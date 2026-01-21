import { FileUpload } from '@/components/FileUpload';
import { DocumentsList } from '@/components/DocumentsList';
import { useState } from 'react';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container py-12 max-w-6xl">
      {/* Upload Section - Centered with white card */}
      <section className="mb-12">
        <div className="bg-card rounded-lg shadow-md p-8 border border-foreground/10">
          <h2 className="text-2xl font-bold heading mb-2">Upload Legal Documents</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Upload PDF, Word, or text files to generate a structured chronology
          </p>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>
      </section>

      {/* Recent Uploads Section */}
      <section>
        <div className="bg-card rounded-lg shadow-md p-8 border border-foreground/10">
          <h2 className="text-2xl font-bold heading mb-6">Recent Uploads</h2>
          <DocumentsList key={refreshKey} />
        </div>
      </section>
    </div>
  );
}
