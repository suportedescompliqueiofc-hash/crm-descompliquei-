import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface MediaMessageProps {
  path: string | null;
  type: 'imagem' | 'video';
}

export function MediaMessage({ path, type }: MediaMessageProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      setError("Caminho do arquivo não fornecido.");
      return;
    }

    const loadMedia = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-media-url', {
          body: { mediaPath: path },
        });

        if (functionError) throw new Error(`Falha na comunicação com o servidor: ${functionError.message}`);
        if (data.error) throw new Error(`Erro no servidor: ${data.error}`);
        if (!data.signedUrl) throw new Error("URL de mídia não retornada pelo servidor.");

        setMediaUrl(data.signedUrl);

      } catch (err: any) {
        console.error("Erro ao carregar mídia via Edge Function:", err);
        setError(err.message || "Erro desconhecido ao buscar mídia");
      } finally {
        setIsLoading(false);
      }
    };

    loadMedia();
  }, [path]);

  if (isLoading) {
    return <Skeleton className="w-64 h-48 rounded-lg mt-1 bg-muted" />;
  }

  if (error || !mediaUrl) {
    return (
      <div className="flex flex-col items-start justify-center p-3 mt-1 border border-destructive/30 bg-destructive/5 rounded text-xs text-destructive gap-1 w-full max-w-xs">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          <span>Erro ao carregar mídia</span>
        </div>
        <span>{error}</span>
        <span className="text-[10px] opacity-70 font-mono break-all">{path}</span>
      </div>
    );
  }

  if (type === 'imagem') {
    return (
      <div className="relative group mt-1">
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block relative">
          <img 
            src={mediaUrl} 
            alt="Mídia da conversa" 
            className="rounded-lg object-cover border border-border shadow-sm max-w-full max-h-[300px] bg-muted/20"
          />
        </a>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="mt-1">
        <video 
          src={mediaUrl} 
          controls 
          className="max-w-full rounded-lg border border-border shadow-sm max-h-[300px] bg-black" 
        />
      </div>
    );
  }

  return null;
}