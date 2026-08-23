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

async function findPaidNoSubscription() {
  try {
    console.log('\n🔍 Finding users with completed payments but no active subscription...\n');

    const usersRef = collection(db, 'rahapremium_users');
    const usersSnapshot = await getDocs(usersRef);

    let foundIssues = 0;

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      const hasCompletedPayments = user.payment_history && 
        user.payment_history.some(p => p.status === 'completed');
      
      const hasActiveSubscription = user.subscription && 
        user.subscription.isActive && 
        new Date(user.subscription.endDate.toDate ? user.subscription.endDate.toDate() : user.subscription.endDate) > new Date();

      if (hasCompletedPayments && !hasActiveSubscription) {
        foundIssues++;
        console.log(`⚠️  User #${foundIssues}:`);
        console.log(`   Phone: ${user.phone_number}`);
        console.log(`   Name: ${user.display_name || 'N/A'}`);
        console.log(`   Username: ${user.username || 'N/A'}`);
        console.log(`   Completed Payments: ${user.payment_history.filter(p => p.status === 'completed').length}`);
        
        if (user.subscription) {
          console.log(`   Subscription: ${user.subscription.packageType} (Active: ${user.subscription.isActive})`);
          const endDate = user.subscription.endDate.toDate ? user.subscription.endDate.toDate() : new Date(user.subscription.endDate);
          console.log(`   End Date: ${endDate.toLocaleString()}`);
          console.log(`   Expired: ${endDate <= new Date() ? 'YES' : 'NO'}`);
        } else {
          console.log(`   Subscription: NONE`);
        }
        
        console.log('');
      }
    });

    if (foundIssues === 0) {
      console.log('✅ No issues found! All users with completed payments have active subscriptions.');
    } else {
      console.log(`\n🔧 Found ${foundIssues} user(s) with payment issues.\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findPaidNoSubscription();
