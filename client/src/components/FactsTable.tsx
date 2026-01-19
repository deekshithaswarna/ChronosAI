import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Download, ArrowUpDown, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { parse, unparse } from 'papaparse';
import * as XLSX from 'xlsx';

interface Fact {
  id: number;
  eventDate: Date;
  originalDateText: string | null;
  summary: string;
  actor: string | null;
  issue: string | null;
  citation: string | null;
  fullText: string | null;
}

export function FactsTable() {
  const { data: facts, isLoading } = trpc.facts.list.useQuery();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'eventDate', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Fact>[]>(
    () => [
      {
        accessorKey: 'eventDate',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="hover:bg-transparent p-0"
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const date = new Date(row.getValue('eventDate'));
          return format(date, 'MMM d, yyyy');
        },
        sortingFn: 'datetime',
      },
      {
        accessorKey: 'summary',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="hover:bg-transparent p-0"
            >
              Summary
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="line-clamp-2">{row.getValue('summary')}</p>
          </div>
        ),
      },
      {
        accessorKey: 'actor',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="hover:bg-transparent p-0"
            >
              Actor
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => row.getValue('actor') || '—',
      },
      {
        accessorKey: 'issue',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="hover:bg-transparent p-0"
            >
              Issue
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => row.getValue('issue') || '—',
      },
      {
        accessorKey: 'citation',
        header: 'Citation',
        cell: ({ row }) => row.getValue('citation') || '—',
      },
    ],
    []
  );

  const table = useReactTable({
    data: facts || [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const exportToCSV = () => {
    if (!facts || facts.length === 0) return;

    const exportData = facts.map(fact => ({
      Date: format(new Date(fact.eventDate), 'yyyy-MM-dd'),
      Summary: fact.summary,
      Actor: fact.actor || '',
      Issue: fact.issue || '',
      Citation: fact.citation || '',
      'Full Text': fact.fullText || '',
    }));

    const csv = unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chronology-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    if (!facts || facts.length === 0) return;

    const exportData = facts.map(fact => ({
      Date: format(new Date(fact.eventDate), 'yyyy-MM-dd'),
      Summary: fact.summary,
      Actor: fact.actor || '',
      Issue: fact.issue || '',
      Citation: fact.citation || '',
      'Full Text': fact.fullText || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chronology');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 50 }, // Summary
      { wch: 20 }, // Actor
      { wch: 20 }, // Issue
      { wch: 20 }, // Citation
      { wch: 60 }, // Full Text
    ];

    XLSX.writeFile(workbook, `chronology-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!facts || facts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No facts extracted yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload and process documents to see facts in the table
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Export Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search facts..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results found
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} facts
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
