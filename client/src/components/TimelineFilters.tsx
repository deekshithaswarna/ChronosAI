import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Filter } from 'lucide-react';

interface TimelineFiltersProps {
  actorFilter: string;
  issueFilter: string;
  onActorChange: (value: string) => void;
  onIssueChange: (value: string) => void;
}

export function TimelineFilters({
  actorFilter,
  issueFilter,
  onActorChange,
  onIssueChange,
}: TimelineFiltersProps) {
  const { data: facts } = trpc.facts.list.useQuery();

  // Extract unique actors and issues from facts
  const actors = Array.from(new Set(facts?.map(f => f.actor).filter(Boolean))) as string[];
  const issues = Array.from(new Set(facts?.map(f => f.issue).filter(Boolean))) as string[];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="actor-filter">Filter by Actor</Label>
          <Select value={actorFilter} onValueChange={onActorChange}>
            <SelectTrigger id="actor-filter">
              <SelectValue placeholder="All actors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {actors.map(actor => (
                <SelectItem key={actor} value={actor}>
                  {actor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue-filter">Filter by Issue</Label>
          <Select value={issueFilter} onValueChange={onIssueChange}>
            <SelectTrigger id="issue-filter">
              <SelectValue placeholder="All issues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All issues</SelectItem>
              {issues.map(issue => (
                <SelectItem key={issue} value={issue}>
                  {issue}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
