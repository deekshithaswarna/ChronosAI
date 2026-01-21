import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DocumentsList } from '@/components/DocumentsList';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { Link } from 'wouter';

export default function Timeline() {

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold heading">Chronos</h1>
              <p className="text-sm text-muted-foreground mt-1 font-sans">
                Legal Document Analysis Tool
              </p>
            </div>
            <Link href="/timeline">
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                View Chronology
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 animate-fadeIn space-y-8">
        {/* Upload Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Upload Documents</h2>
            <p className="text-muted-foreground">
              Upload legal documents to extract facts and build your chronology
            </p>
          </div>
          
          <FileUpload onUploadComplete={() => {
            // Document uploaded successfully
          }} />
        </section>

        {/* Documents List Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Your Documents</h2>
            <p className="text-muted-foreground">
              Manage uploaded documents and view processing status
            </p>
          </div>
          
          <DocumentsList />
        </section>
      </main>
    </div>
  );
}
