import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import CourseDetail from "@/pages/CourseDetail";
import LessonPlayer from "@/pages/LessonPlayer";
import Bookmarks from "@/pages/Bookmarks";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import SimpleSignup from "@/pages/SimpleSignup";
import Certificate from "@/pages/Certificate";
import ScrollToTop from "@/components/ScrollToTop";
import { AuthProvider } from "@/contexts/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import ForgotPassword from "@/pages/ForgotPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import SetupProfile from "@/pages/SetupProfile";
import AcceptInvite from "@/pages/AcceptInvite";
import SimpleInvite from "@/pages/SimpleInvite";
import AdminInvites from "@/pages/AdminInvites";
import AdminAccess from "@/pages/AdminAccess";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CourseProtectedRoute } from "@/components/CourseProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const AppRoutes = () => {
  const { session, loading, isProfileComplete, user, profile } = useAuth();
  
  // Handle malformed invite URLs that go to root with hash
  useEffect(() => {
    const currentUrl = window.location.href;
    const hash = window.location.hash;
    
    // If URL is root with hash, check if it contains invite token
    if (window.location.pathname === '/' && hash) {
      console.log('🔍 Detected root URL with hash:', { currentUrl, hash });
      
      // Check if hash contains invite token
      if (hash.includes('invite=')) {
        const inviteToken = new URLSearchParams(hash.substring(1)).get('invite');
        if (inviteToken) {
          console.log('🎫 Found invite token in hash, redirecting to AcceptInvite page');
          window.location.replace(`/accept-invite?invite=${inviteToken}`);
          return;
        }
      }
    }
  }, []);
  
  // Debug logging
  console.log('🎯 AppRoutes state:', { 
    loading, 
    hasSession: !!session, 
    hasUser: !!user, 
    hasProfile: !!profile, 
    isProfileComplete,
    userId: user?.id 
  });

  // Show loading spinner while checking auth state
  if (loading) {
    console.log('⏳ Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-body-text">Loading...</p>
        </div>
      </div>
    );
  }

  // User is not logged in.
  if (!session) {
    console.log('❌ No session, showing unauthenticated routes');
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SimpleSignup />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/invite/:token" element={<SimpleInvite />} />
        <Route path="/account-setup" element={<SetupProfile />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    );
  }

  // Check if profile is complete
  const isProfileCompleteLocal = profile && (
    profile.first_name && profile.first_name.trim() !== '' &&
    profile.last_name && profile.last_name.trim() !== '' &&
    profile.username && profile.username.trim() !== ''
  );

  // Debug profile completion
  console.log('🔍 Profile completion check:', {
    hasProfile: !!profile,
    first_name: profile?.first_name,
    last_name: profile?.last_name,
    username: profile?.username,
    isComplete: isProfileCompleteLocal
  });

  // Emergency fallback: If user has any profile data, consider them complete
  // This prevents existing users from being stuck in account setup loop
  const hasAnyProfileData = profile && (
    profile.first_name || 
    profile.last_name || 
    profile.username
  );
  
  const shouldShowApp = isProfileCompleteLocal || hasAnyProfileData;
  
  console.log('🚨 Emergency fallback check:', {
    hasAnyProfileData,
    shouldShowApp,
    originalComplete: isProfileCompleteLocal
  });

  // If profile incomplete, redirect to setup
  // START OF CHANGE: Disabling the incomplete profile redirect (lines 124-135)
  /*
  if (!shouldShowApp) {
    console.log('⚠️ Profile incomplete, redirecting to setup');
    return (
      <Routes>
        <Route path="/account-setup" element={<SetupProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/invite/:token" element={<SimpleInvite />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  */
  // END OF CHANGE

  // Fully authenticated with complete profile
  console.log('✅ User authenticated, showing app (profile check is disabled by edit)');
  return (
    <AppShell>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/invite/:token" element={<SimpleInvite />} />
        <Route path="/course/:slug" element={
          <CourseProtectedRoute>
            <CourseDetail />
          </CourseProtectedRoute>
        } />
        <Route path="/lesson/:lessonId" element={<LessonPlayer />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/invites" element={<AdminInvites />} />
        <Route path="/admin/access" element={<AdminAccess />} />
        <Route path="/course/:slug/certificate" element={<Certificate />} />
        {/* Redirect authenticated users away from login */}
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route path="/account-setup" element={<SetupProfile />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
};

const App = () => (
  <ErrorBoundary>
    <Sonner richColors />
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
