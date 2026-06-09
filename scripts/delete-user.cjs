#!/usr/bin/env node
/**
 * Delete a user completely by email or uid.
 * Usage:
 *   node scripts/delete-user.cjs --email user@example.com
 *   node scripts/delete-user.cjs --uid someUid
 *
 * Requires firebase-admin (installed in functions/).
 * Auth: uses GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON),
 * or falls back to Application Default Credentials.
 */

const args = process.argv.slice(2);

function readFlag(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

const email = readFlag('--email');
const uidArg = readFlag('--uid');

if (!email && !uidArg) {
  console.error('Usage: node scripts/delete-user.cjs --email user@example.com');
  console.error('   or: node scripts/delete-user.cjs --uid someUid');
  process.exit(1);
}

const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'ats-camp',
});

const db = admin.firestore();

async function resolveUser() {
  if (uidArg) {
    const doc = await db.collection('users').doc(uidArg).get();
    if (doc.exists) {
      return { uid: uidArg, email: doc.data()?.email || null, hasDoc: true };
    }

    try {
      const authUser = await admin.auth().getUser(uidArg);
      return { uid: authUser.uid, email: authUser.email || null, hasDoc: false };
    } catch {
      return null;
    }
  }

  const normalizedEmail = email.trim().toLowerCase();

  const snapshot = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { uid: doc.id, email: doc.data().email || normalizedEmail, hasDoc: true };
  }

  try {
    const authUser = await admin.auth().getUserByEmail(normalizedEmail);
    return { uid: authUser.uid, email: authUser.email || normalizedEmail, hasDoc: false };
  } catch {
    return null;
  }
}

async function main() {
  const resolved = await resolveUser();
  if (!resolved) {
    console.error('No matching user found in Firestore or Firebase Auth.');
    process.exit(1);
  }

  try {
    await admin.auth().revokeRefreshTokens(resolved.uid);
    await admin.auth().deleteUser(resolved.uid);
    console.log(`Deleted Firebase Auth user ${resolved.uid}.`);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      console.log(`Firebase Auth user ${resolved.uid} was already absent.`);
    } else {
      throw error;
    }
  }

  await db.collection('users').doc(resolved.uid).delete();
  console.log(`Deleted Firestore profile for ${resolved.email || resolved.uid}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
