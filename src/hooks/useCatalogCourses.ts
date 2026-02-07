import { useEffect, useMemo, useState } from 'react';
import type { Course } from '@/data/types';
import { courses as mockCourses } from '@/data/mock';
import { supabase } from '@/lib/supabase';

const COURSE_TITLE_FALLBACK_BY_SLUG: Record<string, string> = {
  'holiday-watercolor-workshop': 'Christmas Watercolor Nail Art Workshop',
  'blom-flower-watercolor-workshop': 'Flower Nail Art Workshop',
};

type DbCourseRow = {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
  summary: string | null;
  level: string | null;
  tags: string[] | null;
  price_zar: number | null;
  duration_text: string | null;
  tagline: string | null;
  description: string | null;
  notes: string[] | null;
  materials: Course['materials'] | null;
  is_active: boolean;
};

const toCourseLevel = (value: string | null | undefined): Course['level'] => {
  if (value === 'Intermediate' || value === 'Pro' || value === 'Beginner') return value;
  return 'Beginner';
};

const applyTitleFallback = (slug: string, title: string | null | undefined) => {
  return title || COURSE_TITLE_FALLBACK_BY_SLUG[slug] || slug;
};

export const useCatalogCourses = () => {
  const [dbRows, setDbRows] = useState<DbCourseRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('courses')
        .select('id, slug, title, cover, summary, level, tags, price_zar, duration_text, tagline, description, notes, materials, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        setDbRows(null);
        setError(error.message);
        setLoading(false);
        return;
      }

      setDbRows((data ?? []) as unknown as DbCourseRow[]);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const courses = useMemo<Course[]>(() => {
    const mockBySlug = new Map(mockCourses.map((c) => [c.slug, c] as const));

    if (!dbRows || dbRows.length === 0) {
      return mockCourses.map((c) => ({
        ...c,
        title: applyTitleFallback(c.slug, c.title),
      }));
    }

    return dbRows.map((row) => {
      const mock = mockBySlug.get(row.slug);
      return {
        id: mock?.id ?? row.id,
        slug: row.slug,
        title: applyTitleFallback(row.slug, row.title),
        cover: row.cover ?? mock?.cover ?? '',
        summary: row.summary ?? mock?.summary ?? '',
        level: toCourseLevel(row.level ?? mock?.level),
        tags: row.tags ?? mock?.tags ?? [],
        priceZAR: row.price_zar ?? mock?.priceZAR,
        durationText: row.duration_text ?? mock?.durationText,
        tagline: row.tagline ?? mock?.tagline,
        description: row.description ?? mock?.description,
        notes: (row.notes ?? mock?.notes) as Course['notes'],
        materials: (row.materials ?? mock?.materials) as Course['materials'],
      };
    });
  }, [dbRows]);

  const titleBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    for (const course of courses) {
      map[course.slug] = course.title;
    }
    return map;
  }, [courses]);

  return { courses, titleBySlug, loading, error };
};

