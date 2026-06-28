import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Users, Sparkles, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function DramatisPersonae() {
  const utils = trpc.useUtils();
  const peopleQuery = trpc.dramatisPersonae.get.useQuery();
  const factsQuery = trpc.facts.list.useQuery();
  const generateMutation = trpc.dramatisPersonae.generate.useMutation();

  const people = peopleQuery.data ?? [];
  const factCount = factsQuery.data?.length ?? 0;

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync();
      await utils.dramatisPersonae.get.invalidate();
      toast.success('Dramatis personae generated');
    } catch {
      toast.error('Failed to generate dramatis personae');
    }
  };

  return (
    <div className="px-4 py-12" style={{ maxWidth: '98vw', margin: '0 auto', marginLeft: '50px' }}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold heading flex items-center gap-2">
            <Users className="h-7 w-7" /> Dramatis Personae
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            The cast of parties in the case — their roles, relevance, and where each is referenced in your documents.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generateMutation.isPending || factCount === 0} className="gap-2">
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {people.length > 0 ? 'Regenerate' : 'Generate from documents'}
        </Button>
      </div>

      {factCount === 0 && (
        <div className="mb-6 p-4 border border-foreground/15 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Upload documents first — the cast is built from your extracted chronology.
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
        <div className="bg-card rounded-lg shadow-md border border-foreground/10">
          <table className="w-full border-collapse legal-table" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-30" style={{ backgroundColor: '#000' }}>
              <tr className="bg-foreground text-background">
                <th className="p-4 text-left font-bold heading" style={{ width: '16%', minWidth: '140px' }}>Name</th>
                <th className="p-4 text-left font-bold heading" style={{ width: '16%', minWidth: '140px' }}>Role / Title</th>
                <th className="p-4 text-left font-bold heading" style={{ width: '40%', minWidth: '300px' }}>Relevance to the case</th>
                <th className="p-4 text-left font-bold heading" style={{ width: '28%', minWidth: '220px' }}>Referenced in</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person, index) => (
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
                            <a
                              href={ref.documentUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-foreground hover:text-[#E07A5F] hover:underline transition-colors"
                            >
                              {ref.documentTitle || ref.documentName || 'Document'}
                            </a>
                            {ref.pages.length > 0 && (
                              <span className="text-muted-foreground">
                                {'  '}
                                {ref.pages.map((p, i) => (
                                  <span key={p}>
                                    {i === 0 ? '(' : ', '}
                                    <a
                                      href={`${ref.documentUrl || '#'}#page=${p}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-[#E07A5F] hover:underline"
                                    >
                                      p.{p}
                                    </a>
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
    </div>
  );
}
