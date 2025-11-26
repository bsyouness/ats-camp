import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../components/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { firebaseUser, loading } = useAuth();

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
      <RegisterForm onSuccess={handleSuccess} />
    </div>
  );
}
