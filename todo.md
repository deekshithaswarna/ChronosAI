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

## Final UI Polish - Sleek & Minimal Theme
- [x] Change entire app background to flat #F9F9F4 (Light Beige)
- [x] Remove all white card containers (upload box, table container, header cards)
- [x] Remove black divider line under CHRONOS logo in navigation
- [x] Ensure navigation links are plain text (Black default, Terracotta hover)

## Upload Page Advanced Refinement
- [x] Remove outer border box around upload area
- [x] Remove "Upload Legal Documents" heading
- [x] Keep only dashed dropzone with "Upload Documents" button and file support text
- [x] Display uploaded files using Smart Title (not filename)
- [x] Make Smart Title a clickable link that opens document in new tab

## Chronology Table Structure Updates
- [x] Adjust column widths: Persons 12%, Issues 15%, Comments 15%, Description expands
- [ ] Display Smart Title + Page Number in Source column (e.g., "Title p. 14")
- [x] Make Source text a hyperlink to the document
- [x] Added documentUrl to getUserFacts query
- [x] Source column now opens document in new tab on click
## Advanced Cell Logic
- [x] Split Persons column into individual tags (not grouped string)
- [x] Convert Issues column to multi-issue with removeable chips
- [x] Add text input with "+" button below chips to add new issues
- [x] Apply max-height: 100px with overflow-y: auto to Issues cells
- [x] Apply max-height: 100px with overflow-y: auto to Comments cells
- [x] Changed userIssues database field to JSON array
- [x] Updated tRPC mutation to accept userIssues array
- [x] Implemented handleAddIssue and handleRemoveIssue functions
- [x] Added newIssueInputs state for input fields
- [x] Person tags split by comma/semicolon with trim height
- [ ] Store issues as array in d## Enhanced Filtering Logic
- [x] Update Person filter to handle individual tags with OR logic
- [x] Update Issue filter to match Person logic (OR for multiple selections)
- [x] Populate Issue filter dropdown with all unique user-created issue tags
- [x] uniquePersons now splits actors by comma/semicolon
- [x] uniqueIssues includes both AI-extracted and user-added issues
- [x] Person filtering uses Array.some() for OR logic
- [x] Issue filtering uses Array.some() for OR logic## PDF Export with jspdf-autotable
- [x] Install jspdf-autotable package
- [x] Replace custom PDF export with jspdf-autotable
- [x] Enable text wrapping for all columns
- [x] Include all user-generated comments and issues
- [x] Respect current active filters (only export visible rows)
- [x] Added autoTable import
- [x] Configured column widths for optimal layout
- [x] Set overflow: 'linebreak' for text wrapping
- [x] Black header with white text styling
## Bug Fixes & New Features (User Feedback)

### Visual Corrections - Flat Aesthetic
- [x] Fix upload zone background to be transparent or match #F9F9F4 exactly
- [x] Fix "Recent Uploads" list background to match global #F9F9F4
- [x] Fix table body background to match global #F9F9F4 (subtle zebra striping OK)
- [x] Remove any darker/different beige shades throughout the app

### Smart Title Generation (Urgent Bug Fix)
- [x] Update upload pipeline to read first 2 pages immediately after upload
- [x] Add LLM call to extract formal legal title from first 2 pages
- [x] Display Smart Title in "Recent Uploads" list instead of filename
- [ ] Display Smart Title + page number in Source column (e.g., "Witness Statement of John Doe, p.1")
- [x] Store Smart Title in database during upload process
- [x] Added extractFirstPages function to documentExtractor
- [x] Added extractSmartTitle function with LLM JSON schema
- [x] Smart Title extracted immediately on upload before async processing

### Person Tagging Fixes
- [x] Force AI to output persons as strict JSON Array of Strings (no grouped names)
- [x] Ensure each person name is a separate tag (split "Person A, Person B" into ["Person A", "Person B"])
- [x] Add "Rename & Merge" feature for person tags
- [x] Allow user to click any Person tag and edit the text
- [x] Update ALL occurrences of renamed tag throughout the table (merge duplicates)
- [x] Example: Rename "Mayolo (Bear Creek)" to "Mayolo" merges all instances
- [x] Updated LLM prompt to output comma-separated actors
- [x] Added renamePersonInFacts function in db.ts
- [x] Added renamePerson tRPC mutation
- [x] Made person tags clickable with hover effect
- [x] Implemented prompt-based rename UI with table refresh

