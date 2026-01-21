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
      {/* Upload Section - No container */}
      <section className="mb-12">
        <FileUpload onUploadComplete={handleUploadComplete} />
      </section>

      {/* Recent Uploads Section */}
      <section>
        <h2 className="text-2xl font-bold heading mb-6">Recent Uploads</h2>
        <DocumentsList key={refreshKey} />
      </section>
    </div>
  );
}
