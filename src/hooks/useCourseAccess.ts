import { useState, useEffect, useCallback } from 'react';
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

    // Grant access to all authenticated users - no enrollment check required
    console.log('✅ User is authenticated, granting access to course:', courseId);
    setAccess({
      hasAccess: true,
      loading: false,
      error: null
    });
  }, [courseId, session, user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    ...access,
    refetch: checkAccess
  };
};
