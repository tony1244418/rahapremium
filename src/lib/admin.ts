import { supabase } from './supabase';
import {
  User,
  Movie,
  Series,
  Story,
  PaymentRequest,
  AdminUser,
  UserSubscription,
  SubscriptionPackage,
  PackageCategory
} from '@/types';
import { processSubscription, completePayment, failPayment } from './subscriptions';

// Phone number normalization utility
export const normalizePhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return phoneNumber;

  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('255')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+255${cleaned.substring(1)}`;
  }
  if (!phoneNumber.startsWith('+')) {
    return `+${cleaned}`;
  }
  return phoneNumber;
};

const safeToDate = (value: any): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
};

const mapUserFromDB = (data: any): User => {
  return {
    ...data,
    uid: data.id,
    phoneNumber: data.phone_number,
    displayName: data.display_name,
    username: data.username,
    profilePhotoURL: data.profile_photo_url,
    isBlocked: data.is_blocked,
    isAdult: data.is_adult,
    createdAt: safeToDate(data.created_at),
    lastLoginAt: safeToDate(data.last_login_at),
    subscription: data.subscription,
    subscriptionHistory: data.subscription_history || [],
    paymentHistory: data.payment_history || [],
    contentAccesses: data.content_accesses || [],
    liveTvSubscription: data.live_tv_subscription || null,
    liveTvSubscriptionHistory: data.live_tv_subscription_history || [],
  };
};

const mapPaymentFromDB = (data: any): PaymentRequest => {
  return {
    id: data.id,
    userId: data.user_id,
    packageType: data.package_type,
    amount: data.amount,
    phoneNumber: data.phone_number,
    status: data.status,
    orderId: data.order_id,
    createdAt: safeToDate(data.created_at),
    completedAt: data.completed_at ? safeToDate(data.completed_at) : undefined,
    failedAt: data.failed_at ? safeToDate(data.failed_at) : undefined,
    cancelledAt: data.cancelled_at ? safeToDate(data.cancelled_at) : undefined,
    paymentType: data.payment_type,
    contentId: data.content_id,
    contentType: data.content_type,
    gameId: data.game_id
  };
};

// User Management
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase.from('rahapremium_users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return ((data as any) || []).map(mapUserFromDB);
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase.from('rahapremium_users').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return mapUserFromDB(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const getUserByPhoneNumber = async (phoneNumber: string): Promise<User | null> => {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    let { data, error } = await supabase.from('rahapremium_users').select('*').eq('phone_number', normalizedPhone).limit(1);
    
    if (!data || (data as any).length === 0) {
      if (phoneNumber !== normalizedPhone) {
        const res = await supabase.from('rahapremium_users').select('*').eq('phone_number', phoneNumber).limit(1);
        data = res.data;
      }
    }

    if (data && (data as any).length > 0) {
      return mapUserFromDB((data as any)[0]);
    }
    return null;
  } catch (error) {
    console.error('Error fetching user by phone number:', error);
    return null;
  }
};

export const getActiveSubUserByPhone = async (phoneNumber: string): Promise<User | null> => {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const formats = [normalizedPhone];
    if (phoneNumber !== normalizedPhone) formats.push(phoneNumber);

    for (const phone of formats) {
      const { data } = await supabase.from('rahapremium_users').select('*').eq('phone_number', phone);
      if (data) {
        for (const userDoc of (data as any)) {
          if (userDoc.subscription?.isActive) {
            return mapUserFromDB(userDoc);
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error in getActiveSubUserByPhone:', error);
    return null;
  }
};

export const blockUser = async (userId: string): Promise<void> => {
  await supabase.from('rahapremium_users').update({ is_blocked: true }).eq('id', userId);
};

export const unblockUser = async (userId: string): Promise<void> => {
  await supabase.from('rahapremium_users').update({ is_blocked: false }).eq('id', userId);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await supabase.from('payments').delete().eq('user_id', userId);
  await supabase.from('rahapremium_users').delete().eq('id', userId);
};

export const addManualSubscription = async (
  userId: string,
  packageType: SubscriptionPackage,
  adminId: string
): Promise<void> => {
  try {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    const paymentData = {
      id: crypto.randomUUID(),
      user_id: userId,
      package_type: packageType,
      amount: 0,
      phone_number: user.phoneNumber,
      status: 'completed',
      is_manually_completed: true,
      completed_by: adminId,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      payment_type: 'subscription'
    };

    const { data: paymentRef, error } = await supabase.from('payments').insert(paymentData).select().single();
    if (error) throw error;

    await processSubscription(user, packageType, (paymentRef as any).id, true, adminId);
  } catch (error) {
    console.error('Error adding manual subscription:', error);
    throw error;
  }
};

export const addDirectSubscription = async (
  userId: string,
  packageType: SubscriptionPackage,
  adminId: string,
  category: PackageCategory = 'GENERAL'
): Promise<void> => {
  try {
    const user = await getUserById(userId);
    if (!user) throw new Error('User not found');

    const isLiveTv = category === 'LIVETV';

    // Use DB-backed package config (admin may have customised days/price)
    const { getPackagesConfig, getLiveTvPackagesConfig, isUpgrade } = await import('./subscriptions');
    const packagesConfig = isLiveTv ? await getLiveTvPackagesConfig() : await getPackagesConfig();
    const packageConfig = packagesConfig[packageType];
    if (!packageConfig) throw new Error(`Unknown package type: ${packageType}`);
    const now = new Date();

    // Operate on the subscription belonging to this category only.
    const currentSub = isLiveTv ? user.liveTvSubscription : user.subscription;
    const currentHistory = isLiveTv
      ? (user.liveTvSubscriptionHistory || [])
      : (user.subscriptionHistory || []);

    const isRenewal = currentSub && currentSub.packageType === packageType && currentSub.isActive;
    const isUpgradeTransaction = currentSub && currentSub.isActive && isUpgrade(currentSub.packageType, packageType);

    let endDate: Date;
    let isRenewalFlag = false;
    let isUpgradeFlag = false;

    if (isRenewal && currentSub && currentSub.isActive) {
      const currentEndDate = new Date(currentSub.endDate);
      endDate = new Date(currentEndDate.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
      isRenewalFlag = true;
    } else if (isUpgradeTransaction && currentSub) {
      const currentEndDate = new Date(currentSub.endDate);
      endDate = new Date(currentEndDate.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
      isUpgradeFlag = true;
    } else if (currentSub && currentSub.isActive) {
      const remainingTime = new Date(currentSub.endDate).getTime() - now.getTime();
      const newPackageTime = packageConfig.days * 24 * 60 * 60 * 1000;
      endDate = new Date(now.getTime() + remainingTime + newPackageTime);
    } else {
      endDate = new Date(now.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
    }

    // Insert a payment record so this subscription is auditable
    const paymentId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      package_type: packageType,
      package_category: category,
      amount: 0,
      phone_number: user.phoneNumber || '',
      status: 'completed',
      is_manually_completed: true,
      completed_by: adminId,
      created_at: now.toISOString(),
      completed_at: now.toISOString(),
      payment_type: 'subscription',
      order_id: paymentId
    };

    const { error: paymentError } = await supabase.from('payments').insert(paymentRecord);
    if (paymentError) {
      console.error('Failed to insert payment record:', paymentError);
      // Non-fatal — proceed with subscription update regardless
    }

    const newSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      packageType,
      startDate: now,
      endDate,
      isActive: true,
      transactionId: paymentId,
      amount: 0,
      isRenewal: isRenewalFlag,
      isUpgrade: isUpgradeFlag,
      previousPackage: currentSub?.packageType || null,
      createdAt: now,
      addedBy: adminId,
      category
    };

    const updatedSubscriptionHistory = [...currentHistory, newSubscription];
    if (currentSub) {
      const updatedHistory = updatedSubscriptionHistory.map(sub =>
        sub.id === currentSub.id ? { ...sub, isActive: false } : sub
      );
      updatedSubscriptionHistory.splice(0, updatedSubscriptionHistory.length, ...updatedHistory);
    }

    const updatePayload = isLiveTv
      ? {
          live_tv_subscription: JSON.parse(JSON.stringify(newSubscription)),
          live_tv_subscription_history: JSON.parse(JSON.stringify(updatedSubscriptionHistory))
        }
      : {
          subscription: JSON.parse(JSON.stringify(newSubscription)),
          subscription_history: JSON.parse(JSON.stringify(updatedSubscriptionHistory))
        };

    const { error: updateError } = await supabase.from('rahapremium_users').update(updatePayload).eq('id', userId);

    if (updateError) {
      console.error('Supabase update error in addDirectSubscription:', updateError);
      throw new Error(`Failed to update user subscription: ${(updateError as any).message}`);
    }

    console.log(`✅ Manual ${category} subscription added for user ${userId}: ${packageType} until ${endDate.toISOString()}`);
  } catch (error) {
    console.error('Error adding direct subscription:', error);
    throw error;
  }
};


export const removeUserSubscription = async (
  userId: string,
  adminId: string,
  category: PackageCategory = 'GENERAL'
): Promise<void> => {
  // NOTE: rahapremium_users has no updated_at column — including it makes the
  // update fail silently. Only null out the relevant subscription column.
  const payload = category === 'LIVETV'
    ? { live_tv_subscription: null }
    : { subscription: null };
  const { error } = await supabase.from('rahapremium_users').update(payload).eq('id', userId);
  if (error) {
    console.error('removeUserSubscription failed:', error);
    throw new Error(error.message || 'Failed to remove subscription');
  }
};

// Content Management
export const createMovie = async (movieData: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Promise<string> => {
  const { data, error } = await supabase.from('movies').insert({
    ...movieData,
    id: crypto.randomUUID(),
    views: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return (data as any).id;
};

export const updateMovie = async (movieId: string, movieData: Partial<Movie>): Promise<void> => {
  const { id, ...dataToUpdate } = movieData as any;
  await supabase.from('movies').update({ ...dataToUpdate, updated_at: new Date().toISOString() }).eq('id', movieId);
};

export const deleteMovie = async (movieId: string): Promise<void> => {
  await supabase.from('movies').delete().eq('id', movieId);
};

export const createSeries = async (seriesData: Omit<Series, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'seasons'>): Promise<string> => {
  const { data, error } = await supabase.from('series').insert({
    ...seriesData,
    id: crypto.randomUUID(),
    views: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return (data as any).id;
};

export const updateSeries = async (seriesId: string, seriesData: Partial<Series>): Promise<void> => {
  const { id, ...dataToUpdate } = seriesData as any;
  await supabase.from('series').update({ ...dataToUpdate, updated_at: new Date().toISOString() }).eq('id', seriesId);
};

export const deleteSeries = async (seriesId: string): Promise<void> => {
  await supabase.from('episodes').delete().eq('series_id', seriesId);
  await supabase.from('seasons').delete().eq('series_id', seriesId);
  await supabase.from('series').delete().eq('id', seriesId);
};

export const createStory = async (storyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt' | 'views'>): Promise<string> => {
  const { data, error } = await supabase.from('stories').insert({
    ...storyData,
    id: crypto.randomUUID(),
    views: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('id').single();
  if (error) throw error;
  return (data as any).id;
};

export const updateStory = async (storyId: string, storyData: Partial<Story>): Promise<void> => {
  const { id, ...dataToUpdate } = storyData as any;
  await supabase.from('stories').update({ ...dataToUpdate, updated_at: new Date().toISOString() }).eq('id', storyId);
};

export const deleteStory = async (storyId: string): Promise<void> => {
  await supabase.from('stories').delete().eq('id', storyId);
};

// Payment Management
export const getAllPayments = async (): Promise<PaymentRequest[]> => {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return ((data as any) || []).map(mapPaymentFromDB);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
};

export const getPaymentById = async (paymentId: string): Promise<PaymentRequest | null> => {
  try {
    const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).single();
    if (error || !data) return null;
    return mapPaymentFromDB(data);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return null;
  }
};

export const completePaymentManually = async (paymentId: string, adminId: string): Promise<void> => {
  await completePayment(paymentId, null as any, true, adminId);
};

export const failPaymentManually = async (paymentId: string, reason: string): Promise<void> => {
  await failPayment(paymentId, null as any, reason);
};

// Analytics
export interface AdminAnalytics {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalMovies: number;
  totalSeries: number;
  totalStories: number;
  pendingPayments: number;
  blockedUsers: number;
}

export const getAnalytics = async (): Promise<AdminAnalytics> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { data: users },
      { data: payments },
      { count: moviesCount },
      { count: seriesCount },
      { count: storiesCount }
    ] = await Promise.all([
      supabase.from('rahapremium_users').select('is_blocked, subscription, live_tv_subscription'),
      supabase.from('payments').select('amount, status, completed_at, order_id').eq('status', 'completed'),
      supabase.from('movies').select('*', { count: 'exact', head: true }),
      supabase.from('series').select('*', { count: 'exact', head: true }),
      supabase.from('stories').select('*', { count: 'exact', head: true })
    ]);

    // Count users with EITHER an active normal OR an active Live TV subscription.
    const activeSubscriptions = (users || []).filter(user => {
      const normalActive = user.subscription?.isActive && new Date(user.subscription.endDate) > now;
      const liveTvActive = user.live_tv_subscription?.isActive && new Date(user.live_tv_subscription.endDate) > now;
      return normalActive || liveTvActive;
    }).length;
    const blockedUsers = (users || []).filter(user => user.is_blocked).length;

    const totalRevenue = (payments || [])
      .filter(p => !(p.order_id && p.order_id.toLowerCase().startsWith('manual')))
      .reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = (payments || [])
      .filter(p => p.completed_at && p.completed_at >= startOfMonth && !(p.order_id && p.order_id.toLowerCase().startsWith('manual')))
      .reduce((sum, p) => sum + p.amount, 0);

    const { count: pendingPayments } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    return {
      totalUsers: users?.length || 0,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      totalMovies: moviesCount || 0,
      totalSeries: seriesCount || 0,
      totalStories: storiesCount || 0,
      pendingPayments: pendingPayments || 0,
      blockedUsers
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return {
      totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0, monthlyRevenue: 0,
      totalMovies: 0, totalSeries: 0, totalStories: 0, pendingPayments: 0, blockedUsers: 0
    };
  }
};

// Real-time subscriptions for admin (using polling)
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  let intervalId: NodeJS.Timeout;
  const poll = async () => {
    const users = await getAllUsers();
    callback(users);
  };
  poll();
  intervalId = setInterval(poll, 30000);
  return () => clearInterval(intervalId);
};

export const subscribeToPayments = (callback: (payments: PaymentRequest[]) => void) => {
  let intervalId: NodeJS.Timeout;
  const poll = async () => {
    const payments = await getAllPayments();
    callback(payments);
  };
  poll();
  intervalId = setInterval(poll, 30000);
  return () => clearInterval(intervalId);
};

export const subscribeToAnalytics = (callback: (analytics: AdminAnalytics) => void) => {
  let intervalId: NodeJS.Timeout;
  const poll = async () => {
    const analytics = await getAnalytics();
    callback(analytics);
  };
  poll();
  intervalId = setInterval(poll, 30000);
  return () => clearInterval(intervalId);
};

// Detailed Analytics Interface
export interface DetailedAnalytics {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  totalMovies: number;
  totalSeries: number;
  totalStories: number;
  pendingPayments: number;
  blockedUsers: number;
  revenueByPackage: { FEDHA: number; CHUMA: number; DHAHABU: number; ALMASI: number; MALKIA: number; };
  subscriptionsByPackage: { FEDHA: number; CHUMA: number; DHAHABU: number; ALMASI: number; MALKIA: number; };
  liveTvSubscriptionsByPackage: { FEDHA: number; CHUMA: number; DHAHABU: number; ALMASI: number; MALKIA: number; };
  normalSubscriptions: number;      // users with an active normal/movies package
  liveTvSubscriptions: number;      // users with an active Live TV package
  // Completed revenue + paying-user counts broken down by what was purchased.
  revenueByType: {
    normalSub: { revenue: number; count: number };
    liveTvSub: { revenue: number; count: number };
    content: { revenue: number; count: number };
    game: { revenue: number; count: number };
  };
  // Top content by number of completed purchases (pay-per-view leaderboard)
  topPaidContent: {
    contentId: string;
    title: string;
    contentType: string;
    count: number;
    revenue: number;
  }[];
  totalPayments: number;
  completedPayments: number;
  failedPayments: number;
  cancelledPayments: number;
  successRate: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersWithSubscription: number;
  usersWithoutSubscription: number;
  dailyRevenueLast7Days: { date: string; revenue: number }[];
  dailyUsersLast7Days: { date: string; users: number }[];
  dailyPaymentsLast7Days: { date: string; completed: number; failed: number }[];
}

export const getDetailedAnalytics = async (): Promise<DetailedAnalytics> => {
  const basic = await getAnalytics();
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(todayStart);
  thisWeekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch data
  const [{ data: users }, { data: payments }] = await Promise.all([
    supabase.from('rahapremium_users').select('created_at, subscription, live_tv_subscription'),
    supabase.from('payments').select('amount, status, created_at, completed_at, package_type, payment_type, package_category, content_id, content_type, order_id')
  ]);

  const allUsers = users || [];
  const allPayments = payments || [];

  let dailyRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  
  const revenueByPackage = { FEDHA: 0, CHUMA: 0, DHAHABU: 0, ALMASI: 0, MALKIA: 0 };
  const subscriptionsByPackage = { FEDHA: 0, CHUMA: 0, DHAHABU: 0, ALMASI: 0, MALKIA: 0 };
  const liveTvSubscriptionsByPackage = { FEDHA: 0, CHUMA: 0, DHAHABU: 0, ALMASI: 0, MALKIA: 0 };
  let normalSubscriptions = 0;
  let liveTvSubscriptions = 0;
  
  let totalPayments = allPayments.length;
  let completedPayments = 0;
  let failedPayments = 0;
  let cancelledPayments = 0;

  // Revenue + count by purchase type (only completed, non-manual payments)
  const revenueByType = {
    normalSub: { revenue: 0, count: 0 },
    liveTvSub: { revenue: 0, count: 0 },
    content: { revenue: 0, count: 0 },
    game: { revenue: 0, count: 0 },
  };

  // Accumulate completed content purchases per content_id (pay-per-view).
  const contentPurchases = new Map<string, { contentId: string; contentType: string; count: number; revenue: number }>();

  const dailyStatsMap = new Map<string, { revenue: number; users: number; completed: number; failed: number }>();
  
  // Initialize last 7 days map
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(todayStart.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyStatsMap.set(dateStr, { revenue: 0, users: 0, completed: 0, failed: 0 });
  }

  // Process users
  let newUsersToday = 0;
  let newUsersThisWeek = 0;
  let newUsersThisMonth = 0;

  allUsers.forEach(user => {
    if (user.created_at) {
      const createdDate = new Date(user.created_at);
      if (createdDate >= todayStart) newUsersToday++;
      if (createdDate >= thisWeekStart) newUsersThisWeek++;
      if (createdDate >= thisMonthStart) newUsersThisMonth++;
      
      const dateStr = createdDate.toISOString().split('T')[0];
      if (dailyStatsMap.has(dateStr)) {
        dailyStatsMap.get(dateStr)!.users++;
      }
    }

    if (user.subscription && user.subscription.isActive && new Date(user.subscription.endDate) > now) {
      normalSubscriptions++;
      const pkg = user.subscription.packageType as keyof typeof subscriptionsByPackage;
      if (subscriptionsByPackage[pkg] !== undefined) {
        subscriptionsByPackage[pkg]++;
      }
    }

    // Independent Live TV subscription
    if (user.live_tv_subscription && user.live_tv_subscription.isActive && new Date(user.live_tv_subscription.endDate) > now) {
      liveTvSubscriptions++;
      const pkg = user.live_tv_subscription.packageType as keyof typeof liveTvSubscriptionsByPackage;
      if (liveTvSubscriptionsByPackage[pkg] !== undefined) {
        liveTvSubscriptionsByPackage[pkg]++;
      }
    }
  });

  // Process payments
  allPayments.forEach(payment => {
    const isCompleted = payment.status === 'completed' || payment.status === 'SUCCESS';
    const isFailed = payment.status === 'failed' || payment.status === 'FAILED';
    const isCancelled = payment.status === 'cancelled';
    
    if (isCompleted) completedPayments++;
    if (isFailed) failedPayments++;
    if (isCancelled) cancelledPayments++;

    // Base date for counting
    const dateToUse = payment.completed_at ? new Date(payment.completed_at) : (payment.created_at ? new Date(payment.created_at) : null);
    
    if (dateToUse) {
      const dateStr = dateToUse.toISOString().split('T')[0];
      const stats = dailyStatsMap.get(dateStr);
      
      if (stats) {
        if (isCompleted) stats.completed++;
        if (isFailed) stats.failed++;
      }

      if (isCompleted) {
        const isManual = payment.order_id && payment.order_id.toLowerCase().startsWith('manual');
        const amt = Number(payment.amount) || 0;
        
        if (!isManual) {
          if (dateToUse >= todayStart) dailyRevenue += amt;
          if (dateToUse >= thisWeekStart) weeklyRevenue += amt;
          if (dateToUse >= thisMonthStart) monthlyRevenue += amt;
          
          if (stats) {
            stats.revenue += amt;
          }

          const pkg = payment.package_type as keyof typeof revenueByPackage;
          if (revenueByPackage[pkg] !== undefined) {
            revenueByPackage[pkg] += amt;
          }

          // Break down by purchase type so admin sees who pays for what.
          const ptype = (payment.payment_type || 'subscription').toLowerCase();
          const isLiveTvPayment = (payment.package_category || '').toUpperCase() === 'LIVETV';
          if (ptype === 'content') {
            revenueByType.content.revenue += amt;
            revenueByType.content.count += 1;
            // Track per-content purchases for the leaderboard
            if (payment.content_id) {
              const existing = contentPurchases.get(payment.content_id);
              if (existing) {
                existing.count += 1;
                existing.revenue += amt;
              } else {
                contentPurchases.set(payment.content_id, {
                  contentId: payment.content_id,
                  contentType: payment.content_type || 'content',
                  count: 1,
                  revenue: amt,
                });
              }
            }
          } else if (ptype === 'game') {
            revenueByType.game.revenue += amt;
            revenueByType.game.count += 1;
          } else if (isLiveTvPayment) {
            revenueByType.liveTvSub.revenue += amt;
            revenueByType.liveTvSub.count += 1;
          } else {
            revenueByType.normalSub.revenue += amt;
            revenueByType.normalSub.count += 1;
          }
        }
      }
    }
  });

  const successRate = totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0;

  // ── Build top-10 paid content leaderboard ─────────────────────────────────
  // Resolve content titles from DB — query all content tables in parallel.
  let topPaidContent: DetailedAnalytics['topPaidContent'] = [];
  if (contentPurchases.size > 0) {
    const contentIds = Array.from(contentPurchases.keys());
    const [movies, series, stories, episodes] = await Promise.all([
      supabase.from('movies').select('id, title').in('id', contentIds),
      supabase.from('series').select('id, title').in('id', contentIds),
      supabase.from('stories').select('id, title').in('id', contentIds),
      supabase.from('episodes').select('id, title').in('id', contentIds),
    ]);
    const titleMap = new Map<string, string>();
    [movies.data, series.data, stories.data, episodes.data].forEach(rows => {
      (rows || []).forEach((r: { id: string; title: string }) => {
        if (r.id && r.title) titleMap.set(r.id, r.title);
      });
    });

    topPaidContent = Array.from(contentPurchases.values())
      .map(c => ({
        ...c,
        title: titleMap.get(c.contentId) || `Unknown (${c.contentId.slice(0, 8)}…)`,
      }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 10);
  }

  const dailyRevenueLast7Days: { date: string; revenue: number }[] = [];
  const dailyUsersLast7Days: { date: string; users: number }[] = [];
  const dailyPaymentsLast7Days: { date: string; completed: number; failed: number }[] = [];

  dailyStatsMap.forEach((stats, date) => {
    const shortDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
    dailyRevenueLast7Days.push({ date: shortDate, revenue: stats.revenue });
    dailyUsersLast7Days.push({ date: shortDate, users: stats.users });
    dailyPaymentsLast7Days.push({ date: shortDate, completed: stats.completed, failed: stats.failed });
  });

  return {
    ...basic,
    weeklyRevenue,
    dailyRevenue,
    revenueByPackage,
    subscriptionsByPackage,
    liveTvSubscriptionsByPackage,
    normalSubscriptions,
    liveTvSubscriptions,
    revenueByType,
    topPaidContent,
    totalPayments,
    completedPayments,
    failedPayments,
    cancelledPayments,
    successRate,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    usersWithSubscription: basic.activeSubscriptions,
    usersWithoutSubscription: basic.totalUsers - basic.activeSubscriptions,
    dailyRevenueLast7Days,
    dailyUsersLast7Days,
    dailyPaymentsLast7Days
  };
};

export const subscribeToDetailedAnalytics = (callback: (analytics: DetailedAnalytics) => void) => {
  let intervalId: NodeJS.Timeout;
  const poll = async () => {
    const analytics = await getDetailedAnalytics();
    callback(analytics);
  };
  poll();
  intervalId = setInterval(poll, 60000);
  return () => clearInterval(intervalId);
};