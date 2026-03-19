const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'ats-camp',
});

const db = admin.firestore();

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

async function main() {
  await db.collection('config').doc('site').set({ usefulLinks, packingCategories }, { merge: true });
  console.log('Info content restored to defaults.');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
