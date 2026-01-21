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
  pageNumber?: number;
}

export interface ExtractionResult {
  documentTitle: string;
  facts: ExtractedFact[];
}

/**
 * Pass 3: Extract structured chronology from document text using three-pass pipeline
 * Handles relative dates like "the following day" or "two weeks later"
 * @param text - Full document text
 * @param pages - Optional page-level data for PDF documents
 * @param filename - Document filename for source attribution
 */
export async function extractFactsFromText(
  text: string,
  pages?: Array<{ pageNumber: number; text: string }>,
  filename?: string
): Promise<ExtractionResult> {
  // Pass 2: Extract date anchors from structured text
  const dateAnchors = extractDateAnchors(text);
  
  if (dateAnchors.length === 0) {
    // No dates found - still try to extract facts without date anchoring
    return await extractFactsWithLLM(text, [], pages, filename);
  }
  
  // Pass 3: Send anchored chunks to LLM for narrative synthesis
  return await extractFactsWithLLM(text, dateAnchors, pages, filename);
}

/**
 * Enhanced LLM prompt for legal chronology extraction with document title generation
 */
async function extractFactsWithLLM(
  text: string,
  dateAnchors: DateAnchor[],
  pages?: Array<{ pageNumber: number; text: string }>,
  filename?: string
): Promise<ExtractionResult> {
  const systemPrompt = `You are a legal chronology expert. Extract a structured timeline from legal documents and generate a descriptive document title.

DOCUMENT TITLE:
- Generate a concise, descriptive title that identifies the document type and key parties
- Examples: "Witness Statement of John Doe", "Employment Contract - Smith v. ABC Corp", "Medical Records - Dr. Jane Smith"
- Use title case and be specific about the document's purpose

FACT EXTRACTION - FOCUS ON:
- Date: Exact date (calculate if relative like "the following day" or "two weeks later")
- Time: Specific time if mentioned (e.g., "3:00 PM", "morning")
- Actor: Who performed the action. IMPORTANT: If multiple people/entities are involved, list them as comma-separated values (e.g., "John Doe, Jane Smith, ABC Corp"). Each name should be a separate entity.
- Event: What happened (be specific and concise)
- Importance: Rate 1-10 (10 = critical legal event like filing, verdict; 1 = minor administrative)
- Page Number: The page number where this event was found (look for [PAGE X] markers in the text)

RELATIVE DATE HANDLING:
- If text says "the following day" or "next day", add 1 day to the previous date
- If text says "two weeks later", add 14 days to the previous date
- If text says "a month later", add 30 days to the previous date
- Always calculate the actual date

Return ONLY valid JSON with no additional text.`;

  // Build text with page markers if pages are available
  let textWithPageMarkers = text;
  if (pages && pages.length > 0) {
    textWithPageMarkers = pages
      .map(p => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n');
  }
  
  const userPrompt = `Extract all legal events from this document and generate a descriptive document title. Pay special attention to dates and calculate relative dates based on context.

${dateAnchors.length > 0 ? `\nDate anchors found:\n${dateAnchors.map(a => `- ${a.date}: ${a.context.substring(0, 150)}...`).join('\n')}\n` : ''}

Document text (first 15000 chars):
${textWithPageMarkers.substring(0, 15000)}`;

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
              documentTitle: { type: 'string', description: 'Descriptive title for the document' },
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
                    pageNumber: { type: 'integer', description: 'Page number where this event was found', minimum: 1 },
                  },
                  required: ['date', 'actor', 'event', 'importance', 'originalText', 'pageNumber'],
                  additionalProperties: false,
                },
              },
            },
            required: ['documentTitle', 'events'],
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
    const documentTitle = result.documentTitle || filename || 'Untitled Document';

    // Normalize and validate dates
    const facts = events.map((event: any) => ({
      date: normalizeDate(event.date),
      time: event.time || undefined,
      actor: event.actor,
      event: event.event,
      importance: Math.min(10, Math.max(1, event.importance)), // Clamp to 1-10
      citation: event.citation || undefined,
      originalText: event.originalText,
      pageNumber: event.pageNumber || undefined,
    }));

    return {
      documentTitle,
      facts,
    };
  } catch (error) {
    console.error('LLM extraction error:', error);
    return {
      documentTitle: filename || 'Untitled Document',
      facts: [],
    };
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
