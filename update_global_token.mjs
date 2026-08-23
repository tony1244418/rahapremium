/**
 * update_global_token.mjs
 *
 * Updates the CDN token stored in Firestore admin_settings (id: 'cdn_token').
 * Usage: node update_global_token.mjs <YOUR_TOKEN>
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const token = process.argv[2];

if (!token) {
  console.error('❌ Usage: node update_global_token.mjs <YOUR_CDN_TOKEN>');
  process.exit(1);
}

// Load Firebase configuration from .env.local or fallback to defaults
let firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const envPath = resolve('./.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  const getEnvVal = (key) => {
    const match = envContent.match(new RegExp(`^${key}=["']?(.*?)["']?$`, 'm'));
    return match ? match[1] : null;
  };
  firebaseConfig = {
    apiKey: getEnvVal('NEXT_PUBLIC_FIREBASE_API_KEY') || firebaseConfig.apiKey,
    authDomain: getEnvVal('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || firebaseConfig.authDomain,
    projectId: getEnvVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || firebaseConfig.projectId,
    storageBucket: getEnvVal('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || firebaseConfig.storageBucket,
    messagingSenderId: getEnvVal('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || firebaseConfig.messagingSenderId,
    appId: getEnvVal('NEXT_PUBLIC_FIREBASE_APP_ID') || firebaseConfig.appId,
    measurementId: getEnvVal('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID') || firebaseConfig.measurementId,
  };
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Missing Firebase config. Please check .env.local has NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  process.exit(1);
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log(`🔥 Connecting to Firebase Project: "${firebaseConfig.projectId}"...`);
  console.log('Updating global CDN token in Firestore admin_settings (doc: cdn_token)...');
  
  await setDoc(
    doc(db, 'admin_settings', 'cdn_token'),
    {
      data: { token },
      updated_at: new Date().toISOString(),
      updated_by: 'script',
    },
    { merge: true }
  );

  console.log('✅ Successfully updated global CDN token in Firestore!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error updating token in Firestore:', err);
  process.exit(1);
});
