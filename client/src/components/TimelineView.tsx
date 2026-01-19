import { useEffect, useRef, useState } from 'react';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data/peer';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TimelineViewProps {
  actorFilter?: string;
  issueFilter?: string;
}

export function TimelineView({ actorFilter, issueFilter }: TimelineViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);
  const { data: facts, isLoading } = trpc.facts.list.useQuery();

  useEffect(() => {
    if (!timelineRef.current || !facts || facts.length === 0) return;

    // Filter facts based on actor and issue
    let filteredFacts = facts;
    if (actorFilter && actorFilter !== 'all') {
      filteredFacts = filteredFacts.filter(f => f.actor === actorFilter);
    }
    if (issueFilter && issueFilter !== 'all') {
      filteredFacts = filteredFacts.filter(f => f.issue === issueFilter);
    }

    // Convert facts to timeline items
    const items = new DataSet(
      filteredFacts.map((fact, index) => ({
        id: fact.id,
        content: `<div class="timeline-item-content">
          <div class="font-semibold text-sm">${escapeHtml(fact.summary)}</div>
          ${fact.actor ? `<div class="text-xs text-muted-foreground mt-1">Actor: ${escapeHtml(fact.actor)}</div>` : ''}
          ${fact.issue ? `<div class="text-xs text-muted-foreground">Issue: ${escapeHtml(fact.issue)}</div>` : ''}
        </div>`,
        start: new Date(fact.eventDate),
        type: 'point',
        className: `timeline-item-${index % 5}`,
      }))
    );

    const options = {
      width: '100%',
      height: '500px',
      margin: {
        item: 20,
        axis: 40,
      },
      orientation: 'top',
      zoomMin: 1000 * 60 * 60 * 24 * 7, // 1 week
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
    };

    // Create or update timeline
    if (!timelineInstance.current) {
      timelineInstance.current = new Timeline(timelineRef.current, items, options);
    } else {
      timelineInstance.current.setItems(items);
    }

    // Fit timeline to show all items
    if (filteredFacts.length > 0) {
      timelineInstance.current.fit();
    }

    return () => {
      // Cleanup on unmount
      if (timelineInstance.current) {
        timelineInstance.current.destroy();
        timelineInstance.current = null;
      }
    };
  }, [facts, actorFilter, issueFilter]);

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
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No facts extracted yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload and process documents to see facts on the timeline
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div ref={timelineRef} className="w-full" />
    </Card>
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
