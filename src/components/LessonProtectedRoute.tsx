import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { getLessonData } from '@/data/mock';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ArrowLeft } from 'lucide-react';

interface LessonProtectedRouteProps {
  children: ReactNode;
}

export const LessonProtectedRoute = ({ children }: LessonProtectedRouteProps) => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { session, loading: authLoading } = useAuth();

  const lessonData = getLessonData(lessonId || '');
  const courseSlug = lessonData?.course.slug || '';
  const isPreview = !!lessonData?.lesson.isPreview;

  const { hasAccess, loading: accessLoading, error } = useCourseAccess(courseSlug);

  if (!lessonData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Lesson Not Found</CardTitle>
            <CardDescription>
              The lesson you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/explore'} className="w-full">
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPreview) {
    return <>{children}</>;
  }

  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom">
        <div className="text-center">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <p className="text-body-text">Checking lesson access...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Lesson Access Required</CardTitle>
            <CardDescription>
              You don't have access to this course yet. You may need an invite or to purchase access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                If you have a course invite, please use the invite link to gain access.
              </AlertDescription>
            </Alert>
            <div className="flex space-x-2">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => window.location.href = '/explore'} className="flex-1">
                Browse Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Lesson Access Required</CardTitle>
            <CardDescription>
              You don't have access to this course yet. You may need an invite or to purchase access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                If you have a course invite, please use the invite link to gain access.
              </AlertDescription>
            </Alert>
            <div className="flex space-x-2">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => window.location.href = '/explore'} className="flex-1">
                Browse Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

