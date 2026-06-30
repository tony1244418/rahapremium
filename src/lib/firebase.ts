// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, enableNetwork, disableNetwork, DocumentReference, getDoc, getDocFromCache } from "firebase/firestore";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Configuration is loaded from environment variables for security, with user-provided details as failover defaults
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAhPycuMgy5XdsHMaiKABziUb948IMGfmk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "rahapremiumtz.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "rahapremiumtz",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "rahapremiumtz.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "402825243066",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:402825243066:web:e6f667e58b3c5fe559d583",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-V1YF1E1KPM"
};

// Validate Firebase configuration
if (typeof window !== 'undefined') {
  const requiredConfigs = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingConfigs = requiredConfigs.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

  if (missingConfigs.length > 0) {
    console.error('❌ Missing Firebase configuration:', missingConfigs);
    console.error('Please ensure all required environment variables are set in .env.local');
  } else {
    console.log('✅ Firebase configuration loaded successfully');
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);

// Enable offline persistence for Firestore
if (typeof window !== 'undefined') {
  // Enable offline persistence
  try {
    // This helps with connection issues
    enableNetwork(db).catch((error) => {
      console.warn('Failed to enable network:', error);
    });
  } catch (error) {
    console.warn('Error setting up Firestore persistence:', error);
  }
}

// Initialize Analytics only if supported (for client-side)
let analytics: any;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((error) => {
    console.warn('Analytics not supported:', error);
  });
}

// Connection status helpers
export const enableFirestoreNetwork = () => enableNetwork(db);
export const disableFirestoreNetwork = () => disableNetwork(db);

export const getDocWithRetry = async (docRef: DocumentReference, retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await getDoc(docRef);
    } catch (error: any) {
      if (error?.code !== 'unavailable' && !error?.message?.includes('offline')) {
        throw error;
      }
      if (i === retries - 1) {
        try {
          return await getDocFromCache(docRef);
        } catch (cacheError) {
          throw error;
        }
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return getDoc(docRef);
};

export { analytics };
export default app;
