import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../../components/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { firebaseUser, loading } = useAuth();

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
      <LoginForm onSuccess={handleSuccess} />
    </div>
  );
}
