const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxZPw0NSG5ACY1zT2_p-Q2q2lpL0lVdjg",
  authDomain: "rahapremiumtz.firebaseapp.com",
  databaseURL: "https://rahapremiumtz-default-rtdb.firebaseio.com",
  projectId: "rahapremiumtz",
  storageBucket: "rahapremiumtz.firebasestorage.app",
  messagingSenderId: "718846096607",
  appId: "1:718846096607:web:139bc91996cfacfe4ea56a",
  measurementId: "G-PPRWRPFT34"
};

async function testDatabasePayments() {
  console.log('🔍 Checking payments in database...\n');

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // Get payments from database
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    console.log(`📊 Found ${querySnapshot.size} payments in database:\n`);

    if (querySnapshot.size === 0) {
      console.log('❌ No payments found in database');
      console.log('   This means payments are not being saved to Firestore');
      return;
    }

    querySnapshot.forEach((doc, index) => {
      const payment = doc.data();
      console.log(`${index + 1}. Payment ID: ${doc.id}`);
      console.log(`   User ID: ${payment.userId}`);
      console.log(`   Phone: ${payment.phoneNumber}`);
      console.log(`   Package: ${payment.packageType}`);
      console.log(`   Amount: ${payment.amount} TZS`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Order ID: ${payment.orderId || 'N/A'}`);
      console.log(`   Created: ${payment.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}`);
      console.log('');
    });

    // Check for pending payments
    const pendingPayments = querySnapshot.docs.filter(doc => doc.data().status === 'pending');
    console.log(`🟡 Pending payments: ${pendingPayments.length}`);

    const completedPayments = querySnapshot.docs.filter(doc => doc.data().status === 'completed');
    console.log(`🟢 Completed payments: ${completedPayments.length}`);

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

testDatabasePayments();
