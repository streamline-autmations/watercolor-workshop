import { Lesson } from "@/data/types";
import { useUserState } from "@/hooks/useUserState";
import { formatDuration } from "@/lib/utils";
import { Play, Pause, Rewind, FastForward, Maximize, Volume2, SkipForward } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

interface PlayerProps {
  lesson: Lesson;
  nextLesson: Lesson | null;
}

export const Player = ({ lesson, nextLesson }: PlayerProps) => {
  const { getLessonProgress, updateLessonProgress } = useUserState();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  
  const progress = getLessonProgress(lesson.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(progress?.watchedSec || 0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset player state when lesson changes
    setCurrentTime(getLessonProgress(lesson.id)?.watchedSec || 0);
    setIsPlaying(false);
  }, [lesson.id, getLessonProgress]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 1;
          if (newTime >= lesson.durationSec) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsPlaying(false);
            updateLessonProgress(lesson.id, lesson.durationSec);
            if (nextLesson) {
              navigate(`/lesson/${nextLesson.id}`);
            }
            return lesson.durationSec;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, lesson.durationSec, lesson.id, nextLesson, navigate, updateLessonProgress]);

  useEffect(() => {
    if (currentTime > 0) {
      updateLessonProgress(lesson.id, currentTime);
    }
  }, [currentTime, lesson.id, updateLessonProgress]);

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleSeek = (value: number[]) => setCurrentTime(value[0]);
  const handleSkip = (amount: number) => setCurrentTime(prev => Math.max(0, Math.min(lesson.durationSec, prev + amount)));
  
  const handleNextVideo = () => {
    if (nextLesson) {
      navigate(`/lesson/${nextLesson.id}`);
    }
  };

  const handleFullscreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (lesson.videoUrl) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden">
        <iframe
          src={lesson.videoUrl}
          loading="lazy"
          className="w-full h-full border-0"
          allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
          allowFullScreen={true}
        ></iframe>
      </div>
    );
  }

  return (
    <div ref={playerRef} className="aspect-video bg-ink rounded-2xl overflow-hidden flex flex-col justify-between text-white relative group">
      <img src={lesson.poster} alt={lesson.title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? 'opacity-20' : 'opacity-50'}`} />
      
      <div className="relative z-10 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-black/50 to-transparent">
        <h3 className="font-bold">{lesson.title}</h3>
      </div>

      <div className="relative z-10 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/50 to-transparent">
        <div className="px-2">
          <Slider
            value={[currentTime]}
            max={lesson.durationSec}
            step={1}
            onValueChange={handleSeek}
            className="w-full [&>span:first-child]:h-1.5 [&>span>span]:bg-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handlePlayPause}>
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleSkip(-10)}><Rewind className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleSkip(10)}><FastForward className="w-5 h-5" /></Button>
          {nextLesson && (
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleNextVideo}>
              <SkipForward className="w-5 h-5" />
            </Button>
          )}
          <span className="text-xs">{formatDuration(currentTime)} / {formatDuration(lesson.durationSec)}</span>
          <div className="flex-grow" />
          <Button variant="ghost" size="icon" className="rounded-full"><Volume2 className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleFullscreen}><Maximize className="w-5 h-5" /></Button>
        </div>
      </div>
    </div>
  );
};