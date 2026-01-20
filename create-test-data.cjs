/**
 * Test data generation script for Chronos
 * Creates a simple legal timeline text file for testing extraction pipeline
 */
const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✓ Created uploads directory');
}

// Sample legal timeline data
const testData = `LEGAL CASE TIMELINE - TEST DOCUMENT
Case No.: 2024-CV-12345
Smith v. Acme Corporation

January 10, 2024
Plaintiff John Smith and Defendant Acme Corporation entered into a purchase agreement for delivery of 1,000 units of Product X.

March 15, 2024 at 9:00 AM
Plaintiff John Smith filed a complaint in Superior Court alleging breach of contract.
The complaint states that Acme Corporation failed to deliver the goods as specified.

March 22, 2024 at 2:30 PM
Defendant Acme Corporation filed an answer denying all allegations and asserting affirmative defenses.

The following day, plaintiff's counsel Jane Doe submitted a motion for expedited discovery.

Two weeks later, the Honorable Judge Williams granted the motion and set a discovery deadline of May 1, 2024.

April 30, 2024
Both parties attended a mandatory settlement conference before Magistrate Judge Thompson.
No settlement was reached.

May 15, 2024
Plaintiff filed a motion for summary judgment.

June 1, 2024
The court denied plaintiff's motion for summary judgment, finding genuine issues of material fact.

July 10, 2024
Trial commenced before a jury.

July 18, 2024
The jury returned a verdict in favor of the plaintiff, awarding $250,000 in damages.
`;

// Write test file
const testFilePath = path.join(uploadsDir, 'test-legal-timeline.txt');
fs.writeFileSync(testFilePath, testData, 'utf-8');

console.log('✓ Created test data file:', testFilePath);
console.log('✓ File size:', fs.statSync(testFilePath).size, 'bytes');
console.log('\nTest data preview:');
console.log(testData.substring(0, 200) + '...\n');
console.log('✓ Ready for processing!');
