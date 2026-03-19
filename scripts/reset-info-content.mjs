import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCou1VPHwl3IT-k3MIBj2iPHJRwwh5hdf4",
  authDomain: "ats-camp.firebaseapp.com",
  projectId: "ats-camp",
  storageBucket: "ats-camp.firebasestorage.app",
  messagingSenderId: "864549858914",
  appId: "1:864549858914:web:f32531851dd5aaca6b6b3b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const usefulLinks = [
  { title: 'Burning Man Official', url: 'https://burningman.org', description: 'Official Burning Man website with event info, tickets, and guidelines' },
  { title: 'iBurn App', url: 'https://iburn.app', description: 'The essential app for navigating Black Rock City' },
  { title: 'Playa Bike Repair', url: 'https://playabikerepair.com', description: 'Rent bikes for the playa' },
  { title: 'Survival Guide', url: 'https://survival.burningman.org', description: 'Everything you need to know to survive and thrive on the playa' },
];

const packingCategories = [
  { category: 'Essentials', items: ['Ticket & Vehicle Pass', 'ID / Passport', 'Cash (for ice sales)', 'Water (1.5 gallons per day)', 'Food for the week', 'Sunscreen (SPF 50+)', 'Goggles & Dust Mask'] },
  { category: 'Shelter', items: ['Tent or shade structure', 'Sleeping bag / bedding', 'Pillow', 'Rebar stakes', 'Tapestries / shade cloth', 'Lights for your tent'] },
  { category: 'Clothing', items: ['Costumes & fun outfits', 'Warm layers for night', 'Sturdy closed-toe shoes', 'Comfortable boots', 'Socks (lots of them)', 'Underwear', 'Hats / head coverings'] },
  { category: 'Hygiene', items: ['Biodegradable soap', 'Wet wipes (lots)', 'Hand sanitizer', 'Toothbrush & toothpaste', 'Medications', 'First aid kit', 'Lip balm with SPF'] },
  { category: 'Gear', items: ['Bike with lights', 'Bike lock', 'Headlamp / flashlight', 'Portable charger', 'Reusable water bottle', 'Cup / mug (for gifted drinks)', 'Trash bags (MOOP bags)'] },
];

await setDoc(doc(db, 'config', 'site'), { usefulLinks, packingCategories }, { merge: true });
console.log('Info content restored to defaults.');
process.exit(0);
