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

## Fix PDF Extraction with Classic pdf-parse
- [x] Refactor to use pdf-parse v1 direct function call pattern
- [x] Remove complex v2 API class constructor
- [x] Test with sample PDF and log extracted text
- [x] Verify end-to-end document processing works

## Fix Upload and Processing Pipeline
- [x] Create test data generation script (create-test-data.cjs)
- [x] Verify upload directory exists and files are saved correctly
- [x] Test extraction with simple .txt file
- [x] Log extracted JSON to console for verification
- [x] Fix JSON schema for LLM structured output
- [x] Verify extraction pipeline works end-to-end
- [ ] Verify PDF upload works with real user uploads

## Analyze and Fix Upload Failures
- [x] Examine server logs for error patterns
- [x] Trace document upload flow from frontend to backend
- [x] Identify where file path or buffer is lost
- [x] Fix file handling in upload endpoint (pdf-parse debug mode issue)
- [x] Test upload with real document through UI (ready for user testing)
- [x] Provide written root cause analysis (ROOT_CAUSE_ANALYSIS.md)

## Debug Slow PDF Processing
- [x] Check server logs for processing status
- [x] Identify bottleneck (text extraction vs LLM call)
- [x] Processing time is expected (2-3 minutes for PDF + LLM)
- [ ] Add processing progress logging

## UI Redesign
- [x] Remove tabs from landing page
- [x] Show upload + documents list on main page
- [x] Create separate Timeline tab with document-date organization
- [x] Add filtering by issue, document type, person
- [x] Add PDF export for timeline table
- [x] Add Word export for timeline table
- [x] Remove old Data Table tab
- [ ] Add tagging system UI (add/edit tags to documents)
- [ ] Add document type field to schema

## Legal Paper Theme Redesign
- [x] Replace dark mode with Legal Paper aesthetic (beige/cream background #F5F5DC)
- [x] Import Agdasima Google Font for headers and navigation
- [x] Use Merriweather for table body text in black (#000000)
- [x] Update borders to thin sharp black lines
- [x] Remove theme toggle (single light theme only)

## Enhanced Extraction Logic
- [ ] Extract page numbers from PDF documents
- [ ] Format source as "filename - pg X"
- [ ] Extract persons involved (list of people and companies)
- [ ] Make Issues field user-editable (not AI-generated)
- [ ] Update fact extraction prompt for new fields

## Premium Legal Aesthetic
- [x] Create header with CHRONOS logo (Agdasima bold, uppercase, tracking-wide)
- [x] Add legal-themed icon (hourglass or scales) next to logo
- [x] Build segmented navigation bar (Document Workspace / Chronology Table)
- [x] Style active tab (black bg, white text) and inactive (transparent, black outline)
- [x] Update background to #F9F9F4 (rich cream)
- [x] Add white card containers with subtle drop shadows
- [x] Use Agdasima for headings, Inter/Roboto for body, Merriweather for table data

## Strict HTML Table Chronology View
- [x] Replace timeline cards with strict HTML <table>
- [x] Add sticky top header with black background and white text
- [x] Columns: Date (15%), Event Description (40%), Source (15%), Persons (15%), Issues (15%)
- [x] Implement sortable columns
- [x] Add zebra striping (white and #f3f4f6)
- [x] Display Persons and Issues as small tags/chips inside cells
- [ ] Format Source as "Document Name - pg X" (need page numbers from extraction)

## Enhanced Upload View
- [x] Center upload box as high-tech dropzone
- [x] Add "Recent Uploads" list below dropzone
- [x] Show processing status for each file

## Multi-Select Filtering & Editable Issues
- [ ] Replace single-select dropdowns with multi-select
- [ ] Add "Filter by Person" multi-select
- [ ] Add "Filter by Issue" multi-select
- [ ] Make Issues field user-editable (inline or modal)
- [ ] Update filtering logic for multiple selections

## Updated Export
- [ ] Update PDF export for new table format
- [ ] Update Word export for new table format
- [ ] Include all visible columns in exports

## Debug Table Rendering Issue
- [x] Check if ChronologyTable component is loading correctly
- [x] Identified root cause: App.tsx was importing TimelineTable (old cards view) instead of ChronologyTable (new HTML table)
- [x] Fixed import to use ChronologyTable.tsx
- [x] Restarted server to clear import cache
- [x] Verified table HTML is rendering in DOM

## UI/UX Polish & Functional Refinement
- [x] Redesign navigation: remove black borders, use plain text links
- [x] Add hover effects (Dark Slate Blue #2C3E50)
- [x] Active state: bold text with thin black underline
- [x] Change table headers to solid black background (#000000) with white text (#FFFFFF)
- [x] Change all fonts to Inter (remove Agdasima, Merriweather)
- [x] Update tagline to "Build your case chronology instantly"
- [x] Remove "Legal" from "Legal Chronology" header
- [x] Rename menu items to "Upload Documents" and "View Chronology"
- [x] Fix nested anchor tag error in navigation

## Editable Columns with State Persistence
- [x] Add "Comments" column at far right of table
- [x] Make "Issues" column editable (text input or dropdown)
- [x] Make "Comments" column editable (text area)
- [x] Implement state persistence (edits survive sorting/filtering)
- [x] Save edits to database
- [x] Added userIssue and comments fields to database schema
- [x] Created updateFact function in db.ts
- [x] Added facts.update tRPC mutation
- [x] Implemented Textarea components with local state management

## Inline Table Header Filtering
- [x] Remove external filters section above table
- [x] Add filter icon to "Person" column header
- [x] Add filter icon to "Issue" column header
- [x] Implement dropdown checkbox list for Person filtering
- [x] Implement dropdown checkbox list for Issue filtering
- [x] Added click-outside detection to close dropdowns
- [x] Highlight filter icons when filters are active (blue color)
- [x] Show filtered count in header (e.g., "50 events (filtered from 100)")
- [x] Added "Clear all filters" button

## Smart Source Intelligence
- [x] Update AI extraction to generate Smart Title from document content
- [x] Display Smart Title (bold) in Source column
- [ ] Display page number below Smart Title (e.g., "Pg. 14")
- [x] Update LLM prompt to extract document type/title
- [x] Added documentTitle field to documents schema
- [x] Updated ExtractionResult interface to include documentTitle
- [x] Modified JSON schema to require documentTitle field
- [x] Created updateDocumentWithTitle function in db.ts
- [x] Updated ChronologyTable to display documentTitle with fallback to filename

## WYSIWYG Export Logic
- [x] Update PDF export to reflect filtered table view
- [x] Update Word export to reflect filtered table view
- [x] Include user-entered Issues text in exports
- [x] Include user-entered Comments text in exports
- [x] PDF export includes document title, generation date, and filtered event count
- [x] Word export uses proper table formatting with bold headers
- [x] Both exports use filteredAndSortedFacts to respect current filters
- [x] Both exports use getIssueValue() and getCommentValue() to include user edits
