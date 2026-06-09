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

  // Firestore doc drives the app UI; the custom claim drives Storage rules.
  await userDoc.ref.update({ role: 'admin', approved: true });
  const existingClaims = (await admin.auth().getUser(userDoc.id)).customClaims || {};
  await admin.auth().setCustomUserClaims(userDoc.id, { ...existingClaims, admin: true });

  console.log(`Done. ${email} (uid: ${userDoc.id}) is now an approved admin.`);
  console.log('The user must sign out and back in for the admin claim to take effect.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
