import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { withTimeout } from './async';
import { compressImage } from './media';
import { CampMap, CampSpot } from '../types';

const CAMP_MAPS_COLLECTION = 'campMaps';
const CAMP_MAP_UPLOAD_TIMEOUT_MS = 20000;

export async function getCampMap(year: number): Promise<CampMap | null> {
  const mapRef = doc(db, CAMP_MAPS_COLLECTION, year.toString());
  const mapSnap = await getDoc(mapRef);

  if (mapSnap.exists()) {
    return mapSnap.data() as CampMap;
  }

  return null;
}

export async function getCurrentCampMap(): Promise<CampMap | null> {
  const currentYear = new Date().getFullYear();
  return getCampMap(currentYear);
}

export async function uploadCampMap(
  year: number,
  file: File,
  uploadedBy: string
): Promise<string> {
  const compressed = await compressImage(file);
  const storageRef = ref(storage, `campMaps/${year}/map.jpg`);
  await withTimeout(
    uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' }),
    CAMP_MAP_UPLOAD_TIMEOUT_MS,
    'Camp map upload timed out. Firebase Storage may not be ready yet.',
  );
  const downloadUrl = await withTimeout(
    getDownloadURL(storageRef),
    CAMP_MAP_UPLOAD_TIMEOUT_MS,
    'Camp map URL lookup timed out. Please try again.',
  );

  const mapRef = doc(db, CAMP_MAPS_COLLECTION, year.toString());
  await withTimeout(
    setDoc(mapRef, {
      year,
      imageUrl: downloadUrl,
      spots: [],
      uploadedBy,
      uploadedAt: Timestamp.now(),
    }),
    CAMP_MAP_UPLOAD_TIMEOUT_MS,
    'Camp map save timed out. Please try again.',
  );

  return downloadUrl;
}

export async function updateCampMapSpots(year: number, spots: CampSpot[]): Promise<void> {
  const mapRef = doc(db, CAMP_MAPS_COLLECTION, year.toString());
  await updateDoc(mapRef, { spots });
}

export async function assignSpotToUser(
  year: number,
  spotNumber: number,
  userId: string | null
): Promise<void> {
  const map = await getCampMap(year);
  if (!map) throw new Error('Camp map not found');

  const updatedSpots = map.spots.map((spot) =>
    spot.number === spotNumber ? { ...spot, assignedTo: userId } : spot
  );

  await updateCampMapSpots(year, updatedSpots);
}
