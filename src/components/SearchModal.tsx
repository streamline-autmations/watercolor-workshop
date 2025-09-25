import { useState, useEffect } from 'react';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { courses, modules, lessons } from '@/data/mock';
import { useNavigate } from 'react-router-dom';
import { FileVideo, Book, GraduationCap } from 'lucide-react';

export const SearchModal = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search for courses or lessons..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Courses">
          {courses.map(course => (
            <CommandItem key={course.id} onSelect={() => handleSelect(`/course/${course.slug}`)} value={course.title}>
              <GraduationCap className="mr-2 h-4 w-4" />
              <span>{course.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Lessons">
          {lessons.map(lesson => (
            <CommandItem key={lesson.id} onSelect={() => handleSelect(`/lesson/${lesson.id}`)} value={lesson.title}>
              <FileVideo className="mr-2 h-4 w-4" />
              <span>{lesson.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};