import { useParams, Link } from 'react-router-dom';
import { getLessonData } from '@/data/mock';
import { Player } from '@/components/Player';
import { Button } from '@/components/ui/button';
import { useUserState } from '@/hooks/useUserState';
import { Star, CheckCircle, FileText, Download, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { LessonSidebar } from '@/components/LessonSidebar';
import { LessonHeader } from '@/components/LessonHeader';

const LessonPlayer = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const data = getLessonData(lessonId || '');
  const { 
    isBookmarked, toggleBookmark, 
    getLessonProgress, toggleLessonComplete,
    getLessonNote, updateLessonNote
  } = useUserState();
  
  const [note, setNote] = useState('');

  useEffect(() => {
    if (lessonId) {
      setNote(getLessonNote(lessonId));
    }
  }, [lessonId, getLessonNote]);

  if (!data) {
    return <div className="container mx-auto py-10">Lesson not found.</div>;
  }

  const { lesson, module, course, prevLesson, nextLesson, allCourseModules, allCourseLessons } = data;
  const progress = getLessonProgress(lesson.id);
  const isCompleted = progress?.completed;

  const handleToggleBookmark = () => {
    toggleBookmark(lesson.id);
    toast.success(isBookmarked(lesson.id) ? "Bookmark removed" : "Lesson bookmarked!");
  };

  const handleToggleComplete = () => {
    toggleLessonComplete(lesson.id);
    toast.success(isCompleted ? "Lesson marked as incomplete" : "Lesson marked complete!");
  };
  
  const handleNoteBlur = () => {
    updateLessonNote(lesson.id, note);
    toast.success("Note saved!");
  };

  return (
    <div className="container mx-auto py-8">
      <LessonHeader 
        course={course}
        module={module}
        lesson={lesson}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          { (lesson.videoUrl || !lesson.content) && <Player lesson={lesson} nextLesson={nextLesson} /> }
          <div className="mt-6 bg-white dark:bg-blom-dark-card p-6 rounded-2xl shadow-card">
            <h1 className="text-3xl font-bold">{lesson.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4 border-y py-3">
              <Button variant="outline" className="rounded-full" onClick={handleToggleComplete}>
                <CheckCircle className={`w-5 h-5 mr-2 ${isCompleted ? 'text-green-500' : ''}`} />
                {isCompleted ? 'Completed' : 'Mark as Complete'}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={handleToggleBookmark}>
                <Star className={`w-5 h-5 mr-2 ${isBookmarked(lesson.id) ? 'text-yellow-400 fill-current' : ''}`} />
                {isBookmarked(lesson.id) ? 'Bookmarked' : 'Bookmark'}
              </Button>
            </div>
            
            {lesson.content && (
              <div className="prose dark:prose-invert max-w-none mt-6" dangerouslySetInnerHTML={{ __html: lesson.content }} />
            )}

            <div className="mt-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><FileText className="w-5 h-5" /> Notes</h3>
              <Textarea 
                placeholder="Write your notes here..." 
                className="min-h-[150px] rounded-lg"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleNoteBlur}
              />
            </div>
            {lesson.resources.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Download className="w-5 h-5" /> Resources</h3>
                <ul className="space-y-2">
                  {lesson.resources.map(res => (
                    <li key={res.name}>
                      <a href={res.href} onClick={() => toast.info(`Downloading ${res.name}`)} className="flex items-center gap-2 text-primary hover:underline">
                        <FileText className="w-4 h-4" /> {res.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between items-center mt-8 border-t pt-6">
              {prevLesson ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link to={`/lesson/${prevLesson.id}`}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous Lesson
                  </Link>
                </Button>
              ) : (
                <div />
              )}
              {nextLesson ? (
                <Button asChild className="rounded-full">
                  <Link to={`/lesson/${nextLesson.id}`}>
                    Next Lesson
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
        <div className="lg:col-span-1">
          <LessonSidebar course={course} modules={allCourseModules} lessons={allCourseLessons} />
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;