import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';
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

export async function signInWithHubId(email: string, password: string) {
  const signInWithHubIdFn = httpsCallable<
    { email: string; password: string },
    { customToken: string; user: { uid: string; email: string; displayName: string; photoURL?: string; hubIdUserId: number } }
  >(functions, 'signInWithHubId');

  const result = await signInWithHubIdFn({ email, password });
  const { customToken, user } = result.data;

  // Sign in to Firebase with the custom token
  const userCredential = await signInWithCustomToken(auth, customToken);

  // Create or update user in Firestore
  const existingUser = await getUser(userCredential.user.uid);

  if (!existingUser) {
    await createUser({
      uid: userCredential.user.uid,
      email: user.email,
      displayName: user.displayName || 'HubID User',
      photoURL: user.photoURL,
    });
  }

  return userCredential.user;
}
