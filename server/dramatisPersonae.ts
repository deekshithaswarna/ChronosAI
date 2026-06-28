/**
 * Dramatis personae generation.
 *
 * Builds the "cast" of a case from the extracted facts: the distinct actors,
 * each with an AI-generated role/title and a short relevance narrative grounded
 * in the events they appear in. Document references (which uploads mention them,
 * and on which pages) are derived from facts at read time, not stored here.
 */
import { invokeLLM } from './_core/llm';
import * as db from './db';

function splitActors(actor: string): string[] {
  return actor.split(/[,;]/).map(a => a.trim()).filter(Boolean);
}

/**
 * Generate (and persist) the dramatis personae for a user from their facts.
 * Returns the stored rows, or [] if there are no facts.
 */
export async function generateDramatisPersonae(userId: number) {
  const facts = await db.getUserFacts(userId);
  if (!facts || facts.length === 0) return [];

  // Gather each distinct actor and a few grounding event summaries.
  const byName = new Map<string, string[]>();
  for (const f of facts) {
    if (!f.actor) continue;
    for (const name of splitActors(f.actor)) {
      const list = byName.get(name) ?? [];
      if (list.length < 6 && f.summary) list.push(f.summary);
      byName.set(name, list);
    }
  }
  if (byName.size === 0) return [];

  const caseMemory = await db.getCaseMemory(userId);
  const caseContext = [
    caseMemory?.title ? `Case: ${caseMemory.title}` : '',
    caseMemory?.summary ? `Summary:\n${caseMemory.summary}` : '',
  ].filter(Boolean).join('\n\n');

  // Build candidate blocks within a char budget WITHOUT ever dropping a name:
  // every distinct actor's header is always included; per-actor event context is
  // trimmed (and reduced further) if needed so no genuine party is lost.
  const BUDGET = 18000;
  const entries = [...byName.entries()];
  let perActor = 6;
  const blockFor = (name: string, summaries: string[]) =>
    `### ${name}\n${summaries.slice(0, perActor).map(s => `- ${s.slice(0, 200)}`).join('\n')}`;
  while (perActor > 0 && entries.reduce((n, [nm, s]) => n + blockFor(nm, s).length + 2, 0) > BUDGET) {
    perActor--;
  }
  const candidates = entries.map(([name, summaries]) =>
    perActor > 0 ? blockFor(name, summaries) : `### ${name}`
  ).join('\n\n');

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are compiling a "dramatis personae" (cast of parties) for a litigation case.
You are given candidate names with the events each appears in, plus the case summary.
For each name that is a genuine party, witness, decision-maker, or relevant organisation, produce:
- name: the name EXACTLY as given (do not rename or merge).
- role: their title or role in the matter (e.g. "Claimant / Employee", "Respondent (Employer)", "Line manager", "Witness", "HR officer"). Keep it short.
- narrative: 1-3 sentences on their relevance to the case, grounded ONLY in the provided events. Be factual; do not invent.
Omit pure non-actors (e.g. a flight number, a generic placeholder like "Unknown"). Order the most central parties first.`,
      },
      {
        role: 'user',
        content: `CASE CONTEXT:\n${caseContext || '(none)'}\n\nCANDIDATES (name + events they appear in):\n${candidates}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'dramatis_personae',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            people: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string' },
                  narrative: { type: 'string' },
                },
                required: ['name', 'role', 'narrative'],
                additionalProperties: false,
              },
            },
          },
          required: ['people'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content from dramatis-personae LLM call');
  let parsed: any;
  try {
    parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  } catch {
    throw new Error('Dramatis personae returned invalid JSON (possibly truncated, or the provider ignored the response schema).');
  }
  const people = (parsed.people || []).filter((p: any) => p && p.name);

  await db.replaceDramatisPersonae(userId, people.map((p: any) => ({
    name: String(p.name).trim(),
    role: String(p.role || '').trim(),
    narrative: String(p.narrative || '').trim(),
  })));

  return db.getDramatisPersonae(userId);
}
