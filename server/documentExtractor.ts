/**
 * Node.js-based document text extraction with three-pass pipeline for legal documents
 * Pass 1: Structural extraction with whitespace preservation
 * Pass 2: Entity and date anchoring
 * Pass 3: Narrative synthesis (handled by factExtractor)
 */
import mammoth from 'mammoth';

/**
 * Pass 1: Extract text from PDF with structural preservation
 * Preserves whitespace, headers, footers for proper legal document parsing
 */
export async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import for CommonJS module - pdf-parse v2 API
    const pdfParseModule: any = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse;
    
    // Use 'new' keyword with buffer option
    const parser = new PDFParse({ buffer: fileBuffer });
    const result = await parser.getText();
    
    // Return raw text with preserved structure
    return result.text;
  } catch (error) {
    // Handle password-protected or corrupted PDFs gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      throw new Error('This PDF is password-protected. Please provide an unlocked version.');
    }
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

/**
 * Extract text from DOCX file buffer
 */
export async function extractTextFromDocx(fileBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from plain text file buffer
 */
export function extractTextFromTxt(fileBuffer: Buffer): string {
  try {
    // Try UTF-8 first, fall back to latin-1
    try {
      return fileBuffer.toString('utf-8');
    } catch {
      return fileBuffer.toString('latin1');
    }
  } catch (error) {
    throw new Error(`Failed to extract text from TXT: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from file buffer based on MIME type
 * Returns raw text with structural preservation (Pass 1)
 */
export async function extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(fileBuffer);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             mimeType === 'application/msword') {
    return extractTextFromDocx(fileBuffer);
  } else if (mimeType.startsWith('text/')) {
    return extractTextFromTxt(fileBuffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Pass 2: Date Anchoring
 * Scan text for date patterns and anchor surrounding sentences
 */
export interface DateAnchor {
  date: string;
  context: string;
  lineNumber: number;
}

export function extractDateAnchors(text: string): DateAnchor[] {
  const anchors: DateAnchor[] = [];
  const lines = text.split('\n');
  
  // Date pattern regex (ISO, American, British formats)
  const datePatterns = [
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, // ISO: 2024-03-15
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, // American: 03/15/2024
    /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, // British: 15-03-2024
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi, // March 15, 2024
    /\b(\d{1,2})(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi, // 15th March 2024
  ];
  
  lines.forEach((line, index) => {
    for (const pattern of datePatterns) {
      const matches = Array.from(line.matchAll(pattern));
      for (const match of matches) {
        // Get context: current line + previous and next lines
        const contextStart = Math.max(0, index - 1);
        const contextEnd = Math.min(lines.length - 1, index + 1);
        const context = lines.slice(contextStart, contextEnd + 1).join(' ').trim();
        
        if (context.length > 10) { // Skip headers/footers with just dates
          anchors.push({
            date: match[0],
            context: context,
            lineNumber: index + 1,
          });
        }
      }
    }
  });
  
  return anchors;
}
