const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY",
  authDomain: "rahacrone.firebaseapp.com",
  projectId: "rahacrone",
  storageBucket: "rahacrone.firebasestorage.app",
  messagingSenderId: "197453554994",
  appId: "1:197453554994:web:8770581f174f90a2e4e32b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  try {
    console.log('\n🔍 Checking Firebase Collections...\n');

    const collections = [
      'users',
      'rahapremium_users', 
      'movies',
      'series',
      'episodes',
      'payments',
      'admins'
    ];

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      console.log(`📦 ${collectionName}: ${snapshot.size} document(s)`);
      
      // Show first document structure if exists
      if (snapshot.size > 0) {
        const firstDoc = snapshot.docs[0];
        const data = firstDoc.data();
        console.log(`   Sample fields: ${Object.keys(data).slice(0, 10).join(', ')}...`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCollections();
