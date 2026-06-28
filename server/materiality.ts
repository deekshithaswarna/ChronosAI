/**
 * Case-contextual materiality scoring.
 *
 * Given the user's Case Memory (the theory of the case), score how material
 * each fact is to THAT case. This is distinct from the generic, case-agnostic
 * `confidence`/importance captured at extraction time.
 *
 * User key-overrides (`isKeyOverride`) are never touched here, so a re-evaluation
 * after editing the case summary preserves the user's manual decisions.
 */
import { invokeLLM } from './_core/llm';
import * as db from './db';

// A fact is treated as "key" when its AI materiality meets this threshold,
// unless the user has set an explicit override.
export const KEY_MATERIALITY_THRESHOLD = 70;

// Prefix marking a Comments value as auto-written by the tool. We only ever
// overwrite/clear comments that are empty or carry this prefix, so user-typed
// comments are never touched.
export const KEY_COMMENT_PREFIX = 'Key fact — ';

function toISODate(d: unknown): string {
  const date = d instanceof Date ? d : new Date(d as string);
  if (isNaN(date.getTime())) return 'unknown date';
  return date.toISOString().split('T')[0];
}

type Scored = { id: number; materiality: number; reason: string; issues?: string[] };

/**
 * Re-evaluate materiality for all of the user's facts against their Case Memory.
 * Returns the number of facts scored. Requires a Case Memory to exist.
 */
export async function evaluateMateriality(userId: number): Promise<{ scored: number; reason?: string }> {
  const caseMemory = await db.getCaseMemory(userId);
  if (!caseMemory || !caseMemory.summary) {
    return { scored: 0, reason: 'no-case-memory' };
  }

  const facts = await db.getUserFacts(userId);
  if (!facts || facts.length === 0) return { scored: 0, reason: 'no-facts' };

  const issueLabels = (caseMemory.issueLabels || []).filter(Boolean);
  const labelSet = new Set(issueLabels.map(l => l.toLowerCase()));

  const caseContext = [
    caseMemory.title ? `Case: ${caseMemory.title}` : '',
    caseMemory.summary ? `Summary:\n${caseMemory.summary}` : '',
    caseMemory.parties?.length ? `Parties: ${caseMemory.parties.join(', ')}` : '',
    caseMemory.issues?.length ? `Disputed issues: ${caseMemory.issues.join('; ')}` : '',
    issueLabels.length ? `Issue labels (the ONLY allowed tags): ${issueLabels.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // Compact, id-tagged lines, then batched so EVERY fact is scored even on
  // large chronologies (a single request would exceed the context window).
  const lines = facts.map(
    f => `[${f.id}] ${toISODate(f.eventDate)} | ${f.actor || 'Unknown'} | ${f.summary}`
  );
  const BATCH_CHARS = 12000;
  const batches: string[][] = [];
  let cur: string[] = [];
  let curLen = 0;
  for (const line of lines) {
    if (curLen + line.length > BATCH_CHARS && cur.length > 0) {
      batches.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(line);
    curLen += line.length + 1;
  }
  if (cur.length) batches.push(cur);

  const scores: Scored[] = [];
  for (let b = 0; b < batches.length; b++) {
    try {
      scores.push(...(await scoreBatch(caseContext, batches[b].join('\n'))));
    } catch (err) {
      // One failed batch shouldn't lose the rest.
      console.error(`[Materiality] Batch ${b + 1}/${batches.length} failed:`, err);
    }
  }

  const factsById = new Map(facts.map(f => [f.id, f]));
  let scored = 0;
  for (const s of scores) {
    const fact = factsById.get(s.id);
    if (!fact) continue;
    const materiality = Math.min(100, Math.max(0, Math.round(s.materiality)));
    const reason = (s.reason || '').slice(0, 255);
    await db.updateFactMateriality(s.id, materiality, reason);
    scored++;

    // Tag the fact with the case's neutral issue labels (closed set only).
    if (issueLabels.length) {
      const tags = (Array.isArray(s.issues) ? s.issues : [])
        .map(t => issueLabels.find(l => l.toLowerCase() === String(t).toLowerCase()))
        .filter((t): t is string => Boolean(t));
      await db.updateFactAiIssues(s.id, Array.from(new Set(tags)));
    }

    // Mirror the rationale into the (user-editable) Comments column when the
    // TOOL flags the event as key (no user override + above threshold). We only
    // touch comments that are empty or tool-written, so user notes are safe.
    const override = (fact as any).isKeyOverride;
    const aiKey = (override === null || override === undefined) && materiality >= KEY_MATERIALITY_THRESHOLD;
    const current = fact.comments ?? '';
    const toolOwned = current === '' || current.startsWith(KEY_COMMENT_PREFIX);
    if (toolOwned) {
      const desired = aiKey && reason ? `${KEY_COMMENT_PREFIX}${reason}` : '';
      if (desired !== current) {
        await db.updateFactComments(s.id, desired);
      }
    }
  }

  return { scored };
}

// Score one batch of fact lines against the case context.
async function scoreBatch(caseContext: string, factList: string): Promise<Scored[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a litigation strategist deciding which chronology events are MATERIAL to a specific case.
A fact is material if it bears on the disputed issues, proves/disproves a claim, establishes liability, causation, notice, damages, limitation/deadlines, or credibility. Routine/administrative or merely contextual events are LOW materiality even if they are real.
For each fact id you are given, return:
- materiality: integer 0-100 (how strongly it bears on THIS case's disputed issues).
- reason: a concise (max ~15 words) rationale.
- issues: which issue label(s) from the provided "Issue labels" set this fact bears on. Use the labels EXACTLY as given; pick 0, 1, or more; return [] if none apply or no labels were provided. Do NOT invent new labels.
Score relative to the case context provided. Return every id exactly once.`,
      },
      {
        role: 'user',
        content: `CASE CONTEXT:\n${caseContext}\n\nFACTS (id | date | actor | event):\n${factList}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'materiality_scores',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            scores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  materiality: { type: 'integer', minimum: 0, maximum: 100 },
                  reason: { type: 'string' },
                  issues: { type: 'array', items: { type: 'string' } },
                },
                required: ['id', 'materiality', 'reason', 'issues'],
                additionalProperties: false,
              },
            },
          },
          required: ['scores'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) return [];
  const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  return parsed.scores || [];
}
