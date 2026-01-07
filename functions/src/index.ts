import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

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
    let firebaseUser;

    try {
      firebaseUser = await admin.auth().getUser(uid);
    } catch {
      // User doesn't exist, create them
      firebaseUser = await admin.auth().createUser({
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
