import { FileText, Loader2, CheckCircle2, XCircle, Trash2, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export function DocumentsList() {
  const utils = trpc.useUtils();
  const { data: documents, isLoading } = trpc.documents.list.useQuery();
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const updateTitleMutation = trpc.documents.updateTitle.useMutation();
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      utils.facts.list.invalidate();
      toast.success('Document deleted');
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card className="p-12 text-center bg-transparent border-none shadow-none">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload your first legal document to get started
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map(doc => (
        <Card key={doc.id} className="p-4 bg-transparent border border-foreground/20 shadow-none hover:border-foreground/40 transition-all duration-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg flex-shrink-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {editingDocId === doc.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={async () => {
                        if (editingTitle && editingTitle !== (doc.documentTitle || doc.originalFilename)) {
                          await updateTitleMutation.mutateAsync({
                            id: doc.id,
                            title: editingTitle
                          });
                          utils.documents.list.invalidate();
                          utils.facts.list.invalidate();
                        }
                        setEditingDocId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                        if (e.key === 'Escape') {
                          setEditingDocId(null);
                        }
                      }}
                      autoFocus
                      className="font-semibold text-sm px-2 py-1 border border-foreground rounded-md focus:outline-none focus:ring-1 focus:ring-[#E07A5F] w-full"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <a 
                        href={doc.s3Url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-sm hover:text-[#E07A5F] hover:underline transition-colors"
                      >
                        {doc.documentTitle || doc.originalFilename}
                      </a>
                      <button
                        onClick={() => {
                          setEditingDocId(doc.id);
                          setEditingTitle(doc.documentTitle || doc.originalFilename);
                        }}
                        className="text-muted-foreground hover:text-[#E07A5F] transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.status === 'pending' && (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Pending
                    </Badge>
                  )}
                  {doc.status === 'processing' && (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </Badge>
                  )}
                  {doc.status === 'completed' && (
                    <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                  {doc.status === 'failed' && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ id: doc.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {doc.status === 'failed' && doc.errorMessage && (
                <p className="text-xs text-destructive mt-2">
                  Error: {doc.errorMessage}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
