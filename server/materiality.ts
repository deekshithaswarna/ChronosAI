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

function toISODate(d: unknown): string {
  const date = d instanceof Date ? d : new Date(d as string);
  if (isNaN(date.getTime())) return 'unknown date';
  return date.toISOString().split('T')[0];
}

type Scored = { id: number; materiality: number; reason: string };

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

  const caseContext = [
    caseMemory.title ? `Case: ${caseMemory.title}` : '',
    caseMemory.summary ? `Summary:\n${caseMemory.summary}` : '',
    caseMemory.parties?.length ? `Parties: ${caseMemory.parties.join(', ')}` : '',
    caseMemory.issues?.length ? `Disputed issues: ${caseMemory.issues.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // Compact, id-tagged list so the model returns scores we can map back.
  const factList = facts
    .map(f => `[${f.id}] ${toISODate(f.eventDate)} | ${f.actor || 'Unknown'} | ${f.summary}`)
    .join('\n')
    .slice(0, 15000);

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a litigation strategist deciding which chronology events are MATERIAL to a specific case.
A fact is material if it bears on the disputed issues, proves/disproves a claim, establishes liability, causation, notice, damages, limitation/deadlines, or credibility. Routine/administrative or merely contextual events are LOW materiality even if they are real.
For each fact id you are given, return:
- materiality: integer 0-100 (how strongly it bears on THIS case's disputed issues).
- reason: a concise (max ~15 words) rationale.
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
                },
                required: ['id', 'materiality', 'reason'],
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
  if (!content) throw new Error('No content from materiality LLM call');
  const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  const scores: Scored[] = parsed.scores || [];

  const validIds = new Set(facts.map(f => f.id));
  let scored = 0;
  for (const s of scores) {
    if (!validIds.has(s.id)) continue;
    const materiality = Math.min(100, Math.max(0, Math.round(s.materiality)));
    await db.updateFactMateriality(s.id, materiality, (s.reason || '').slice(0, 255));
    scored++;
  }

  return { scored };
}
