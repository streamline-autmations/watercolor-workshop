import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCourseInvites } from '../hooks/useCourseInvites';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const { claimCourseInvite, loading: claiming } = useCourseInvites();

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'waiting'>('loading');
  const [message, setMessage] = useState('Please wait while we process your invite...');
  const [showRefresh, setShowRefresh] = useState(false);
  const claimAttemptedRef = useRef(false);

  const inviteTokenFromQuery = searchParams.get('invite');
  const inviteToken = inviteTokenFromQuery ?? localStorage.getItem('pending_invite_token');

  useEffect(() => {
    if (!inviteTokenFromQuery && inviteToken) {
      navigate(`/accept-invite?invite=${encodeURIComponent(inviteToken)}`, { replace: true });
      return;
    }
    if (inviteTokenFromQuery) {
      localStorage.setItem('pending_invite_token', inviteTokenFromQuery);
    }
  }, [inviteTokenFromQuery, inviteToken, navigate]);

  // Effect for handling refresh timer
  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      if (status === 'loading') {
        setShowRefresh(true);
      }
    }, 3000);

    return () => clearTimeout(refreshTimer);
  }, [status]);

  // Effect for checking auth state and setting appropriate status
  useEffect(() => {
    if (loading) {
      return; // Wait if auth is loading
    }

    // If no invite token, redirect to signup
    if (!inviteToken) {
      setStatus('error');
      setMessage('No invite token found. Redirecting to signup...');
      setTimeout(() => navigate('/signup'), 1500);
      return;
    }

    // If user not logged in, show login/signup options
    if (!session || !user) {
      setStatus('waiting');
      setMessage('Please sign up or log in to accept this invite.');
      return;
    }
  }, [inviteToken, session, user, loading, navigate]);

  // Effect for claiming invite when user is logged in
  useEffect(() => {
    const handleClaim = async () => {
      if (inviteToken && session && user && !claiming && !claimAttemptedRef.current) {
        claimAttemptedRef.current = true;
        setStatus('loading');
        setMessage('Processing your invite...');

        if (import.meta.env.DEV) {
          console.log('🎫 Claiming invite', { inviteToken, userId: user.id });
        }

        const { courseSlug, error } = await claimCourseInvite(inviteToken);

        if (error) {
          setStatus('error');
          if (error.includes('expired') || error.includes('invalid')) {
            setMessage('This invite has expired or is invalid. Please request a new invite.');
          } else if (error.includes('already used') || error.includes('claimed')) {
            setMessage('This invite has already been used.');
          } else {
            setMessage(`Failed to accept invite: ${error}`);
          }
        } else if (courseSlug) {
          setStatus('success');
          setMessage('Invite accepted successfully! Redirecting to your course...');
          localStorage.removeItem('pending_invite_token');
          setTimeout(() => {
            navigate(`/course/${courseSlug}`);
          }, 2000);
        } else {
          setStatus('error');
          setMessage('Invalid response from server. Please try again.');
        }
      }
    };

    handleClaim();
  }, [inviteToken, session, user, claiming, claimCourseInvite, navigate]);

  const handleLogin = () => {
    navigate(`/login?invite=${inviteToken}`);
  };

  const handleSignUp = () => {
    navigate(`/signup?invite=${inviteToken}`);
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
