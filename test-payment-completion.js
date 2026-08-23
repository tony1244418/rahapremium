const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQ",
  authDomain: "raha-premium.firebaseapp.com",
  projectId: "raha-premium",
  storageBucket: "raha-premium.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testPaymentCompletion() {
  try {
    console.log('Testing payment completion for phone number 0788672140...');
    
    // Find user by phone number
    const usersQuery = query(collection(db, 'users'), where('phoneNumber', '==', '0788672140'));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      console.log('❌ User with phone number 0788672140 not found');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();
    console.log('✅ User found:', user.displayName, user.phoneNumber);
    
    // Find pending payments for this user
    const paymentsQuery = query(collection(db, 'payments'), where('userId', '==', user.uid), where('status', '==', 'pending'));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    if (paymentsSnapshot.empty) {
      console.log('❌ No pending payments found for this user');
      return;
    }
    
    const paymentDoc = paymentsSnapshot.docs[0];
    const payment = paymentDoc.data();
    console.log('✅ Pending payment found:', payment.packageType, 'TSH', payment.amount);
    
    // Test the completePayment function
    const { completePayment } = require('./src/lib/subscriptions.ts');
    await completePayment(paymentDoc.id, true, 'test-admin');
    
    console.log('✅ Payment completed successfully!');
    
    // Check user subscription status
    const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
    const updatedUser = updatedUserDoc.data();
    
    if (updatedUser.subscription && updatedUser.subscription.isActive) {
      console.log('✅ User subscription is now active:', updatedUser.subscription.packageType);
      console.log('   Start Date:', updatedUser.subscription.startDate.toDate());
      console.log('   End Date:', updatedUser.subscription.endDate.toDate());
    } else {
      console.log('❌ User subscription is not active');
    }
    
  } catch (error) {
    console.error('❌ Error testing payment completion:', error);
  }
}

testPaymentCompletion();
