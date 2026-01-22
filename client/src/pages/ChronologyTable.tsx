import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { ArrowUpDown, Download, Filter, X, Plus, Pencil, Trash2, Search, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  
  // State for edited issues, comments, and descriptions
  const [editedIssues, setEditedIssues] = useState<Record<number, string[]>>({});
  const [editedComments, setEditedComments] = useState<Record<number, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<number, string>>({});
  const [editedDates, setEditedDates] = useState<Record<number, string>>({});
  const [newIssueInputs, setNewIssueInputs] = useState<Record<number, string>>({});
  const [editingDescriptionId, setEditingDescriptionId] = useState<number | null>(null);
  const [editingDateId, setEditingDateId] = useState<number | null>(null);
  const [hoveredDescriptionId, setHoveredDescriptionId] = useState<number | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  
  // State for inline person editing
  const [editingPerson, setEditingPerson] = useState<string | null>(null);
  const [editingPersonValue, setEditingPersonValue] = useState<string>('');

  // Global search state
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'word'>('pdf');
  const [exportColumns, setExportColumns] = useState({
    date: true,
    description: true,
    source: true,
    actors: true,
    issues: true,
    comments: false
  });
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [factToDelete, setFactToDelete] = useState<number | null>(null);
  
  // History management for undo/redo
  type HistorySnapshot = {
    editedIssues: Record<number, string[]>;
    editedComments: Record<number, string>;
    editedDescriptions: Record<number, string>;
    editedDates: Record<number, string>;
  };
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Filter state
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [showPersonFilter, setShowPersonFilter] = useState(false);
  const [showIssueFilter, setShowIssueFilter] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showSourceFilter, setShowSourceFilter] = useState(false);
  
  // Date filter state
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<'year' | 'month' | 'range'>('year');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [dateRangeFrom, setDateRangeFrom] = useState<string>('');
  const [dateRangeTo, setDateRangeTo] = useState<string>('');

  // Refs for click-outside detection
  const personFilterRef = useRef<HTMLDivElement>(null);
  const issueFilterRef = useRef<HTMLDivElement>(null);
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const sourceFilterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personFilterRef.current && !personFilterRef.current.contains(event.target as Node)) {
        setShowPersonFilter(false);
      }
      if (issueFilterRef.current && !issueFilterRef.current.contains(event.target as Node)) {
        setShowIssueFilter(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setShowDateFilter(false);
      }
      if (sourceFilterRef.current && !sourceFilterRef.current.contains(event.target as Node)) {
        setShowSourceFilter(false);
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
  
  const uniqueSources = useMemo(() => {
    if (!facts) return [];
    const sources = new Set<string>();
    facts.forEach(fact => {
      if (fact.documentTitle) sources.add(fact.documentTitle);
    });
    return Array.from(sources).sort();
  }, [facts]);
  
  // Get unique years and months from facts
  const uniqueYears = useMemo(() => {
    if (!facts) return [];
    const years = new Set<number>();
    facts.forEach(fact => {
      years.add(new Date(fact.eventDate).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a); // Descending order
  }, [facts]);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
    if (selectedSources.length > 0) {
      filtered = filtered.filter(f => {
        return f.documentTitle && selectedSources.includes(f.documentTitle);
      });
    }
    
    // Apply global search filter
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase();
      filtered = filtered.filter(f => {
        // Search in Event Description
        if (f.summary && f.summary.toLowerCase().includes(searchLower)) return true;
        // Search in Source
        if (f.documentTitle && f.documentTitle.toLowerCase().includes(searchLower)) return true;
        if (f.documentName && f.documentName.toLowerCase().includes(searchLower)) return true;
        // Search in Actors
        if (f.actor && f.actor.toLowerCase().includes(searchLower)) return true;
        // Search in Issues
        if (f.issue && f.issue.toLowerCase().includes(searchLower)) return true;
        if (f.userIssues && f.userIssues.some(issue => issue.toLowerCase().includes(searchLower))) return true;
        // Search in Comments
        if (f.comments && f.comments.toLowerCase().includes(searchLower)) return true;
        return false;
      });
    }
    
    // Apply date filters
    if (dateFilterMode === 'year' && selectedYears.length > 0) {
      filtered = filtered.filter(f => {
        const year = new Date(f.eventDate).getFullYear();
        return selectedYears.includes(year);
      });
    }
    if (dateFilterMode === 'month' && selectedMonths.length > 0) {
      filtered = filtered.filter(f => {
        const month = new Date(f.eventDate).getMonth() + 1; // 1-12
        return selectedMonths.includes(month);
      });
    }
    if (dateFilterMode === 'range' && (dateRangeFrom || dateRangeTo)) {
      filtered = filtered.filter(f => {
        const eventDate = new Date(f.eventDate);
        if (dateRangeFrom && eventDate < new Date(dateRangeFrom)) return false;
        if (dateRangeTo && eventDate > new Date(dateRangeTo)) return false;
        return true;
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
  }, [facts, sortField, sortDirection, selectedPersons, selectedIssues, selectedSources, dateFilterMode, selectedYears, selectedMonths, dateRangeFrom, dateRangeTo, globalSearch]);

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
    
    saveToHistory(); // Save BEFORE making changes
    
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
    saveToHistory(); // Save BEFORE making changes
    
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
  
  const startEditingPerson = (personName: string) => {
    setEditingPerson(personName);
    setEditingPersonValue(personName);
  };
  
  const savePersonRename = async () => {
    if (!editingPerson || !editingPersonValue || editingPersonValue === editingPerson) {
      setEditingPerson(null);
      return;
    }
    
    try {
      await renamePersonMutation.mutateAsync({
        oldName: editingPerson,
        newName: editingPersonValue.trim(),
      });
      utils.facts.list.invalidate();
      setEditingPerson(null);
    } catch (error) {
      console.error('Failed to rename person:', error);
      setEditingPerson(null);
    }
  };
  
  const cancelPersonEdit = () => {
    setEditingPerson(null);
    setEditingPersonValue('');
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

  // Get current value for Event Description (edited or original)
  const getDescriptionValue = (fact: any) => {
    if (editedDescriptions[fact.id] !== undefined) {
      return editedDescriptions[fact.id];
    }
    return fact.summary || '';
  };

  // Handle Event Description field change
  const handleDescriptionChange = (factId: number, value: string) => {
    setEditedDescriptions(prev => ({ ...prev, [factId]: value }));
  };

  // Initialize history with current state on first render
  useEffect(() => {
    if (history.length === 0 && facts && facts.length > 0) {
      const initialSnapshot: HistorySnapshot = {
        editedIssues: {},
        editedComments: {},
        editedDescriptions: {},
        editedDates: {},
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }
  }, [facts]);

  // History management functions
  const saveToHistory = () => {
    const snapshot: HistorySnapshot = {
      editedIssues: { ...editedIssues },
      editedComments: { ...editedComments },
      editedDescriptions: { ...editedDescriptions },
      editedDates: { ...editedDates },
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const snapshot = history[newIndex];
      setEditedIssues(snapshot.editedIssues);
      setEditedComments(snapshot.editedComments);
      setEditedDescriptions(snapshot.editedDescriptions);
      setEditedDates(snapshot.editedDates);
      setHistoryIndex(newIndex);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];
      setEditedIssues(snapshot.editedIssues);
      setEditedComments(snapshot.editedComments);
      setEditedDescriptions(snapshot.editedDescriptions);
      setEditedDates(snapshot.editedDates);
      setHistoryIndex(newIndex);
    }
  };

  // Save Event Description field on blur
  const handleDescriptionSave = async (factId: number) => {
    saveToHistory(); // Save BEFORE making changes
    const newValue = editedDescriptions[factId];
    if (newValue !== undefined) {
      await updateFactMutation.mutateAsync({
        id: factId,
        summary: newValue,
      });
      utils.facts.list.invalidate();
      setEditingDescriptionId(null);
    }
  };

  // Start editing Event Description
  const startEditingDescription = (factId: number) => {
    setEditingDescriptionId(factId);
  };

  // Cancel editing Event Description
  const cancelDescriptionEdit = () => {
    setEditingDescriptionId(null);
  };

  // Delete fact mutation
  const deleteFactMutation = trpc.facts.delete.useMutation();

  // Handle fact deletion
  const handleDeleteFact = (factId: number) => {
    setFactToDelete(factId);
    setShowDeleteModal(true);
  };
  
  const confirmDelete = async () => {
    if (factToDelete === null) return;
    
    saveToHistory(); // Save BEFORE making changes
    
    try {
      await deleteFactMutation.mutateAsync({ id: factToDelete });
      utils.facts.list.invalidate();
      setShowDeleteModal(false);
      setFactToDelete(null);
    } catch (error) {
      console.error('Failed to delete fact:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Get current value for Date (edited or original)
  const getDateValue = (fact: any) => {
    if (editedDates[fact.id] !== undefined) {
      return editedDates[fact.id];
    }
    // Format as YYYY-MM-DD for input[type="date"]
    return new Date(fact.eventDate).toISOString().split('T')[0];
  };

  // Handle Date field change
  const handleDateChange = (factId: number, value: string) => {
    setEditedDates(prev => ({ ...prev, [factId]: value }));
  };

  // Save Date field on blur with auto-sorting
  const handleDateSave = async (factId: number) => {
    saveToHistory(); // Save BEFORE making changes
    const newDateValue = editedDates[factId];
    if (newDateValue !== undefined) {
      try {
        // Convert YYYY-MM-DD to Date object
        const newDate = new Date(newDateValue);
        await updateFactMutation.mutateAsync({
          id: factId,
          eventDate: newDate.toISOString(),
        });
        // Invalidate to trigger re-fetch and auto-sort
        utils.facts.list.invalidate();
        setEditingDateId(null);
      } catch (error) {
        console.error('Failed to update date:', error);
        alert('Failed to update date. Please try again.');
      }
    }
  };

  // Start editing Date
  const startEditingDate = (factId: number) => {
    setEditingDateId(factId);
  };

  // Cancel editing Date
  const cancelDateEdit = () => {
    setEditingDateId(null);
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
    
    // Build header and column styles based on selected columns
    const headers: string[] = [];
    const columnStyles: any = {};
    let colIndex = 0;
    
    if (exportColumns.date) { headers.push('Date'); columnStyles[colIndex++] = { cellWidth: 20 }; }
    if (exportColumns.description) { headers.push('Event Description'); columnStyles[colIndex++] = { cellWidth: 50 }; }
    if (exportColumns.source) { headers.push('Source'); columnStyles[colIndex++] = { cellWidth: 35 }; }
    if (exportColumns.actors) { headers.push('Actors'); columnStyles[colIndex++] = { cellWidth: 25 }; }
    if (exportColumns.issues) { headers.push('Issues'); columnStyles[colIndex++] = { cellWidth: 30 }; }
    if (exportColumns.comments) { headers.push('Comments'); columnStyles[colIndex++] = { cellWidth: 30 }; }
    
    // Prepare table data with only selected columns
    const tableData = filteredAndSortedFacts.map(fact => {
      const issues = getIssueValue(fact);
      const comments = getCommentValue(fact);
      const row: string[] = [];
      
      if (exportColumns.date) row.push(formatDate(fact.eventDate));
      if (exportColumns.description) row.push(fact.summary);
      if (exportColumns.source) row.push(fact.documentTitle || fact.documentName || 'Unknown');
      if (exportColumns.actors) row.push(fact.actor || '-');
      if (exportColumns.issues) row.push(issues && issues.length > 0 ? issues.join(', ') : '-');
      if (exportColumns.comments) row.push(comments || '-');
      
      return row;
    });
    
    // Generate table with autoTable
    autoTable(doc, {
      startY: 40,
      head: [headers],
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
      columnStyles,
      margin: { top: 40, left: 14, right: 14 }
    });
    
    doc.save('chronology.pdf');
  };

  // Export to Word with filtered data and user edits
  const exportToWord = async () => {
    // Build header cells based on selected columns
    const headerCells: TableCell[] = [];
    if (exportColumns.date) headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }));
    if (exportColumns.description) headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Event Description', bold: true })] })], width: { size: 35, type: WidthType.PERCENTAGE } }));
    if (exportColumns.source) headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Source', bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }));
    if (exportColumns.actors) headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Actors', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }));
    if (exportColumns.issues) headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Issues', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }));
    if (exportColumns.comments) headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Comments', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }));
    
    const rows: TableRow[] = [
      new TableRow({ children: headerCells, tableHeader: true }),
    ];

    // Data rows with only selected columns
    filteredAndSortedFacts.forEach((fact) => {
      const issues = getIssueValue(fact);
      const comments = getCommentValue(fact);
      const dataCells: TableCell[] = [];
      
      if (exportColumns.date) dataCells.push(new TableCell({ children: [new Paragraph(formatDate(fact.eventDate))] }));
      if (exportColumns.description) dataCells.push(new TableCell({ children: [new Paragraph(fact.summary)] }));
      if (exportColumns.source) dataCells.push(new TableCell({ children: [new Paragraph(fact.documentTitle || fact.documentName || 'Unknown')] }));
      if (exportColumns.actors) dataCells.push(new TableCell({ children: [new Paragraph(fact.actor || '-')] }));
      if (exportColumns.issues) dataCells.push(new TableCell({ children: [new Paragraph(issues && issues.length > 0 ? issues.join(', ') : '-')] }));
      if (exportColumns.comments) dataCells.push(new TableCell({ children: [new Paragraph(comments || '-')] }));
      
      rows.push(new TableRow({ children: dataCells }));
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

  const hasActiveFilters = selectedPersons.length > 0 || selectedIssues.length > 0 || selectedSources.length > 0;

  return (
    <div className="px-4 py-12" style={{ maxWidth: '98vw', margin: '0 auto', marginLeft: '50px' }}>
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
            <Button className="gap-2" onClick={() => { setExportType('pdf'); setShowExportModal(true); }}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button className="gap-2" onClick={() => { setExportType('word'); setShowExportModal(true); }}>
              <Download className="h-4 w-4" />
              Export Word
            </Button>
          </div>
        </div>
      </div>

      {/* Global Search & Undo/Redo */}
      <div className="mb-4 flex items-center justify-center gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search chronology..."
            className="w-full pl-10 pr-4 py-2 bg-transparent border border-foreground/20 rounded-md text-sm focus:outline-none focus:border-foreground/40 transition-colors"
            style={{ border: '1px solid rgba(0,0,0,0.2)' }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo (Cmd/Ctrl+Z)"
            className="gap-2"
          >
            <Undo className="h-4 w-4" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="Redo (Cmd/Ctrl+Shift+Z)"
            className="gap-2"
          >
            <Redo className="h-4 w-4" />
            Redo
          </Button>
        </div>
      </div>

      {/* Strict HTML Table */}
      <div className="bg-card rounded-lg shadow-md border border-foreground/10" style={{ overflow: 'visible' }}>
        <div style={{ overflow: 'visible' }}>
          <table className="w-full border-collapse legal-table" style={{ tableLayout: 'fixed', overflow: 'visible' }}>
            {/* Sticky Header */}
            <thead className="sticky top-0 z-30" style={{ backgroundColor: '#000' }}>
              <tr className="bg-foreground text-background">
                <th className="p-4 text-left font-bold heading relative" style={{ width: '8%', minWidth: '90px' }}>
                  <div className="flex items-center gap-2">
                    <span 
                      className="cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => toggleSort('date')}
                    >
                      Date
                    </span>
                    <ArrowUpDown 
                      className="h-5 w-5 cursor-pointer hover:opacity-70 transition-opacity" 
                      onClick={() => toggleSort('date')}
                    />
                    <button
                      onClick={() => setShowDateFilter(!showDateFilter)}
                      className="hover:bg-background/10 p-1 rounded transition-colors"
                    >
                      <Filter className={`h-5 w-5 ${(selectedYears.length > 0 || selectedMonths.length > 0 || dateRangeFrom || dateRangeTo) ? 'text-[#E07A5F]' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Date Filter Dropdown */}
                  {showDateFilter && (
                    <div ref={dateFilterRef} className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg p-4 z-20 min-w-[300px]">
                      {/* Filter Mode Tabs */}
                      <div className="flex gap-2 mb-4 border-b border-border">
                        <button
                          onClick={() => setDateFilterMode('year')}
                          className={`px-3 py-2 text-sm transition-colors ${dateFilterMode === 'year' ? 'border-b-2 border-[#E07A5F] text-[#E07A5F] font-bold' : 'text-black hover:text-[#E07A5F]'}`}
                        >
                          By Year
                        </button>
                        <button
                          onClick={() => setDateFilterMode('month')}
                          className={`px-3 py-2 text-sm transition-colors ${dateFilterMode === 'month' ? 'border-b-2 border-[#E07A5F] text-[#E07A5F] font-bold' : 'text-black hover:text-[#E07A5F]'}`}
                        >
                          By Month
                        </button>
                        <button
                          onClick={() => setDateFilterMode('range')}
                          className={`px-3 py-2 text-sm transition-colors ${dateFilterMode === 'range' ? 'border-b-2 border-[#E07A5F] text-[#E07A5F] font-bold' : 'text-black hover:text-[#E07A5F]'}`}
                        >
                          By Range
                        </button>
                      </div>
                      
                      {/* Year Filter */}
                      {dateFilterMode === 'year' && (
                        <div className="max-h-[300px] overflow-y-auto">
                          {uniqueYears.map(year => (
                            <label key={year} className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer">
                              <Checkbox
                                checked={selectedYears.includes(year)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedYears([...selectedYears, year]);
                                  } else {
                                    setSelectedYears(selectedYears.filter(y => y !== year));
                                  }
                                }}
                              />
                              <span className="text-sm text-black">{year}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {/* Month Filter */}
                      {dateFilterMode === 'month' && (
                        <div className="max-h-[300px] overflow-y-auto">
                          {monthNames.map((month, index) => (
                            <label key={index} className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer">
                              <Checkbox
                                checked={selectedMonths.includes(index + 1)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMonths([...selectedMonths, index + 1]);
                                  } else {
                                    setSelectedMonths(selectedMonths.filter(m => m !== index + 1));
                                  }
                                }}
                              />
                              <span className="text-sm text-black">{month}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {/* Range Filter */}
                      {dateFilterMode === 'range' && (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block text-black">From:</label>
                            <input
                              type="date"
                              value={dateRangeFrom}
                              onChange={(e) => setDateRangeFrom(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block text-black">To:</label>
                            <input
                              type="date"
                              value={dateRangeTo}
                              onChange={(e) => setDateRangeTo(e.target.value)}
                              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Clear Filters Button */}
                      <Button
                        onClick={() => {
                          setSelectedYears([]);
                          setSelectedMonths([]);
                          setDateRangeFrom('');
                          setDateRangeTo('');
                        }}
                        className="mt-4 w-full"
                      >
                        Clear Date Filters
                      </Button>
                    </div>
                  )}
                </th>
                <th 
                  className="p-4 text-left font-bold heading"
                  style={{ width: '35%', minWidth: '300px' }}
                >
                  Event Description
                </th>
                <th className="p-4 text-left font-bold heading relative" style={{ width: '12%', minWidth: '110px' }}>
                  <div className="flex items-center gap-2">
                    Source
                    <button
                      onClick={() => setShowSourceFilter(!showSourceFilter)}
                      className="hover:bg-background/10 p-1 rounded transition-colors"
                    >
                      <Filter className={`h-5 w-5 ${selectedSources.length > 0 ? 'text-[#E07A5F]' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Source Filter Dropdown */}
                  {showSourceFilter && (
                    <div ref={sourceFilterRef} className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg p-4 z-20 min-w-[250px]">
                      <div className="max-h-[300px] overflow-y-auto">
                        {uniqueSources.map(source => (
                          <label key={source} className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer">
                            <Checkbox
                              checked={selectedSources.includes(source)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSources([...selectedSources, source]);
                                } else {
                                  setSelectedSources(selectedSources.filter(s => s !== source));
                                }
                              }}
                            />
                            <span className="text-sm text-black">{source}</span>
                          </label>
                        ))}
                      </div>
                      {selectedSources.length > 0 && (
                        <button
                          onClick={() => setSelectedSources([])}
                          className="mt-3 w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  )}
                </th>
                <th className="p-4 text-left font-bold heading relative" style={{ width: '15%', minWidth: '140px' }}>
                  <div className="flex items-center gap-2">
                    Actors
                    <button
                      onClick={() => setShowPersonFilter(!showPersonFilter)}
                      className="hover:bg-background/10 p-1 rounded transition-colors"
                    >
                      <Filter className={`h-5 w-5 ${selectedPersons.length > 0 ? 'text-[#E07A5F]' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Person Filter Dropdown */}
                  {showPersonFilter && (
                    <div 
                      ref={personFilterRef}
                      className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg p-4 min-w-[250px] z-20"
                    >
                      <div className="max-h-[300px] overflow-y-auto">
                        {uniquePersons.length === 0 ? (
                          <div className="text-muted-foreground text-xs">No actors found</div>
                        ) : (
                          uniquePersons.map(person => (
                            <label key={person} className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded">
                              <Checkbox
                                checked={selectedPersons.includes(person)}
                                onCheckedChange={() => togglePerson(person)}
                              />
                              <span className="text-sm">{person}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {selectedPersons.length > 0 && (
                        <button
                          onClick={() => setSelectedPersons([])}
                          className="mt-3 w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  )}
                </th>
                <th className="p-4 text-left font-bold heading relative" style={{ width: '10%', minWidth: '130px' }}>
                  <div className="flex items-center gap-2">
                    Issues
                    <button
                      onClick={() => setShowIssueFilter(!showIssueFilter)}
                      className="hover:bg-background/10 p-1 rounded transition-colors"
                    >
                      <Filter className={`h-5 w-5 ${selectedIssues.length > 0 ? 'text-[#E07A5F]' : ''}`} />
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
                      {selectedIssues.length > 0 && (
                        <button
                          onClick={() => setSelectedIssues([])}
                          className="mt-3 w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  )}
                </th>
                <th className="p-4 text-left font-bold heading" style={{ width: '20%', minWidth: '180px' }}>
                  Comments
                </th>
              </tr>
            </thead>

            {/* Table Body with Zebra Striping */}
            <tbody>
              {filteredAndSortedFacts.map((fact, index) => (
                <tr 
                  key={fact.id}
                  className={`relative border-t border-foreground/10 hover:bg-foreground/5 transition-colors ${
                    index % 2 === 0 ? 'bg-transparent' : 'bg-foreground/[0.02]'
                  }`}
                  onMouseEnter={() => setHoveredRowId(fact.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  {/* Date Column - Editable with Floating Editor & Trash Icon */}
                  <td className="py-4 px-4 align-top relative" style={{ fontSize: '14px' }}>
                    {/* Trash Icon - Floats outside table to the left */}
                    <button
                      onClick={() => handleDeleteFact(fact.id)}
                      className="absolute text-[#9CA3AF] hover:text-[#EF4444] transition-all p-1 rounded"
                      style={{ 
                        left: '-32px', 
                        top: '16px',
                        opacity: hoveredRowId === fact.id ? 1 : 0,
                        pointerEvents: hoveredRowId === fact.id ? 'auto' : 'none',
                        transition: 'opacity 0.3s ease, color 0.2s ease',
                        transitionDelay: hoveredRowId === fact.id ? '0s' : '0.8s'
                      }}
                      title="Delete this event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <span 
                      className="font-medium text-foreground cursor-pointer hover:bg-foreground/5 px-1 py-0.5 rounded transition-colors"
                      onClick={() => startEditingDate(fact.id)}
                    >
                      {formatDate(fact.eventDate)}
                    </span>
                    {editingDateId === fact.id && (
                      <div className="absolute top-0 left-0 w-full z-50">
                        <input
                          type="date"
                          value={getDateValue(fact)}
                          onChange={(e) => handleDateChange(fact.id, e.target.value)}
                          onBlur={() => handleDateSave(fact.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelDateEdit();
                            if (e.key === 'Enter') handleDateSave(fact.id);
                          }}
                          autoFocus
                          className="w-full text-sm px-1 py-0.5 bg-transparent"
                          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                        />
                      </div>
                    )}
                  </td>

                  {/* Event Description Column - Editable with Floating Editor */}
                  <td 
                    className="py-4 px-4 align-top relative" 
                    style={{ fontSize: '14px', wordWrap: 'break-word', overflowWrap: 'break-word', width: '35%', minWidth: '300px' }}
                    onMouseEnter={() => setHoveredDescriptionId(fact.id)}
                    onMouseLeave={() => setHoveredDescriptionId(null)}
                  >
                    <div 
                      className="flex items-start gap-2 cursor-pointer hover:bg-foreground/5 p-1 -m-1 rounded transition-colors"
                      onClick={() => startEditingDescription(fact.id)}
                      style={{ visibility: editingDescriptionId === fact.id ? 'hidden' : 'visible' }}
                    >
                      <p className="text-foreground leading-relaxed flex-1">
                        {getDescriptionValue(fact)}
                      </p>
                      {hoveredDescriptionId === fact.id && (
                        <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1" />
                      )}
                    </div>
                    {editingDescriptionId === fact.id && (
                      <div className="absolute top-0 left-0 w-full z-50">
                        <Textarea
                          value={getDescriptionValue(fact)}
                          onChange={(e) => handleDescriptionChange(fact.id, e.target.value)}
                          onBlur={() => handleDescriptionSave(fact.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelDescriptionEdit();
                          }}
                          autoFocus
                          className="min-h-[80px] text-sm resize-none bg-transparent p-1"
                          style={{ height: 'auto', minHeight: '80px', border: 'none', outline: 'none', boxShadow: 'none' }}
                        />
                      </div>
                    )}
                  </td>

                  {/* Source Column */}
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px', width: '12%', minWidth: '110px' }}>
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
                        <div className="text-muted-foreground mt-2" style={{ fontSize: '14px' }}>
                          <span className="font-bold">Other potential sources referenced in uploaded documents:</span> {fact.citation}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actors Column - Split into individual tags */}
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px', whiteSpace: 'normal', wordWrap: 'break-word', width: '15%', minWidth: '140px' }}>
                    <div className="flex flex-wrap gap-1">
                      {fact.actor && fact.actor.split(/[,;]/).map((person, idx) => {
                        const trimmed = person.trim();
                        if (!trimmed) return null;
                        
                        // Show input field if this person is being edited
                        if (editingPerson === trimmed) {
                          return (
                            <input
                              key={idx}
                              type="text"
                              value={editingPersonValue}
                              onChange={(e) => setEditingPersonValue(e.target.value)}
                              onBlur={savePersonRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') savePersonRename();
                                if (e.key === 'Escape') cancelPersonEdit();
                              }}
                              autoFocus
                              className="text-xs px-2 py-1 border border-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-[#E07A5F] relative z-50"
                              style={{ width: `${Math.max(editingPersonValue.length * 8 + 20, 150)}px`, minWidth: '150px' }}
                            />
                          );
                        }
                        
                        return (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-[#E07A5F] hover:text-white transition-colors flex items-center gap-1"
                            onClick={() => startEditingPerson(trimmed)}
                            style={{ whiteSpace: 'normal', display: 'inline-block', wordBreak: 'break-word' }}
                          >
                            {trimmed}
                            <Pencil className="h-3 w-3" />
                          </Badge>
                        );
                      })}
                    </div>
                  </td>

                  {/* Issues Column - Multi-tag with chips */}
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px', width: '10%', minWidth: '130px' }}>
                    <div className="flex flex-col gap-2">
                      {/* Existing issue chips */}
                      <div className="flex flex-wrap gap-1">
                        {getIssueValue(fact).map((issue, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-[#E07A5F] hover:text-white transition-colors flex items-center gap-1"
                            style={{ whiteSpace: 'normal', display: 'inline-block', wordBreak: 'break-word' }}
                          >
                            {issue}
                            <button
                              onClick={() => handleRemoveIssue(fact.id, issue)}
                              className="hover:opacity-70 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      {/* Add new issue input */}
                      <div className="flex gap-1 w-full flex-wrap">
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
                          className="flex-1 text-xs px-2 py-1 bg-transparent"
                          style={{ width: '100%', maxWidth: '90%', minWidth: '80px', boxSizing: 'border-box', flexGrow: 1, border: 'none', outline: 'none', boxShadow: 'none' }}
                        />
                        <button
                          onClick={() => handleAddIssue(fact.id)}
                          className="flex-shrink-0 px-2 py-1 bg-foreground text-background rounded hover:bg-foreground/90 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Comments Column - Single Textarea */}
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                    <Textarea
                      value={getCommentValue(fact)}
                      onChange={(e) => handleCommentChange(fact.id, e.target.value)}
                      onBlur={() => handleCommentSave(fact.id)}
                      placeholder="Add comments..."
                      className="min-h-[60px] w-full text-sm resize-none bg-transparent p-2"
                      style={{ height: 'auto', minHeight: '60px', border: 'none', outline: 'none', boxShadow: 'none' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Options Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Select which columns to include in the export:</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={exportColumns.date}
                  onCheckedChange={(checked) => setExportColumns(prev => ({ ...prev, date: !!checked }))}
                />
                <span className="text-sm">Date</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={exportColumns.description}
                  onCheckedChange={(checked) => setExportColumns(prev => ({ ...prev, description: !!checked }))}
                />
                <span className="text-sm">Event Description</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={exportColumns.source}
                  onCheckedChange={(checked) => setExportColumns(prev => ({ ...prev, source: !!checked }))}
                />
                <span className="text-sm">Source</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={exportColumns.actors}
                  onCheckedChange={(checked) => setExportColumns(prev => ({ ...prev, actors: !!checked }))}
                />
                <span className="text-sm">Actors</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={exportColumns.issues}
                  onCheckedChange={(checked) => setExportColumns(prev => ({ ...prev, issues: !!checked }))}
                />
                <span className="text-sm">Issues</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={exportColumns.comments}
                  onCheckedChange={(checked) => setExportColumns(prev => ({ ...prev, comments: !!checked }))}
                />
                <span className="text-sm">Comments</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (exportType === 'pdf') {
                exportToPDF();
              } else {
                exportToWord();
              }
              setShowExportModal(false);
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download {exportType === 'pdf' ? 'PDF' : 'Word'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground">
              Are you sure you want to delete this event? This action can be undone.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(false)}
              className="border-foreground text-foreground hover:bg-foreground/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDelete}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
