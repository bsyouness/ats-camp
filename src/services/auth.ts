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
import { createUser, getUser, getUserByEmail, updateUser } from './users';
import { LoginMethod, User } from '../types';

const googleProvider = new GoogleAuthProvider();

class AuthMethodError extends Error {
  code = 'auth/wrong-login-method';

  constructor(message: string) {
    super(message);
    this.name = 'AuthMethodError';
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getLoginMethodLabel(method: LoginMethod): string {
  switch (method) {
    case 'email':
      return 'email and password';
    case 'google':
      return 'Google';
    case 'hubid':
      return 'Hub Culture';
  }
}

async function ensureLoginMethod(user: User, method: LoginMethod): Promise<void> {
  if (user.loginMethod && user.loginMethod !== method) {
    throw new AuthMethodError(
      `This account uses ${getLoginMethodLabel(user.loginMethod)}. Sign in with that method.`,
    );
  }
}

async function persistLoginMethodIfMissing(user: User | null, method: LoginMethod): Promise<void> {
  if (user && !user.loginMethod) {
    await updateUser(user.uid, { loginMethod: method });
  }
}

export async function signUp(email: string, password: string, displayName: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    const method = existingUser.loginMethod ?? 'email';
    throw new AuthMethodError(
      `An account with this email already exists and uses ${getLoginMethodLabel(method)}.`,
    );
  }

  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

  await updateProfile(userCredential.user, { displayName });

  await createUser({
    uid: userCredential.user.uid,
    email: normalizedEmail,
    displayName,
    loginMethod: 'email',
  });

  return userCredential.user;
}

export async function signIn(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    await ensureLoginMethod(existingUser, 'email');
  }

  const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  await persistLoginMethodIfMissing(existingUser, 'email');
  return userCredential.user;
}

export async function signInWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const email = userCredential.user.email;
  if (!email) {
    await firebaseSignOut(auth);
    throw new Error('Google did not return an email address for this account.');
  }

  const existingUser = await getUser(userCredential.user.uid);
  const existingUserByEmail = await getUserByEmail(email);

  if (existingUserByEmail && existingUserByEmail.uid !== userCredential.user.uid) {
    const method = existingUserByEmail.loginMethod ?? 'email';
    await firebaseSignOut(auth);
    throw new AuthMethodError(
      `This email is already registered with ${getLoginMethodLabel(method)}.`,
    );
  }

  if (!existingUser) {
    await createUser({
      uid: userCredential.user.uid,
      email,
      displayName: userCredential.user.displayName || 'Anonymous',
      photoURL: userCredential.user.photoURL,
      loginMethod: 'google',
    });
  } else {
    try {
      await ensureLoginMethod(existingUser, 'google');
      await persistLoginMethodIfMissing(existingUser, 'google');
    } catch (error) {
      await firebaseSignOut(auth);
      throw error;
    }
  }

  return userCredential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function signInWithHubId(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUserByEmail = await getUserByEmail(normalizedEmail);
  if (existingUserByEmail) {
    await ensureLoginMethod(existingUserByEmail, 'hubid');
  }

  const signInWithHubIdFn = httpsCallable<
    { email: string; password: string },
    { customToken: string; user: { uid: string; email: string; displayName: string; photoURL?: string; hubIdUserId: number } }
  >(functions, 'signInWithHubId');

  const result = await signInWithHubIdFn({ email: normalizedEmail, password });
  const { customToken, user } = result.data;

  // Sign in to Firebase with the custom token
  const userCredential = await signInWithCustomToken(auth, customToken);

  // Create or update user in Firestore
  const existingUser = await getUser(userCredential.user.uid);
  const normalizedUserEmail = normalizeEmail(user.email);
  const emailOwner = await getUserByEmail(normalizedUserEmail);

  if (emailOwner && emailOwner.uid !== userCredential.user.uid) {
    await firebaseSignOut(auth);
    throw new AuthMethodError(
      `This email is already registered with ${getLoginMethodLabel(emailOwner.loginMethod ?? 'email')}.`,
    );
  }

  if (!existingUser) {
    await createUser({
      uid: userCredential.user.uid,
      email: normalizedUserEmail,
      displayName: user.displayName || 'HubID User',
      photoURL: user.photoURL,
      loginMethod: 'hubid',
    });
  } else {
    try {
      await ensureLoginMethod(existingUser, 'hubid');
      await persistLoginMethodIfMissing(existingUser, 'hubid');
    } catch (error) {
      await firebaseSignOut(auth);
      throw error;
    }
  }

  return userCredential.user;
}
