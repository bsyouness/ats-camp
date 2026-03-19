import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
import sgMail = require('@sendgrid/mail');

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

export const onVideoUploaded = onObjectFinalized(async (event) => {
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

// ── Expiry reminder emails (daily 08:00 UTC) ──────────────────────────────────

export const sendMediaExpiryReminders = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'UTC' },
  async () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      functions.logger.error('SENDGRID_API_KEY not set');
      return;
    }
    sgMail.setApiKey(apiKey);

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const in31Days = admin.firestore.Timestamp.fromMillis(now.toMillis() + 31 * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('media')
      .where('expiresAt', '<=', in31Days)
      .where('expiresAt', '>', now)
      .get();

    let sent = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const expiresAt = data.expiresAt as admin.firestore.Timestamp;
      const remindersSent: string[] = data.remindersSent || [];
      const daysLeft = Math.ceil((expiresAt.toMillis() - now.toMillis()) / (1000 * 60 * 60 * 24));

      const thresholds = [
        { key: '30d', days: 30, subject: 'Your media expires in 30 days — ATS Camp' },
        { key: '2d', days: 2, subject: 'Reminder: your media expires in 2 days — ATS Camp' },
      ];

      for (const threshold of thresholds) {
        if (daysLeft <= threshold.days && !remindersSent.includes(threshold.key)) {
          const userDoc = await db.collection('users').doc(data.uploadedBy as string).get();
          const uploaderEmail = userDoc.data()?.email as string | undefined;
          if (!uploaderEmail) continue;

          const expiryDate = new Date(expiresAt.toMillis()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          });

          await sgMail.send({
            to: uploaderEmail,
            from: 'noreply@ats-camp.com',
            subject: threshold.subject,
            text: `Your uploaded media will expire on ${expiryDate}. Log in to download or re-upload it before it's removed.\n\nhttps://ats-camp.web.app/media`,
            html: `<p>Your uploaded media will expire on <strong>${expiryDate}</strong>.</p><p>Log in to download or re-upload it before it's removed.</p><p><a href="https://ats-camp.web.app/media">View your media</a></p>`,
          });

          await docSnap.ref.update({
            remindersSent: admin.firestore.FieldValue.arrayUnion(threshold.key),
          });

          sent++;
        }
      }
    }

    functions.logger.info(`Sent ${sent} expiry reminder email(s)`);
  },
);

// ── Cleanup expired media (daily 03:00 UTC) ────────────────────────────────────

export const cleanupExpiredMedia = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'UTC' },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db.collection('media')
      .where('expiresAt', '<', now)
      .get();

    let deleted = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const bucket = admin.storage().bucket();

      try {
        const url = data.url as string;
        const match = url.match(/\/o\/(.+?)\?/);
        if (match) {
          const storagePath = decodeURIComponent(match[1]);
          await bucket.file(storagePath).delete();
        }
      } catch (err) {
        functions.logger.warn(`Could not delete storage file for media ${docSnap.id}:`, err);
      }

      await docSnap.ref.delete();
      deleted++;
    }

    functions.logger.info(`Deleted ${deleted} expired media item(s)`);
  },
);
