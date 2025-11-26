import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { ContactSubmission } from '../types';

const CONTACTS_COLLECTION = 'contacts';

export async function getAllContacts(): Promise<ContactSubmission[]> {
  const contactsRef = collection(db, CONTACTS_COLLECTION);
  const q = query(contactsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ContactSubmission[];
}

export async function markContactHandled(contactId: string, handled: boolean): Promise<void> {
  const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
  await updateDoc(contactRef, { handled });
}

export async function deleteContact(contactId: string): Promise<void> {
  const contactRef = doc(db, CONTACTS_COLLECTION, contactId);
  await deleteDoc(contactRef);
}
