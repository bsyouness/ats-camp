import { createContext } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';

export interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  previewAsUser: boolean;
  setPreviewAsUser: (v: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
