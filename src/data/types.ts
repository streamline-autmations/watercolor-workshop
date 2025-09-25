export type Course = {
  id: string;
  title: string;
  slug: string;
  cover: string;
  summary: string;
  level: "Beginner" | "Intermediate" | "Pro";
  tags: string[];
  priceZAR?: number;
  durationText?: string;
  tagline?: string;
  description?: string;
  notes?: string[];
  materials?: { name: string; image: string; link?: string; }[];
};

export type Module = {
  id: string;
  courseId: string;
  title: string;
  order: number;
  summary?: string;
  icon?: string;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  durationSec: number;
  poster: string;
  videoUrl?: string;
  content?: string;
  resources: { name: string; type: "pdf" | "zip" | "img"; href: string }[];
  order: number;
  isPreview?: boolean;
};

export type Progress = {
  lessonId: string;
  watchedSec: number;
  completed: boolean;
  updatedAt: string;
};

export type Bookmark = {
  lessonId: string;
  createdAt: string;
};

export type Notes = Record<string, string>;

export type UserProfile = {
  firstName: string;
  lastName: string;
  facebookName: string;
  contact: string;
};