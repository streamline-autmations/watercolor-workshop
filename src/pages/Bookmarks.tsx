import { useUserState } from '@/hooks/useUserState';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

const Bookmarks = () => {
  const { bookmarkedLessons, toggleBookmark } = useUserState();

  const handleRemoveBookmark = (e: React.MouseEvent, lessonId: string) => {
    e.preventDefault();
    toggleBookmark(lessonId);
    toast.success("Bookmark removed");
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">My Bookmarks</h1>
      {bookmarkedLessons.length === 0 ? (
        <p>You haven't bookmarked any lessons yet.</p>
      ) : (
        <div className="space-y-4">
          {bookmarkedLessons.map((lesson: any) => (
            <Link to={`/lesson/${lesson.id}`} key={lesson.id}>
              <Card className="hover:bg-secondary/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <img src={lesson.poster} alt={lesson.title} className="w-32 h-20 object-cover rounded-md" />
                  <div className="flex-grow">
                    <h3 className="font-bold text-ink">{lesson.title}</h3>
                    <p className="text-sm text-body-text/80">{lesson.courseTitle}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={(e) => handleRemoveBookmark(e, lesson.id)}>
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookmarks;