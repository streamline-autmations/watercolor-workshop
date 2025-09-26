import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import CourseDetail from "./pages/CourseDetail";
import LessonPlayer from "./pages/LessonPlayer";
import Bookmarks from "./pages/Bookmarks";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Certificate from "./pages/Certificate";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./contexts/AuthProvider";
import { useAuth } from "./hooks/useAuth";
import { Skeleton } from "./components/ui/skeleton";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import SetupProfile from "./pages/SetupProfile";
import AcceptInvite from "./pages/AcceptInvite";
import AdminInvites from "./pages/AdminInvites";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CourseProtectedRoute } from "./components/CourseProtectedRoute";

const AppRoutes = () => {
  const { session, loading, isProfileComplete, user, profile } = useAuth();
  // Debug: Force update to trigger deployment

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
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <p className="text-body-text">Loading...</p>
        </div>
      </div>
    );
  }

  // User is not logged in.
  if (!session) {
    console.log('❌ No session, redirecting to login');
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Show loading while checking profile for authenticated users
  if (session && user && loading) {
    console.log('⏳ Session exists, checking profile...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom">
        <div className="text-center">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <p className="text-body-text">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // User is logged in, but their profile is not complete.
  // Only redirect to account setup if we have a session but no profile data
  // (not just during the initial loading phase)
  if (!isProfileComplete && session && user && !loading) {
    console.log('⚠️ Session exists but profile incomplete, redirecting to account setup');
    return (
      <Routes>
        <Route path="/account-setup" element={<SetupProfile />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/account-setup" replace />} />
      </Routes>
    );
  }

  // Fully authenticated and profile complete
  console.log('✅ User fully authenticated, showing app');
  return (
    <AppShell>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/course/:slug" element={
          <CourseProtectedRoute>
            <CourseDetail />
          </CourseProtectedRoute>
        } />
        <Route path="/lesson/:lessonId" element={<LessonPlayer />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin/invites" element={<AdminInvites />} />
        <Route path="/course/:slug/certificate" element={<Certificate />} />
        {/* Redirect authenticated users away from login and account setup */}
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route path="/account-setup" element={<Navigate to="/home" replace />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
};

const App = () => (
  <>
    <Sonner richColors />
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </>
);

export default App;