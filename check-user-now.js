const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function checkUserNow(phoneNumber) {
  try {
    console.log(`\n🔍 Checking user: ${phoneNumber} RIGHT NOW\n`);

    const usersRef = collection(db, 'rahapremium_users');
    const q = query(usersRef, where('phone_number', '==', phoneNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('❌ User not found in rahapremium_users collection');
      return;
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    console.log('✅ USER FOUND:');
    console.log(`   Name: ${user.display_name}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Phone: ${user.phone_number}`);
    console.log(`   User ID: ${user.id}`);

    // Check subscription
    console.log('\n📦 SUBSCRIPTION STATUS:');
    if (user.subscription) {
      const sub = user.subscription;
      const endDate = sub.endDate.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      console.log(`   Package: ${sub.packageType}`);
      console.log(`   Is Active: ${sub.isActive ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`   Start Date: ${new Date(sub.startDate).toLocaleString()}`);
      console.log(`   End Date: ${endDate.toLocaleString()}`);
      console.log(`   Days Remaining: ${daysRemaining}`);
      console.log(`   Amount: TSH ${sub.amount}`);
      console.log(`   Transaction ID: ${sub.transactionId}`);
      
      if (endDate > now && !sub.isActive) {
        console.log('\n   ⚠️  PROBLEM: Subscription has future end date but isActive = FALSE');
        console.log('   💡 SOLUTION: Need to set isActive = true');
      } else if (endDate <= now) {
        console.log('\n   ⚠️  EXPIRED: Subscription end date has passed');
      } else if (sub.isActive && endDate > now) {
        console.log('\n   ✅ GOOD: Subscription is active and valid');
      }
    } else {
      console.log('   ❌ NO SUBSCRIPTION FOUND');
    }

    // Check payment history
    console.log('\n💳 PAYMENT HISTORY:');
    if (user.payment_history && user.payment_history.length > 0) {
      console.log(`   Total Payments: ${user.payment_history.length}`);
      
      const completedPayments = user.payment_history.filter(p => p.status === 'completed');
      console.log(`   Completed: ${completedPayments.length}`);
      console.log(`   Pending: ${user.payment_history.filter(p => p.status === 'pending').length}`);
      
      // Show last 3 payments
      const recent = user.payment_history.slice(-3).reverse();
      console.log('\n   Last 3 payments:');
      recent.forEach((payment, i) => {
        console.log(`\n   ${i + 1}. ${payment.packageType || 'N/A'} - TSH ${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Created: ${new Date(payment.createdAt).toLocaleString()}`);
        console.log(`      Order ID: ${payment.orderId || 'N/A'}`);
      });
    } else {
      console.log('   ❌ No payment history');
    }

    // Check payments collection directly
    console.log('\n\n💰 CHECKING PAYMENTS COLLECTION:');
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(paymentsRef, where('user_id', '==', user.id));
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    console.log(`   Found ${paymentsSnapshot.size} payment(s) in payments table`);
    
    if (paymentsSnapshot.size > 0) {
      const payments = [];
      paymentsSnapshot.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by created date
      payments.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
      });

      // Show last 3
      const recent = payments.slice(0, 3);
      console.log('\n   Last 3 payments from payments table:');
      recent.forEach((payment, i) => {
        console.log(`\n   ${i + 1}. ${payment.package_type} - TSH ${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Created: ${new Date(payment.created_at).toLocaleString()}`);
        console.log(`      Order ID: ${payment.order_id || 'N/A'}`);
        console.log(`      Manually Completed: ${payment.is_manually_completed || false}`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

const phoneNumber = process.argv[2] || '+255796142071';
checkUserNow(phoneNumber);
