import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Import supabase client

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'waiting'>('loading');
  const [message, setMessage] = useState('Please wait while we process your invite...');
  const [showRefresh, setShowRefresh] = useState(false);

  const inviteToken = searchParams.get('invite');

  const processInvite = async (token: string, userId: string) => {
    try {
      setStatus('loading');
      setMessage('Processing your invite...');

      console.log('🎫 Processing invite token:', token);
      console.log('👤 User ID:', userId);

      // Call the Supabase RPC function to claim the course invite
      const { data, error } = await supabase.rpc('claim_course_invite', {
        p_token: token,
        p_user_id: userId
      });

      console.log('📊 Invite claim result:', { data, error });

      if (error) {
        console.error('❌ Error claiming invite:', error);
        
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setStatus('error');
          setMessage('This invite has expired or is invalid. Please request a new invite.');
        } else if (error.message.includes('already used') || error.message.includes('claimed')) {
          setStatus('error');
          setMessage('This invite has already been used.');
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
        
        // Redirect to the course after a short delay
        setTimeout(() => {
          navigate(`/course/${data.course_slug || data.course_id}`);
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

  useEffect(() => {
    console.log('辞 AcceptInvite - Logic updated:', {
      inviteToken,
      hasSession: !!session,
      hasUser: !!user,
      loading
    });

    const refreshTimer = setTimeout(() => {
      if (status === 'loading') {
        setShowRefresh(true);
      }
    }, 3000);

    if (loading) {
      return () => clearTimeout(refreshTimer); // Wait if auth is loading
    }

    // If no invite token, redirect to signup
    if (!inviteToken) {
      console.log('側 No invite token - redirecting to signup');
      setStatus('error');
      setMessage('No invite token found. Redirecting to signup...');
      setTimeout(() => navigate('/signup'), 1500);
      return () => clearTimeout(refreshTimer);
    }

    // If user not logged in, show login/signup options
    if (!session || !user) {
      console.log('側 User not logged in - showing options');
      setStatus('waiting');
      setMessage('Please sign up or log in to accept this invite.');
      // No automatic redirect, let user choose
      return () => clearTimeout(refreshTimer);
    }

    // User is logged in, process the invite
    console.log('側 User logged in - processing invite...');
    processInvite(inviteToken, user.id);

    return () => clearTimeout(refreshTimer);
  }, [inviteToken, session, user, loading, navigate]);
  
  const handleLogin = () => {
    navigate(`/login?invite=${inviteToken}`);
  };

  const handleSignUp = () => {
    navigate(`/signup?invite=${inviteToken}`); // Assuming signup page can handle this
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Course Invite</CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">
                {message}
              </span>
              {showRefresh && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <RefreshCw className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>Still loading? You can try refreshing.</p>
                      <Button onClick={() => window.location.reload()} size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Page
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {status === 'waiting' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  You've been invited to join a course! Create an account or log in to get started.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button onClick={handleSignUp} className="w-full">
                  Create Account & Join
                </Button>
                <Button onClick={handleLogin} variant="outline" className="w-full">
                  Already have an account? Log In
                </Button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-green-700">{message}</p>
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
