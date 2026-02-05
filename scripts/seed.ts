import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import seedData from './seed-data.json' assert { type: 'json' };
import algeriaData from './algeria-wilayas.json' assert { type: 'json' };

dotenv.config({ path: '../.env' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('Starting database seeding...');

  console.log('Seeding brands...');
  for (const [id, brand] of Object.entries(seedData.brands)) {
    await setDoc(doc(db, 'brands', id), brand);
    console.log('  - Created brand: ' + brand.name);
  }

  console.log('Seeding categories...');
  for (const category of seedData.categories) {
    const catRef = doc(collection(db, 'categories'));
    await setDoc(catRef, {
      ...category,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  - Created category: ' + category.name);
  }

  console.log('Seeding products...');
  for (const product of seedData.products) {
    const productRef = doc(collection(db, 'products'));
    const slug = product.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    await setDoc(productRef, {
      ...product,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  - Created product: ' + product.name);
  }

  console.log('Seeding site settings...');
  await setDoc(doc(db, 'site_settings', 'main'), seedData.siteSettings);
  console.log('  - Created site settings');

  console.log('Seeding Algeria wilayas...');
  for (const [code, wilaya] of Object.entries(algeriaData)) {
    await setDoc(doc(db, 'delivery_wilayas', code), wilaya);
    console.log('  - Created wilaya: ' + wilaya.name);
  }

  console.log('\nSeeding completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Create an admin user in Firebase Authentication');
  console.log('2. Add user document in Firestore users collection with role: "admin"');
  console.log('3. Run: npm run dev');
  console.log('4. Login at: http://localhost:3000/admin/login');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });
