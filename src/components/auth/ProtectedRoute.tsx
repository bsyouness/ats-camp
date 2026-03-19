import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingPage } from '../ui';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { firebaseUser, user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.banned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-playa-dark px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-3">Account Suspended</h1>
          <p className="text-gray-400">Your account has been suspended. Please contact the camp organizers if you believe this is a mistake.</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
