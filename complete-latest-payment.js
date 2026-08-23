const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, Timestamp } = require('firebase/firestore');

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

async function completeLatestPayment(phoneNumber) {
  try {
    console.log(`\n🔧 Completing latest payment for: ${phoneNumber}\n`);

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

    if (!user.payment_history || user.payment_history.length === 0) {
      console.log('❌ No payment history');
      return;
    }

    // Find latest pending payment
    const pendingPayments = user.payment_history.filter(p => p.status === 'pending');
    
    if (pendingPayments.length === 0) {
      console.log('❌ No pending payments found');
      return;
    }

    const latestPayment = pendingPayments[pendingPayments.length - 1];
    console.log('\n💳 Latest pending payment:');
    console.log(`   Package: ${latestPayment.packageType}`);
    console.log(`   Amount: TSH ${latestPayment.amount}`);
    console.log(`   Created: ${new Date(latestPayment.createdAt).toLocaleString()}`);

    // Mark payment as completed
    const updatedPaymentHistory = user.payment_history.map(p =>
      p.id === latestPayment.id
        ? { ...p, status: 'completed', completedAt: new Date().toISOString(), isManuallyCompleted: true }
        : p
    );

    // Calculate new subscription end date
    const now = new Date();
    const packageDays = {
      'FEDHA': 3,
      'CHUMA': 7,
      'DHAHABU': 15,
      'ALMASI': 30,
      'MALKIA': 90
    };
    
    const days = packageDays[latestPayment.packageType] || 3;
    const endDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    const newSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      packageType: latestPayment.packageType,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      isActive: true,
      transactionId: latestPayment.id,
      amount: latestPayment.amount,
      isRenewal: true,
      isUpgrade: false,
      previousPackage: user.subscription?.packageType || null,
      createdAt: now.toISOString(),
      category: 'GENERAL'
    };

    // Update user with new subscription and payment history
    await updateDoc(doc(db, 'rahapremium_users', userDoc.id), {
      subscription: newSubscription,
      payment_history: updatedPaymentHistory
    });

    console.log('\n✅ Payment completed and subscription activated!');
    console.log(`   Package: ${newSubscription.packageType}`);
    console.log(`   Active: true`);
    console.log(`   Valid until: ${endDate.toLocaleString()}`);
    console.log(`   Days: ${days}`);
    console.log('\n💡 Please refresh your app or log out and log back in to see the changes.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

const phoneNumber = process.argv[2] || '+255796142071';
completeLatestPayment(phoneNumber);
