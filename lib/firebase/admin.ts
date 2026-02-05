import admin from 'firebase-admin';

if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
  throw new Error('Missing FIREBASE_ADMIN_PROJECT_ID');
}
if (!process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
  throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL');
}
if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  throw new Error('Missing FIREBASE_ADMIN_PRIVATE_KEY');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;