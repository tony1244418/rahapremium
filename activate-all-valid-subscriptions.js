const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function activateAllValidSubscriptions() {
  try {
    console.log('\n🔧 Activating all valid subscriptions...\n');

    const usersRef = collection(db, 'rahapremium_users');
    const snapshot = await getDocs(usersRef);

    let fixed = 0;

    for (const userDoc of snapshot.docs) {
      const user = userDoc.data();
      
      if (!user.subscription) continue;
      if (user.subscription.isActive) continue; // Already active

      const endDate = user.subscription.endDate.toDate ? user.subscription.endDate.toDate() : new Date(user.subscription.endDate);
      const now = new Date('2025-08-18'); // Set to correct current date

      if (endDate > now) {
        // Subscription is still valid
        const updatedSubscription = {
          ...user.subscription,
          isActive: true
        };

        await updateDoc(doc(db, 'rahapremium_users', userDoc.id), {
          subscription: updatedSubscription
        });

        fixed++;
        console.log(`✅ ${fixed}. ${user.phone_number} (${user.display_name}) - ${user.subscription.packageType} activated until ${endDate.toLocaleDateString()}`);
      }
    }

    console.log(`\n✅ Activated ${fixed} subscription(s)!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

activateAllValidSubscriptions();
