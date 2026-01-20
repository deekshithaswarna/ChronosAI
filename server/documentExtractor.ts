/**
 * Node.js-based document text extraction for PDF, DOCX, and TXT files
 * Replaces Python-based extraction with pure JavaScript/TypeScript
 */
import mammoth from 'mammoth';

/**
 * Extract text from PDF file buffer
 */
export async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import for CommonJS module - use PDFParse named export
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.PDFParse || pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(fileBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
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
