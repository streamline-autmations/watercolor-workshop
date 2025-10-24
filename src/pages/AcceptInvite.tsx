import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);

  // Parse invite token from both query params and hash fragments
  const inviteTokenFromParams = searchParams.get('invite');
  const inviteTokenFromHash = window.location.hash.includes('invite=') 
    ? new URLSearchParams(window.location.hash.substring(1)).get('invite')
    : null;
  const inviteToken = inviteTokenFromParams || inviteTokenFromHash;
  
  // Also check for Supabase confirmation URLs that might contain invite info
  const confirmationUrl = searchParams.get('confirmation_url');
  const tokenHash = searchParams.get('token_hash');

  // Detect Gmail browser and show warning
  useEffect(() => {
    const isGmailBrowser = navigator.userAgent.includes('Gmail') || 
                          window.location.href.includes('gmail.com') ||
                          document.referrer.includes('gmail.com') ||
                          navigator.userAgent.includes('Mobile') && window.location.href.includes('mail.google.com');
    
    if (isGmailBrowser) {
      setShowBrowserWarning(true);
    }
  }, []);

  const openInBrowser = () => {
    const url = window.location.href;
    
    // Try to open in external browser
    if (navigator.userAgent.includes('Mobile')) {
      // For mobile, try to open in external browser
      window.open(url, '_blank');
      
      // Show instructions as fallback
      setTimeout(() => {
        alert('For the best experience, please copy this link and open it in your regular browser (Chrome, Safari, etc.)');
      }, 1000);
    } else {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    console.log('🎫 AcceptInvite useEffect triggered:', {
      inviteToken,
      inviteTokenFromParams,
      inviteTokenFromHash,
      hasSession: !!session,
      hasUser: !!user,
      loading,
      currentUrl: window.location.href,
      hash: window.location.hash,
      search: window.location.search
    });

    if (!inviteToken) {
      console.log('❌ No invite token found in URL');
      console.log('🔍 URL analysis:', {
        fullUrl: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        searchParams: Object.fromEntries(searchParams.entries())
      });
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
    console.log('🎫 User is logged in, processing invite directly');
    processInvite(inviteToken);
  }, [inviteToken, session, user, loading]);

  const processInvite = async (token: string) => {
    // Prevent multiple simultaneous calls
    if (isProcessing) {
      console.log('⏳ Already processing invite, skipping...');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      setStatus('loading');
      setMessage('Processing your invite...');

      console.log('🎫 Processing invite token:', token);
      console.log('👤 User ID:', user?.id);

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });

      // Call the Supabase RPC function to claim the course invite
      const claimPromise = supabase.rpc('claim_course_invite', {
        p_token: token
      });

      const { data, error } = await Promise.race([claimPromise, timeoutPromise]) as any;

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

      if (data && data.length > 0) {
        const result = data[0];
        console.log('✅ Invite claim result:', result);
        
        if (result.success) {
          console.log('✅ Invite claimed successfully, course ID:', result.course_id);
          setStatus('success');
          setMessage('Invite accepted successfully! Redirecting to your dashboard...');
          setCourseId(result.course_id);
          
          // Redirect to the homepage after a short delay
          setTimeout(() => {
            navigate('/home');
          }, 2000);
        } else {
          console.error('❌ Invite claim failed:', result.message);
          setStatus('error');
          setMessage(result.message || 'Failed to accept invite. Please try again.');
        }
      } else {
        setStatus('error');
        setMessage('Invalid response from server. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Unexpected error processing invite:', error);
      
      if (error.message === 'Request timeout') {
        setStatus('error');
        setMessage('Request timed out. Please try again.');
      } else {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = () => {
    // Redirect to login page with invite token preserved
    navigate(`/login?invite=${inviteToken}`);
  };

  const handleSignUp = () => {
    // Redirect to account setup page with invite token preserved  
    navigate(`/account-setup?invite=${inviteToken}`);
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
              {showBrowserWarning && (
                <Alert className="border-blue-200 bg-blue-50">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>For best experience:</strong> You're viewing this in Gmail's browser. 
                    <Button 
                      variant="link" 
                      onClick={openInBrowser}
                      className="p-0 h-auto text-blue-600 underline ml-1"
                    >
                      Open in your regular browser
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
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
