import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { Media } from '../types';

const MEDIA_COLLECTION = 'media';

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        'image/jpeg',
        0.82,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };

    img.src = url;
  });
}

export async function getAllMedia(): Promise<Media[]> {
  const mediaRef = collection(db, MEDIA_COLLECTION);
  const q = query(mediaRef, orderBy('uploadedAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Media[];
}

export async function getMyMedia(uid: string): Promise<Media[]> {
  const mediaRef = collection(db, MEDIA_COLLECTION);
  const q = query(mediaRef, where('uploadedBy', '==', uid), orderBy('uploadedAt', 'desc'));
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

  let uploadFile: File | Blob = data.file;
  if (data.type === 'photo') {
    uploadFile = await compressImage(data.file);
  }

  const uploadedAt = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(uploadedAt.toMillis() + 365 * 24 * 60 * 60 * 1000);

  await uploadBytes(storageRef, uploadFile);
  const downloadUrl = await getDownloadURL(storageRef);

  const mediaRef = collection(db, MEDIA_COLLECTION);
  const docRef = await addDoc(mediaRef, {
    type: data.type,
    url: downloadUrl,
    thumbnailUrl: null,
    uploadedBy: data.uploadedBy,
    uploadedAt,
    year: data.year,
    description: data.description,
    expiresAt,
    compressed: false,
    remindersSent: [],
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
