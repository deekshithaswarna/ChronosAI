import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Filter, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Home } from 'lucide-react';
import { Link } from 'wouter';
import jsPDF from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { saveAs } from 'file-saver';

export default function TimelineTable() {
  const { theme, toggleTheme } = useTheme();
  const [issueFilter, setIssueFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');

  // Fetch all facts
  const { data: allFacts = [], isLoading } = trpc.facts.list.useQuery();
  
  // Fetch unique actors for person filter
  const { data: actors = [] } = trpc.actors.list.useQuery();
  
  // Fetch unique issues for issue filter
  const { data: issues = [] } = trpc.issues.list.useQuery();

  // Filter facts based on selected filters
  const filteredFacts = allFacts.filter(fact => {
    if (personFilter !== 'all' && fact.actor !== personFilter) return false;
    if (issueFilter !== 'all' && fact.issue !== issueFilter) return false;
    // Type filter would need document type field - placeholder for now
    return true;
  });

  // Sort by event date (document date, not upload date)
  const sortedFacts = [...filteredFacts].sort((a, b) => {
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Legal Timeline - Document Chronology', margin, yPos);
    yPos += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy')}`, margin, yPos);
    yPos += 5;
    doc.text(`Total Events: ${sortedFacts.length}`, margin, yPos);
    yPos += 15;

    // Events
    sortedFacts.forEach((fact, index) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      // Date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(format(new Date(fact.eventDate), 'MMM dd, yyyy'), margin, yPos);
      yPos += 6;

      // Summary
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(fact.summary, pageWidth - 2 * margin);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 5;

      // Actor
      if (fact.actor) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Actor: ${fact.actor}`, margin, yPos);
        yPos += 5;
        doc.setTextColor(0, 0, 0);
      }

      yPos += 5; // Space between events
    });

    doc.save(`timeline-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExportWord = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: 'Legal Timeline - Document Chronology',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated: ${format(new Date(), 'MMM dd, yyyy')}`,
                  size: 20,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total Events: ${sortedFacts.length}`,
                  size: 20,
                }),
              ],
              spacing: { after: 400 },
            }),
            ...sortedFacts.flatMap((fact) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: format(new Date(fact.eventDate), 'MMM dd, yyyy'),
                    bold: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: fact.summary,
                    size: 22,
                  }),
                ],
                spacing: { after: 100 },
              }),
              ...(fact.actor
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Actor: ${fact.actor}`,
                          italics: true,
                          size: 20,
                          color: '666666',
                        }),
                      ],
                      spacing: { after: 200 },
                    }),
                  ]
                : []),
            ]),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `timeline-${format(new Date(), 'yyyy-MM-dd')}.docx`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Timeline</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Document chronology organized by event dates
                </p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 animate-fadeIn space-y-6">
        {/* Filters and Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue</label>
                <Select value={issueFilter} onValueChange={setIssueFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Issues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Issues</SelectItem>
                    {issues.map((issue) => (
                      <SelectItem key={issue.id} value={issue.name}>
                        {issue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="motion">Motion</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="brief">Brief</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Person</label>
                <Select value={personFilter} onValueChange={setPersonFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Persons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Persons</SelectItem>
                    {actors.map((actor) => (
                      <SelectItem key={actor.id} value={actor.name}>
                        {actor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button onClick={handleExportWord} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Word
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Chronology
              </span>
              <Badge variant="secondary">{sortedFacts.length} events</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading timeline...
              </div>
            ) : sortedFacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No events found. Upload documents to build your timeline.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {format(new Date(fact.eventDate), 'MMM dd, yyyy')}
                          </Badge>
                          {fact.originalDateText && fact.originalDateText !== format(new Date(fact.eventDate), 'yyyy-MM-dd') && (
                            <span className="text-xs text-muted-foreground">
                              ({fact.originalDateText})
                            </span>
                          )}
                        </div>

                        {/* Event Summary */}
                        <p className="text-sm font-medium">{fact.summary}</p>

                        {/* Actor */}
                        {fact.actor && (
                          <div className="flex items-center gap-2">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{fact.actor}</span>
                          </div>
                        )}

                        {/* Full Text (collapsible) */}
                        {fact.fullText && fact.fullText !== fact.summary && (
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground">
                              View full text
                            </summary>
                            <p className="mt-2 pl-4 border-l-2 border-border">{fact.fullText}</p>
                          </details>
                        )}
                      </div>

                      {/* Confidence Score */}
                      {fact.confidence && (
                        <Badge variant="secondary" className="shrink-0">
                          {Math.round(fact.confidence / 10)}/10
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
