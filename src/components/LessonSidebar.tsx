import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Course, Module, Lesson } from '@/data/types';
import { useUserState } from '@/hooks/useUserState';
import { Input } from '@/components/ui/input';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonSidebarProps {
  course: Course;
  modules: Module[];
  lessons: Lesson[];
}

export const LessonSidebar = ({ course, modules, lessons }: LessonSidebarProps) => {
  const { lessonId: activeLessonId } = useParams<{ lessonId: string }>();
  const { getLessonProgress } = useUserState();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="bg-white/70 backdrop-blur-lg p-4 rounded-2xl shadow-card h-full sticky top-24">
      <Input
        placeholder="Search lessons..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4 rounded-full"
      />
      <div className="space-y-4 overflow-y-auto h-[calc(100vh-240px)] pr-2">
        {modules.map(module => {
          const moduleLessons = filteredLessons.filter(l => l.moduleId === module.id);
          if (moduleLessons.length === 0) return null;

          return (
            <div key={module.id}>
              <h4 className="font-bold text-ink mb-2 px-2">{module.title}</h4>
              <div className="space-y-1">
                {moduleLessons.map(lesson => {
                  const progress = getLessonProgress(lesson.id);
                  const isCompleted = progress?.completed;
                  const isActive = lesson.id === activeLessonId;

                  return (
                    <Link
                      key={lesson.id}
                      to={`/lesson/${lesson.id}`}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg text-sm transition-colors",
                        isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary/50",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-body-text/50 flex-shrink-0" />
                      )}
                      <span className="flex-grow">{lesson.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};