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

    try {
      console.log('🔍 Checking access for course:', courseId, 'user:', user.id);
      
      // Call Supabase RPC to check if user has access to this course
      const { data, error } = await supabase.rpc('check_course_access', {
        course_id: courseId,
        user_id: user.id
      });

      console.log('📊 Course access result:', { data, error });

      if (error) {
        console.error('❌ Error checking course access:', error);
        setAccess({
          hasAccess: false,
          loading: false,
          error: error.message
        });
        return;
      }

      setAccess({
        hasAccess: data === true,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('❌ Unexpected error checking course access:', error);
      setAccess({
        hasAccess: false,
        loading: false,
        error: 'Failed to check course access'
      });
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
