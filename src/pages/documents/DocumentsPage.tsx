import { useState } from 'react';
import { Upload, FileText, Link as LinkIcon, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'url';
  size?: string;
  status: 'processing' | 'indexed' | 'failed';
  progress?: number;
  chunks?: number;
}

const mockDocuments: Document[] = [
  { id: '1', name: 'Product Documentation.pdf', type: 'pdf', size: '2.4 MB', status: 'indexed', chunks: 156 },
  { id: '2', name: 'FAQ.txt', type: 'txt', size: '45 KB', status: 'indexed', chunks: 23 },
  { id: '3', name: 'https://example.com/help', type: 'url', status: 'processing', progress: 67 },
  { id: '4', name: 'Pricing Guide.pdf', type: 'pdf', size: '1.1 MB', status: 'failed' },
];

const statusConfig = {
  processing: { icon: Clock, color: 'text-accent-foreground', bg: 'bg-accent/30' },
  indexed: { icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10' },
  failed: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export const DocumentsPage = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [urlInput, setUrlInput] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: file.name.endsWith('.pdf') ? 'pdf' : 'txt',
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: 'processing',
        progress: 0,
      };
      setDocuments(prev => [newDoc, ...prev]);
      
      toast({
        title: "Document uploaded",
        description: `${file.name} is being processed...`,
      });
    });
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    const newDoc: Document = {
      id: Date.now().toString(),
      name: urlInput,
      type: 'url',
      status: 'processing',
      progress: 0,
    };
    setDocuments(prev => [newDoc, ...prev]);
    setUrlInput('');
    
    toast({
      title: "URL added",
      description: "Content is being fetched and indexed...",
    });
  };

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Document removed",
      description: "The document has been deleted.",
    });
  };

  const handleRetry = (id: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, status: 'processing' as const, progress: 0 } : doc
    ));
    toast({
      title: "Retrying...",
      description: "Attempting to process the document again.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">
            Upload documents to train your AI agents with your knowledge base
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Upload Files</CardTitle>
              <CardDescription>
                Drag and drop or click to upload PDFs and text files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="mb-2 text-sm text-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, TXT (MAX 10MB each)
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.txt"
                  multiple
                  onChange={handleFileUpload}
                />
              </label>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Add Website URL</CardTitle>
              <CardDescription>
                We'll crawl and index the content from web pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="url"
                        placeholder="https://example.com/docs"
                        className="pl-10"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleUrlAdd}>Add</Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll extract text content from the page and any linked pages
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Your Documents</CardTitle>
            <CardDescription>
              {documents.length} documents • {documents.filter(d => d.status === 'indexed').length} indexed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">No documents yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload files or add URLs to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const StatusIcon = statusConfig[doc.status].icon;
                  return (
                    <div 
                      key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        doc.type === 'pdf' ? "bg-destructive/10" : doc.type === 'url' ? "bg-accent/30" : "bg-muted/30"
                      )}>
                        {doc.type === 'url' ? (
                          <LinkIcon className="w-5 h-5 text-accent-foreground" />
                        ) : (
                          <FileText className={cn(
                            "w-5 h-5",
                            doc.type === 'pdf' ? "text-destructive" : "text-muted-foreground"
                          )} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {doc.size && (
                            <span className="text-xs text-muted-foreground">{doc.size}</span>
                          )}
                          {doc.chunks && (
                            <span className="text-xs text-muted-foreground">• {doc.chunks} chunks</span>
                          )}
                        </div>
                        {doc.status === 'processing' && doc.progress !== undefined && (
                          <Progress value={doc.progress} className="h-1 mt-2" />
                        )}
                      </div>

                      <Badge 
                        variant="outline" 
                        className={cn("capitalize", statusConfig[doc.status].bg, statusConfig[doc.status].color)}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {doc.status}
                      </Badge>

                      <div className="flex items-center gap-1">
                        {doc.status === 'failed' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleRetry(doc.id)}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DocumentsPage;
