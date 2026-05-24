// Debug script to check user subscription status
// Run this with: node debug-user-subscription.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugUserSubscription(phoneNumber) {
  try {
    console.log(`🔍 Debugging subscription for phone: ${phoneNumber}`);
    
    // First, find the user by phone number
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ No user found with this phone number');
      return;
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log('👤 User found:', {
      uid: userDoc.id,
      phoneNumber: userData.phoneNumber,
      displayName: userData.displayName,
      username: userData.username
    });
    
    // Check subscription status
    if (userData.subscription) {
      const subscription = userData.subscription;
      const now = new Date();
      const endDate = subscription.endDate?.toDate ? subscription.endDate.toDate() : new Date(subscription.endDate);
      
      console.log('📋 Subscription details:', {
        packageType: subscription.packageType,
        isActive: subscription.isActive,
        startDate: subscription.startDate?.toDate ? subscription.startDate.toDate() : new Date(subscription.startDate),
        endDate: endDate,
        isExpired: endDate <= now,
        daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });
    } else {
      console.log('❌ No subscription found');
    }
    
    // Check payment history
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('userId', '==', userDoc.id), orderBy('createdAt', 'desc'));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    console.log('💳 Recent payments:');
    paymentsSnapshot.docs.forEach((paymentDoc, index) => {
      const payment = paymentDoc.data();
      console.log(`  ${index + 1}. ${payment.status} - ${payment.packageType} - ${payment.amount} TZS - ${payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt)}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging user:', error);
  }
}

// Run the debug
debugUserSubscription('0788672140');

