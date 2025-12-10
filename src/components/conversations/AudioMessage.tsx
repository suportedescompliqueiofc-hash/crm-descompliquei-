import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudioPlayer } from './AudioPlayer';
import { Skeleton } from '@/components/ui/skeleton';

interface AudioMessageProps {
  filePath: string;
}

export function AudioMessage({ filePath }: AudioMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      setError("Caminho do arquivo de áudio não fornecido.");
      return;
    }

    const getSignedUrlViaFunction = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('getSignedAudioUrl', {
        body: { filePath },
      });

      if (functionError) {
        console.error('Erro ao chamar a edge function:', functionError);
        // Tenta extrair a mensagem de erro específica do corpo da resposta
        const detailedError = functionError.context?.body?.error || functionError.message;
        setError(`Falha na comunicação com o servidor: ${detailedError}`);
        setAudioUrl(null);
      } else if (data.error) {
        console.error('Erro retornado pela edge function:', data.error);
        setError(`Não foi possível carregar o áudio: ${data.error}`);
        setAudioUrl(null);
      } else if (!data.signedUrl) {
        setError('O servidor não retornou uma URL de áudio válida.');
        setAudioUrl(null);
      }
      else {
        setAudioUrl(data.signedUrl);
      }
      setIsLoading(false);
    };

    getSignedUrlViaFunction();
  }, [filePath]);

  if (isLoading) {
    return <Skeleton className="w-64 h-10 rounded-md" />;
  }

  if (error || !audioUrl) {
    return <div className="text-xs text-destructive p-2">{error || 'Não foi possível carregar o áudio.'}</div>;
  }

  return <AudioPlayer audioUrl={audioUrl} />;
}