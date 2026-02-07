import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCourseAccess } from '@/hooks/useCourseAccess';
import { getCourseData } from '@/data/mock';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ArrowLeft } from 'lucide-react';

interface CourseProtectedRouteProps {
  children: ReactNode;
}

export const CourseProtectedRoute = ({ children }: CourseProtectedRouteProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { session, loading: authLoading } = useAuth();

  const rawSlug = slug || '';
  const courseSlug = rawSlug === 'christmas-watercolor-workshop'
    ? 'holiday-watercolor-workshop'
    : rawSlug === 'blom-flower-workshop'
      ? 'blom-flower-watercolor-workshop'
      : rawSlug === 'watercolour-christmas'
        ? 'holiday-watercolor-workshop'
        : rawSlug;

  const courseData = getCourseData(courseSlug);

  const { hasAccess, loading: accessLoading, error } = useCourseAccess(courseSlug);

  if (rawSlug !== courseSlug) {
    return <Navigate to={`/course/${courseSlug}`} replace />;
  }

  // If course doesn't exist, show not found
  if (!courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Course Not Found</CardTitle>
            <CardDescription>The course "{rawSlug || 'unknown'}" doesn't exist.</CardDescription>
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

  // Show loading spinner while checking auth or access
  if (authLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom">
        <div className="text-center">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <p className="text-body-text">Checking course access...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If there's an error checking access (shouldn't happen with open access)
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Course Access Required</CardTitle>
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

  // If user doesn't have access (only happens if not authenticated)
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">Course Access Required</CardTitle>
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

  // User has access, show the course content
  return <>{children}</>;
};
