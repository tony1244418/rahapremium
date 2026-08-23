const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvQZJQZJQZJQZJQZJQZJQZJQZJQZJQZJQ",
  authDomain: "rahapremiumtz.firebaseapp.com",
  projectId: "rahapremiumtz",
  storageBucket: "rahapremiumtz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeUserSubscriptionByPhone(phoneNumber) {
  try {
    console.log(`Looking for user with phone number: ${phoneNumber}`);

    // Find user by phone number
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No user found with that phone number');
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log(`Found user: ${userData.displayName || userData.email} (${userData.uid})`);
    console.log(`Current subscription:`, userData.subscription);

    if (!userData.subscription) {
      console.log('User has no active subscription');
      return;
    }

    // Remove subscription
    const userRef = doc(db, 'users', userDoc.id);
    await updateDoc(userRef, {
      subscription: null
    });

    console.log('✅ Subscription removed successfully!');
    console.log('User can no longer watch videos.');

  } catch (error) {
    console.error('Error removing subscription:', error);
  }
}

// Run the script
const phoneNumber = process.argv[2] || '+255788672140';
removeUserSubscriptionByPhone(phoneNumber).then(() => {
  console.log('Script completed');
  process.exit(0);
});
