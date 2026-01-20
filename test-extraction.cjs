/**
 * Test extraction pipeline
 * Verifies text extraction and LLM fact extraction work end-to-end
 */
const fs = require('fs');
const path = require('path');

async function testExtraction() {
  console.log('=== Testing Chronos Extraction Pipeline ===\n');
  
  // Read test file
  const testFilePath = path.join(__dirname, 'uploads', 'test-legal-timeline.txt');
  const fileBuffer = fs.readFileSync(testFilePath);
  
  console.log('✓ Loaded test file:', testFilePath);
  console.log('✓ File size:', fileBuffer.length, 'bytes\n');
  
  // Import extraction modules (TypeScript)
  const { extractText } = await import('./server/documentExtractor.ts');
  const { extractFactsFromText } = await import('./server/factExtractor.ts');
  
  // Step 1: Extract text
  console.log('Step 1: Extracting text...');
  const text = await extractText(fileBuffer, 'text/plain');
  console.log('✓ Extracted', text.length, 'characters');
  console.log('Preview:', text.substring(0, 200) + '...\n');
  
  // Step 2: Extract facts with LLM
  console.log('Step 2: Extracting facts with LLM...');
  const facts = await extractFactsFromText(text);
  console.log('✓ Extracted', facts.length, 'facts\n');
  
  // Step 3: Display JSON output
  console.log('=== EXTRACTED FACTS (JSON) ===');
  console.log(JSON.stringify(facts, null, 2));
  console.log('\n=== Test Complete ===');
  
  // Summary
  console.log('\nSummary:');
  facts.forEach((fact, index) => {
    console.log(`${index + 1}. ${fact.date} - ${fact.actor}: ${fact.event.substring(0, 60)}...`);
  });
}

testExtraction().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
