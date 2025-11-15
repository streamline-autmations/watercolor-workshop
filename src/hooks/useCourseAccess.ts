import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface CourseAccess {
  hasAccess: boolean;
  loading: boolean;
  error: string | null;
}

export const useCourseAccess = (courseId: string) => {
  const { user, session } = useAuth();
  const [access, setAccess] = useState<CourseAccess>({
    hasAccess: false,
    loading: true,
    error: null
  });

  const checkAccess = useCallback(async () => {
    if (!session || !user) {
      setAccess({
        hasAccess: false,
        loading: false,
        error: 'Not authenticated'
      });
      return;
    }

    // Check database enrollment for Christmas workshop (using UUID or slug)
    if (courseId === 'watercolour-christmas' || courseId === 'efe16488-1de6-4522-aeb3-b08cfae3a640') {
      console.log('🎄 Checking Christmas workshop enrollment for user:', user.id, 'courseId:', courseId);
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', 'efe16488-1de6-4522-aeb3-b08cfae3a640')
          .single();
        
        if (!error && data) {
          console.log('✅ User has Christmas workshop enrollment');
          setAccess({ hasAccess: true, loading: false, error: null });
          return;
        } else {
          console.log('❌ No Christmas workshop enrollment found:', error);
        }
      } catch (e) {
        console.log('❌ Error checking Christmas workshop enrollment:', e);
      }
    }

    // Check database enrollment for Flower workshop (using UUID)
    if (courseId === 'blom-flower-workshop') {
      console.log('🌸 Checking Flower workshop enrollment for user:', user.id);
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', '7c5276c1-9207-4653-89c3-bb4c675db5e2')
          .single();
        
        if (!error && data) {
          console.log('✅ User has Flower workshop enrollment');
          setAccess({ hasAccess: true, loading: false, error: null });
          return;
        }
      } catch (e) {
        console.log('❌ No Flower workshop enrollment found');
      }
    }

    // Special case: Admin users get access to all courses
    const ADMIN_USER_IDS = [
      '7778cc4f-d55b-43bc-9b2c-68c6d885bb74',
      '25817216-e3ab-418a-903a-c1108f451f59'
    ];
    if (ADMIN_USER_IDS.includes(user.id)) {
      console.log('👑 Admin user detected, granting access to course:', courseId);
      setAccess({
        hasAccess: true,
        loading: false,
        error: null
      });
      return;
    }

    // Fallback: check if user has any enrollment for this course (by UUID or slug)
    // Using a join with courses table to support both UUID and slug lookups
    try {
      console.log('🔍 Checking enrollment for course:', courseId);

      // Use a join with courses table and check both id and slug
      // This handles both UUID and slug inputs in a single efficient query
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, courses!inner(id, slug)')
        .eq('user_id', user.id)
        .or(`id.eq.${courseId},slug.eq.${courseId}`, { foreignTable: 'courses' })
        .single();

      if (!error && data) {
        console.log('✅ User has enrollment for course:', courseId);
        setAccess({ hasAccess: true, loading: false, error: null });
        return;
      } else {
        console.log('❌ No enrollment found for course:', courseId, error);
      }
    } catch (e) {
      console.log('❌ Error checking enrollment for course:', courseId, e);
    }
  }, [courseId, session, user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    ...access,
    refetch: checkAccess
  };
};
