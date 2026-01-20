# Chronos - Legal Timeline Builder TODO

## Backend Features
- [x] Database schema for documents, facts, actors, and issues
- [x] Document upload endpoint with file validation
- [x] PDF text extraction using PyPDF2/pdfplumber
- [x] Word document text extraction using python-docx
- [x] Plain text file processing
- [x] LLM-based fact extraction (dates, events, actors, citations)
- [x] Date normalization logic (various formats → ISO 8601)
- [x] Fact summarization (1-2 sentences per event)
- [x] Actor and Issue categorization
- [x] S3 file storage integration for uploaded documents

## Frontend Features
- [x] Drag-and-drop file upload interface
- [x] File upload progress indicator
- [x] Document list view with upload history
- [x] Interactive timeline visualization component
- [x] Filter timeline by Actor
- [x] Filter timeline by Issue
- [x] Searchable data table with all extracted facts
- [x] Sortable columns in data table
- [x] CSV export functionality
- [x] Excel export functionality
- [ ] Document detail view with extracted facts

## UI/UX Polish
- [x] Professional legal SaaS aesthetic
- [x] Dark mode support with theme toggle
- [x] Inter or SF Pro font integration
- [x] Subtle animations and transitions
- [x] Loading states and skeletons
- [x] Error handling and user feedback
- [x] Empty states for no documents/facts
- [x] Responsive design for mobile/tablet

## Testing & Deployment
- [x] Vitest tests for backend procedures
- [x] End-to-end document processing test
- [x] Test date normalization edge cases
- [x] Test export functionality
- [x] Final checkpoint and documentation

## Bug Fixes
- [x] Fix Python SRE module mismatch error
- [x] Create stable Python 3.11 virtual environment
- [x] Reinstall Python dependencies in venv
- [x] Update backend to use venv Python interpreter
- [x] Test document upload and processing

## Critical Python Fix
- [x] Identify all available Python versions on system
- [x] Test each Python version for SRE module corruption
- [x] Remove corrupted venv and create fresh one with stable Python
- [x] Verify new environment with simple import test
- [x] Update backend to use verified Python interpreter
- [x] Test document upload end-to-end

## Manual Python Environment Rebuild
- [x] Identify clean system Python version
- [x] Remove all existing venv directories
- [x] Create manual_venv using /usr/bin/python3 -m venv
- [x] Manually activate and install pypdf, python-docx, python-magic
- [x] Test with simple sys.version check
- [x] Update backend routers.ts to use manual_venv/bin/python
- [x] Restart server and test document upload

## Rebuild with Pure Node.js Stack
- [x] Remove Python venv directories and Python files
- [x] Verify Node.js environment
- [x] Install pdf-parse, mammoth for document extraction
- [x] Rewrite document extraction in Node.js/TypeScript
- [x] Update fact extraction to use LLM directly from Node.js
- [x] Remove Python spawn calls from routers.ts
- [x] Test PDF upload and text extraction
- [x] Test DOCX upload and text extraction
- [x] Test end-to-end fact extraction with LLM
- [x] Verify timeline and data table work with new backend

## Fix pdf-parse Import Error
- [x] Debug pdf-parse module structure
- [x] Fix import to correctly access the parsing function
- [x] Test PDF extraction with sample file
- [x] Verify document upload works end-to-end

## Three-Pass Extraction Pipeline
- [x] Fix pdf-parse constructor error (use 'new' keyword with v2 API)
- [x] Implement Pass 1: Structural extraction with whitespace preservation
- [x] Implement Pass 2: Entity and date anchoring logic
- [x] Implement Pass 3: Narrative synthesis with enhanced LLM prompt
- [x] Add relative date calculation (e.g., "two weeks later")
- [x] Return clean JSON array with date, actor, event, importance fields
- [x] Add graceful error handling for password-protected PDFs
- [ ] Test with sample PDF and verify console output
