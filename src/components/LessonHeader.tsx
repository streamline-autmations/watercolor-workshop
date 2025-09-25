import { Link } from 'react-router-dom';
import { Course, Module, Lesson } from '@/data/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonHeaderProps {
  course: Course;
  module: Module;
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
}

export const LessonHeader = ({ course, module, lesson, prevLesson, nextLesson }: LessonHeaderProps) => {
  const isChristmasCourse = course.slug === 'christmas-watercolor-workshop';

  const breadcrumbClass = isChristmasCourse ? "hover:text-accent-foreground" : "hover:text-primary";

  return (
    <div className="bg-white/70 dark:bg-blom-dark-card/70 backdrop-blur-lg p-4 rounded-2xl shadow-card mb-8 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center text-sm font-medium text-body-text/80 overflow-hidden">
        <Link to={`/course/${course.slug}`} className={cn("truncate", breadcrumbClass)}>
          {course.title}
        </Link>
        <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
        <span className="truncate text-body-text">{module.title}</span>
      </div>
      <div className="flex items-center gap-2">
        {prevLesson ? (
          <Button asChild variant="outline" size="icon" className="rounded-full">
            <Link to={`/lesson/${prevLesson.id}`} title="Previous Lesson">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" className="rounded-full" disabled>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        {nextLesson ? (
          <Button asChild size="icon" className="rounded-full">
            <Link to={`/lesson/${nextLesson.id}`} title="Next Lesson">
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        ) : (
          <Button size="icon" className="rounded-full" disabled>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};