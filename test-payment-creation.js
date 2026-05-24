const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } = require('firebase/firestore');

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

async function testPaymentCreation() {
  try {
    console.log('Testing payment creation for user +255788672140...');

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
      phoneNumber: userData.phoneNumber
    });

    // Create a test payment
    const paymentData = {
      userId: userData.uid,
      packageType: 'FEDHA',
      amount: 2000,
      phoneNumber: '+255788672140',
      status: 'pending',
      createdAt: Timestamp.now(),
      isManuallyCompleted: false
    };

    console.log('Creating payment in payments collection...');
    const paymentRef = await addDoc(collection(db, 'payments'), paymentData);
    console.log('✅ Payment created with ID:', paymentRef.id);

    // Add payment to user's payment history
    const payment = {
      ...paymentData,
      id: paymentRef.id,
      createdAt: new Date(),
      completedAt: null
    };

    const updatedPaymentHistory = [...(userData.paymentHistory || []), payment];

    console.log('Adding payment to user payment history...');
    await updateDoc(doc(db, 'users', userData.uid), {
      paymentHistory: updatedPaymentHistory.map(p => ({
        ...p,
        createdAt: p.createdAt instanceof Date ? Timestamp.fromDate(p.createdAt) : p.createdAt,
        completedAt: p.completedAt instanceof Date ? Timestamp.fromDate(p.completedAt) : (p.completedAt || null),
      }))
    });

    console.log('✅ Payment added to user payment history');

    // Verify the payment was added
    const updatedUserDoc = await getDocs(query(usersRef, where('phoneNumber', '==', '+255788672140')));
    const updatedUserData = updatedUserDoc.docs[0].data();

    console.log('✅ Verification - User payment history length:', updatedUserData.paymentHistory?.length || 0);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPaymentCreation();
