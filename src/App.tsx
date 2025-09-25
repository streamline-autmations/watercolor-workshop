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

const AppRoutes = () => {
  const { session, loading, isProfileComplete, user, profile } = useAuth();

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
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // User is logged in, but their profile is not complete.
  if (!isProfileComplete) {
    console.log('⚠️ Session exists but profile incomplete, redirecting to account setup');
    return (
      <Routes>
        <Route path="/account-setup" element={<SetupProfile />} />
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
        <Route path="/course/:slug" element={<CourseDetail />} />
        <Route path="/lesson/:lessonId" element={<LessonPlayer />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/profile" element={<Profile />} />
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