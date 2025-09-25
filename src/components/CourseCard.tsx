import { Link } from 'react-router-dom';
import { Course } from '@/data/types';
import { Card, CardContent } from '@/components/ui/card';
import { PillTag } from './PillTag';
import { ProgressBar } from './ProgressBar';
import { useUserState } from '@/hooks/useUserState';
import { Button } from './ui/button';
import { Snowflake } from 'lucide-react';

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  const { getCourseProgress } = useUserState();
  const progress = getCourseProgress(course.id);

  return (
    <Link to={`/course/${course.slug}`} className="block group">
      <Card className="shadow-card group-hover:shadow-card-hover transition-all duration-300 ease-in-out group-hover:-translate-y-1 overflow-hidden">
        <div className="aspect-[4/3] overflow-hidden relative">
          <img src={course.cover} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {course.slug === 'christmas-watercolor-workshop' && (
            <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-md">
              <Snowflake className="w-5 h-5 text-blue-500" />
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-ink group-hover:text-primary transition-colors">{course.title}</h3>
            <PillTag variant="level">{course.level}</PillTag>
          </div>
          <p className="text-sm text-body-text/80 line-clamp-2 h-10">{course.summary}</p>
          
          {course.priceZAR ? (
            <div className="flex justify-between items-center pt-2">
              <div>
                <span className="font-bold text-lg text-blom-ink">ZAR {course.priceZAR}</span>
                <PillTag className="ml-2">{course.durationText}</PillTag>
              </div>
              <Button variant="outline" size="sm" className="rounded-full border-accent-foreground/50 text-accent-foreground hover:bg-accent">View Details</Button>
            </div>
          ) : progress > 0 && (
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-body-text">Progress</span>
                <span className="font-bold text-primary">{Math.round(progress)}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};