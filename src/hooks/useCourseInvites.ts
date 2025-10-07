import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface CourseInvite {
  id: string;
  course_id: string;
  email: string;
  token: string;
  expires_at: string;
  redeemed_at: string | null;
  created_at: string;
}

export const useCourseInvites = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvite = useCallback(async (courseId: string, email: string, expiresInDays: number = 30) => {
    if (!user) {
      setError('You must be logged in to create invites');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎫 Creating invite for course:', courseId, 'email:', email, 'expires in:', expiresInDays, 'days');
      
      const { data, error } = await supabase.rpc('create_course_invite', {
        p_course_id: courseId,
        p_email: email,
        p_expires_in_days: expiresInDays
      });

      console.log('📊 Create invite result:', { data, error });

      if (error) {
        console.error('❌ Error creating invite:', error);
        setError(error.message);
        return null;
      }

      console.log('✅ Invite created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Unexpected error creating invite:', error);
      setError('Failed to create invite');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getInvites = useCallback(async (courseId?: string) => {
    if (!user) {
      setError('You must be logged in to view invites');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching invites for course:', courseId || 'all');
      
      // Use the course_invites_admin view to get invites with admin details
      let query = supabase.from('course_invites_admin').select('*');
      
      if (courseId) {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('📊 Get invites result:', { data, error });

      if (error) {
        console.error('❌ Error fetching invites:', error);
        setError(error.message);
        return [];
      }

      console.log('✅ Invites fetched successfully:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Unexpected error fetching invites:', error);
      setError('Failed to fetch invites');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const revokeInvite = useCallback(async (inviteId: string) => {
    if (!user) {
      setError('You must be logged in to revoke invites');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🗑️ Revoking invite:', inviteId);
      
      // Delete the invite from the course_invites table
      const { error } = await supabase
        .from('course_invites')
        .delete()
        .eq('id', inviteId);

      console.log('📊 Revoke invite result:', { error });

      if (error) {
        console.error('❌ Error revoking invite:', error);
        setError(error.message);
        return false;
      }

      console.log('✅ Invite revoked successfully');
      return true;
    } catch (error) {
      console.error('❌ Unexpected error revoking invite:', error);
      setError('Failed to revoke invite');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    createInvite,
    getInvites,
    revokeInvite,
    loading,
    error
  };
};