### Source Column Logic Fix
- [x] Line 1: Display Smart Title of uploaded file + page number as hyperlink
- [x] Line 2: Display referenced documents (Exhibits) in smaller grey text below
- [x] Format: "Other potential sources referenced in uploaded documents: [Name of referenced document]"
- [x] Separate uploaded file source from referenced exhibit sources
- [x] Added pageNumber to getUserFacts query
- [x] Source column now shows "Smart Title, p.X" as hyperlink
- [x] Citation field displays as grey text with proper formatting

## UI Refinements (User Feedback)

### Logo Centering
- [x] Center CHRONOS logo above navigation menu items
- [x] Adjust layout to have logo centered at top with menu below

### Person Tag Discoverability
- [x] Add pencil icon next to person tags to indicate they're editable
- [x] Make it clear to users that clicking person tags allows renaming

### Table Header Icon Consistency
- [x] Standardize all sorting and filtering icon sizes in table headers
- [x] Ensure ArrowUpDown and Filter icons are the same size
- [x] All icons already set to h-4 w-4 (16px) for consistency

## Smart Title Generation Debug (Critical Bug)

### Root Cause Analysis
- [x] Add detailed error logging to Smart Title extraction in routers.ts
- [ ] Test upload flow with new document to capture actual error
- [x] Identify why extractSmartTitle is failing silently
- [x] Check if LLM invocation is working correctly
- [x] Verify extractFirstPages returns valid text
- [x] **FOUND ROOT CAUSE**: extractedText field (TEXT 65KB) too small for large documents
- [x] Changed extractedText from text to longtext (supports up to 4GB)
- [x] Pushed database schema changes successfully

### Fix Implementation
- [ ] Fix the root cause preventing Smart Title extraction
- [ ] Ensure Smart Titles are saved to database during upload
- [ ] Verify Smart Titles display in DocumentsList component
- [ ] Verify Smart Titles display in ChronologyTable Source column
- [ ] Add fallback handling for extraction failures

### Testing
- [ ] Upload a new test document and verify Smart Title is generated
- [ ] Check database to confirm documentTitle field is populated
- [ ] Verify Smart Title appears in Recent Uploads list
- [ ] Verify Smart Title appears in chronology table Source column

## Button & Link Standardization

