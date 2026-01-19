# Chronos - AI Legal Timeline Builder

A production-ready web application that transforms legal documents into structured, interactive litigation timelines using AI-powered fact extraction.

## Overview

Chronos helps legal practitioners quickly organize case documents into chronological timelines with automatic fact extraction, categorization, and filtering capabilities. Built with modern web technologies and powered by LLM-based document analysis.

## Features

### Document Ingestion
- **Drag-and-drop file upload** interface with progress tracking
- **Multiple format support**: PDF, Word (.docx, .doc), and plain text files
- **Automatic text extraction** using PyPDF2 and python-docx
- **S3 storage integration** for secure document management
- **Real-time processing status** updates (pending, processing, completed, failed)

### AI-Powered Fact Extraction
- **LLM-based analysis** to identify dates, events, actors, and citations
- **Automatic date normalization** (e.g., "Jan 5th, '23" → "2023-01-05")
- **Intelligent summarization** (1-2 sentence fact descriptions)
- **Actor categorization** (people, companies, entities)
- **Issue classification** (legal issue categories)
- **Citation detection** for legal references

### Interactive Timeline Visualization
- **Chronological event display** using vis-timeline library
- **Filter by Actor** to focus on specific parties
- **Filter by Issue** to track legal categories
- **Real-time UI updates** when filters change
- **Zoom and pan controls** for timeline navigation
- **Hover tooltips** with full fact details

### Data Management
- **Searchable data table** with TanStack Table
- **Sortable columns** (Date, Summary, Actor, Issue, Citation)
- **Global search** across all fact fields
- **Pagination** (20 items per page)
- **CSV export** for spreadsheet analysis
- **Excel export** with formatted columns

### Professional UI/UX
- **Legal SaaS aesthetic** with professional color palette
- **Dark mode support** with theme toggle
- **Inter font** for clean typography
- **Subtle animations** and smooth transitions
- **Loading states** and skeleton screens
- **Empty states** with helpful guidance
- **Responsive design** for mobile, tablet, and desktop

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Shadcn/ui** component library
- **tRPC** for type-safe API calls
- **vis-timeline** for timeline visualization
- **TanStack Table** for data tables
- **react-dropzone** for file uploads
- **papaparse** for CSV export
- **xlsx** for Excel export

### Backend
- **Node.js** with Express
- **tRPC 11** for API layer
- **Python 3.11** for document processing
- **PyPDF** for PDF text extraction
- **python-docx** for Word document extraction
- **MySQL/TiDB** database with Drizzle ORM
- **AWS S3** for file storage
- **LLM integration** for fact extraction

### Development
- **Vite** for fast development builds
- **Vitest** for unit testing
- **TypeScript** for type safety
- **ESBuild** for production builds

## Getting Started

### Prerequisites
- Node.js 22.x or higher
- Python 3.11
- MySQL/TiDB database
- AWS S3 bucket (or compatible storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chronos
```

2. Install dependencies:
```bash
pnpm install
```

3. Install Python dependencies:
```bash
sudo pip3 install pypdf python-docx python-magic
```

4. Set up environment variables (automatically configured in Manus platform):
- `DATABASE_URL` - MySQL connection string
- `BUILT_IN_FORGE_API_KEY` - LLM API key
- `BUILT_IN_FORGE_API_URL` - LLM API endpoint
- S3 credentials (configured in storage module)

5. Push database schema:
```bash
pnpm db:push
```

6. Start development server:
```bash
pnpm dev
```

7. Run tests:
```bash
pnpm test
```

## Usage

### Uploading Documents

1. Navigate to the **Upload** tab
2. Drag and drop legal documents (PDF, DOCX, TXT) or click to browse
3. Files are automatically uploaded to S3 and queued for processing
4. Monitor processing status in the document list

### Viewing Timeline

1. Switch to the **Timeline** tab after documents are processed
2. Use filter controls to narrow by Actor or Issue
3. Zoom and pan to navigate the timeline
4. Click events for detailed information

### Exporting Data

1. Navigate to the **Data Table** tab
2. Use the search box to find specific facts
3. Click column headers to sort
4. Click **Export CSV** or **Export Excel** to download

## Architecture

### Document Processing Flow

1. **Upload**: User uploads document via drag-and-drop interface
2. **Storage**: File is uploaded to S3 and database record created
3. **Extraction**: Python script extracts text from PDF/DOCX/TXT
4. **Analysis**: LLM analyzes text to identify facts, dates, actors, issues
5. **Normalization**: Dates are normalized to ISO 8601 format
6. **Storage**: Extracted facts are saved to database
7. **Display**: Facts appear in timeline and data table

### Database Schema

- **users**: Authentication and user management
- **documents**: Uploaded document metadata and processing status
- **facts**: Extracted events with dates, summaries, and categorization
- **actors**: Actor categories for filtering
- **issues**: Issue categories for filtering

### API Endpoints (tRPC)

- `documents.upload` - Upload new document
- `documents.list` - List user's documents
- `documents.get` - Get document with facts
- `documents.delete` - Delete document and associated facts
- `facts.list` - List all user's facts
- `facts.filter` - Filter facts by actor/issue
- `actors.list` - List actor categories
- `issues.list` - List issue categories

## Testing

The application includes comprehensive Vitest tests:

- **documents.upload.test.ts** - Document upload validation
- **documents.list.test.ts** - Document listing and deletion
- **facts.list.test.ts** - Fact retrieval and filtering
- **auth.logout.test.ts** - Authentication flow

Run all tests:
```bash
pnpm test
```

## Deployment

The application is designed for deployment on the Manus platform with built-in:
- Database provisioning
- S3 storage configuration
- LLM API integration
- OAuth authentication
- Custom domain support

To deploy:
1. Create a checkpoint: Review changes in the UI
2. Click **Publish** button in the Management UI
3. Configure custom domain (optional)

## Performance Considerations

- **Async processing**: Document processing happens asynchronously to avoid blocking uploads
- **Pagination**: Data table uses pagination to handle large fact sets
- **Lazy loading**: Timeline items are rendered on-demand
- **Optimistic updates**: UI updates immediately for better UX
- **Caching**: tRPC queries are cached for faster navigation

## Security

- **Authentication required**: All endpoints require valid user session
- **User isolation**: Users can only access their own documents and facts
- **File validation**: Upload size limits and MIME type checking
- **SQL injection prevention**: Parameterized queries via Drizzle ORM
- **XSS protection**: Content sanitization in timeline rendering

## Future Enhancements

- Document detail view with highlighted facts
- Batch document upload
- Collaborative timeline sharing
- Export to PDF report format
- Advanced date range filtering
- Custom actor/issue management
- Document version tracking
- Audit trail for changes

## License

MIT

## Support

For issues or questions, please contact the development team or submit an issue in the repository.
