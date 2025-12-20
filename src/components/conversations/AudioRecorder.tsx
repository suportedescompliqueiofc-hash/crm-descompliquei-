import { useEffect } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();

  // Inicia a gravação automaticamente ao montar o componente
  useEffect(() => {
    startRecording();
    return () => {
      // Limpeza de segurança
      if (isRecording) cancelRecording();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopAndSend = () => {
    stopRecording();
  };

  // Efeito para enviar assim que o blob estiver pronto após parar
  useEffect(() => {
    if (!isRecording && audioBlob) {
      onSend(audioBlob);
    }
  }, [isRecording, audioBlob, onSend]);

  return (
    <div className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex-1 flex items-center gap-3 bg-muted/50 rounded-md px-3 py-2 border border-destructive/20">
        <div className="relative">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
        </div>
        <span className="text-sm font-mono font-medium text-destructive">
          {formatTime(recordingTime)}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          Gravando áudio...
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={() => {
          cancelRecording();
          onCancel();
        }}
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      <Button
        type="button"
        size="icon"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={handleStopAndSend}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}