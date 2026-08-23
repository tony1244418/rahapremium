const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function fixSubscription(phoneNumber) {
  try {
    console.log(`\n🔧 Fixing subscription for: ${phoneNumber}\n`);

    // Find user
    const usersRef = collection(db, 'rahapremium_users');
    const q = query(usersRef, where('phone_number', '==', phoneNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ User not found');
      return;
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    console.log('✅ User found:', user.display_name);
    console.log('   Current subscription:', user.subscription);

    if (!user.subscription) {
      console.log('❌ No subscription to fix');
      return;
    }

    const endDate = user.subscription.endDate.toDate ? user.subscription.endDate.toDate() : new Date(user.subscription.endDate);
    const now = new Date();

    console.log(`\n📅 End Date: ${endDate.toLocaleString()}`);
    console.log(`📅 Now: ${now.toLocaleString()}`);
    console.log(`⏰ Days remaining: ${Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))}`);

    if (endDate > now) {
      // Subscription is still valid, just activate it
      const updatedSubscription = {
        ...user.subscription,
        isActive: true
      };

      await updateDoc(doc(db, 'rahapremium_users', userDoc.id), {
        subscription: updatedSubscription
      });

      console.log('\n✅ Subscription activated successfully!');
      console.log(`   Package: ${updatedSubscription.packageType}`);
      console.log(`   Active: true`);
      console.log(`   Valid until: ${endDate.toLocaleString()}`);
    } else {
      console.log('\n⚠️  Subscription has EXPIRED. User needs to renew.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get phone number from command line
const phoneNumber = process.argv[2] || '+255796142071';
fixSubscription(phoneNumber);
