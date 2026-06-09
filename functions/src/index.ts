import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

admin.initializeApp();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const HUBID_API_URL = 'https://id.hubculture.com';
const HUBID_PRIVATE_KEY = 'private_4d39c2d2009f2ea1970fc74a';
const HUBID_PUBLIC_KEY = 'public_153222247f4cbe2511208120a';
const HUBID_CLIENT_ID = '10050';

interface HubIdTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

interface HubIdUserData {
  id: number;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  image?: string;
  memberships?: string[];
}

type LoginMethod = 'email' | 'google' | 'hubid';

async function requireAdminCaller(request: functions.https.CallableRequest<unknown>) {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const caller = await admin.firestore().collection('users').doc(request.auth.uid).get();
  if (!caller.exists || caller.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
}

async function getHubIdAccessToken(email: string, password: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: HUBID_CLIENT_ID,
    username: email,
    password: password,
  });

  const response = await fetch(`${HUBID_API_URL}/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Private-Key': HUBID_PRIVATE_KEY,
      'Public-Key': HUBID_PUBLIC_KEY,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HubID auth failed:', response.status, errorText);
    throw new Error('Invalid credentials');
  }

  const data = await response.json() as HubIdTokenResponse;
  return data.access_token;
}

async function getHubIdRefreshToken(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: HUBID_CLIENT_ID,
    access_token: accessToken,
  });

  const response = await fetch(`${HUBID_API_URL}/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Private-Key': HUBID_PRIVATE_KEY,
      'Public-Key': HUBID_PUBLIC_KEY,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    return accessToken;
  }

  const data = await response.json() as HubIdTokenResponse;
  return data.refresh_token || data.access_token;
}

async function getHubIdUserData(accessToken: string): Promise<HubIdUserData> {
  const response = await fetch(`${HUBID_API_URL}/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Private-Key': HUBID_PRIVATE_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }

  const result = await response.json();
  return result.data || result;
}

export const getLoginMethodForEmail = functions.https.onCall(async (request) => {
  const email = String(request.data?.email || '').trim().toLowerCase();

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  const snapshot = await admin
    .firestore()
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { exists: false, uid: null, loginMethod: null };
  }

  const doc = snapshot.docs[0];
  const data = doc.data() as { loginMethod?: LoginMethod };

  return {
    exists: true,
    uid: doc.id,
    loginMethod: data.loginMethod ?? null,
  };
});

export const deleteUserCompletely = functions.https.onCall(async (request) => {
  await requireAdminCaller(request);

  const uid = String(request.data?.uid || '').trim();
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'UID is required');
  }

  const db = admin.firestore();

  try {
    await admin.auth().revokeRefreshTokens(uid);
    await admin.auth().deleteUser(uid);
  } catch (error) {
    const err = error as { code?: string };
    if (err.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', 'Failed to delete Firebase Auth user');
    }
  }

  await db.collection('users').doc(uid).delete();
  return { success: true };
});

export const signInWithHubId = functions.https.onCall(async (request) => {
  const { email, password } = request.data;

  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and password are required');
  }

  try {
    // Step 1: Authenticate with HubID
    const accessToken = await getHubIdAccessToken(email, password);

    // Step 2: Get refresh token for longer-lived session
    const refreshToken = await getHubIdRefreshToken(accessToken);

    // Step 3: Get user data from HubID
    const hubIdUser = await getHubIdUserData(refreshToken);

    // Step 4: Create or get Firebase user
    const uid = `hubid_${hubIdUser.id}`;

    try {
      await admin.auth().getUser(uid);
    } catch {
      // User doesn't exist, create them
      await admin.auth().createUser({
        uid: uid,
        email: hubIdUser.email,
        displayName: hubIdUser.name || `${hubIdUser.first_name || ''} ${hubIdUser.last_name || ''}`.trim(),
        photoURL: hubIdUser.image || undefined,
      });
    }

    // Step 5: Create custom token for Firebase auth
    const customToken = await admin.auth().createCustomToken(uid, {
      hubIdUserId: hubIdUser.id,
      provider: 'hubid',
    });

    return {
      customToken,
      user: {
        uid: uid,
        email: hubIdUser.email,
        displayName: hubIdUser.name,
        photoURL: hubIdUser.image,
        hubIdUserId: hubIdUser.id,
      },
    };
  } catch (error) {
    console.error('HubID sign in error:', error);
    throw new functions.https.HttpsError('unauthenticated', 'Invalid email or password');
  }
});

// ── Video transcoding ──────────────────────────────────────────────────────────

export const onVideoUploaded = onObjectFinalized({ region: 'us-east1' }, async (event) => {
  const object = event.data;
  const contentType = object.contentType || '';
  if (!contentType.startsWith('video/')) return;

  // Skip already-compressed files to avoid re-trigger loop
  if (object.metadata?.compressed === 'true') return;

  const filePath = object.name;
  if (!filePath) return;

  const bucket = admin.storage().bucket(object.bucket);
  const tmpInput = path.join(os.tmpdir(), `input_${path.basename(filePath)}`);
  const tmpOutput = path.join(os.tmpdir(), `output_${Date.now()}.mp4`);

  try {
    // Download original file
    await bucket.file(filePath).download({ destination: tmpInput });

    // Transcode with ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tmpInput)
        .videoCodec('libx264')
        .addOption('-crf', '28')
        .addOption('-vf', 'scale=\'min(1280,iw)\':\'min(720,ih)\':force_original_aspect_ratio=decrease')
        .audioCodec('aac')
        .audioBitrate('128k')
        .format('mp4')
        .on('error', reject)
        .on('end', () => resolve())
        .save(tmpOutput);
    });

    // Re-upload compressed file to same path with metadata flag
    await bucket.upload(tmpOutput, {
      destination: filePath,
      metadata: {
        contentType: 'video/mp4',
        metadata: { compressed: 'true' },
      },
    });

    // Get fresh download URL
    const [url] = await bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    // Update Firestore: find media doc whose url contains the file basename
    const db = admin.firestore();
    const allDocs = await db.collection('media')
      .where('compressed', '==', false)
      .get();

    const matchingDocs = allDocs.docs.filter(
      (d) => (d.data().url as string).includes(path.basename(filePath)),
    );

    for (const d of matchingDocs) {
      await d.ref.update({ compressed: true, url });
    }

    functions.logger.info(`Transcoded video: ${filePath}`);
  } finally {
    if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
    if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
  }
});
