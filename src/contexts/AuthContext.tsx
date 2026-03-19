import { useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUser } from '../services/users';
import { User } from '../types';
import { AuthContext, AuthContextType } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewAsUser, setPreviewAsUserState] = useState<boolean>(
    () => sessionStorage.getItem('previewAsUser') === 'true',
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const userData = await getUser(fbUser.uid);
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function setPreviewAsUser(v: boolean) {
    sessionStorage.setItem('previewAsUser', String(v));
    setPreviewAsUserState(v);
  }

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    isAdmin: user?.role === 'admin' && !previewAsUser,
    previewAsUser,
    setPreviewAsUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
