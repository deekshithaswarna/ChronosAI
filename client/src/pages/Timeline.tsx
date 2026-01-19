import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DocumentsList } from '@/components/DocumentsList';
import { TimelineView } from '@/components/TimelineView';
import { TimelineFilters } from '@/components/TimelineFilters';
import { FactsTable } from '@/components/FactsTable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Clock, Table } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function Timeline() {
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [issueFilter, setIssueFilter] = useState<string>('all');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between animate-fadeIn">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Chronos</h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-Powered Legal Timeline Builder
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 animate-fadeIn">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <Table className="h-4 w-4" />
              Data Table
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Upload Documents</h2>
              <p className="text-muted-foreground">
                Upload legal documents to extract facts and build your chronology
              </p>
            </div>
            
            <FileUpload onUploadComplete={() => {
              // Optionally switch to timeline view after upload
            }} />

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Your Documents</h3>
              <DocumentsList />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Interactive Timeline</h2>
              <p className="text-muted-foreground">
                View and filter extracted facts chronologically
              </p>
            </div>
            
            <TimelineFilters
              actorFilter={actorFilter}
              issueFilter={issueFilter}
              onActorChange={setActorFilter}
              onIssueChange={setIssueFilter}
            />
            
            <TimelineView actorFilter={actorFilter} issueFilter={issueFilter} />
          </TabsContent>

          <TabsContent value="table" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Data Table</h2>
              <p className="text-muted-foreground">
                Search, sort, and export your chronology data
              </p>
            </div>
            
            <FactsTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
