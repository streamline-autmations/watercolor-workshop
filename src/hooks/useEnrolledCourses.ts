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
        const { data: enrollmentRows, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', user.id);

        if (cancelled) return;

        if (enrollmentsError) {
          setRows([]);
          setError(enrollmentsError.message);
          setLoading(false);
          return;
        }

        const courseIds = (enrollmentRows ?? [])
          .map((r) => (r as any).course_id)
          .filter(Boolean) as string[];

        if (courseIds.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        const { data: coursesRows, error: coursesError } = await supabase
          .from('courses')
          .select('id, slug, title')
          .in('id', courseIds);

        if (cancelled) return;

        if (coursesError) {
          setRows([]);
          setError(coursesError.message);
          setLoading(false);
          return;
        }

        const byId = new Map((coursesRows ?? []).map((c: any) => [c.id, c] as const));
        const mapped: EnrollmentRow[] = courseIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map((c: any) => ({ courses: { slug: c.slug, title: c.title } }));

        setRows(mapped);
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
