const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

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

async function listAllUsers() {
  try {
    console.log('\n📋 Fetching all users...\n');

    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(100)); // Get first 100 users
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No users found in database');
      return;
    }

    console.log(`✅ Found ${querySnapshot.size} user(s)\n`);

    querySnapshot.forEach((doc, index) => {
      const user = doc.data();
      console.log(`User #${index + 1}:`);
      console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
      console.log(`   Name: ${user.displayName || 'N/A'}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Has Subscription: ${user.subscription ? 'YES (' + user.subscription.packageType + ')' : 'NO'}`);
      console.log(`   Subscription Active: ${user.subscription?.isActive ? 'YES' : 'NO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAllUsers();
