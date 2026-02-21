"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  variant?: 'incoming' | 'outgoing';
}

const formatTime = (time: number) => {
  if (isNaN(time) || !isFinite(time)) return '00:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ audioUrl, variant = 'incoming' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isOutgoing = variant === 'outgoing';

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      setHasError(false);
      setIsLoading(true);

      const handleLoadedMetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
        setIsLoading(false);
      };

      const handleTimeUpdate = () => {
        if (!isDragging) {
          setCurrentTime(audio.currentTime);
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleError = () => {
        console.error("Erro ao carregar áudio:", audio.error);
        setHasError(true);
        setIsLoading(false);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      // Forçar recarregamento ao mudar URL
      audio.load();

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioUrl, isDragging]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (audioRef.current && !isLoading && !hasError) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Erro ao reproduzir:", error);
            setIsPlaying(false);
          });
        }
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
    setIsDragging(true);
    setCurrentTime(value[0]);
  };

  const handleSliderCommit = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
    }
    setIsDragging(false);
  };

  if (hasError) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border border-dashed",
        isOutgoing ? "bg-white/10 border-white/20 text-white" : "bg-destructive/5 border-destructive/20 text-destructive"
      )}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-[10px] font-medium">Erro ao carregar áudio</span>
      </div>
    );
  }

  return (
    <div className={cn(
        "flex flex-col gap-1",
        "w-[260px] xs:w-[300px] sm:w-[320px] md:w-[340px]"
    )}>
      {/* crossOrigin="anonymous" é essencial para evitar bloqueios de CORS ao processar o áudio */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="anonymous" />
      
      <div className="flex items-center gap-2.5">
        <Button 
          onClick={togglePlay} 
          size="icon" 
          variant="ghost" 
          className={cn(
            "flex-shrink-0 h-10 w-10 transition-colors rounded-full",
            isOutgoing 
              ? "text-primary-foreground hover:bg-white/20 hover:text-white" 
              : "text-foreground hover:bg-black/5"
          )} 
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </Button>
        
        <div className="flex-grow flex flex-col gap-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2.5">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.1}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              className={cn(
                "flex-1 cursor-pointer py-1",
                "[&>span:first-child]:h-1",
                isOutgoing 
                  ? "[&>span:first-child]:bg-black/20" 
                  : "[&>span:first-child]:bg-muted-foreground/20",
                "[&>span:first-child>span]:bg-current",
                isOutgoing ? "text-white" : "text-primary",
                "[&>span[role=slider]]:h-3 [&>span[role=slider]]:w-3 [&>span[role=slider]]:border-0 [&>span[role=slider]]:shadow-sm"
              )}
              disabled={isLoading || duration === 0}
            />
            
            <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeed}
                disabled={isLoading}
                className={cn(
                    "h-6 px-1.5 text-[10px] font-bold rounded-md flex-shrink-0 min-w-[2.2rem]",
                    isOutgoing
                        ? "bg-black/20 text-white hover:bg-black/30" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
            >
                {playbackRate.toFixed(1)}x
            </Button>
          </div>

          <div className={cn(
            "flex justify-between items-center text-[10px] px-0.5 font-medium",
            isOutgoing ? "text-white/80" : "text-muted-foreground"
          )}>
            <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
            <span className="font-mono tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}