"use client";

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isOutgoing = variant === 'outgoing';

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        setDuration(audio.duration);
        if (!isDragging) {
            setCurrentTime(audio.currentTime);
        }
        setIsLoading(false);
      };

      const setAudioTime = () => {
        if (!isDragging) {
            setCurrentTime(audio.currentTime);
        }
      };

      const handleEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      
      const handleCanPlay = () => {
        setIsLoading(false);
      };

      audio.addEventListener('loadedmetadata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', handleEnd);
      audio.addEventListener('canplay', handleCanPlay);
      
      if (audio.readyState >= 2) {
        setAudioData();
      }

      return () => {
        audio.removeEventListener('loadedmetadata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', handleEnd);
        audio.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [audioUrl, isDragging]);

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
    setIsDragging(true);
    setCurrentTime(value[0]);
  };

  const handleSliderCommit = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
    }
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col gap-1 w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[380px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <div className="flex items-center gap-2">
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
        
        <div className="flex-grow flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.01}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              className={cn(
                "flex-1 cursor-pointer py-2",
                "[&>span:first-child]:h-1.5",
                isOutgoing 
                  ? "[&>span:first-child]:bg-black/20" 
                  : "[&>span:first-child]:bg-muted-foreground/20",
                "[&>span:first-child>span]:bg-current",
                isOutgoing ? "text-white" : "text-primary",
                "[&>span[role=slider]]:h-4 [&>span[role=slider]]:w-4 [&>span[role=slider]]:border-0 [&>span[role=slider]]:shadow-md [&>span[role=slider]]:transition-transform active:[&>span[role=slider]]:scale-125",
                isOutgoing
                   ? "[&>span[role=slider]]:bg-white"
                   : "[&>span[role=slider]]:bg-primary"
              )}
              disabled={isLoading || duration === 0}
            />
            
            <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeed}
                disabled={isLoading}
                className={cn(
                    "h-7 px-1.5 text-[10px] font-bold rounded-full flex-shrink-0 min-w-[2.5rem] transition-all",
                    isOutgoing
                        ? "bg-black/20 text-white hover:bg-black/30" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
            >
                {playbackRate.toFixed(1)}x
            </Button>
          </div>

          <div className="flex justify-between items-center px-1">
            <span className={cn(
                "text-[10px] font-mono tabular-nums",
                isOutgoing ? "text-white/80" : "text-muted-foreground"
            )}>
                {formatTime(currentTime)}
            </span>
            <span className={cn(
                "text-[10px] font-mono tabular-nums",
                isOutgoing ? "text-white/80" : "text-muted-foreground"
            )}>
                {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}