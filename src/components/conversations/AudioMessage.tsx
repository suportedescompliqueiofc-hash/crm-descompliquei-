import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer } from './AudioPlayer';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface AudioMessageProps {
  filePath: string;
}

export function AudioMessage({ filePath }: AudioMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      setError(true);
      return;
    }

    // Suporte para Optimistic UI: Se for um blob local, usa diretamente
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
    return <Skeleton className="w-64 h-10 rounded-md" />;
  }

  if (error || !audioUrl) {
    // Fallback discreto em vez de mensagem de erro gigante
    return (
      <div className="flex items-center gap-2 p-2 w-64 bg-muted/30 rounded-md text-xs text-muted-foreground border border-dashed">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <span>Áudio indisponível</span>
      </div>
    );
  }

  return <AudioPlayer audioUrl={audioUrl} />;
}