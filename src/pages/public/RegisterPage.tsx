import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../components/auth';
import { useAuth } from '../../contexts/useAuth';
import { getAuthNotice, subscribeAuthNotice } from '../../services/auth-notice';
import { useEffect, useSyncExternalStore } from 'react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { firebaseUser, loading } = useAuth();
  // Reason a previous attempt bounced back here, if any.
  const notice = useSyncExternalStore(subscribeAuthNotice, getAuthNotice);

  useEffect(() => {
    if (!loading && firebaseUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [firebaseUser, loading, navigate]);

  const handleSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <RegisterForm onSuccess={handleSuccess} initialError={notice} />
    </div>
  );
}
