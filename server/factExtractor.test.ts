/**
 * Tests for page number extraction in factExtractor
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractFactsFromText } from './factExtractor';
import type { PagedText } from './documentExtractor';

// Mock the LLM module
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn(),
}));

describe('factExtractor - Page Number Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include page markers in the text sent to LLM', async () => {
    const { invokeLLM } = await import('./_core/llm');
    const mockInvokeLLM = vi.mocked(invokeLLM);

    // Mock LLM response with page numbers
    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            documentTitle: 'Test Document',
            events: [{
              date: '2024-01-15',
              time: '',
              actor: 'John Doe',
              event: 'Signed contract',
              importance: 8,
              citation: '',
              originalText: 'John Doe signed the contract on January 15, 2024',
              pageNumber: 1,
            }],
          }),
        },
      }],
    } as any);

    const pages = [
      { pageNumber: 1, text: 'John Doe signed the contract on January 15, 2024' },
      { pageNumber: 2, text: 'The contract was filed with the court.' },
    ];

    const result = await extractFactsFromText('Full text here', pages, 'test.pdf');

    // Verify LLM was called
    expect(mockInvokeLLM).toHaveBeenCalled();
    
    // Verify the user prompt includes page markers
    const callArgs = mockInvokeLLM.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
    expect(userMessage.content).toContain('[PAGE 1]');
    expect(userMessage.content).toContain('[PAGE 2]');
  });

  it('should extract page numbers from LLM response', async () => {
    const { invokeLLM } = await import('./_core/llm');
    const mockInvokeLLM = vi.mocked(invokeLLM);

    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            documentTitle: 'Test Document',
            events: [
              {
                date: '2024-01-15',
                time: '',
                actor: 'John Doe',
                event: 'Signed contract',
                importance: 8,
                citation: '',
                originalText: 'John Doe signed the contract',
                pageNumber: 1,
              },
              {
                date: '2024-01-16',
                time: '',
                actor: 'Jane Smith',
                event: 'Filed with court',
                importance: 9,
                citation: '',
                originalText: 'Filed with court',
                pageNumber: 2,
              },
            ],
          }),
        },
      }],
    } as any);

    const pages = [
      { pageNumber: 1, text: 'John Doe signed the contract on January 15, 2024' },
      { pageNumber: 2, text: 'Jane Smith filed with court on January 16, 2024' },
    ];

    const result = await extractFactsFromText('Full text', pages, 'test.pdf');

    expect(result.facts).toHaveLength(2);
    expect(result.facts[0].pageNumber).toBe(1);
    expect(result.facts[1].pageNumber).toBe(2);
  });

  it('should handle missing page numbers gracefully', async () => {
    const { invokeLLM } = await import('./_core/llm');
    const mockInvokeLLM = vi.mocked(invokeLLM);

    mockInvokeLLM.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            documentTitle: 'Test Document',
            events: [{
              date: '2024-01-15',
              time: '',
              actor: 'John Doe',
              event: 'Signed contract',
              importance: 8,
              citation: '',
              originalText: 'John Doe signed the contract',
              // pageNumber is missing
            }],
          }),
        },
      }],
    } as any);

    const result = await extractFactsFromText('Full text', undefined, 'test.pdf');

    expect(result.facts).toHaveLength(1);
    expect(result.facts[0].pageNumber).toBeUndefined();
  });
});
