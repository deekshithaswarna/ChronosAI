import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { ArrowUpDown, Download, Filter, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';

type SortField = 'date' | 'event' | 'source';
type SortDirection = 'asc' | 'desc';

export default function ChronologyTable() {
  const { data: facts, isLoading } = trpc.facts.list.useQuery();
  const updateFactMutation = trpc.facts.update.useMutation();
  const utils = trpc.useUtils();
  
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Local state for editable fields (persists across sorting)
  const [editedIssues, setEditedIssues] = useState<Record<number, string[]>>({});
  const [editedComments, setEditedComments] = useState<Record<number, string>>({});
  const [newIssueInputs, setNewIssueInputs] = useState<Record<number, string>>({});

  // Filter state
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [showPersonFilter, setShowPersonFilter] = useState(false);
  const [showIssueFilter, setShowIssueFilter] = useState(false);

  // Refs for click-outside detection
  const personFilterRef = useRef<HTMLDivElement>(null);
  const issueFilterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personFilterRef.current && !personFilterRef.current.contains(event.target as Node)) {
        setShowPersonFilter(false);
      }
      if (issueFilterRef.current && !issueFilterRef.current.contains(event.target as Node)) {
        setShowIssueFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unique persons and issues from facts
  const uniquePersons = useMemo(() => {
    if (!facts) return [];
    const persons = new Set<string>();
    facts.forEach(fact => {
      if (fact.actor) {
        // Split by comma or semicolon and add each person as separate tag
        fact.actor.split(/[,;]/).forEach(person => {
          const trimmed = person.trim();
          if (trimmed) persons.add(trimmed);
        });
      }
    });
    return Array.from(persons).sort();
  }, [facts]);

  const uniqueIssues = useMemo(() => {
    if (!facts) return [];
    const issues = new Set<string>();
    facts.forEach(fact => {
      if (fact.issue) issues.add(fact.issue);
      if (fact.userIssues && Array.isArray(fact.userIssues)) {
        fact.userIssues.forEach(issue => issues.add(issue));
      }
    });
    return Array.from(issues).sort();
  }, [facts]);

  // Filter and sort facts
  const filteredAndSortedFacts = useMemo(() => {
    if (!facts) return [];
    
    // Apply filters
    let filtered = facts;
    if (selectedPersons.length > 0) {
      filtered = filtered.filter(f => {
        if (!f.actor) return false;
        // Split actor into individual persons and check if any match (OR logic)
        const persons = f.actor.split(/[,;]/).map(p => p.trim());
        return persons.some(person => selectedPersons.includes(person));
      });
    }
    if (selectedIssues.length > 0) {
      filtered = filtered.filter(f => {
        if (f.issue && selectedIssues.includes(f.issue)) return true;
        if (f.userIssues && Array.isArray(f.userIssues)) {
          return f.userIssues.some(issue => selectedIssues.includes(issue));
        }
        return false;
      });
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
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
  }, [facts, sortField, sortDirection, selectedPersons, selectedIssues]);

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

  // Handle person filter toggle
  const togglePerson = (person: string) => {
    setSelectedPersons(prev => 
      prev.includes(person) 
        ? prev.filter(p => p !== person)
        : [...prev, person]
    );
  };

  // Handle issue filter toggle
  const toggleIssue = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedPersons([]);
    setSelectedIssues([]);
  };

  // Handle new issue input change
  const handleNewIssueInputChange = (factId: number, value: string) => {
    setNewIssueInputs(prev => ({ ...prev, [factId]: value }));
  };

  // Handle Comments field change
  const handleCommentChange = (factId: number, value: string) => {
    setEditedComments(prev => ({ ...prev, [factId]: value }));
  };

  // Add new issue tag
  const handleAddIssue = async (factId: number) => {
    const newIssue = newIssueInputs[factId]?.trim();
    if (!newIssue) return;
    
    const currentIssues = getIssueValue({ id: factId, ...facts?.find(f => f.id === factId) });
    const updatedIssues = [...currentIssues, newIssue];
    
    setEditedIssues(prev => ({ ...prev, [factId]: updatedIssues }));
    setNewIssueInputs(prev => ({ ...prev, [factId]: '' }));
    
    await updateFactMutation.mutateAsync({
      id: factId,
      userIssues: updatedIssues,
    });
    utils.facts.list.invalidate();
  };

  // Remove issue tag
  const handleRemoveIssue = async (factId: number, issueToRemove: string) => {
    const currentIssues = getIssueValue({ id: factId, ...facts?.find(f => f.id === factId) });
    const updatedIssues = currentIssues.filter(issue => issue !== issueToRemove);
    
    setEditedIssues(prev => ({ ...prev, [factId]: updatedIssues }));
    
    await updateFactMutation.mutateAsync({
      id: factId,
      userIssues: updatedIssues,
    });
    utils.facts.list.invalidate();
  };

  // Rename person across all facts (merge duplicates)
  const renamePersonMutation = trpc.facts.renamePerson.useMutation();
  const handleRenamePerson = async (oldName: string) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName === oldName) return;
    
    try {
      await renamePersonMutation.mutateAsync({
        oldName,
        newName: newName.trim(),
      });
      utils.facts.list.invalidate();
      alert(`Successfully renamed "${oldName}" to "${newName}" across all events.`);
    } catch (error) {
      alert(`Failed to rename person: ${error}`);
    }
  };

  // Save Comments field on blur
  const handleCommentSave = async (factId: number) => {
    const newValue = editedComments[factId];
    if (newValue !== undefined) {
      await updateFactMutation.mutateAsync({
        id: factId,
        comments: newValue,
      });
      utils.facts.list.invalidate();
    }
  };

  // Get current value for Issues (edited or original) - returns array
  const getIssueValue = (fact: any): string[] => {
    if (editedIssues[fact.id] !== undefined) {
      // editedIssues now stores arrays
      return Array.isArray(editedIssues[fact.id]) ? editedIssues[fact.id] : [];
    }
    // Return userIssues array or convert issue to array
    if (fact.userIssues && Array.isArray(fact.userIssues)) {
      return fact.userIssues;
    }
    if (fact.issue) {
      return [fact.issue];
    }
    return [];
  };

  // Get current value for Comments (edited or original)
  const getCommentValue = (fact: any) => {
    if (editedComments[fact.id] !== undefined) {
      return editedComments[fact.id];
    }
    return fact.comments || '';
  };

  // Export to PDF with filtered data and user edits using jspdf-autotable
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('CHRONOS - Case Chronology', 14, 20);
    
    // Metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Total Events: ${filteredAndSortedFacts.length}`, 14, 34);
    
    // Prepare table data
    const tableData = filteredAndSortedFacts.map(fact => {
      const issues = getIssueValue(fact);
      const comments = getCommentValue(fact);
      
      return [
        formatDate(fact.eventDate),
        fact.summary,
        fact.documentTitle || fact.documentName || 'Unknown',
        fact.actor || '-',
        issues && issues.length > 0 ? issues.join(', ') : '-',
        comments || '-'
      ];
    });
    
    // Generate table with autoTable
    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Event Description', 'Source', 'Persons', 'Issues', 'Comments']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 20 },  // Date
        1: { cellWidth: 50 },  // Event Description
        2: { cellWidth: 35 },  // Source
        3: { cellWidth: 25 },  // Persons
        4: { cellWidth: 30 },  // Issues
        5: { cellWidth: 30 }   // Comments
      },
      margin: { top: 40, left: 14, right: 14 }
    });
    
    doc.save('chronology.pdf');
  };

  // Export to Word with filtered data and user edits
  const exportToWord = async () => {
    const rows: TableRow[] = [
      // Header row
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Event Description', bold: true })] })],
            width: { size: 35, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Source', bold: true })] })],
            width: { size: 20, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Person', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Issues', bold: true })] })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
        ],
        tableHeader: true,
      }),
    ];

    // Data rows
    filteredAndSortedFacts.forEach((fact) => {
      const issues = getIssueValue(fact);
      const comments = getCommentValue(fact);
      
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(formatDate(fact.eventDate))],
            }),
            new TableCell({
              children: [
                new Paragraph(fact.summary),
                ...(comments ? [new Paragraph({ children: [new TextRun({ text: `Comments: ${comments}`, italics: true })] })] : []),
              ],
            }),
            new TableCell({
              children: [new Paragraph(fact.documentTitle || fact.documentName || 'Unknown')],
            }),
            new TableCell({
              children: [new Paragraph(fact.actor || '-')],
            }),
            new TableCell({
              children: [new Paragraph(issues && issues.length > 0 ? issues.join(', ') : '-')],
            }),
          ],
        })
      );
    });

    const table = new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'CHRONOS - Case Chronology',
              heading: 'Heading1',
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: `Generated: ${new Date().toLocaleDateString()} | Total Events: ${filteredAndSortedFacts.length}`,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }), // Spacer
            table,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chronology.docx';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <p className="text-center text-muted-foreground">Loading chronology...</p>
      </div>
    );
  }

  if (!facts || facts.length === 0) {
    return (
      <div className="container py-12">
        <p className="text-center text-muted-foreground">
          No events found. Upload documents to generate a chronology.
        </p>
      </div>
    );
  }

  const hasActiveFilters = selectedPersons.length > 0 || selectedIssues.length > 0;

  return (
    <div className="container py-12">
      {/* Header with Export Buttons */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold heading">Chronology</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredAndSortedFacts.length} events 
              {hasActiveFilters && ` (filtered from ${facts.length})`} 
              {' '}extracted from {new Set(facts.map(f => f.documentName || 'Unknown')).size} documents
            </p>
            {hasActiveFilters && (
              <Button 
                variant="link" 
                onClick={clearFilters}
                className="h-auto p-0 mt-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={exportToPDF}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportToWord}>
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
                  className="w-[12%] p-4 text-left font-bold heading cursor-pointer hover:bg-foreground/90 transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="w-[28%] p-4 text-left font-bold heading cursor-pointer hover:bg-foreground/90 transition-colors"
                  onClick={() => toggleSort('event')}
                >
                  <div className="flex items-center gap-2">
                    Event Description
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="w-[12%] p-4 text-left font-bold heading cursor-pointer hover:bg-foreground/90 transition-colors"
                  onClick={() => toggleSort('source')}
                >
                  <div className="flex items-center gap-2">
                    Source
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </th>
                <th className="w-[12%] p-4 text-left font-bold heading relative">
                  <div className="flex items-center gap-2">
                    Persons
                    <button
                      onClick={() => setShowPersonFilter(!showPersonFilter)}
                      className="hover:bg-background/10 p-1 rounded transition-colors"
                    >
                      <Filter className={`h-4 w-4 ${selectedPersons.length > 0 ? 'text-blue-300' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Person Filter Dropdown */}
                  {showPersonFilter && (
                    <div 
                      ref={personFilterRef}
                      className="absolute top-full left-0 mt-2 bg-card border border-foreground/20 rounded-lg shadow-lg p-4 min-w-[200px] z-20 text-foreground font-normal text-sm"
                    >
                      <div className="font-semibold mb-2 text-xs uppercase tracking-wide">Filter by Person</div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {uniquePersons.length === 0 ? (
                          <div className="text-muted-foreground text-xs">No persons found</div>
                        ) : (
                          uniquePersons.map(person => (
                            <label key={person} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                              <Checkbox
                                checked={selectedPersons.includes(person)}
                                onCheckedChange={() => togglePerson(person)}
                              />
                              <span className="text-sm">{person}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </th>
                <th className="w-[15%] p-4 text-left font-bold heading relative">
                  <div className="flex items-center gap-2">
                    Issues
                    <button
                      onClick={() => setShowIssueFilter(!showIssueFilter)}
                      className="hover:bg-background/10 p-1 rounded transition-colors"
                    >
                      <Filter className={`h-4 w-4 ${selectedIssues.length > 0 ? 'text-blue-300' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Issue Filter Dropdown */}
                  {showIssueFilter && (
                    <div 
                      ref={issueFilterRef}
                      className="absolute top-full left-0 mt-2 bg-card border border-foreground/20 rounded-lg shadow-lg p-4 min-w-[200px] z-20 text-foreground font-normal text-sm"
                    >
                      <div className="font-semibold mb-2 text-xs uppercase tracking-wide">Filter by Issue</div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {uniqueIssues.length === 0 ? (
                          <div className="text-muted-foreground text-xs">No issues found</div>
                        ) : (
                          uniqueIssues.map(issue => (
                            <label key={issue} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                              <Checkbox
                                checked={selectedIssues.includes(issue)}
                                onCheckedChange={() => toggleIssue(issue)}
                              />
                              <span className="text-sm">{issue}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </th>
                <th className="w-[15%] p-4 text-left font-bold heading">
                  Comments
                </th>
              </tr>
            </thead>

            {/* Table Body with Zebra Striping */}
            <tbody>
              {filteredAndSortedFacts.map((fact, index) => (
                <tr 
                  key={fact.id}
                  className={`border-t border-foreground/10 hover:bg-foreground/5 transition-colors ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-foreground/[0.02]'
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
                    <p className="text-foreground leading-relaxed">
                      {fact.summary}
                    </p>
                  </td>

                  {/* Source Column */}
                  <td className="p-4 align-top">
                    <div className="text-sm">
                      <a 
                        href={fact.documentUrl || '#'} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-foreground hover:text-[#E07A5F] hover:underline transition-colors"
                      >
                        {fact.documentTitle || fact.documentName || 'Unknown'}
                        {fact.pageNumber && `, p.${fact.pageNumber}`}
                      </a>
                      {fact.citation && (
                        <div className="text-muted-foreground mt-2 text-xs">
                          Other potential sources referenced in uploaded documents: {fact.citation}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Persons Column - Split into individual tags */}
                  <td className="p-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {fact.actor && fact.actor.split(/[,;]/).map((person, idx) => {
                        const trimmed = person.trim();
                        if (!trimmed) return null;
                        return (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-[#E07A5F] hover:text-white transition-colors"
                            onClick={() => handleRenamePerson(trimmed)}
                          >
                            {trimmed}
                          </Badge>
                        );
                      })}
                    </div>
                  </td>

                  {/* Issues Column - Multi-tag with chips */}
                  <td className="p-4 align-top">
                    <div className="max-h-[100px] overflow-y-auto space-y-2">
                      {/* Existing issue chips */}
                      <div className="flex flex-wrap gap-1">
                        {getIssueValue(fact).map((issue, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {issue}
                            <button
                              onClick={() => handleRemoveIssue(fact.id, issue)}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Add new issue input */}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newIssueInputs[fact.id] || ''}
                          onChange={(e) => handleNewIssueInputChange(fact.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddIssue(fact.id);
                            }
                          }}
                          placeholder="Add issue..."
                          className="flex-1 text-xs px-2 py-1 border border-muted rounded focus:border-foreground/30 focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddIssue(fact.id)}
                          className="px-2 py-1 bg-foreground text-background rounded hover:bg-foreground/90 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Comments Column - Editable with scrollbar */}
                  <td className="p-4 align-top">
                    <div className="max-h-[100px] overflow-y-auto">
                      <Textarea
                        value={getCommentValue(fact)}
                        onChange={(e) => handleCommentChange(fact.id, e.target.value)}
                        onBlur={() => handleCommentSave(fact.id)}
                        placeholder="Add comments..."
                        className="min-h-[60px] text-sm resize-none border-muted focus:border-foreground/30"
                      />
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
