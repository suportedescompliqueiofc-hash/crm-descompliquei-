import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileMessageProps {
  path: string;
  fileName?: string;
}

export function FileMessage({ path, fileName = "Documento" }: FileMessageProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      setError("Caminho do arquivo não fornecido.");
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-media-url', {
          body: { mediaPath: path },
        });

        if (functionError) throw new Error(`Erro: ${functionError.message}`);
        if (data.error) throw new Error(`Erro: ${data.error}`);
        if (!data.signedUrl) throw new Error("URL não retornada.");

        setFileUrl(data.signedUrl);

      } catch (err: any) {
        console.error("Erro ao carregar arquivo:", err);
        setError("Não foi possível carregar o arquivo.");
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [path]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border w-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Carregando documento...</span>
      </div>
    );
  }

  if (error || !fileUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20 w-64">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <span className="text-xs text-destructive">{error || "Erro ao carregar"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg shadow-sm w-64 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="bg-red-100 p-2 rounded-lg text-red-600">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate text-foreground">{fileName}</span>
          <span className="text-[10px] text-muted-foreground uppercase">PDF / Documento</span>
        </div>
      </div>
      
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
          <Download className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}