import { useParams, Link, Navigate } from 'react-router-dom';
import { getCourseData } from '@/data/mock';
import { useUserState } from '@/hooks/useUserState';
import { Button } from '@/components/ui/button';
import { Download, Award, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const Certificate = () => {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const { getCourseProgress } = useUserState();
  const data = getCourseData(slug || '');

  if (!data) {
    return <Navigate to="/400" replace />;
  }

  const { course } = data;
  const progress = getCourseProgress(course.id);
  const isChristmasCourse = slug === 'christmas-watercolor-workshop';

  if (progress < 100) {
    // Redirect if the user hasn't completed the course
    toast.error("You must complete the course to view the certificate.");
    return <Navigate to={`/course/${slug}`} replace />;
  }

  const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Student';
  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownload = () => {
    toast.success("Your certificate download has started!");
  };

  return (
    <div className="min-h-screen bg-bloom flex items-center justify-center p-4 sm:p-8">
      <div className={cn(
        "w-full max-w-4xl bg-white/90 dark:bg-blom-dark-card/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-10 border-4 relative overflow-hidden",
        isChristmasCourse ? "border-accent-foreground/20" : "border-primary/20"
      )}>
        {isChristmasCourse && (
          <>
            <Snowflake className="absolute top-4 left-4 w-12 h-12 text-sky-200 dark:text-sky-500/20 opacity-70" />
            <Snowflake className="absolute bottom-4 right-4 w-16 h-16 text-sky-200 dark:text-sky-500/20 opacity-70" />
            <Snowflake className="absolute top-1/2 right-8 w-8 h-8 text-sky-200 dark:text-sky-500/20 opacity-70" />
          </>
        )}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Award className={cn("w-16 h-16", isChristmasCourse ? "text-accent-foreground" : "text-primary")} />
          </div>
          <h1 className={cn(
            "text-2xl sm:text-4xl font-bold tracking-wider uppercase",
            isChristmasCourse ? "text-accent-foreground" : "text-primary"
          )}>
            Certificate of Completion
          </h1>
          <p className="text-base sm:text-lg text-body-text">This certificate is proudly presented to</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-ink italic">
            {userName}
          </h2>
          <p className="text-base sm:text-lg text-body-text max-w-2xl mx-auto">
            for successfully completing the course
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-ink">
            {course.title}
          </h3>
          <p className="text-sm text-body-text/80">on {completionDate}</p>
          <div className="flex justify-center pt-4">
            <img src="/blom-academy.png" alt="BLOM Academy Logo" className="h-16" />
          </div>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleDownload} className="rounded-full font-bold">
            <Download className="w-4 h-4 mr-2" />
            Download Certificate
          </Button>
          <Button variant="outline" asChild className="rounded-full">
            <Link to={`/course/${course.slug}`}>Back to Course</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Certificate;