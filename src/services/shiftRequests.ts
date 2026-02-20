import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ShiftRequest } from '../types';

const COLLECTION = 'shiftRequests';

export async function createShiftRequest(data: {
  userId: string;
  type: 'change_request' | 'cancel_request';
  shiftId: string;
  slotId: string;
  targetShiftId: string | null;
  targetSlotId: string | null;
  message: string;
}): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...data,
    status: 'pending',
    createdAt: Timestamp.now(),
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  });
  return docRef.id;
}

export async function getAllShiftRequests(): Promise<ShiftRequest[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ShiftRequest[];
}

export async function getPendingShiftRequests(): Promise<ShiftRequest[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('status', '==', 'pending'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ShiftRequest[];
}

export async function getUserShiftRequests(userId: string): Promise<ShiftRequest[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ShiftRequest[];
}

export async function updateShiftRequestStatus(
  id: string,
  status: 'approved' | 'denied',
  reviewedBy: string,
  reviewNote: string | null
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    status,
    reviewedBy,
    reviewedAt: Timestamp.now(),
    reviewNote: reviewNote || null,
  });
}
