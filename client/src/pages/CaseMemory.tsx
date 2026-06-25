import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, Wand2, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function CaseMemory() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const caseQuery = trpc.caseMemory.get.useQuery();
  const factsQuery = trpc.facts.list.useQuery();

  const generateMutation = trpc.caseMemory.generate.useMutation();
  const updateMutation = trpc.caseMemory.update.useMutation();
  const reEvaluateMutation = trpc.facts.reEvaluateKeyFacts.useMutation();

  // Local editable state mirrors the stored case memory.
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [parties, setParties] = useState('');
  const [issues, setIssues] = useState('');
  const [dirty, setDirty] = useState(false);

  // Hydrate local state when the query loads (and we're not mid-edit).
  useEffect(() => {
    if (caseQuery.data && !dirty) {
      setTitle(caseQuery.data.title || '');
      setSummary(caseQuery.data.summary || '');
      setParties((caseQuery.data.parties || []).join(', '));
      setIssues((caseQuery.data.issues || []).join('\n'));
    }
  }, [caseQuery.data, dirty]);

  const hasCase = Boolean(caseQuery.data?.summary);
  const factCount = factsQuery.data?.length ?? 0;

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync();
      if (!result) {
        toast.error('No facts to summarise yet. Upload documents first.');
        return;
      }
      setDirty(false);
      await utils.caseMemory.get.invalidate();
      toast.success('Case summary generated from your documents');
    } catch (e) {
      toast.error('Failed to generate case summary');
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        title: title.trim(),
        summary,
        parties: parties.split(',').map(p => p.trim()).filter(Boolean),
        issues: issues.split('\n').map(i => i.trim()).filter(Boolean),
        source: 'user',
      });
      setDirty(false);
      await utils.caseMemory.get.invalidate();
      toast.success('Case memory saved');
    } catch (e) {
      toast.error('Failed to save case memory');
    }
  };

  const handleReEvaluate = async () => {
    try {
      const res = await reEvaluateMutation.mutateAsync();
      await utils.facts.list.invalidate();
      if (res?.reason === 'no-case-memory') {
        toast.error('Save a case summary first, then re-evaluate.');
      } else {
        toast.success(`Key facts re-evaluated (${res?.scored ?? 0} events scored)`);
      }
    } catch (e) {
      toast.error('Failed to re-evaluate key facts');
    }
  };

  const markDirty = () => setDirty(true);

  return (
    <div className="container py-12 max-w-4xl">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold heading">Case Memory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The tool's understanding of your case. It drives which facts get flagged as key in the chronology.
            Generate it from your documents, then edit freely.
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={handleGenerate} disabled={generateMutation.isPending || factCount === 0} className="gap-2">
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {hasCase ? 'Regenerate from documents' : 'Generate from documents'}
        </Button>
        <Button variant="outline" onClick={handleSave} disabled={updateMutation.isPending || !summary.trim()} className="gap-2">
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
        <Button variant="outline" onClick={handleReEvaluate} disabled={reEvaluateMutation.isPending || !hasCase} className="gap-2">
          {reEvaluateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Re-evaluate key facts
        </Button>
      </div>

      {factCount === 0 && (
        <div className="mb-6 p-4 border border-foreground/15 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Upload documents first — the case summary is deduced from your extracted chronology.
        </div>
      )}

      {caseQuery.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="text-sm font-semibold heading block mb-2">Case title</label>
            <Input
              value={title}
              onChange={e => { setTitle(e.target.value); markDirty(); }}
              placeholder="e.g. Sharma v. StratAIR — Flight Delay Claim"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="text-sm font-semibold heading block mb-2">Summary</label>
            <Textarea
              value={summary}
              onChange={e => { setSummary(e.target.value); markDirty(); }}
              placeholder="Generate from documents, or type / paste your own case summary here…"
              className="min-h-[260px] text-sm leading-relaxed"
            />
            {caseQuery.data?.source && (
              <p className="text-xs text-muted-foreground mt-1">
                Source: {caseQuery.data.source === 'ai' ? 'AI-generated' : caseQuery.data.source === 'user' ? 'Edited by you' : 'Uploaded'}
                {dirty && ' • unsaved changes'}
              </p>
            )}
          </div>

          {/* Parties */}
          <div>
            <label className="text-sm font-semibold heading block mb-2">Key parties <span className="font-normal text-muted-foreground">(comma-separated)</span></label>
            <Input
              value={parties}
              onChange={e => { setParties(e.target.value); markDirty(); }}
              placeholder="Priya Sharma, StratAIR UK Limited"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {parties.split(',').map(p => p.trim()).filter(Boolean).map((p, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div>
            <label className="text-sm font-semibold heading block mb-2">Disputed issues <span className="font-normal text-muted-foreground">(one per line)</span></label>
            <Textarea
              value={issues}
              onChange={e => { setIssues(e.target.value); markDirty(); }}
              placeholder={'Liability for flight delay\nEntitlement to compensation under UK261\nWhether extraordinary circumstances apply'}
              className="min-h-[120px] text-sm"
            />
          </div>

          <div className="pt-2 border-t border-foreground/10">
            <p className="text-sm text-muted-foreground mb-3">
              When your summary reflects the case, re-evaluate so the chronology highlights the most material events.
            </p>
            <Button onClick={() => navigate('/chronology')} variant="link" className="p-0 h-auto">
              Go to chronology →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
