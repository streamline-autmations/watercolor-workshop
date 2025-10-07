import { useUserState } from '@/hooks/useUserState';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ProgressBar';
import { CourseCard } from '@/components/CourseCard';
import { Star, PlayCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ContinueWatchingCard = ({ lesson }: { lesson: any }) => {
  const { getLessonProgress } = useUserState();
  const progress = getLessonProgress(lesson.id);
  const progressPercent = progress ? (progress.watchedSec / lesson.durationSec) * 100 : 0;

  return (
    <Link to={`/lesson/${lesson.id}`} className="block group w-full sm:w-80 flex-shrink-0">
      <Card className="shadow-card group-hover:shadow-card-hover transition-all duration-300 ease-in-out group-hover:-translate-y-1">
        <div className="aspect-video overflow-hidden relative">
          <img src={lesson.poster} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <PlayCircle className="w-12 h-12 text-white" />
          </div>
        </div>
        <CardContent className="p-4">
          <h4 className="font-bold text-ink truncate group-hover:text-primary">{lesson.title}</h4>
          <ProgressBar value={progressPercent} />
        </CardContent>
      </Card>
    </Link>
  );
};

const Home = () => {
  const { profile } = useAuth();
  const { continueWatchingList, getEnrolledCourses, bookmarkedLessons } = useUserState();
  const enrolledCourses = getEnrolledCourses();
  const recentBookmarks = bookmarkedLessons.slice(0, 3);

  return (
    <div className="container mx-auto py-10 space-y-12">
      <section>
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-ink tracking-tight">
                  Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
                </h1>
                <p className="mt-2 text-lg text-body-text">Let's continue learning and master your watercolor painting skills.</p>
            </div>
        </div>
      </section>

      {continueWatchingList.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Continue Watching</h2>
          <div className="flex gap-6 pb-4 -mx-4 px-4 overflow-x-auto">
            {continueWatchingList.map((lesson: any) => (
              <ContinueWatchingCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </section>
      )}

      {enrolledCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">My Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {enrolledCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {recentBookmarks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">Recent Bookmarks</h2>
          <div className="space-y-4">
            {recentBookmarks.map((lesson: any) => (
              <Link to={`/lesson/${lesson.id}`} key={lesson.id}>
                <Card className="hover:bg-secondary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <img src={lesson.poster} alt={lesson.title} className="w-32 h-20 object-cover rounded-md" />
                    <div className="flex-grow">
                      <h3 className="font-bold text-ink">{lesson.title}</h3>
                      <p className="text-sm text-body-text/80">{lesson.courseTitle}</p>
                    </div>
                    <Star className="w-5 h-5 text-yellow-400 fill-current flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
             {bookmarkedLessons.length > 3 && (
                <div className="text-center pt-4">
                    <Button asChild variant="outline" className="rounded-full">
                        <Link to="/bookmarks">View All Bookmarks</Link>
                    </Button>
                </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;