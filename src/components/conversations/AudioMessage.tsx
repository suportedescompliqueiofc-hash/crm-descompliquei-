import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer } from './AudioPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AudioMessageProps {
  filePath: string;
  variant?: 'incoming' | 'outgoing';
}

export function AudioMessage({ filePath, variant = 'incoming' }: AudioMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudio = async () => {
    if (!filePath) {
      setIsLoading(false);
      setError("Caminho inválido");
      return;
    }

    // Suporte para Optimistic UI (blob local)
    if (filePath.startsWith('blob:')) {
      setAudioUrl(filePath);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Chama a função centralizada para URLs de mídia
      const { data, error: functionError } = await supabase.functions.invoke('get-media-url', {
        body: { mediaPath: filePath },
      });

      if (functionError || !data?.signedUrl) {
        console.warn('Falha ao buscar áudio via Edge Function, tentando fallback direto...');
        // Tentativa de fallback direto em diferentes buckets para máxima resiliência
        const buckets = ['media-mensagens', 'audio-mensagens', 'campaign-media'];
        let foundUrl = null;

        for (const bucket of buckets) {
            let cleanPath = filePath;
            if (cleanPath.startsWith(`${bucket}/`)) {
                cleanPath = cleanPath.substring(bucket.length + 1);
            }
            const { data: fallbackData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
            if (fallbackData?.publicUrl) {
                // Checagem básica se a URL é válida (não 404 instantâneo)
                foundUrl = fallbackData.publicUrl;
                break;
            }
        }

        if (foundUrl) {
            setAudioUrl(foundUrl);
            setError(null);
        } else {
            setError("Áudio não encontrado no servidor.");
        }
      } else {
        setAudioUrl(data.signedUrl);
      }
    } catch (err) {
      console.error("Exceção ao buscar áudio:", err);
      setError("Falha na comunicação");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAudio();
  }, [filePath]);

  if (isLoading) {
    return (
      <div className={cn("w-64 h-14 rounded-xl flex items-center px-3 gap-3", variant === 'outgoing' ? "bg-white/10" : "bg-muted/50")}>
        <Skeleton className={cn("h-9 w-9 rounded-full shrink-0", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
        <div className="flex-1 space-y-2">
            <Skeleton className={cn("h-1.5 w-full rounded", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
            <Skeleton className={cn("h-1.5 w-2/3 rounded", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
        </div>
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className={cn(
        "flex flex-col gap-2 p-3 w-64 rounded-xl border border-dashed", 
        variant === 'outgoing' ? "bg-white/10 text-white/70 border-white/30" : "bg-destructive/5 text-destructive border-destructive/20"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4" />
            <span>{error || "Áudio indisponível"}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 hover:bg-black/10 rounded-full" 
            onClick={fetchAudio}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[9px] opacity-60 font-mono truncate">{filePath.split('/').pop()}</p>
      </div>
    );
  }

  return <AudioPlayer audioUrl={audioUrl} variant={variant} />;
}