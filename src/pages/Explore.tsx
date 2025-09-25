import { useState, useEffect } from 'react';
import { CourseCard } from "@/components/CourseCard";
import { courses } from "@/data/mock";
import { CourseCardSkeleton } from '@/components/CourseCardSkeleton';

const Explore = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Simulate a 1.5 second network request
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-16 pb-16">
      <section className="bg-bloom">
        <div className="container mx-auto text-center py-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-ink tracking-tighter">Master your craft</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-body-text">
            Unlock your potential with expert-led courses in nail artistry and salon business.
          </p>
        </div>
      </section>

      <section id="explore" className="container mx-auto">
        <h2 className="text-2xl font-bold mb-6">Explore Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <CourseCardSkeleton key={index} />)
          ) : (
            courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Explore;