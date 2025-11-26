import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Shift, ShiftSlot } from '../types';

const SHIFTS_COLLECTION = 'shifts';

export async function getAllShifts(): Promise<Shift[]> {
  const shiftsRef = collection(db, SHIFTS_COLLECTION);
  const q = query(shiftsRef, orderBy('date'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Shift[];
}

export async function getShift(shiftId: string): Promise<Shift | null> {
  const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
  const shiftSnap = await getDoc(shiftRef);

  if (shiftSnap.exists()) {
    return { id: shiftSnap.id, ...shiftSnap.data() } as Shift;
  }

  return null;
}

export async function createShift(data: {
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  slots: ShiftSlot[];
  createdBy: string;
}): Promise<string> {
  const shiftsRef = collection(db, SHIFTS_COLLECTION);
  const docRef = await addDoc(shiftsRef, {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function updateShift(shiftId: string, data: Partial<Shift>): Promise<void> {
  const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
  await updateDoc(shiftRef, data);
}

export async function deleteShift(shiftId: string): Promise<void> {
  const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
  await deleteDoc(shiftRef);
}

export async function signUpForSlot(
  shiftId: string,
  slotId: string,
  userId: string
): Promise<void> {
  const shift = await getShift(shiftId);
  if (!shift) throw new Error('Shift not found');

  const updatedSlots = shift.slots.map((slot) => {
    if (slot.id === slotId && !slot.preAssigned && !slot.assignedTo) {
      return { ...slot, assignedTo: userId };
    }
    return slot;
  });

  await updateShift(shiftId, { slots: updatedSlots });
}

export async function cancelSlotSignUp(
  shiftId: string,
  slotId: string,
  userId: string
): Promise<void> {
  const shift = await getShift(shiftId);
  if (!shift) throw new Error('Shift not found');

  const updatedSlots = shift.slots.map((slot) => {
    if (slot.id === slotId && slot.assignedTo === userId && !slot.preAssigned) {
      return { ...slot, assignedTo: null };
    }
    return slot;
  });

  await updateShift(shiftId, { slots: updatedSlots });
}
