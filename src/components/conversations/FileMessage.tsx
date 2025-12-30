import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Loader2, AlertTriangle, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Document, Page, pdfjs } from 'react-pdf';
import { Skeleton } from '@/components/ui/skeleton';

// Configuração obrigatória do worker do PDF.js para funcionar com Vite/React
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FileMessageProps {
  path: string;
  fileName?: string;
}

export function FileMessage({ path, fileName = "Documento" }: FileMessageProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      setIsLoadingUrl(false);
      setError("Caminho do arquivo não fornecido.");
      return;
    }

    const loadFile = async () => {
      setIsLoadingUrl(true);
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
        setIsLoadingUrl(false);
      }
    };

    loadFile();
  }, [path]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsPdfLoading(false);
  };

  const isPdf = fileName.toLowerCase().endsWith('.pdf') || (fileUrl && fileUrl.toLowerCase().includes('.pdf'));

  // Estado de carregamento inicial (buscando URL)
  if (isLoadingUrl) {
    return (
      <div className="w-64 h-48 bg-muted/30 rounded-lg border flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Carregando documento...</span>
      </div>
    );
  }

  // Estado de Erro
  if (error || !fileUrl) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20 w-64">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <span className="text-xs text-destructive">{error || "Erro ao carregar"}</span>
      </div>
    );
  }

  // Visualização estilo WhatsApp para PDFs
  if (isPdf) {
    return (
      <div className="group relative w-64 overflow-hidden rounded-lg border bg-background shadow-sm hover:shadow-md transition-all">
        {/* Área de Preview (Capa) */}
        <div className="relative bg-gray-100 min-h-[160px] flex items-center justify-center overflow-hidden cursor-pointer">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            {isPdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-50">
                <Skeleton className="w-full h-full" />
                <Loader2 className="absolute h-8 w-8 animate-spin text-primary/30" />
              </div>
            )}
            
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<Skeleton className="w-full h-[160px]" />}
              className="flex justify-center"
              error={
                <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground p-4 text-center">
                  <FileText className="h-10 w-10 mb-2 opacity-20" />
                  <span className="text-xs">Pré-visualização indisponível</span>
                </div>
              }
            >
              {/* Renderiza apenas a primeira página como thumbnail */}
              <Page 
                pageNumber={1} 
                width={256} // Largura fixa do container w-64 (256px)
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
            </Document>
          </a>
        </div>

        {/* Rodapé com Informações */}
        <div className="flex items-center justify-between p-3 bg-card border-t bg-white/95 dark:bg-zinc-900/95 backdrop-blur">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-red-600 dark:text-red-400 shrink-0">
              <FileType className="h-5 w-5" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate text-foreground leading-tight" title={fileName}>
                {fileName}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {numPages ? `${numPages} página${numPages > 1 ? 's' : ''} • ` : ''}PDF
              </span>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download title="Baixar PDF">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Fallback para outros tipos de arquivo (Visualização antiga)
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg shadow-sm w-64 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate text-foreground">{fileName}</span>
          <span className="text-[10px] text-muted-foreground uppercase">Arquivo</span>
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