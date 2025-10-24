import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);

  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    console.log('🎫 AcceptInvite - Simple redirect logic:', {
      inviteToken,
      hasSession: !!session,
      hasUser: !!user,
      loading
    });

    // Show refresh option after 3 seconds if still loading
    const refreshTimer = setTimeout(() => {
      setShowRefresh(true);
    }, 3000);

    // If still loading auth, wait
    if (loading) {
      return;
    }

    // Clear the timer
    clearTimeout(refreshTimer);

    // Set redirecting state
    setRedirecting(true);

    // If no invite token, redirect to account setup
    if (!inviteToken) {
      console.log('👤 No invite token - redirecting to account setup');
      setTimeout(() => navigate('/account-setup'), 500);
      return;
    }

    // If user not logged in, redirect to account setup with invite token
    if (!session || !user) {
      console.log('👤 User not logged in - redirecting to account setup with invite');
      setTimeout(() => navigate(`/account-setup?invite=${inviteToken}`), 500);
      return;
    }

    // If user is logged in, redirect directly to home
    console.log('👤 User logged in - redirecting directly to home');
    setTimeout(() => navigate('/home'), 500);

    return () => clearTimeout(refreshTimer);
  }, [inviteToken, session, user, loading, navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDirectSetup = () => {
    navigate('/account-setup');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Processing Invite</CardTitle>
          <CardDescription>
            {redirecting ? 'Redirecting you...' : 'Please wait while we process your invite...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">
              {redirecting ? 'Redirecting...' : 'Loading...'}
            </span>
          </div>

          {showRefresh && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>If you see a white screen, please refresh your browser.</p>
                  <div className="flex space-x-2">
                    <Button onClick={handleRefresh} size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Page
                    </Button>
                    <Button onClick={handleDirectSetup} size="sm">
                      Go to Account Setup
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
