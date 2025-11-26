import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUser, getUser } from './users';

const googleProvider = new GoogleAuthProvider();

export async function signUp(email: string, password: string, displayName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(userCredential.user, { displayName });

  await createUser({
    uid: userCredential.user.uid,
    email: userCredential.user.email!,
    displayName,
  });

  return userCredential.user;
}

export async function signIn(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signInWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);

  const existingUser = await getUser(userCredential.user.uid);

  if (!existingUser) {
    await createUser({
      uid: userCredential.user.uid,
      email: userCredential.user.email!,
      displayName: userCredential.user.displayName || 'Anonymous',
      photoURL: userCredential.user.photoURL,
    });
  }

  return userCredential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}
