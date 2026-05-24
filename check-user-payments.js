const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAxZPw0NSG5ACY1zT2_p-Q2q2lpL0lVdjg",
  authDomain: "rahapremiumtz.firebaseapp.com",
  projectId: "rahapremiumtz",
  storageBucket: "rahapremiumtz.firebasestorage.app",
  messagingSenderId: "718846096607",
  appId: "1:718846096607:web:139bc91996cfacfe4ea56a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUserPayments() {
  try {
    console.log('Checking user with phone +255788672140...');

    // Find user by phone number
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', '+255788672140'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No user found with phone +255788672140');
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log('✅ User found:', {
      uid: userData.uid,
      displayName: userData.displayName,
      phoneNumber: userData.phoneNumber,
      paymentHistoryLength: userData.paymentHistory?.length || 0
    });

    if (userData.paymentHistory && userData.paymentHistory.length > 0) {
      console.log('📋 Payment History:');
      userData.paymentHistory.forEach((payment, index) => {
        console.log(`${index + 1}. ${payment.packageType} - ${payment.amount} - ${payment.status} - ${payment.createdAt?.toDate?.() || payment.createdAt}`);
      });
    } else {
      console.log('❌ No payment history found');
    }

    // Also check payments collection
    console.log('\nChecking payments collection...');
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('phoneNumber', '==', '+255788672140'));
    const paymentsSnapshot = await getDocs(paymentsQuery);

    console.log(`Found ${paymentsSnapshot.size} payments in payments collection`);
    paymentsSnapshot.forEach((doc, index) => {
      const payment = doc.data();
      console.log(`${index + 1}. ${payment.packageType} - ${payment.amount} - ${payment.status} - ${payment.createdAt?.toDate?.() || payment.createdAt}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserPayments();
