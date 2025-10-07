import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from './ProgressBar';
import { useUserState } from '@/hooks/useUserState';
import { Module } from '@/data/types';
import { Link } from 'react-router-dom';
import { lessons } from '@/data/mock';
import { Compass, Paintbrush, Layers, Flower, Sparkles, Award, type LucideIcon } from 'lucide-react';
import React from 'react';

const iconMap: { [key: string]: LucideIcon } = {
  Compass,
  Paintbrush,
  Layers,
  Flower,
  Sparkles,
  Award,
};

const Icon = ({ name, ...props }: { name: string; [key: string]: any }) => {
  const LucideIconComponent = iconMap[name];
  if (!LucideIconComponent) return null;
  return <LucideIconComponent {...props} />;
};

interface ModuleCardProps {
  module: Module;
}

export const ModuleCard = ({ module }: ModuleCardProps) => {
  const { getModuleProgress } = useUserState();
  const progress = getModuleProgress(module.id);
  const firstLesson = lessons.find(l => l.moduleId === module.id);

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 ease-in-out hover:-translate-y-1 flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          {module.icon && <Icon name={module.icon} className="w-8 h-8 text-accent-foreground mt-1 flex-shrink-0" />}
          <div>
            <CardTitle className="text-xl">{module.title}</CardTitle>
            <p className="text-body-text/80 text-sm mt-1">{module.summary}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-body-text">Progress</span>
              <span className="font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
          <Button asChild className="w-full rounded-full font-bold">
            <Link to={`/lesson/${firstLesson?.id}`}>
              {progress > 0 && progress < 100 ? 'Continue' : 'Start Module'}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};