import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';
import { createUser, getUser, updateUser } from './users';
import { clearAuthNotice, setAuthNotice } from './auth-notice';
import { LoginMethod, User } from '../types';

const googleProvider = new GoogleAuthProvider();
const getLoginMethodForEmailFn = httpsCallable<
  { email: string },
  { exists: boolean; uid: string | null; loginMethod: LoginMethod | null }
>(functions, 'getLoginMethodForEmail');

class AuthMethodError extends Error {
  code = 'auth/wrong-login-method';

  constructor(message: string) {
    super(message);
    this.name = 'AuthMethodError';
  }
}

/**
 * Firebase notifies auth observers as soon as the credential is accepted, which is
 * before a sign-up flow has written its Firestore profile doc. Sign-in flows register
 * here so the auth listener can wait them out instead of mistaking that gap for a
 * profile-less session.
 */
let pendingSignIn: Promise<void> | null = null;

function trackSignIn<T>(run: () => Promise<T>): Promise<T> {
  const promise = run();
  const settled = promise.then(
    () => {
      clearAuthNotice();
    },
    (error: unknown) => {
      // The form that called us may already be unmounted by the redirect, so the
      // reason is parked where the remounted login page will find it.
      console.error('[auth] Sign-in failed:', error);
      setAuthNotice(
        error instanceof Error && error.message
          ? error.message
          : 'Sign-in failed. Please try again.',
      );
    },
  );

  pendingSignIn = settled;
  void settled.then(() => {
    if (pendingSignIn === settled) {
      pendingSignIn = null;
    }
  });

  return promise;
}

/** Resolves once any in-flight sign-in has finished creating/validating its profile. */
export function awaitPendingSignIn(): Promise<void> {
  return pendingSignIn ?? Promise.resolve();
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

async function lookupAccountByEmail(email: string): Promise<{ exists: boolean; uid: string | null; loginMethod: LoginMethod | null }> {
  const result = await getLoginMethodForEmailFn({ email: normalizeEmail(email) });
  return result.data;
}

async function tryLookupAccountByEmail(email: string): Promise<{ exists: boolean; uid: string | null; loginMethod: LoginMethod | null } | null> {
  try {
    return await lookupAccountByEmail(email);
  } catch (error) {
    // Non-fatal by design, but it silently disables the duplicate-email guard —
    // loud enough to spot in the console when the callable is misconfigured.
    console.error(
      '[auth] getLoginMethodForEmail is unreachable; the duplicate-email guard is ' +
        'disabled for this sign-in. Check the callable is deployed and publicly invocable.',
      error,
    );
    return null;
  }
}

export function signUp(email: string, password: string, displayName: string) {
  return trackSignIn(() => runSignUp(email, password, displayName));
}

async function runSignUp(email: string, password: string, displayName: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingAccount = await tryLookupAccountByEmail(normalizedEmail);
  if (existingAccount?.exists) {
    const method = existingAccount.loginMethod ?? 'email';
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

export function signIn(email: string, password: string) {
  return trackSignIn(() => runSignIn(email, password));
}

async function runSignIn(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingAccount = await tryLookupAccountByEmail(normalizedEmail);
  if (existingAccount?.exists && existingAccount.loginMethod && existingAccount.loginMethod !== 'email') {
    throw new AuthMethodError(
      `This account uses ${getLoginMethodLabel(existingAccount.loginMethod)}. Sign in with that method.`,
    );
  }

  const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  // Read by uid: rules always let owners read their own doc, whereas the by-email
  // query requires approval — which a pending user does not have.
  const existingUser = await getUser(userCredential.user.uid);

  if (!existingUser) {
    if (existingAccount?.exists && existingAccount.uid !== userCredential.user.uid) {
      // Another account already owns this email; creating a second doc would
      // duplicate it. Bail rather than fork the identity.
      await firebaseSignOut(auth);
      throw new AuthMethodError(
        `This email is already registered with ${getLoginMethodLabel(existingAccount.loginMethod ?? 'email')}.`,
      );
    }

    // Authenticated, but sign-up never wrote the profile doc. Repair it here so a
    // half-finished registration isn't a permanent lockout.
    console.warn(`[auth] Missing profile for uid ${userCredential.user.uid}; creating it now.`);
    await createUser({
      uid: userCredential.user.uid,
      email: normalizedEmail,
      displayName: userCredential.user.displayName || normalizedEmail.split('@')[0],
      photoURL: userCredential.user.photoURL,
      loginMethod: 'email',
    });

    return userCredential.user;
  }

  try {
    await ensureLoginMethod(existingUser, 'email');
  } catch (error) {
    await firebaseSignOut(auth);
    throw error;
  }

  await persistLoginMethodIfMissing(existingUser, 'email');
  return userCredential.user;
}

export function signInWithGoogle() {
  return trackSignIn(runGoogleSignIn);
}

async function runGoogleSignIn() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const email = userCredential.user.email;
  if (!email) {
    await firebaseSignOut(auth);
    throw new Error('Google did not return an email address for this account.');
  }

  const existingUser = await getUser(userCredential.user.uid);
  // Best-effort like the other flows: an unreachable precheck must not strand a
  // freshly authenticated user without a profile doc.
  const existingAccountByEmail = await tryLookupAccountByEmail(email);

  if (existingAccountByEmail?.exists && existingAccountByEmail.uid !== userCredential.user.uid) {
    const method = existingAccountByEmail.loginMethod ?? 'email';
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

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, normalizeEmail(email));
}

export function signInWithHubId(email: string, password: string) {
  return trackSignIn(() => runHubIdSignIn(email, password));
}

async function runHubIdSignIn(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingAccount = await tryLookupAccountByEmail(normalizedEmail);
  if (existingAccount?.exists && existingAccount.loginMethod && existingAccount.loginMethod !== 'hubid') {
    throw new AuthMethodError(
      `This account uses ${getLoginMethodLabel(existingAccount.loginMethod)}. Sign in with that method.`,
    );
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
  const emailOwner = (await tryLookupAccountByEmail(normalizedUserEmail)) ?? {
    exists: false,
    uid: null,
    loginMethod: null,
  };

  if (emailOwner.exists && emailOwner.uid !== userCredential.user.uid) {
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