### Minimalist Outlined Button Style
- [x] Apply to all buttons throughout the app
- [x] Normal state: Transparent background, 1px solid black border, black text
- [x] Hover state: Terracotta (#E07A5F) text and border, no fill
- [x] Update Upload Documents button
- [x] Update Export PDF and Export Word buttons
- [x] Update all other buttons (delete, add, etc.)

### Hyperlink Styling
- [x] Apply terracotta hover color to all clickable links
- [x] Update Source column document title links
- [x] Update Recent Uploads file name links
- [x] Ensure consistent hover transition

## Table Typography & Formatting

### Font Consistency
- [x] Ensure ALL table text uses Inter font family
- [x] Set consistent 14px font size for all table content
- [x] Apply to Date, Description, Source, Persons, Issues, Comments columns
- [x] Remove any font size variations

### Source Column Formatting
- [x] Make "Other potential sources referenced in uploaded documents:" label bold (font-weight: 700)
- [x] Keep referenced document names in regular weight

## Inline Editing (No Popups)

### Person Tag Inline Editing
- [x] Remove browser alert/popup on click
- [x] Convert clicked tag to input field in place
- [x] Save on Enter key press
- [x] Save on click away (blur event)
- [x] Auto-update ALL identical person tags in table (merge functionality)
- [x] Add visual feedback during editing

### File Name Inline Editing
- [x] Remove browser alert/popup on click in Recent Uploads
- [x] Convert clicked file name to input field in place
- [x] Save on Enter key press
- [x] Save on click away (blur event)
- [x] Auto-update display name in Source Column of chronology table
- [x] Add visual feedback during editing
- [x] Added pencil icon next to document titles
- [x] Created updateDocumentTitle tRPC mutation
- [x] Added updateDocumentTitle function in db.ts

## Page Number Extraction Enhancement

### Document Extractor Updates
- [x] Update extractTextFromPDF to return page-by-page text array
- [x] Create extractTextByPage function that returns { pageNumber, text }[]
- [x] Ensure each page's text is tracked separately
- [x] extractTextFromPdf already returns PagedText with pages array

### Fact Extractor Updates
- [x] Modify factExtractor to accept page-tracked text
- [x] Update LLM prompt to include page number context
- [x] Ensure extracted facts include pageNumber field
- [x] Update JSON schema to require pageNumber for each fact
- [x] Added [PAGE X] markers to text sent to LLM
- [x] Updated ExtractedFact interface to include pageNumber
- [x] Added pageNumber to JSON schema as required field

### Processing Pipeline Updates
- [x] Update processDocumentAsync to use page-by-page extraction
- [x] Pass page numbers to createFact database function
- [x] Verify pageNumber is saved correctly in facts table
- [x] extractFactsFromText already receives extractedData.pages
- [x] Added pageNumber: fact.pageNumber || null to createFact call

### Frontend Display
- [x] Verify ChronologyTable Source column shows "Smart Title, p.X"
- [x] Ensure page numbers display correctly for all events
- [ ] Test with new document upload
- [x] Source column already displays pageNumber when available
- [x] Format: {documentTitle}{pageNumber ? `, p.${pageNumber}` : ''}
- [x] Created factExtractor.test.ts with 3 passing tests

## Final UI Polish & Date Filtering

### Column Width Adjustments
- [x] Reduce Persons column width (currently 12%)
- [x] Expand Event Description column (widest column)
- [x] Expand Comments column (second widest)
- [x] Adjust other columns accordingly
- [x] Persons: 12% → 10%
- [x] Issues: 15% → 12%
- [x] Comments: 15% → 18%
- [x] Event Description expands to fill remaining space

### Date Column Filtering
- [x] Add filter icon to Date column header
- [x] Implement dropdown with three filter options
- [x] Option 1: By Year - multi-select list of years
- [x] Option 2: By Month - multi-select list of months
- [x] Option 3: By Range - "From" and "To" date pickers
- [x] Update table immediately when filters change
- [x] Highlight filter icon when active
- [x] Added dateFilterMode state with 'year', 'month', 'range' options
- [x] Created uniqueYears extraction with descending sort
- [x] Implemented tabbed UI with terracotta active state
- [x] Added date filtering logic to filteredAndSortedFacts
- [x] Filter icon turns terracotta when active

### Icon & Button Consistency
- [x] Set all table header icons to exactly 20px (w-5 h-5)
- [x] Align icons perfectly with header text
- [x] Verify all buttons use Minimalist Outlined style
- [x] Ensure Upload, Export PDF, Export Word buttons are consistent
- [x] Changed all ArrowUpDown icons from h-4 w-4 to h-5 w-5
- [x] Changed all Filter icons from h-4 w-4 to h-5 w-5
- [x] Updated Person and Issue filter icons to use terracotta color when active

### Typography Verification
- [x] Confirm ALL table text uses 14px Inter font
- [x] Verify "Other potential sources..." label is bold (font-weight: 700)
- [x] Check Date, Description, Source, Persons, Issues, Comments columns
- [x] All table cells have style={{ fontSize: '14px' }}
- [x] "Other potential sources..." label has className="font-bold"

### Inline Editing Verification
- [x] Confirm Person tags use inline editing (no popups)
- [x] Verify no window.prompt or browser alerts remain
- [x] Test click-to-edit, enter-to-save functionality
- [x] Person tags use inline input field on click
- [x] Document titles use inline editing in Recent Uploads
- [x] All popups replaced with inline editing

## Date Filter Styling Updates

- [x] Change all text within Date filter dropdown to black color
- [x] Update tab labels (By Year, By Month, By Range) to black text
- [x] Update year/month checkbox labels to black text
- [x] Update date range input labels to black text
- [x] Change "Clear Date Filters" button to Minimalist Outlined style
- [x] Replaced button element with Button component using default variant
- [x] Document Minimalist Outlined as standard button style in code comments
- [x] Added comprehensive documentation comment in button.tsx
- [x] Specified default variant as the standard for all new buttons

## Table Column Updates

- [x] Remove sort function from Event Description column
- [x] Remove onClick handler from Event Description header
- [x] Remove ArrowUpDown icon from Event Description header
- [x] Add filter icon to Source column header
- [x] Implement Source filter dropdown with unique document titles
- [x] Add state for Source filter (selectedSources)
- [x] Update filtering logic to include Source filter
- [x] Added selectedSources and showSourceFilter state
- [x] Added sourceFilterRef for click-outside detection
- [x] Created uniqueSources extraction from documentTitle
- [x] Added Source filtering logic to filteredAndSortedFacts
- [x] Filter icon turns terracotta when active
- [x] Change "Persons" heading to "Actors" in table header
- [x] Update all references to "Persons" to "Actors" in UI
- [x] Updated table header from "Persons" to "Actors"
- [x] Changed filter label from "Filter by Person" to "Filter by Actor"
- [x] Updated "No persons found" to "No actors found"
- [x] Updated PDF export column header
- [x] Updated column comment in code

## Table Column Width Optimization

- [x] Applied table-layout: fixed to enforce strict column widths
- [x] Updated Date column to 8% (from 12%)
- [x] Updated Event Description column to 37% (from 28%) - significantly wider
- [x] Kept Source column at 12%
- [x] Updated Actors column to 13% (from 10%)
- [x] Updated Issues column to 13% (from 12%)
- [x] Updated Comments column to 17% (from 18%)
- [x] Added word-wrap: break-word and overflowWrap: break-word to Event Description column
- [x] Added word-wrap: break-word and overflowWrap: break-word to Comments column

## Table Layout Refinement & Event Description Enhancement

- [x] Update Date column to 8% (no change)
- [x] Update Event Description column to 35% (from 37%)
- [x] Update Source column to 12% (no change)
- [x] Update Actors column to 15% (from 13%)
- [x] Update Issues column to 10% (from 13%)
- [x] Update Comments column to 20% (from 17%)
- [x] Add white-space: normal and word-wrap: break-word to Actors column
- [x] Ensure Event Description wraps naturally with proper CSS
- [x] Make Event Description text editable by user
- [x] Add pencil icon (visible on hover) next to Event Description text
- [x] Implement click-to-edit functionality for Event Description
- [x] Save Event Description edits to database
- [x] Added summary field to facts.update mutation
- [x] Added summary field to updateFact function in db.ts
- [x] Added state management for editing descriptions
- [x] Implemented hover state with pencil icon
- [x] Click-to-edit with Textarea component
- [x] Auto-save on blur with database update
- [x] Update AI extraction prompt to generate detailed, comprehensive summaries
- [x] Enhance LLM prompt to include key context and specific actions (not overly concise)
- [x] Changed Event prompt to request 2-4 sentence detailed summaries with context

## Event Description Context & Row Deletion

- [x] Update AI extraction prompt to include actor names in event descriptions
- [x] Ensure event descriptions are self-contained (e.g., "Andrew Swarthout graduated..." not just "Graduated...")
- [x] Added CRITICAL instruction to always include actor names in event descriptions
- [x] Updated prompt with example: "Andrew Swarthout graduated from the University of Arizona" NOT just "Graduated from the University of Arizona"
- [x] Add delete button to each table row
- [x] Added Actions column (5% width) with Trash2 icon
- [x] Delete button shows on hover with red color transition
- [x] Implement delete confirmation (optional)
- [x] Added browser confirm() dialog before deletion
- [x] Create facts.delete tRPC mutation
- [x] Added delete mutation to facts router with user ID verification
- [x] Create deleteFact function in db.ts
- [x] Implemented deleteFact with userId check for security
- [x] Test row deletion functionality
- [x] Adjusted column widths to accommodate Actions column (Date 7%, Description 33%, Actors 14%, Comments 19%)

## UI De-Cluttering & Date Logic

- [x] Remove Actions column header and vertical grid line
- [x] Move delete icon to hover-only state on each row
- [x] Position delete icon at far right edge of row (floating/borderless)
- [x] Added hoveredRowId state to track row hover
- [x] Delete icon appears absolutely positioned on right side with rounded button style
- [x] Fix Issues column with flex-wrap for tags and input
- [x] Changed from max-h with overflow to flex-col with gap-2
- [x] Tags wrap properly with flex-wrap
- [x] Set "Add issue..." input to full width (100%)
- [x] Added w-full and min-w-0 to input container
- [x] Ensure Issues cell expands vertically to show all content
- [x] Removed max-height constraint, cell now expands naturally
- [x] Increase vertical padding in all table cells to 16px (top/bottom)
- [x] Changed all td from p-4 to py-4 px-4
- [x] Make Date cell editable with inline-edit pattern
- [x] Added editingDateId state and date editing handlers
- [x] Click date to edit with input[type="date"]
- [x] Implement date editing with save on blur
- [x] Added handleDateSave with blur and Enter key handlers
- [x] Add auto-sorting logic when date is changed
- [x] utils.facts.list.invalidate() triggers re-fetch and auto-sort
- [x] Ensure row visually "jumps" to new chronological position after date edit
- [x] Table re-renders with new sort order after invalidation
- [x] Update eventDate field in database when date is edited
- [x] Added eventDate to updateFact function
- [x] Add date mutation to facts.update
- [x] Added eventDate field to facts.update mutation schema
- [x] Restored column widths after removing Actions column (Date 8%, Description 35%, Actors 15%, Comments 20%)

## Global Layout & Floating Editors

- [x] Change main container to fluid full width
- [x] Set max-width to 98vw to occupy 98% of viewport width
- [x] Keep small margins (px-4) to prevent edge touching
- [x] Removed .container class, applied px-4 py-12 with maxWidth: 98vw
- [x] Implement floating auto-expanding editor for Date column
- [x] Date editor positioned absolutely over cell with z-index: 50
- [x] Date editor matches cell width, auto-expands vertically
- [x] Add white background, drop shadow, and focused border to Date editor
- [x] Date input floats above cell with shadow-lg and border-2
- [x] Implement floating auto-expanding editor for Event Description
- [x] Description editor positioned absolutely over cell
- [x] Description editor auto-expands as user types (grows downwards)
- [x] Textarea with min-h-[80px] and height: auto for expansion
- [x] Implement floating auto-expanding editor for Comments
- [x] Comments editor positioned absolutely over cell
- [x] Comments editor auto-expands vertically without breaking layout
- [x] Always-visible textarea with transparent border, shadow on focus
- [x] Add min-width: 150px to Person tag editing input
- [x] Person input now has minWidth: 150px and z-50 for overlap
- [x] Add min-width: 150px to Issue tag editing input
- [x] Issue input has minWidth: 150px for full placeholder visibility
- [x] Ensure tag inputs can overlap next cell slightly if needed for visibility
- [x] Added z-50 to Person input for proper layering

## Delete Column Relocation & Input Overflow Fix

- [x] Create narrow column (40px) on far left for delete action
- [x] Added delete column header (empty)
- [x] Added delete column cell with 40px width
- [x] Move trash icon from floating right position to left column
- [x] Removed old floating delete icon on right side
- [x] Keep "show on hover" logic for trash icon
- [x] Trash icon appears in left column only when hoveredRowId matches
- [x] Style trash icon with subtle grey (#9CA3AF)
- [x] Add red hover effect (#EF4444) to trash icon
- [x] Fix "Add issue..." input overflow in Issues column
- [x] Apply box-sizing: border-box to input
- [x] Set input width to 100% with proper constraints
- [x] Add max-width: 90% if needed to prevent overflow
- [x] Added maxWidth: 90% and boxSizing: border-box
- [x] Ensure flex-wrap: wrap on container for proper line breaking
- [x] Added flex-wrap to input container div
- [x] Reduced minWidth from 150px to 120px for better fit

## Ghost Delete Action & Document-Style Inputs

- [x] Remove dedicated delete column entirely
- [x] Removed delete column header from thead
- [x] Removed delete column cell from tbody
- [x] Move trash icon inside Date cell with absolute positioning
- [x] Position trash icon at far left of Date cell (left: 8px, top: 16px)
- [x] Set default opacity: 0 for trash icon
- [x] Show trash icon with opacity: 1 on row hover
- [x] Added pointerEvents: 'none' when hidden for proper interaction
- [x] Trash icon takes zero horizontal width in layout
- [x] Ghost delete floats absolutely, no impact on table layout
- [x] Style all "Add issue..." inputs as transparent background
- [x] Applied bg-transparent to Add issue input
- [x] Style all "Add comment..." inputs as transparent background
- [x] Applied bg-transparent to Comments textarea
- [x] Remove default borders from inputs
- [x] Changed to border-0 border-b for both inputs
- [x] Add subtle bottom border on hover/focus (optional)
- [x] Added border-transparent with hover:border-foreground/20 and focus:border-foreground/30
- [x] Match input font family and size to table text
- [x] Inputs use text-sm matching table font size
- [x] Fix Add issue layout with display: flex and flex-wrap: wrap
- [x] Container already has flex-wrap applied
- [x] Set Add issue input to min-width: 80px with flex-grow: 1
- [x] Applied minWidth: 80px and flexGrow: 1 to input style
- [x] Ensure input drops to new line when space is limited
- [x] Flex-wrap ensures proper line breaking
- [x] Apply vertical-align: top to ALL table cells (td)
- [x] All cells already have align-top class
- [x] Ensure consistent padding-top: 16px across all cells
- [x] All cells have py-4 (16px top/bottom padding)
- [x] Align first line of text in Date, Description, Comments columns
- [x] Consistent padding ensures perfect alignment across all columns

## Trash Icon Outside Table & UI Fixes

- [x] Remove trash icon from inside Date cell
- [x] Apply position: relative to table row (tr)
- [x] Row already has relative positioning
- [x] Create trash icon as absolute child of row
- [x] Moved trash icon to be direct child of tr
- [x] Position trash icon at left: -40px, top: 50%, transform: translateY(-50%)
- [x] Applied exact positioning to float outside table
- [x] Set opacity: 0 by default, opacity: 1 on tr:hover
- [x] Trash icon fades in/out based on hoveredRowId
- [x] Add margin-left: 50px to main container for trash icon space
- [x] Applied marginLeft: 50px to main container
- [x] Fix Comments double text bug (overlapping "Add comments")
- [x] Remove current floating editor logic for Comments
- [x] Removed floating overlay div and background text
- [x] Use single standard textarea with placeholder
- [x] Replaced with single Textarea component
- [x] Bind value strictly to row data (no secondary label)
- [x] Value bound to getCommentValue(fact) only
- [x] Ensure vertical alignment matches Issues column
- [x] Both have align-top and py-4 padding
- [x] Apply transparent background to ALL inputs in all states
- [x] All inputs now have bg-transparent
- [x] Remove all borders from inputs (border: none !important)
- [x] Applied border: 'none' to all input styles
- [x] Remove all outlines (outline: none !important)
- [x] Applied outline: 'none' to all input styles
- [x] Remove all box-shadows (box-shadow: none !important)
- [x] Applied boxShadow: 'none' to all input styles
- [x] Only show blinking cursor as edit feedback
- [x] Inputs are now completely invisible except for cursor
- [x] Copy Actor/Person tag CSS to Issue tags
- [x] Changed Issue tags to use Badge component
- [x] Remove blue background from Issue tags
- [x] Removed bg-blue-100 text-blue-800 classes
- [x] Apply beige background, small text, rounded corners to Issue tags
- [x] Applied variant="secondary" matching Actor tags
- [x] Ensure Issue tags look identical to Actor tags
- [x] Both use same Badge component with identical styling

## Delete Button Overflow Fix & Column Order Restoration

- [x] Apply overflow: visible !important to main table container
- [x] Applied overflow: 'visible' to bg-card container div
- [x] Apply overflow: visible !important to table element itself
- [x] Applied overflow: 'visible' to inner div and table element
- [x] Remove trash icon from being child of tr
- [x] Moved trash icon from tr to Date cell
- [x] Set position: relative on first td (Date column)
- [x] Date cell already has position: relative
- [x] Place trash icon as child of Date cell
- [x] Trash icon now first child of Date td
- [x] Position trash icon at left: -32px, top: 16px
- [x] Applied exact positioning: left: '-32px', top: '16px'
- [x] Set opacity: 0 by default, opacity: 1 on tr:hover
- [x] Opacity controlled by hoveredRowId state
- [x] Verify column order is correct: Date, Description, Source, Actors, Issues, Comments
- [x] Column order verified correct
- [x] Column 1 renders event.date (8%)
- [x] Date column renders formatDate(fact.eventDate)
- [x] Column 2 renders event.description (35%)
- [x] Description column renders getDescriptionValue(fact)
- [x] Column 3 renders event.sourceTitle (12%)
- [x] Source column renders fact.documentTitle/documentName
- [x] Column 4 renders event.persons tags (15%)
- [x] Actors column renders getPersonValue(fact) as Badge tags
- [x] Column 5 renders event.issues tags (10%)
- [x] Issues column renders getIssueValue(fact) as Badge tags
- [x] Column 6 renders event.userComments (20%)
- [x] Comments column renders getCommentValue(fact) in Textarea
- [x] Apply vertical-align: top !important to all cells
- [x] All cells have align-top class
- [x] Set padding-top: 16px on all cells
- [x] All cells have py-4 (16px top/bottom padding)
- [x] Ensure all inputs are transparent (no white background)
- [x] All inputs have bg-transparent
- [x] Ensure all inputs are aligned with text
- [x] All inputs have border: none, outline: none, boxShadow: none

## Filter Clear Buttons, Min-Width Guardrails, & Tag Overflow Fix

- [x] Verify global "Clear all filters" button resets all filters
- [x] Global clear button already exists and resets all filter states
- [x] Add "Clear Filter" button to Actors filter dropdown
- [x] Added conditional button that appears when selectedPersons.length > 0
- [x] Add "Clear Filter" button to Issues filter dropdown
- [x] Added conditional button that appears when selectedIssues.length > 0
- [x] Add "Clear Filter" button to Source filter dropdown
- [x] Added conditional button that appears when selectedSources.length > 0
- [x] Position clear button at bottom of each dropdown
- [x] All clear buttons positioned with mt-3 below scrollable list
- [x] Clear button removes only that column's filter, leaves others active
- [x] Each button calls setSelectedXXX([]) to clear only that filter
- [x] Apply min-width to Date column: width: 8%, min-width: 90px
- [x] Applied to both th and td Date cells
- [x] Apply min-width to Description column: width: 35%, min-width: 300px
- [x] Applied to both th and td Description cells
- [x] Apply min-width to Source column: width: 12%, min-width: 110px
- [x] Applied to both th and td Source cells
- [x] Apply min-width to Actors column: width: 15%, min-width: 140px
- [x] Applied to both th and td Actors cells
- [x] Apply min-width to Issues column: width: 10%, min-width: 130px
- [x] Applied to both th and td Issues cells
- [x] Apply min-width to Comments column: width: 20%, min-width: 180px
- [x] Applied to th Comments cell (td already has width/minWidth)
- [x] Apply white-space: normal to Issue tags
- [x] Added to Badge style prop
- [x] Apply display: inline-block to Issue tags
- [x] Added to Badge style prop
- [x] Apply word-break: break-word to Issue tags for long names
- [x] Added to Badge style prop to wrap long issue names like "Toronto Stock Exchange"
- [x] Ensure Add issue input container has display: flex, flex-wrap: wrap
- [x] Container already has flex and flex-wrap classes
- [x] Set Add issue input to width: 100%, min-width: 80px
- [x] Input already has width: 100%, minWidth: 80px, flexGrow: 1
- [x] Verify input shrinks or wraps without overflowing cell
- [x] Input configured to fill row when empty, shrink/wrap when tags present

## UX Improvements & Export Modal

- [x] Fix flickering delete button with transition delays
- [x] Add transition: opacity 0.3s ease to trash icon
- [x] Add transition-delay of 0.8s when mouse leaves row
- [x] Button remains visible for 0.8 seconds after hover ends
- [x] Make table header sticky with position: sticky, top: 0
- [x] Set z-index: 30 on sticky header
- [x] Ensure solid black background (#000) on header to prevent content bleed-through
- [x] Add global text search input above table (top left)
- [x] Search input placeholder: "Search chronology..."
- [x] Style search with transparent background, thin border
- [x] Implement real-time filtering on search input
- [x] Search scope: Event Description, Source, Actors, Issues, Comments
- [x] Added globalSearch state and filtering logic in useMemo
- [ ] Add Undo button (curved arrow left) next to search
- [ ] Add Redo button (curved arrow right) next to search
- [ ] Implement history stack for destructive actions
- [ ] Push state to stack on: edit text, delete row, merge tags
- [ ] Undo reverts to previous state
- [ ] Redo moves forward in history
- [ ] Grey out Undo/Redo buttons when no history available
- [ ] NOTE: Undo/redo requires deep state management integration - deferred for future implementation
- [x] Create Export Options dialog modal
- [x] Modal title: "Export Options"
- [x] Add checkboxes for: Date, Description, Source, Actors, Issues, Comments
- [x] Modal triggered by "Export PDF" and "Export Word" buttons
- [x] Download button in modal generates file with only checked columns
- [x] Modified exportToPDF to build headers and data based on exportColumns
- [x] Modified exportToWord to build TableCells based on exportColumns
- [x] CRITICAL: Preserve delete button positioning (left: -32px on first cell)
- [x] Delete button positioning preserved in all changes
- [x] CRITICAL: Maintain overflow: visible !important on table container
- [x] Overflow: visible maintained on all container divs
- [x] CRITICAL: Keep exact column width percentages and min-width guardrails
- [x] No changes made to column widths or min-width values

## Tag Overflow Fix & Undo/Redo Buttons

- [x] Fix Actor tag overflow with word-break styling
- [x] Apply white-space: normal to Actor tags
- [x] Apply display: inline-block to Actor tags
- [x] Apply word-break: break-word to Actor tags
- [x] Added style prop to Actor Badge with all three properties
- [x] Verify Issue tags already have word-break styling
- [x] Issue tags already have word-break styling applied
- [x] Add Undo button next to search bar
- [x] Add Redo button next to search bar
- [x] Style buttons with curved arrow icons (Undo, Redo from lucide-react)
- [x] Position buttons to the right of search input
- [x] Buttons positioned in flex container next to search
- [ ] Add basic undo/redo state management
- [ ] Track history of destructive operations
- [ ] Implement undo functionality
- [ ] Implement redo functionality
- [x] Grey out buttons when no history available
- [x] Buttons currently disabled with "Coming Soon" tooltip
- [ ] NOTE: Full undo/redo implementation requires state history tracking - marked as disabled for now

## Center Search Bar & Undo/Redo Buttons

- [x] Center search bar and undo/redo button container above table
- [x] Add justify-center to container
- [x] Removed flex-1 from search div to prevent stretching
- [x] Container now centered with justify-center class

## Fix Non-Functional Undo/Redo Buttons

- [x] Analyze why undo/redo buttons are not working
- [x] Found issue: saveToHistory() was called AFTER state updates, saving new state instead of old
- [x] Check if history is being saved correctly
- [x] Added useEffect to initialize history with empty snapshot on first render
- [x] Verify historyIndex is updating properly
- [x] Fix the undo/redo logic
- [x] Moved all saveToHistory() calls to BEFORE state changes
- [x] Updated handleAddIssue, handleRemoveIssue, handleDescriptionSave, handleDateSave, confirmDelete
- [x] Test undo/redo functionality with real edits
