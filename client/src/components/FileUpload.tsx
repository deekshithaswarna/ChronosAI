import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface UploadedFile {
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function FileUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const uploadMutation = trpc.documents.upload.useMutation();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const ACCEPTED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    for (const file of acceptedFiles) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`File too large: ${file.name} (max 50MB)`);
        continue;
      }

      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        status: 'uploading',
        progress: 0,
      };

      setFiles(prev => [...prev, uploadedFile]);

      try {
        // Convert file to base64
        const base64Data = await fileToBase64(file);

        // Upload file
        await uploadMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
          base64Data,
        });

        setFiles(prev =>
          prev.map(f =>
            f.name === file.name ? { ...f, status: 'success', progress: 100 } : f
          )
        );

        toast.success(`${file.name} uploaded successfully`);
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      } catch (error) {
        setFiles(prev =>
          prev.map(f =>
            f.name === file.name
              ? { ...f, status: 'error', error: String(error) }
              : f
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [uploadMutation, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed rounded-none p-12 text-center cursor-pointer transition-all duration-200 bg-transparent ${
          isDragActive
            ? 'border-foreground'
            : 'border-foreground/40 hover:border-foreground/70'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <Button 
            type="button" 
            variant="default" 
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
          <div className="text-xs text-muted-foreground">
            Supports PDF, Word (.docx, .doc), and Text files (max 50MB)
          </div>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card key={index} className="p-4 bg-transparent border-none shadow-none">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>
                <div className="flex-shrink-0">
                  {file.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = error => reject(error);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
