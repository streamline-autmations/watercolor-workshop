import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'waiting' | 'ready'>('waiting');
  const [message, setMessage] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    console.log('🎫 AcceptInvite useEffect triggered:', {
      inviteToken,
      hasSession: !!session,
      hasUser: !!user,
      loading,
      currentUrl: window.location.href
    });

    if (!inviteToken) {
      console.log('❌ No invite token found');
      setStatus('error');
      setMessage('No invite token provided. Please check your invite link.');
      return;
    }

    if (loading) {
      console.log('⏳ Still loading auth state');
      setStatus('loading');
      setMessage('Loading...');
      return;
    }

    if (!session || !user) {
      console.log('👤 User not logged in, showing signup options');
      setStatus('waiting');
      setMessage('Please create an account to accept this invite.');
      return;
    }

    // User is logged in - process the invite directly
    // This handles the case where logged-in users click invite links
    console.log('🎫 User is logged in, processing invite automatically');
    processInvite(inviteToken);
  }, [inviteToken, session, user, loading]);

  const processInvite = async (token: string) => {
    try {
      setStatus('loading');
      setMessage('Processing your invite...');

      console.log('🎫 Processing invite token:', token);
      console.log('👤 User ID:', user?.id);

      // Call the Supabase RPC function to claim the course invite
      const { data, error } = await supabase.rpc('claim_course_invite', {
        p_token: token
      });

      console.log('📊 Invite claim result:', { data, error });

      if (error) {
        console.error('❌ Error claiming invite:', error);
        
        // Handle specific error cases
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setStatus('error');
          setMessage('This invite has expired or is invalid. Please request a new invite.');
        } else if (error.message.includes('already used') || error.message.includes('claimed')) {
          setStatus('error');
          setMessage('This invite has already been used. Please request a new invite.');
        } else {
          setStatus('error');
          setMessage(`Failed to accept invite: ${error.message}`);
        }
        return;
      }

      if (data && data.course_id) {
        console.log('✅ Invite claimed successfully, course ID:', data.course_id);
        setStatus('success');
        setMessage('Invite accepted successfully! Redirecting to your course...');
        setCourseId(data.course_id);
        
        // Redirect to the course after a short delay
        setTimeout(() => {
          navigate(`/course/${data.course_id}`);
        }, 2000);
      } else {
        setStatus('error');
        setMessage('Invalid response from server. Please try again.');
      }
    } catch (error) {
      console.error('❌ Unexpected error processing invite:', error);
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again.');
    }
  };

  const handleLogin = () => {
    // Redirect to login page with invite token preserved
    navigate(`/login?invite=${inviteToken}`);
  };

  const handleSignUp = () => {
    // Redirect to signup page with invite token preserved  
    navigate(`/login?invite=${inviteToken}&mode=signup`);
  };

  const handleRetry = () => {
    if (inviteToken) {
      processInvite(inviteToken);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Course Invite</CardTitle>
          <CardDescription>
            {status === 'waiting' && 'Please log in to accept this course invite.'}
            {status === 'loading' && 'Processing your invite...'}
            {status === 'success' && 'Welcome to your new course!'}
            {status === 'error' && 'There was a problem with your invite.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>{message}</span>
            </div>
          )}

          {status === 'waiting' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  You've been invited to join a course! Create an account to get started.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button onClick={handleSignUp} className="w-full">
                  Create Account & Join Course
                </Button>
                <Button onClick={handleLogin} variant="outline" className="w-full">
                  Already have an account? Log In
                </Button>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  {message}
                </AlertDescription>
              </Alert>
              <Button onClick={() => processInvite(inviteToken!)} className="w-full">
                Accept Course Invite
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-green-700">{message}</p>
              {courseId && (
                <p className="text-sm text-gray-600">
                  Redirecting to course: {courseId}
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={() => navigate('/')} className="flex-1">
                  Go Home
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
