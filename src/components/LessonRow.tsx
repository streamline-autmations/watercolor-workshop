import { Link } from 'react-router-dom';
import { Lesson } from '@/data/types';
import { formatDuration } from '@/lib/utils';
import { useUserState } from '@/hooks/useUserState';
import { CheckCircle2, Lock, PlayCircle, Star } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { PillTag } from './PillTag';

interface LessonRowProps {
  lesson: Lesson;
  courseSlug: string;
}

export const LessonRow = ({ lesson, courseSlug }: LessonRowProps) => {
  const { getLessonProgress, isBookmarked, toggleBookmark } = useUserState();
  const progress = getLessonProgress(lesson.id);
  const isCompleted = progress?.completed;

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(lesson.id);
    toast.success(isBookmarked(lesson.id) ? "Bookmark removed" : "Lesson bookmarked!");
  };

  return (
    <Link to={`/lesson/${lesson.id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors group">
      <div className="text-primary">
        {isCompleted ? <CheckCircle2 /> : <PlayCircle />}
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-ink group-hover:text-primary">{lesson.title}</p>
        <span className="text-sm text-body-text/70">{formatDuration(lesson.durationSec)}</span>
      </div>
      {lesson.isPreview && <PillTag>Preview</PillTag>}
      <Button variant="ghost" size="icon" className="rounded-full" onClick={handleToggleBookmark}>
        <Star className={`w-5 h-5 transition-colors ${isBookmarked(lesson.id) ? 'text-yellow-400 fill-current' : 'text-body-text/50'}`} />
      </Button>
    </Link>
  );
};