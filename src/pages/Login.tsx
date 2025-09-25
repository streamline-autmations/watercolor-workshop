import { useIsMobile } from '@/hooks/use-mobile';
import { Link, Navigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuthGate } from '@/hooks/useAuthGate';
import { Auth } from '@supabase/auth-ui-react';
import { supabase } from '@/integrations/supabase/client';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const Login = () => {
  const isMobile = useIsMobile();
  const heroImage = isMobile ? '/hero-mobile-3.webp' : '/hero-desktop-3.webp';

  const { loading, session } = useAuthGate();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bloom">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/home" replace />;
  }

  const handleHardReset = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      localStorage.removeItem('device_id');
      sessionStorage.clear();
      if (indexedDB?.databases) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }
      location.reload();
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: `url('${heroImage}')` }}
    >
      <div className="absolute inset-0 bg-bloom opacity-50" />
      
      <div className="relative z-10 flex flex-col items-center w-full">
        <img src="/blom-academy.png" alt="BLOM Academy Logo" className="w-40 mb-8" />
        
        <div className="w-full max-w-md bg-white/80 dark:bg-card/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-ink tracking-tight">Welcome Back</h1>
            <p className="text-body-text mt-1">Please sign in to your account.</p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(340 95% 70%)',
                    brandAccent: 'hsl(340 95% 60%)',
                  },
                  radii: {
                    inputBorderRadius: '1rem',
                    buttonBorderRadius: '9999px',
                  }
                },
              },
            }}
            providers={[]}
            theme="light"
            view="sign_in"
            showLinks={false}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email Address',
                  password_label: 'Password',
                },
              },
            }}
          />
          <div className="text-center text-sm">
            <Link to="/forgot-password" className="underline text-body-text/80 hover:text-primary">
              Forgot your password?
            </Link>
          </div>
          <div className="text-center text-sm text-body-text/80">
            By signing in, you agree to our{' '}
            <Link to="/terms" target="_blank" className="underline hover:text-primary">
              Terms & Conditions
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" className="underline hover:text-primary">
              Privacy Policy
            </Link>
            .
          </div>
          <div className="text-center mt-4">
            <button
              onClick={handleHardReset}
              className="text-xs text-gray-500 underline hover:text-gray-700"
              type="button"
            >
              Having trouble? Reset login state
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;