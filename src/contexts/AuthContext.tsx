import { useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { awaitPendingSignIn } from '../services/auth';
import { setAuthNotice } from '../services/auth-notice';
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
        // A sign-up writes its profile doc after authenticating, so wait for the flow
        // to finish before reading — otherwise we sign the user straight back out.
        await awaitPendingSignIn();
        if (auth.currentUser?.uid !== fbUser.uid) return;

        try {
          const userData = await getUser(fbUser.uid);
          if (userData) {
            setUser(userData);
          } else {
            // Confirmed missing profile doc: end the session instead of leaving a ghost login.
            console.error(
              `[auth] No profile document for uid ${fbUser.uid}; signing out. ` +
                'The sign-up flow either failed or never ran.',
            );
            setAuthNotice(
              'Your sign-in could not be completed because your profile was not created. Please try again.',
            );
            await auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error('[auth] Error fetching user data:', error);
          // Keep the session for transient fetch failures; only sign out on confirmed absence.
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('previewAsUser');
        setPreviewAsUserState(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function setPreviewAsUser(v: boolean) {
    sessionStorage.setItem('previewAsUser', String(v));
    setPreviewAsUserState(v);
  }

  async function refreshUser() {
    if (!auth.currentUser) return;
    try {
      const userData = await getUser(auth.currentUser.uid);
      if (userData) setUser(userData);
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    isAdmin: user?.role === 'admin' && user?.approved !== false && !previewAsUser,
    previewAsUser,
    setPreviewAsUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
