import { useEffect, useMemo, useState } from 'react';
import type { Course } from '@/data/types';
import { courses as mockCourses } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type EnrollmentRow = {
  courses: { slug: string; title: string } | null;
};

export const useEnrolledCourses = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EnrollmentRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('enrollments')
        .select('courses!inner(slug, title)')
        .eq('user_id', user.id);

      if (cancelled) return;

      if (error) {
        setRows([]);
        setError(error.message);
        setLoading(false);
        return;
      }

      setRows((data ?? []) as unknown as EnrollmentRow[]);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const enrolledCourses = useMemo<Course[]>(() => {
    const mockBySlug = new Map(mockCourses.map((c) => [c.slug, c] as const));
    const slugs = (rows ?? []).map((r) => r.courses?.slug).filter(Boolean) as string[];

    return slugs
      .map((slug) => {
        const mock = mockBySlug.get(slug);
        const rowCourse = (rows ?? []).find((r) => r.courses?.slug === slug)?.courses;
        if (mock) {
          return {
            ...mock,
            title: rowCourse?.title || mock.title,
          };
        }

        return {
          id: slug,
          slug,
          title: rowCourse?.title || slug,
          cover: '',
          summary: '',
          level: 'Beginner',
          tags: [],
        };
      });
  }, [rows]);

  return { enrolledCourses, loading, error };
};

