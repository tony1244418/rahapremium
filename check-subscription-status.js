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

async function checkSubscriptionStatus(phoneNumber) {
  try {
    console.log(`\n🔍 Checking subscription for phone: ${phoneNumber}\n`);

    // 1. Find user by phone number
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No user found with this phone number');
      console.log('💡 Make sure the phone number format is correct (e.g., +255788672140)');
      return;
    }

    const userDoc = querySnapshot.docs[0];
    const user = userDoc.data();

    console.log('✅ USER FOUND:');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Display Name: ${user.displayName || 'N/A'}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Is Blocked: ${user.isBlocked || false}`);
    console.log(`   Created: ${user.createdAt?.toDate?.() || user.createdAt || 'N/A'}`);

    // 2. Check GENERAL subscription
    console.log('\n📦 GENERAL SUBSCRIPTION (Movies/Series):');
    if (user.subscription) {
      const sub = user.subscription;
      console.log(`   Package Type: ${sub.packageType}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Start Date: ${sub.startDate?.toDate?.() || sub.startDate}`);
      console.log(`   End Date: ${sub.endDate?.toDate?.() || sub.endDate}`);
      console.log(`   Amount: TSH ${sub.amount || 'N/A'}`);
      console.log(`   Transaction ID: ${sub.transactionId || 'N/A'}`);
      
      // Calculate remaining days
      const now = new Date();
      const endDate = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      const isValid = endDate > now;
      
      console.log(`   Days Remaining: ${daysRemaining}`);
      console.log(`   Status: ${isValid ? '✅ ACTIVE & VALID' : '❌ EXPIRED'}`);
      
      if (!isValid) {
        console.log(`   ⚠️  Subscription expired on ${endDate.toLocaleString()}`);
      }
      if (sub.isActive && !isValid) {
        console.log(`   ⚠️  WARNING: isActive is TRUE but end date has passed!`);
      }
    } else {
      console.log('   ❌ No general subscription found');
    }

    // 3. Check LIVE TV subscription
    console.log('\n📺 LIVE TV SUBSCRIPTION:');
    if (user.liveTvSubscription) {
      const liveSub = user.liveTvSubscription;
      console.log(`   Package Type: ${liveSub.packageType}`);
      console.log(`   Is Active: ${liveSub.isActive}`);
      console.log(`   Start Date: ${liveSub.startDate?.toDate?.() || liveSub.startDate}`);
      console.log(`   End Date: ${liveSub.endDate?.toDate?.() || liveSub.endDate}`);
      console.log(`   Amount: TSH ${liveSub.amount || 'N/A'}`);
      
      const now = new Date();
      const endDate = liveSub.endDate?.toDate ? liveSub.endDate.toDate() : new Date(liveSub.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      const isValid = endDate > now;
      
      console.log(`   Days Remaining: ${daysRemaining}`);
      console.log(`   Status: ${isValid ? '✅ ACTIVE & VALID' : '❌ EXPIRED'}`);
    } else {
      console.log('   ❌ No Live TV subscription found');
    }

    // 4. Check payment history
    console.log('\n💳 PAYMENT HISTORY:');
    if (user.paymentHistory && user.paymentHistory.length > 0) {
      console.log(`   Total Payments: ${user.paymentHistory.length}`);
      
      // Show last 5 payments
      const recentPayments = user.paymentHistory.slice(-5).reverse();
      recentPayments.forEach((payment, index) => {
        console.log(`\n   Payment #${index + 1}:`);
        console.log(`      Package: ${payment.packageType || 'N/A'}`);
        console.log(`      Amount: TSH ${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Phone: ${payment.phoneNumber}`);
        console.log(`      Order ID: ${payment.orderId || 'N/A'}`);
        console.log(`      Payment Type: ${payment.paymentType || 'subscription'}`);
        console.log(`      Created: ${payment.createdAt?.toDate?.() || payment.createdAt}`);
        console.log(`      Manually Completed: ${payment.isManuallyCompleted || false}`);
        if (payment.completedAt) {
          console.log(`      Completed At: ${payment.completedAt?.toDate?.() || payment.completedAt}`);
        }
      });
    } else {
      console.log('   ❌ No payment history found');
    }

    // 5. Check payments collection
    console.log('\n\n💰 CHECKING PAYMENTS COLLECTION:');
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(
      paymentsRef, 
      where('userId', '==', user.uid)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    if (!paymentsSnapshot.empty) {
      console.log(`   Found ${paymentsSnapshot.size} payment(s) in payments collection`);
      
      const payments = [];
      paymentsSnapshot.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by created date, newest first
      payments.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });

      payments.slice(0, 5).forEach((payment, index) => {
        console.log(`\n   Payment #${index + 1}:`);
        console.log(`      ID: ${payment.id}`);
        console.log(`      Package: ${payment.packageType}`);
        console.log(`      Category: ${payment.packageCategory || 'GENERAL'}`);
        console.log(`      Amount: TSH ${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Phone: ${payment.phoneNumber}`);
        console.log(`      Order ID: ${payment.orderId || 'N/A'}`);
        console.log(`      Created: ${payment.createdAt?.toDate?.() || payment.createdAt}`);
        console.log(`      Manually Completed: ${payment.isManuallyCompleted || false}`);
      });
    } else {
      console.log('   ❌ No payments found in payments collection');
    }

    // 6. DIAGNOSIS
    console.log('\n\n🔧 DIAGNOSIS:');
    const hasCompletedPayments = user.paymentHistory?.some(p => p.status === 'completed');
    const hasActiveSub = user.subscription && user.subscription.isActive;
    const hasValidSub = user.subscription && user.subscription.isActive && 
      new Date(user.subscription.endDate?.toDate?.() || user.subscription.endDate) > new Date();

    if (hasCompletedPayments && !hasValidSub) {
      console.log('   ⚠️  ISSUE FOUND: User has completed payments but NO active/valid subscription!');
      console.log('\n   💡 POSSIBLE CAUSES:');
      console.log('      1. Payment was marked complete but subscription was not activated');
      console.log('      2. Subscription end date has expired');
      console.log('      3. completePayment() or processSubscription() function failed');
      console.log('\n   💡 SOLUTIONS:');
      console.log('      A. Manually activate subscription for this user');
      console.log('      B. Check server logs for errors during payment processing');
      console.log('      C. Run test-payment-completion.js to verify the flow');
    } else if (!hasCompletedPayments) {
      console.log('   ℹ️  User has no completed payments in the system');
      console.log('   💡 User needs to make a payment to activate subscription');
    } else if (hasActiveSub && !hasValidSub) {
      console.log('   ⚠️  Subscription is marked active but has EXPIRED');
      console.log('   💡 User needs to renew subscription');
    } else if (hasValidSub) {
      console.log('   ✅ Everything looks good! User has an active and valid subscription');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

// Get phone number from command line argument or use default
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.log('Usage: node check-subscription-status.js <phone_number>');
  console.log('Example: node check-subscription-status.js +255788672140');
  process.exit(1);
}

checkSubscriptionStatus(phoneNumber);
