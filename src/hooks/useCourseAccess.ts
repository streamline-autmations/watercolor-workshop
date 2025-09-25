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
