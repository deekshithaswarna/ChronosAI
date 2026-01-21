import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { ArrowUpDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type SortField = 'date' | 'event' | 'source';
type SortDirection = 'asc' | 'desc';

export default function ChronologyTable() {
  const { data: facts, isLoading } = trpc.facts.list.useQuery();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sort facts
  const sortedFacts = useMemo(() => {
    if (!facts) return [];
    
    return [...facts].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'date') {
        comparison = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      } else if (sortField === 'event') {
        comparison = a.summary.localeCompare(b.summary);
      } else if (sortField === 'source') {
        comparison = (a.documentName || '').localeCompare(b.documentName || '');
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [facts, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="bg-card rounded-lg shadow-md p-8 border border-foreground/10">
          <p className="text-center text-muted-foreground">Loading chronology...</p>
        </div>
      </div>
    );
  }

  if (!facts || facts.length === 0) {
    return (
      <div className="container py-12">
        <div className="bg-card rounded-lg shadow-md p-8 border border-foreground/10">
          <p className="text-center text-muted-foreground">
            No events found. Upload documents to generate a chronology.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      {/* Header with Export Buttons */}
      <div className="bg-card rounded-lg shadow-md p-6 border border-foreground/10 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold heading">Legal Chronology</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sortedFacts.length} events extracted from {new Set(sortedFacts.map(f => f.documentName || 'Unknown')).size} documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Word
            </Button>
          </div>
        </div>
      </div>

      {/* Strict HTML Table */}
      <div className="bg-card rounded-lg shadow-md border border-foreground/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse legal-table">
            {/* Sticky Header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-foreground text-background">
                <th 
                  className="w-[15%] p-4 text-left font-bold heading cursor-pointer hover:bg-foreground/90 transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="w-[40%] p-4 text-left font-bold heading cursor-pointer hover:bg-foreground/90 transition-colors"
                  onClick={() => toggleSort('event')}
                >
                  <div className="flex items-center gap-2">
                    Event Description
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="w-[15%] p-4 text-left font-bold heading cursor-pointer hover:bg-foreground/90 transition-colors"
                  onClick={() => toggleSort('source')}
                >
                  <div className="flex items-center gap-2">
                    Source
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="w-[15%] p-4 text-left font-bold heading">
                  Persons
                </th>
                <th className="w-[15%] p-4 text-left font-bold heading">
                  Issues
                </th>
              </tr>
            </thead>

            {/* Table Body with Zebra Striping */}
            <tbody>
              {sortedFacts.map((fact, index) => (
                <tr 
                  key={fact.id}
                  className={`border-t border-foreground/10 hover:bg-muted/50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {/* Date Column */}
                  <td className="p-4 align-top">
                    <span className="font-medium text-foreground">
                      {formatDate(fact.eventDate)}
                    </span>
                  </td>

                  {/* Event Description Column */}
                  <td className="p-4 align-top">
                    <p className="text-foreground leading-relaxed font-serif">
                      {fact.summary}
                    </p>
                  </td>

                  {/* Source Column */}
                  <td className="p-4 align-top">
                    <span className="text-sm text-foreground">
                      {fact.documentName || 'Unknown'}
                      {fact.citation && (
                        <span className="block text-muted-foreground mt-1">
                          {fact.citation}
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Persons Column */}
                  <td className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {fact.actor && (
                        <Badge variant="secondary" className="text-xs">
                          {fact.actor}
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Issues Column */}
                  <td className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {fact.issue && (
                        <Badge variant="outline" className="text-xs">
                          {fact.issue}
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
