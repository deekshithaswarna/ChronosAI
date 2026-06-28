/**
 * Case Memory generation.
 *
 * Produces an AI-deduced "theory of the case" from the user's already-extracted
 * facts (compact and cheaper than re-reading every document). The result is
 * stored as the user's Case Memory and is fully editable afterwards.
 */
import { invokeLLM } from './_core/llm';
import * as db from './db';
import type { CaseMemory } from '../drizzle/schema';

function toISODate(d: Date): string {
  // facts come back as Date objects; format defensively.
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return 'unknown date';
  return date.toISOString().split('T')[0];
}

/**
 * Generate (and persist) a case summary for the user from their facts.
 * Returns the stored Case Memory, or undefined if there are no facts.
 */
export async function generateCaseSummary(userId: number): Promise<CaseMemory | undefined> {
  const facts = await db.getUserFacts(userId);
  if (!facts || facts.length === 0) return undefined;

  // Build a compact chronology digest for the model.
  // Build a compact digest; if the chronology is large, sample EVENLY across the
  // whole timeline (rather than truncating to the first events) so the summary
  // reflects the full case, not just its opening.
  const allLines = facts.map(
    f => `- ${toISODate(f.eventDate as unknown as Date)} | ${f.actor || 'Unknown'} | ${f.summary}`
  );
  const MAX_LINES = 120;
  const sampled =
    allLines.length <= MAX_LINES
      ? allLines
      : allLines.filter((_, i) => i % Math.ceil(allLines.length / MAX_LINES) === 0);
  const digest = sampled.join('\n').slice(0, 18000);

  const documentTitles = Array.from(
    new Set(facts.map(f => f.documentTitle || f.documentName).filter(Boolean))
  );

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a senior litigation associate. From a chronology of extracted facts, deduce the most likely "theory of the case" so a colleague can quickly understand what the matter is about.
Produce:
- title: a short case label (e.g. "Sharma v. StratAIR — Flight Delay / Consumer Claim").
- summary: 2-4 short paragraphs covering what the dispute appears to be about, what happened, and what is likely contested. Be factual and grounded ONLY in the provided chronology; do not invent facts. If something is unclear, say so briefly.
- parties: the key people/organisations involved.
- issues: the disputed legal/factual issues or claims that the chronology suggests (can be full sentences).
- issueLabels: a SHORT, NEUTRAL tag for each issue — the subject matter or cause of action only, never a party's argument or characterisation. Examples: "Redundancy", "Bullying/harassment claim", "Breach of trust claim", "Compensation claim", "Disciplinary process". Do NOT use loaded/argumentative words like "sham", "unfair" (unless it is the neutral statutory name of the claim, e.g. "Unfair dismissal claim"), "wrongful", "bad faith". Keep each to 1-4 words. Provide one label per distinct issue; merge near-duplicates.
Write in neutral, professional language.`,
      },
      {
        role: 'user',
        content: `Documents: ${documentTitles.join('; ') || 'n/a'}\n\nChronology (date | actor | event):\n${digest}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'case_summary',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            parties: { type: 'array', items: { type: 'string' } },
            issues: { type: 'array', items: { type: 'string' } },
            issueLabels: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'summary', 'parties', 'issues', 'issueLabels'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from case-summary LLM call');
  let parsed: any;
  try {
    parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  } catch {
    throw new Error('Case summary returned invalid JSON (possibly truncated, or the provider ignored the response schema).');
  }

  return db.upsertCaseMemory(userId, {
    title: parsed.title || 'Untitled Case',
    summary: parsed.summary || '',
    parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    issueLabels: Array.isArray(parsed.issueLabels) ? parsed.issueLabels : [],
    source: 'ai',
  });
}
