import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { Media } from '../types';

const MEDIA_COLLECTION = 'media';

export async function getAllMedia(): Promise<Media[]> {
  const mediaRef = collection(db, MEDIA_COLLECTION);
  const q = query(mediaRef, orderBy('uploadedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Media[];
}

export async function uploadMedia(data: {
  file: File;
  type: 'photo' | 'video';
  description: string;
  year: number;
  uploadedBy: string;
}): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${data.file.name}`;
  const storageRef = ref(storage, `media/${data.year}/${data.uploadedBy}/${fileName}`);

  await uploadBytes(storageRef, data.file);
  const downloadUrl = await getDownloadURL(storageRef);

  const mediaRef = collection(db, MEDIA_COLLECTION);
  const docRef = await addDoc(mediaRef, {
    type: data.type,
    url: downloadUrl,
    thumbnailUrl: null,
    uploadedBy: data.uploadedBy,
    uploadedAt: Timestamp.now(),
    year: data.year,
    description: data.description,
  });

  return docRef.id;
}

export async function deleteMedia(mediaId: string, url: string): Promise<void> {
  const mediaRef = doc(db, MEDIA_COLLECTION, mediaId);

  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  await deleteDoc(mediaRef);
}

export function getMediaType(file: File): 'photo' | 'video' | null {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}
