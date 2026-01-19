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
