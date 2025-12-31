import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer } from './AudioPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioMessageProps {
  filePath: string;
  variant?: 'incoming' | 'outgoing';
}

export function AudioMessage({ filePath, variant = 'incoming' }: AudioMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      setError(true);
      return;
    }

    // Suporte para Optimistic UI
    if (filePath.startsWith('blob:')) {
      setAudioUrl(filePath);
      setIsLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;

    const getSignedUrlViaFunction = async () => {
      setIsLoading(true);
      setError(false);

      try {
        const { data, error: functionError } = await supabase.functions.invoke('getSignedAudioUrl', {
          body: { filePath },
        });

        if (!isMounted) return;

        if (functionError) {
          console.warn('Falha na edge function de áudio:', functionError);
          setError(true);
        } else if (data?.error || !data?.signedUrl) {
          console.warn('Erro retornado pela função de áudio:', data?.error);
          setError(true);
        } else {
          setAudioUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("Exceção ao buscar áudio:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    getSignedUrlViaFunction();

    return () => {
      isMounted = false;
    };
  }, [filePath]);

  if (isLoading) {
    return (
      <div className={cn("w-64 h-12 rounded-md flex items-center px-2", variant === 'outgoing' ? "bg-white/10" : "bg-muted/50")}>
        <Skeleton className={cn("h-8 w-8 rounded-full mr-2", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
        <Skeleton className={cn("h-2 flex-1 rounded", variant === 'outgoing' ? "bg-white/20" : "bg-muted-foreground/20")} />
      </div>
    );
  }

  if (error || !audioUrl) {
    return (
      <div className={cn("flex items-center gap-2 p-2 w-64 rounded-md text-xs border border-dashed", 
        variant === 'outgoing' ? "bg-white/10 text-white/70 border-white/20" : "bg-muted/30 text-muted-foreground")}>
        <AlertCircle className="h-4 w-4" />
        <span>Áudio indisponível</span>
      </div>
    );
  }

  return <AudioPlayer audioUrl={audioUrl} variant={variant} />;
}