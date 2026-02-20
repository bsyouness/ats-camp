#!/usr/bin/env node
/**
 * Promote a user to admin by email.
 * Usage:  node scripts/make-admin.js <email>
 *
 * Requires firebase-admin (installed in functions/).
 * Auth: uses GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON),
 * or falls back to Application Default Credentials (works after `firebase login`
 * or `gcloud auth application-default login`).
 */

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'ats-camp',
});

const db = admin.firestore();

async function main() {
  // Find user document by email field
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

  if (snapshot.empty) {
    console.error(`No user found with email: ${email}`);
    console.error('Make sure the user has logged in at least once so their Firestore doc exists.');
    process.exit(1);
  }

  const userDoc = snapshot.docs[0];
  const current = userDoc.data();

  if (current.role === 'admin') {
    console.log(`${email} (uid: ${userDoc.id}) is already an admin.`);
    process.exit(0);
  }

  await userDoc.ref.update({ role: 'admin' });
  console.log(`Done. ${email} (uid: ${userDoc.id}) is now an admin.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
