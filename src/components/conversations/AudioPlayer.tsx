import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        setDuration(audio.duration);
        setCurrentTime(audio.currentTime);
        setIsLoading(false);
      };

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      const handleEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      const handleCanPlay = () => {
        setIsLoading(false);
      };

      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', handleEnd);
      audio.addEventListener('canplay', handleCanPlay);
      
      if (audio.readyState >= 2) {
        setAudioData();
      }

      return () => {
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', handleEnd);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [audioUrl]);

  // Aplica a velocidade de reprodução sempre que o estado mudar
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (audioRef.current && !isLoading) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleSpeed = () => {
    setPlaybackRate(current => {
        if (current === 1) return 1.5;
        if (current === 1.5) return 2;
        return 1;
    });
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  return (
    <div className="flex items-center gap-2 w-64">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <Button onClick={togglePlay} size="icon" variant="ghost" className="flex-shrink-0 h-8 w-8 hover:bg-black/5 dark:hover:bg-white/10" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </Button>
      <div className="flex-grow flex items-center gap-2">
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSliderChange}
          className={cn(
            "w-full",
            // Estilos da trilha (barra de fundo)
            "[&>span:first-child]:h-1 [&>span:first-child]:bg-muted-foreground/20",
            // Estilos do preenchimento (barra de progresso)
            "[&>span:first-child>span]:bg-destructive",
            // Estilos do controle deslizante (thumb)
            "[&>span[role=slider]]:h-3.5 [&>span[role=slider]]:w-3.5 [&>span[role=slider]]:border-2 [&>span[role=slider]]:border-warning [&>span[role=slider]]:bg-white"
          )}
          disabled={isLoading || duration === 0}
        />
        
        <Button
            variant="ghost"
            size="sm"
            onClick={toggleSpeed}
            disabled={isLoading}
            className="h-6 px-2 text-[10px] font-medium rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-foreground/80 hover:text-foreground flex-shrink-0 min-w-[2.5rem] transition-all"
        >
            {playbackRate}x
        </Button>

        <span className="text-[10px] text-muted-foreground font-mono w-9 text-right flex-shrink-0 tabular-nums">
            {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}