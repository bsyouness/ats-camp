import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../../components/auth';
import { useAuth } from '../../contexts/useAuth';
import { getAuthNotice, subscribeAuthNotice } from '../../services/auth-notice';
import { useEffect, useSyncExternalStore } from 'react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { firebaseUser, loading } = useAuth();
  // Reason a previous attempt bounced back here, if any.
  const notice = useSyncExternalStore(subscribeAuthNotice, getAuthNotice);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!loading && firebaseUser) {
      navigate(from, { replace: true });
    }
  }, [firebaseUser, loading, navigate, from]);

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <LoginForm onSuccess={handleSuccess} initialError={notice} />
    </div>
  );
}
