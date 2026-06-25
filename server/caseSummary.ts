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
  const digest = facts
    .map(f => `- ${toISODate(f.eventDate as unknown as Date)} | ${f.actor || 'Unknown'} | ${f.summary}`)
    .join('\n')
    .slice(0, 15000);

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
- issues: the disputed legal/factual issues or claims that the chronology suggests.
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
          },
          required: ['title', 'summary', 'parties', 'issues'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from case-summary LLM call');
  const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

  return db.upsertCaseMemory(userId, {
    title: parsed.title || 'Untitled Case',
    summary: parsed.summary || '',
    parties: Array.isArray(parsed.parties) ? parsed.parties : [],
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    source: 'ai',
  });
}
