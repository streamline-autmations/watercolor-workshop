import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: ProtectedRouteProps) => {
  const { session, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom">
        <div className="text-center">
          <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
          <p className="text-body-text">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not logged in, redirect
  if (requireAuth && !session) {
    return <Navigate to={redirectTo} replace />;
  }

  // If auth is not required but user is logged in, redirect to home
  if (!requireAuth && session) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
