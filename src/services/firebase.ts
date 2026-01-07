import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCou1VPHwl3IT-k3MIBj2iPHJRwwh5hdf4",
  authDomain: "ats-camp.firebaseapp.com",
  projectId: "ats-camp",
  storageBucket: "ats-camp.firebasestorage.app",
  messagingSenderId: "864549858914",
  appId: "1:864549858914:web:f32531851dd5aaca6b6b3b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
