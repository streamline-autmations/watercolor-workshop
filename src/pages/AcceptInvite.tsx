import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    console.log('🎫 AcceptInvite - Simple redirect logic:', {
      inviteToken,
      hasSession: !!session,
      hasUser: !!user,
      loading
    });

    // If still loading auth, wait
    if (loading) {
      return;
    }

    // If no invite token, redirect to account setup
    if (!inviteToken) {
      console.log('👤 No invite token - redirecting to account setup');
      navigate('/account-setup');
      return;
    }

    // If user not logged in, redirect to account setup with invite token
    if (!session || !user) {
      console.log('👤 User not logged in - redirecting to account setup with invite');
      navigate(`/account-setup?invite=${inviteToken}`);
      return;
    }

    // If user is logged in, redirect to home (they can access courses from there)
    console.log('👤 User logged in - redirecting to home');
    navigate('/home');
  }, [inviteToken, session, user, loading, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Redirecting...</p>
      </div>
    </div>
  );
}
