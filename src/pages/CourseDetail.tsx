import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourseData } from '@/data/mock';
import { ModuleCard } from '@/components/ModuleCard';
import { BackButton } from '@/components/BackButton';
import { ModuleCardSkeleton } from '@/components/ModuleCardSkeleton';
import { useUserState } from '@/hooks/useUserState';
import { Button } from '@/components/ui/button';
import { Award, Brush } from 'lucide-react';
import { FestiveBanner } from '@/components/FestiveBanner';

const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const { getCourseProgress } = useUserState();
  
  const data = getCourseData(slug || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Simulate a 1 second network request
    return () => clearTimeout(timer);
  }, [slug]);

  if (!data) {
    return <div className="container mx-auto py-10">Course not found.</div>;
  }

  const { course, modules } = data;
  const progress = getCourseProgress(course.id);
  const isCompleted = progress >= 100;
  const isChristmasCourse = course.slug === 'christmas-watercolor-workshop';

  return (
    <div className="container mx-auto py-10">
      <BackButton />
      
      {isChristmasCourse ? (
        <FestiveBanner>
          <h1 className="text-4xl font-bold mb-2 text-accent-foreground">{course.title}</h1>
          <p className="text-lg text-accent-foreground/80 max-w-2xl mx-auto">{course.tagline}</p>
          {isCompleted && !isLoading && (
            <Button asChild className="mt-6 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold">
              <Link to={`/course/${course.slug}/certificate`}>
                <Award className="w-5 h-5 mr-2" />
                View Certificate
              </Link>
            </Button>
          )}
        </FestiveBanner>
      ) : (
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
          <p className="text-lg text-body-text max-w-2xl mx-auto">{course.tagline}</p>
          {isCompleted && !isLoading && (
            <Button asChild className="mt-6 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold">
              <Link to={`/course/${course.slug}/certificate`}>
                <Award className="w-5 h-5 mr-2" />
                View Certificate
              </Link>
            </Button>
          )}
        </div>
      )}

      {course.materials && course.materials.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-6 flex items-center justify-center gap-2">
            <Brush className="w-6 h-6" />
            Required Materials
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {course.materials.map((material) => {
              const content = (
                <div className="text-center">
                  <div className="aspect-square bg-secondary/50 rounded-lg overflow-hidden mb-2">
                    <img src={material.image} alt={material.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-sm font-medium text-body-text">{material.name}</p>
                </div>
              );

              if (material.link) {
                return (
                  <a key={material.name} href={material.link} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                    {content}
                  </a>
                );
              }

              return <div key={material.name}>{content}</div>;
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          Array.from({ length: modules.length }).map((_, index) => <ModuleCardSkeleton key={index} />)
        ) : (
          modules.map(module => (
            <ModuleCard key={module.id} module={module} />
          ))
        )}
      </div>
    </div>
  );
};

export default CourseDetail;