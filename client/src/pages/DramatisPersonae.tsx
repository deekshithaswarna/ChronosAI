import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Users, Sparkles, Loader2, FileText, Download, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } from 'docx';

type Person = {
  id: number;
  name: string;
  role: string | null;
  narrative: string | null;
  references: Array<{
    documentId: number;
    documentTitle: string | null;
    documentName: string | null;
    documentUrl: string | null;
    pages: number[];
  }>;
};

const docLabel = (r: Person['references'][number]) => r.documentTitle || r.documentName || 'Document';
const refsText = (p: Person) =>
  p.references
    .map(r => `${docLabel(r)}${r.pages.length ? ` (pp. ${r.pages.join(', ')})` : ''}`)
    .join('; ');

export default function DramatisPersonae() {
  const utils = trpc.useUtils();
  const peopleQuery = trpc.dramatisPersonae.get.useQuery();
  const factsQuery = trpc.facts.list.useQuery();
  const generateMutation = trpc.dramatisPersonae.generate.useMutation();

  const people = (peopleQuery.data ?? []) as Person[];
  const factCount = factsQuery.data?.length ?? 0;

  // Search + filter + export state (mirrors the chronology page).
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showDocFilter, setShowDocFilter] = useState(false);
  const docFilterRef = useRef<HTMLDivElement>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'word'>('pdf');
  const [exportColumns, setExportColumns] = useState({ name: true, role: true, relevance: true, references: true });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (docFilterRef.current && !docFilterRef.current.contains(e.target as Node)) setShowDocFilter(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const uniqueDocs = useMemo(() => {
    const set = new Set<string>();
    people.forEach(p => p.references.forEach(r => set.add(docLabel(r))));
    return Array.from(set).sort();
  }, [people]);

  const filteredPeople = useMemo(() => {
    let list = people;
    if (selectedDocs.length > 0) {
      list = list.filter(p => p.references.some(r => selectedDocs.includes(docLabel(r))));
    }
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.role && p.role.toLowerCase().includes(q)) ||
        (p.narrative && p.narrative.toLowerCase().includes(q)) ||
        p.references.some(r => docLabel(r).toLowerCase().includes(q))
      );
    }
    return list;
  }, [people, selectedDocs, globalSearch]);

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync();
      await utils.dramatisPersonae.get.invalidate();
      toast.success('Dramatis personae generated');
    } catch {
      toast.error('Failed to generate dramatis personae');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('CHRONOS - Dramatis Personae', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Total parties: ${filteredPeople.length}`, 14, 34);

    const headers: string[] = [];
    const columnStyles: any = {};
    let ci = 0;
    if (exportColumns.name) { headers.push('Name'); columnStyles[ci++] = { cellWidth: 30 }; }
    if (exportColumns.role) { headers.push('Role / Title'); columnStyles[ci++] = { cellWidth: 35 }; }
    if (exportColumns.relevance) { headers.push('Relevance'); columnStyles[ci++] = { cellWidth: 75 }; }
    if (exportColumns.references) { headers.push('Referenced in'); columnStyles[ci++] = { cellWidth: 45 }; }

    const body = filteredPeople.map(p => {
      const row: string[] = [];
      if (exportColumns.name) row.push(p.name);
      if (exportColumns.role) row.push(p.role || '-');
      if (exportColumns.relevance) row.push(p.narrative || '-');
      if (exportColumns.references) row.push(refsText(p) || '-');
      return row;
    });

    autoTable(doc, {
      startY: 40,
      head: [headers],
      body,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles,
      margin: { top: 40, left: 14, right: 14 },
    });
    doc.save('dramatis-personae.pdf');
  };

  const exportToWord = async () => {
    const headerCells: TableCell[] = [];
    const mkHead = (t: string, w: number) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })], width: { size: w, type: WidthType.PERCENTAGE } });
    if (exportColumns.name) headerCells.push(mkHead('Name', 18));
    if (exportColumns.role) headerCells.push(mkHead('Role / Title', 20));
    if (exportColumns.relevance) headerCells.push(mkHead('Relevance', 37));
    if (exportColumns.references) headerCells.push(mkHead('Referenced in', 25));

    const rows: TableRow[] = [new TableRow({ children: headerCells, tableHeader: true })];
    filteredPeople.forEach(p => {
      const cells: TableCell[] = [];
      if (exportColumns.name) cells.push(new TableCell({ children: [new Paragraph(p.name)] }));
      if (exportColumns.role) cells.push(new TableCell({ children: [new Paragraph(p.role || '-')] }));
      if (exportColumns.relevance) cells.push(new TableCell({ children: [new Paragraph(p.narrative || '-')] }));
      if (exportColumns.references) cells.push(new TableCell({ children: [new Paragraph(refsText(p) || '-')] }));
      rows.push(new TableRow({ children: cells }));
    });

    const docx = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'CHRONOS - Dramatis Personae', heading: 'Heading1', alignment: AlignmentType.CENTER }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()} | Total parties: ${filteredPeople.length}`, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),
          new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(docx);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dramatis-personae.docx';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-12" style={{ maxWidth: '98vw', margin: '0 auto', marginLeft: '50px' }}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold heading flex items-center gap-2">
            <Users className="h-7 w-7" /> Dramatis Personae
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredPeople.length} {filteredPeople.length === 1 ? 'party' : 'parties'}
            {(selectedDocs.length > 0 || globalSearch.trim()) && people.length !== filteredPeople.length ? ` (filtered from ${people.length})` : ''}
            {' '}— roles, relevance, and where each is referenced in your documents.
          </p>
        </div>
        <div className="flex gap-2">
          {people.length > 0 && (
            <>
              <Button className="gap-2" onClick={() => { setExportType('pdf'); setShowExportModal(true); }}>
                <Download className="h-4 w-4" /> Export PDF
              </Button>
              <Button className="gap-2" onClick={() => { setExportType('word'); setShowExportModal(true); }}>
                <Download className="h-4 w-4" /> Export Word
              </Button>
            </>
          )}
          <Button variant={people.length > 0 ? 'outline' : 'default'} onClick={handleGenerate} disabled={generateMutation.isPending || factCount === 0} className="gap-2">
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {people.length > 0 ? 'Regenerate' : 'Generate from documents'}
          </Button>
        </div>
      </div>

      {factCount === 0 && (
        <div className="mb-6 p-4 border border-foreground/15 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Upload documents first — the cast is built from your extracted chronology.
        </div>
      )}

      {/* Search */}
      {people.length > 0 && (
        <div className="mb-4 flex items-center justify-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search the cast…"
              className="w-full pl-10 pr-4 py-2 bg-transparent border rounded-md text-sm focus:outline-none transition-colors"
              style={{ border: '1px solid rgba(0,0,0,0.2)' }}
            />
          </div>
        </div>
      )}

      {peopleQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : people.length === 0 ? (
        <div className="p-12 text-center border border-foreground/10 rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No cast generated yet</h3>
          <p className="text-sm text-muted-foreground">
            {factCount === 0 ? 'Upload and process documents first.' : 'Click "Generate from documents" to build the dramatis personae.'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow-md border border-foreground/10" style={{ overflow: 'visible' }}>
          <table className="w-full border-collapse legal-table" style={{ tableLayout: 'fixed', overflow: 'visible' }}>
            <thead className="sticky top-0 z-30" style={{ backgroundColor: '#000' }}>
              <tr className="bg-foreground text-background">
                <th className="p-4 text-left font-bold heading" style={{ width: '16%', minWidth: '140px' }}>Name</th>
                <th className="p-4 text-left font-bold heading" style={{ width: '16%', minWidth: '140px' }}>Role / Title</th>
                <th className="p-4 text-left font-bold heading" style={{ width: '40%', minWidth: '300px' }}>Relevance to the case</th>
                <th className="p-4 text-left font-bold heading relative" style={{ width: '28%', minWidth: '220px' }}>
                  <div className="flex items-center gap-2">
                    Referenced in
                    <button onClick={() => setShowDocFilter(!showDocFilter)} className="hover:bg-background/10 p-1 rounded transition-colors">
                      <Filter className={`h-5 w-5 ${selectedDocs.length > 0 ? 'text-[#E07A5F]' : ''}`} />
                    </button>
                  </div>
                  {showDocFilter && (
                    <div ref={docFilterRef} className="absolute top-full right-0 mt-1 bg-background border border-border rounded-md shadow-lg p-4 z-40 min-w-[260px] text-foreground font-normal">
                      <div className="max-h-[300px] overflow-y-auto">
                        {uniqueDocs.length === 0 ? (
                          <div className="text-muted-foreground text-xs">No documents</div>
                        ) : uniqueDocs.map(d => (
                          <label key={d} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-foreground/5">
                            <Checkbox
                              checked={selectedDocs.includes(d)}
                              onCheckedChange={checked => setSelectedDocs(prev => checked ? [...prev, d] : prev.filter(x => x !== d))}
                            />
                            <span className="text-sm">{d}</span>
                          </label>
                        ))}
                      </div>
                      {selectedDocs.length > 0 && (
                        <button onClick={() => setSelectedDocs([])} className="mt-3 w-full px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded transition-colors">
                          Clear filter
                        </button>
                      )}
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.map((person, index) => (
                <tr
                  key={person.id}
                  className={`border-t border-foreground/10 hover:bg-foreground/5 transition-colors ${index % 2 === 0 ? 'bg-transparent' : 'bg-foreground/[0.02]'}`}
                >
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px' }}>
                    <span className="font-semibold">{person.name}</span>
                  </td>
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                    {person.role ? <span>{person.role}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px', wordWrap: 'break-word' }}>
                    <p className="leading-relaxed">{person.narrative || '—'}</p>
                  </td>
                  <td className="py-4 px-4 align-top" style={{ fontSize: '14px' }}>
                    {person.references.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-2">
                        {person.references.map(ref => (
                          <div key={ref.documentId} className="text-sm">
                            <a href={ref.documentUrl || '#'} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-[#E07A5F] hover:underline transition-colors">
                              {docLabel(ref)}
                            </a>
                            {ref.pages.length > 0 && (
                              <span className="text-muted-foreground">
                                {'  '}
                                {ref.pages.map((p, i) => (
                                  <span key={p}>
                                    {i === 0 ? '(' : ', '}
                                    <a href={`${ref.documentUrl || '#'}#page=${p}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#E07A5F] hover:underline">p.{p}</a>
                                    {i === ref.pages.length - 1 ? ')' : ''}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Export options modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Select which columns to include:</p>
            <div className="space-y-3">
              {([['name', 'Name'], ['role', 'Role / Title'], ['relevance', 'Relevance'], ['references', 'Referenced in']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={exportColumns[key]} onCheckedChange={checked => setExportColumns(prev => ({ ...prev, [key]: !!checked }))} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
            <Button onClick={() => { exportType === 'pdf' ? exportToPDF() : exportToWord(); setShowExportModal(false); }}>
              <Download className="h-4 w-4 mr-2" />
              Download {exportType === 'pdf' ? 'PDF' : 'Word'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
