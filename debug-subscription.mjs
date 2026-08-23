import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSubscription(phoneNumber) {
  try {
    console.log(`\n🔍 Checking user with phone: ${phoneNumber}\n`);

    // 1. Find user by phone number
    const { data: users, error: userError } = await supabase
      .from('rahapremium_users')
      .select('*')
      .eq('phone_number', phoneNumber);

    if (userError) {
      console.error('❌ Error fetching user:', userError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No user found with this phone number');
      return;
    }

    const user = users[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Display Name: ${user.display_name}`);
    console.log(`   Phone: ${user.phone_number}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Is Blocked: ${user.is_blocked}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    console.log(`   Last Login: ${new Date(user.last_login_at).toLocaleString()}`);

    // 2. Check subscription status
    console.log('\n📦 GENERAL SUBSCRIPTION:');
    if (user.subscription) {
      console.log(`   Package: ${user.subscription.packageType}`);
      console.log(`   Is Active: ${user.subscription.isActive}`);
      console.log(`   Start Date: ${new Date(user.subscription.startDate).toLocaleString()}`);
      console.log(`   End Date: ${new Date(user.subscription.endDate).toLocaleString()}`);
      console.log(`   Amount: ${user.subscription.amount}`);
      console.log(`   Transaction ID: ${user.subscription.transactionId}`);
      console.log(`   Is Renewal: ${user.subscription.isRenewal}`);
      
      const now = new Date();
      const endDate = new Date(user.subscription.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      console.log(`   Days Remaining: ${daysRemaining}`);
      console.log(`   Currently Valid: ${endDate > now ? '✅ YES' : '❌ EXPIRED'}`);
    } else {
      console.log('   ❌ No subscription found');
    }

    // 3. Check Live TV subscription
    console.log('\n📺 LIVE TV SUBSCRIPTION:');
    if (user.live_tv_subscription) {
      console.log(`   Package: ${user.live_tv_subscription.packageType}`);
      console.log(`   Is Active: ${user.live_tv_subscription.isActive}`);
      console.log(`   Start Date: ${new Date(user.live_tv_subscription.startDate).toLocaleString()}`);
      console.log(`   End Date: ${new Date(user.live_tv_subscription.endDate).toLocaleString()}`);
      console.log(`   Amount: ${user.live_tv_subscription.amount}`);
      
      const now = new Date();
      const endDate = new Date(user.live_tv_subscription.endDate);
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      console.log(`   Days Remaining: ${daysRemaining}`);
      console.log(`   Currently Valid: ${endDate > now ? '✅ YES' : '❌ EXPIRED'}`);
    } else {
      console.log('   ❌ No Live TV subscription found');
    }

    // 4. Check payment history
    console.log('\n💳 PAYMENT HISTORY:');
    if (user.payment_history && user.payment_history.length > 0) {
      console.log(`   Total payments: ${user.payment_history.length}`);
      user.payment_history.slice(-5).reverse().forEach((payment, index) => {
        console.log(`\n   Payment ${index + 1}:`);
        console.log(`      ID: ${payment.id}`);
        console.log(`      Package: ${payment.packageType || payment.packageCategory || 'N/A'}`);
        console.log(`      Amount: ${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Phone: ${payment.phoneNumber}`);
        console.log(`      Order ID: ${payment.orderId || 'N/A'}`);
        console.log(`      Created: ${new Date(payment.createdAt).toLocaleString()}`);
        console.log(`      Type: ${payment.paymentType || 'subscription'}`);
      });
    } else {
      console.log('   ❌ No payment history');
    }

    // 5. Check payments table directly
    console.log('\n\n💰 PAYMENTS TABLE (Direct Query):');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (paymentsError) {
      console.error('   ❌ Error fetching payments:', paymentsError.message);
    } else if (payments && payments.length > 0) {
      console.log(`   Total payments in table: ${payments.length}`);
      payments.forEach((payment, index) => {
        console.log(`\n   Payment ${index + 1}:`);
        console.log(`      ID: ${payment.id}`);
        console.log(`      Package: ${payment.package_type}`);
        console.log(`      Category: ${payment.package_category || 'GENERAL'}`);
        console.log(`      Amount: ${payment.amount}`);
        console.log(`      Status: ${payment.status}`);
        console.log(`      Phone: ${payment.phone_number}`);
        console.log(`      Order ID: ${payment.order_id || 'N/A'}`);
        console.log(`      Created: ${new Date(payment.created_at).toLocaleString()}`);
        console.log(`      Manually Completed: ${payment.is_manually_completed || false}`);
        console.log(`      Completed By: ${payment.completed_by || 'N/A'}`);
        console.log(`      Completed At: ${payment.completed_at ? new Date(payment.completed_at).toLocaleString() : 'N/A'}`);
      });
    } else {
      console.log('   ❌ No payments in table');
    }

    // 6. Diagnosis
    console.log('\n\n🔧 DIAGNOSIS:');
    const hasCompletedPayments = payments && payments.some(p => p.status === 'completed');
    const hasActiveSubscription = user.subscription && user.subscription.isActive && new Date(user.subscription.endDate) > new Date();
    const hasActiveLiveTv = user.live_tv_subscription && user.live_tv_subscription.isActive && new Date(user.live_tv_subscription.endDate) > new Date();

    if (hasCompletedPayments && !hasActiveSubscription && !hasActiveLiveTv) {
      console.log('   ⚠️ ISSUE FOUND: User has completed payments but NO active subscription!');
      console.log('   💡 SOLUTION: The payment completion process did not activate the subscription.');
      console.log('   💡 ACTION: Need to manually activate subscription or investigate payment completion logic.');
    } else if (!hasCompletedPayments) {
      console.log('   ℹ️  User has no completed payments in the system.');
    } else if (hasActiveSubscription || hasActiveLiveTv) {
      console.log('   ✅ User has active subscription! Everything looks good.');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get phone number from command line or use default
const phoneNumber = process.argv[2] || '+255788672140';
debugSubscription(phoneNumber);
