/**
 * Cross-document actor reconciliation.
 *
 * Facts are extracted one document at a time, so the same person can end up
 * recorded under different forms ("Priya", "Priya Sharma", "Sharma, Priya Ms").
 * This pass looks at every distinct actor name across a user's facts, asks the
 * LLM to cluster the variants that refer to the same person/entity, and rewrites
 * each fact's `actor` field to a single canonical name per person.
 */
import { invokeLLM } from './_core/llm';
import * as db from './db';

const HONORIFICS = /^(mr|mrs|ms|miss|mx|dr|prof|professor|sir|madam|hon|rev)\.?\s+/i;

/** Normalised key for loose matching (lowercase, no honorific, collapsed spaces). */
function nameKey(name: string): string {
  return name
    .replace(HONORIFICS, '')
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split an actor cell into individual trimmed names. */
function splitActors(actor: string): string[] {
  return actor
    .split(/[,;]/)
    .map(a => a.trim())
    .filter(Boolean);
}

type Cluster = { canonical: string; variants: string[] };

/**
 * Ask the LLM to group name variants. Returns a map from each variant's
 * normalised key to the canonical display name. Conservative by design: only
 * groups names that clearly denote the same person/entity.
 */
async function clusterNames(names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (names.length < 2) return map;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are resolving whether differently-written names refer to the SAME person or organisation.
Names may appear as "First Last", "Last First", "Last, First", first-name-only, last-name-only, or with titles (Mr/Ms/Dr...).
Group only names you are confident denote the SAME entity. Be conservative: if two names merely share a common first name (e.g. two different "James"), keep them separate.
For each group, choose a canonical label: the most complete "Firstname Lastname" form available, in Title Case, with NO honorific/title. For organisations use the full official name.
Every input name must appear in exactly one group (a unique name forms a group of one).`,
      },
      {
        role: 'user',
        content: `Group these names:\n${names.map(n => `- ${n}`).join('\n')}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'name_clusters',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  canonical: { type: 'string', description: 'Canonical "Firstname Lastname", no title' },
                  variants: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'All input names (verbatim) that refer to this entity',
                  },
                },
                required: ['canonical', 'variants'],
                additionalProperties: false,
              },
            },
          },
          required: ['groups'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response?.choices?.[0]?.message?.content;
  if (!content) return map;

  const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
  const groups: Cluster[] = parsed.groups || [];

  for (const group of groups) {
    const canonical = (group.canonical || '').trim();
    if (!canonical) continue;
    for (const variant of group.variants || []) {
      map.set(nameKey(variant), canonical);
    }
    // Ensure the canonical maps to itself too.
    map.set(nameKey(canonical), canonical);
  }

  return map;
}

/**
 * Reconcile actor names across all of a user's facts. Safe to call repeatedly;
 * only writes facts whose actor string actually changes.
 */
export async function reconcileUserActors(userId: number): Promise<void> {
  try {
    const facts = await db.getUserFacts(userId);
    if (!facts || facts.length === 0) return;

    // Collect distinct actor names as they currently appear.
    const distinct = new Set<string>();
    for (const fact of facts) {
      if (fact.actor) splitActors(fact.actor).forEach(n => distinct.add(n));
    }
    if (distinct.size < 2) return;

    const canonicalByKey = await clusterNames([...distinct]);
    if (canonicalByKey.size === 0) return;

    for (const fact of facts) {
      if (!fact.actor) continue;
      const resolved: string[] = [];
      const seen = new Set<string>();
      for (const name of splitActors(fact.actor)) {
        const canonical = canonicalByKey.get(nameKey(name)) ?? name;
        const dedupeKey = nameKey(canonical);
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        resolved.push(canonical);
      }
      const newActor = resolved.join(', ');
      if (newActor && newActor !== fact.actor) {
        await db.updateFactActor(fact.id, newActor);
      }
    }
  } catch (error) {
    // Reconciliation is best-effort; never block document processing on it.
    console.error('[ActorReconciler] Failed to reconcile actors:', error);
  }
}
