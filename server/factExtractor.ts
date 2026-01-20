/**
 * LLM-based fact extraction and date normalization for legal documents
 * Pure Node.js/TypeScript implementation
 */
import { invokeLLM } from './_core/llm';

export interface ExtractedFact {
  original_date: string;
  normalized_date: string;
  summary: string;
  actor: string | null;
  issue: string | null;
  citation: string | null;
  full_text: string;
}

/**
 * Extract structured facts from document text using LLM
 */
export async function extractFactsFromText(text: string): Promise<ExtractedFact[]> {
  const systemPrompt = `You are a legal document analysis expert. Extract key facts, events, and dates from legal documents.

For each fact you identify, extract:
1. Date (in any format mentioned in the document)
2. Event summary (1-2 sentences describing what happened)
3. Actor (person, company, or entity involved)
4. Issue (legal issue category, e.g., "Contract Dispute", "Discovery", "Motion Filed")
5. Citation (any legal citation mentioned, if present)
6. Full context (the complete relevant text from the document)

Return ONLY valid JSON with no additional text. Format:
{
  "facts": [
    {
      "date": "original date string from document",
      "summary": "brief 1-2 sentence summary",
      "actor": "person or entity name",
      "issue": "legal issue category",
      "citation": "legal citation or null",
      "full_text": "complete relevant text from document"
    }
  ]
}

If no facts are found, return: {"facts": []}`;

  const userPrompt = `Extract all facts, events, and dates from this legal document:

${text.substring(0, 15000)}`; // Limit to first 15k chars to avoid token limits

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'fact_extraction',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              facts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string' },
                    summary: { type: 'string' },
                    actor: { type: ['string', 'null'] },
                    issue: { type: ['string', 'null'] },
                    citation: { type: ['string', 'null'] },
                    full_text: { type: 'string' },
                  },
                  required: ['date', 'summary', 'full_text'],
                  additionalProperties: false,
                },
              },
            },
            required: ['facts'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    // Content should be a string for JSON schema responses
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentString);
    const facts = result.facts || [];

    // Normalize dates for each fact
    return facts.map((fact: any) => ({
      original_date: fact.date,
      normalized_date: normalizeDate(fact.date),
      summary: fact.summary,
      actor: fact.actor || null,
      issue: fact.issue || null,
      citation: fact.citation || null,
      full_text: fact.full_text,
    }));
  } catch (error) {
    console.error('LLM extraction error:', error);
    return [];
  }
}

/**
 * Normalize various date formats to ISO 8601 (YYYY-MM-DD)
 */
export function normalizeDate(dateString: string): string {
  const cleaned = dateString.trim();

  // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
  const withoutOrdinals = cleaned.replace(/(\d+)(st|nd|rd|th)/g, '$1');

  // Common date format patterns to try
  const formats = [
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, format: 'YYYY-MM-DD' },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: 'MM/DD/YYYY' },
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'MM-DD-YYYY' },
    { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, format: 'YYYY/MM/DD' },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, format: 'MM/DD/YY' },
  ];

  for (const { regex, format } of formats) {
    const match = withoutOrdinals.match(regex);
    if (match) {
      let year, month, day;
      if (format === 'YYYY-MM-DD') {
        [, year, month, day] = match;
      } else if (format === 'MM/DD/YYYY' || format === 'MM-DD-YYYY') {
        [, month, day, year] = match;
      } else if (format === 'YYYY/MM/DD') {
        [, year, month, day] = match;
      } else if (format === 'MM/DD/YY') {
        [, month, day, year] = match;
        // Convert 2-digit year to 4-digit (assume 2000s for years < 50, 1900s otherwise)
        year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
      }

      if (year && month && day) {
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
      }
    }
  }

  // Try parsing with Date constructor as fallback
  try {
    const date = new Date(withoutOrdinals);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Ignore parsing errors
  }

  // Last resort: return original string
  return cleaned;
}
