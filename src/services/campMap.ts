import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { CampMap, CampSpot } from '../types';

const CAMP_MAPS_COLLECTION = 'campMaps';

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
  const storageRef = ref(storage, `campMaps/${year}/${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  const mapRef = doc(db, CAMP_MAPS_COLLECTION, year.toString());
  await setDoc(mapRef, {
    year,
    imageUrl: downloadUrl,
    spots: [],
    uploadedBy,
    uploadedAt: Timestamp.now(),
  });

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
