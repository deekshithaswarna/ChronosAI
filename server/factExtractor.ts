/**
 * Pass 3: Narrative Synthesis with LLM
 * Enhanced fact extraction with relative date calculation and importance scoring
 */
import { invokeLLM } from './_core/llm';
import { extractDateAnchors, type DateAnchor } from './documentExtractor';

export interface ExtractedFact {
  date: string;
  time?: string;
  actor: string;
  event: string;
  importance: number; // 1-10 scale
  citation?: string;
  originalText: string;
}

/**
 * Pass 3: Extract structured chronology from document text using three-pass pipeline
 * Handles relative dates like "the following day" or "two weeks later"
 */
export async function extractFactsFromText(text: string): Promise<ExtractedFact[]> {
  // Pass 2: Extract date anchors from structured text
  const dateAnchors = extractDateAnchors(text);
  
  if (dateAnchors.length === 0) {
    // No dates found - still try to extract facts without date anchoring
    return await extractFactsWithLLM(text, []);
  }
  
  // Pass 3: Send anchored chunks to LLM for narrative synthesis
  return await extractFactsWithLLM(text, dateAnchors);
}

/**
 * Enhanced LLM prompt for legal chronology extraction
 */
async function extractFactsWithLLM(text: string, dateAnchors: DateAnchor[]): Promise<ExtractedFact[]> {
  const systemPrompt = `You are a legal chronology expert. Extract a structured timeline from legal documents.

FOCUS ON:
- Date: Exact date (calculate if relative like "the following day" or "two weeks later")
- Time: Specific time if mentioned (e.g., "3:00 PM", "morning")
- Actor: Who performed the action (person, company, entity)
- Event: What happened (be specific and concise)
- Importance: Rate 1-10 (10 = critical legal event like filing, verdict; 1 = minor administrative)

RELATIVE DATE HANDLING:
- If text says "the following day" or "next day", add 1 day to the previous date
- If text says "two weeks later", add 14 days to the previous date
- If text says "a month later", add 30 days to the previous date
- Always calculate the actual date

Return ONLY valid JSON with no additional text.`;

  const userPrompt = `Extract all legal events from this document. Pay special attention to dates and calculate relative dates based on context.

${dateAnchors.length > 0 ? `\nDate anchors found:\n${dateAnchors.map(a => `- ${a.date}: ${a.context.substring(0, 150)}...`).join('\n')}\n` : ''}

Document text (first 15000 chars):
${text.substring(0, 15000)}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'legal_chronology',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', description: 'ISO date format YYYY-MM-DD' },
                    time: { type: 'string', description: 'Time if mentioned, empty string if not available' },
                    actor: { type: 'string', description: 'Who performed the action' },
                    event: { type: 'string', description: 'What happened' },
                    importance: { type: 'integer', description: 'Importance score 1-10', minimum: 1, maximum: 10 },
                    citation: { type: 'string', description: 'Legal citation if present, empty string if not available' },
                    originalText: { type: 'string', description: 'Original text excerpt' },
                  },
                  required: ['date', 'actor', 'event', 'importance', 'originalText'],
                  additionalProperties: false,
                },
              },
            },
            required: ['events'],
            additionalProperties: false,
          },
        },
      },
    });

    // Check if response is valid
    if (!response || !response.choices || response.choices.length === 0) {
      console.error('Invalid LLM response:', JSON.stringify(response, null, 2));
      throw new Error('Invalid LLM response structure');
    }
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No content in LLM response:', JSON.stringify(response.choices[0], null, 2));
      throw new Error('No content in LLM response');
    }

    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentString);
    const events = result.events || [];

    // Normalize and validate dates
    return events.map((event: any) => ({
      date: normalizeDate(event.date),
      time: event.time || undefined,
      actor: event.actor,
      event: event.event,
      importance: Math.min(10, Math.max(1, event.importance)), // Clamp to 1-10
      citation: event.citation || undefined,
      originalText: event.originalText,
    }));
  } catch (error) {
    console.error('LLM extraction error:', error);
    return [];
  }
}

/**
 * Normalize date to ISO 8601 format (YYYY-MM-DD)
 */
export function normalizeDate(dateString: string): string {
  const cleaned = dateString.trim();

  // Remove ordinal suffixes
  const withoutOrdinals = cleaned.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  // Try parsing as ISO date first
  if (/^\d{4}-\d{2}-\d{2}$/.test(withoutOrdinals)) {
    return withoutOrdinals;
  }

  // Try Date constructor
  try {
    const date = new Date(withoutOrdinals);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Continue to fallback
  }

  // Return original if can't parse
  return cleaned;
}

/**
 * Calculate relative date from anchor date
 * E.g., "two weeks later" from "2024-03-01" = "2024-03-15"
 */
export function calculateRelativeDate(anchorDate: string, relativePhrase: string): string {
  try {
    const anchor = new Date(anchorDate);
    if (isNaN(anchor.getTime())) {
      return anchorDate; // Return original if invalid
    }

    const phrase = relativePhrase.toLowerCase();
    let daysToAdd = 0;

    if (phrase.includes('following day') || phrase.includes('next day')) {
      daysToAdd = 1;
    } else if (phrase.includes('week later') || phrase.includes('weeks later')) {
      const weeks = parseInt(phrase.match(/(\d+)\s*weeks?/)?.[1] || '1');
      daysToAdd = weeks * 7;
    } else if (phrase.includes('month later') || phrase.includes('months later')) {
      const months = parseInt(phrase.match(/(\d+)\s*months?/)?.[1] || '1');
      daysToAdd = months * 30; // Approximate
    } else if (phrase.includes('year later') || phrase.includes('years later')) {
      const years = parseInt(phrase.match(/(\d+)\s*years?/)?.[1] || '1');
      daysToAdd = years * 365;
    }

    if (daysToAdd > 0) {
      anchor.setDate(anchor.getDate() + daysToAdd);
      const year = anchor.getFullYear();
      const month = String(anchor.getMonth() + 1).padStart(2, '0');
      const day = String(anchor.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return anchorDate;
  } catch {
    return anchorDate;
  }
}
