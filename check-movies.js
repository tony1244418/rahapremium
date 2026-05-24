const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: './.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAPpd6ruOQk8Kn5ZO5OIT_x22D4zJbLoWs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "tonnygamingtz.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "tonnygamingtz",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tonnygamingtz.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "903456511153",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:903456511153:web:96410e965a35581503be90",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-HZBY1V9Z5C"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const moviesRef = collection(db, 'movies');
    const snapshot = await getDocs(moviesRef);
    console.log(`Total movies in DB: ${snapshot.size}`);
    
    let active = 0;
    let nonAdult = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.isActive) active++;
      if (data.isAdult === false) nonAdult++;
      if (data.isActive && data.isAdult === false) {
        console.log(`Movie matching criteria: ${data.title}`);
      }
    });
    
    console.log(`Active: ${active}, Non-Adult: ${nonAdult}`);
  } catch (error) {
    console.error(error);
  }
}

check();
