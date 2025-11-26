import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

const USERS_COLLECTION = 'users';

export async function createUser(data: {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, data.uid);

  const newUser: User = {
    uid: data.uid,
    email: data.email,
    role: 'member',
    createdAt: Timestamp.now(),
    displayName: data.displayName,
    photoURL: data.photoURL || null,
    playaName: null,
    bio: null,
    skills: [],
    contactInfo: {},
    yearsAttended: [],
    tentNumber: null,
  };

  await setDoc(userRef, newUser);
}

export async function getUser(uid: string): Promise<User | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as User;
  }

  return null;
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, data);
}

export async function getAllUsers(): Promise<User[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, orderBy('displayName'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => doc.data() as User);
}

export async function setUserRole(uid: string, role: 'member' | 'admin'): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { role });
}

export async function assignTentNumber(uid: string, tentNumber: number | null): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, { tentNumber });
}
