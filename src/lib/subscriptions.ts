import { supabase } from './supabase';
import {
  User,
  UserSubscription,
  SubscriptionPackage,
  PaymentRequest,
  PaymentStatus,
  PackageCategory
} from '@/types';

export interface PackageConfig {
  days: number;
  price: number;
  name: string;
  description?: string;
  /** Number of devices allowed to be logged in at once on this package. */
  maxDevices?: number;
}

/**
 * Default device limits per package key. Used as a fallback when a package
 * config does not explicitly set `maxDevices` (e.g. older stored configs).
 */
export const DEFAULT_DEVICE_LIMITS: Record<string, number> = {
  FEDHA: 1, CHUMA: 1, DHAHABU: 1, ALMASI: 2, MALKIA: 4,
  KITONGA: 1, SWALA: 1, ZEBRA: 1, SIMBA: 1, NDOVU: 1, FARU: 1, TWIGA: 1,
};

/** Resolve the device limit for a single package from a config map. */
export const getPackageDeviceLimit = (
  config: PackagesConfigMap | undefined,
  packageType?: string | null
): number => {
  if (!packageType) return 1;
  const configured = config?.[packageType as SubscriptionPackage]?.maxDevices;
  if (typeof configured === 'number' && configured > 0) return configured;
  return DEFAULT_DEVICE_LIMITS[packageType] ?? 1;
};

export type PackagesConfigMap = Record<SubscriptionPackage, PackageConfig>;

// Default Subscription packages configuration
export const SUBSCRIPTION_PACKAGES: PackagesConfigMap = {
  FEDHA: { days: 3, price: 5000, name: 'FEDHA', maxDevices: 1 },
  CHUMA: { days: 7, price: 8000, name: 'CHUMA', maxDevices: 1 },
  DHAHABU: { days: 14, price: 15000, name: 'DHAHABU', maxDevices: 1 },
  ALMASI: { days: 30, price: 25000, name: 'ALMASI', maxDevices: 2 },
  MALKIA: { days: 180, price: 120000, name: 'MALKIA', maxDevices: 4 },
  // Game-specific packages
  KITONGA: { days: 0, price: 1000, name: 'KITONGA' },
  SWALA: { days: 0, price: 5000, name: 'SWALA' },
  ZEBRA: { days: 0, price: 8000, name: 'ZEBRA' },
  SIMBA: { days: 0, price: 9000, name: 'SIMBA' },
  NDOVU: { days: 0, price: 15000, name: 'NDOVU' },
  FARU: { days: 0, price: 20000, name: 'FARU' },
  TWIGA: { days: 0, price: 30000, name: 'TWIGA' }
};

// Default Live TV packages configuration.
// Same prices/durations as the regular packages, but with distinct display
// names (e.g. "FEDHA LIVE") so users can tell a Live TV package apart from a
// normal package that shares the same key. Stored/edited independently.
export const LIVETV_SUBSCRIPTION_PACKAGES: PackagesConfigMap = {
  FEDHA: { days: 3, price: 5000, name: 'FEDHA LIVE TV', maxDevices: 1 },
  CHUMA: { days: 7, price: 8000, name: 'CHUMA LIVE TV', maxDevices: 1 },
  DHAHABU: { days: 14, price: 15000, name: 'DHAHABU LIVE TV', maxDevices: 1 },
  ALMASI: { days: 30, price: 25000, name: 'ALMASI LIVE TV', maxDevices: 2 },
  MALKIA: { days: 180, price: 120000, name: 'MALKIA LIVE TV', maxDevices: 4 },
  // Game packages are not part of the Live TV set; kept for type completeness.
  KITONGA: { days: 0, price: 1000, name: 'KITONGA' },
  SWALA: { days: 0, price: 5000, name: 'SWALA' },
  ZEBRA: { days: 0, price: 8000, name: 'ZEBRA' },
  SIMBA: { days: 0, price: 9000, name: 'SIMBA' },
  NDOVU: { days: 0, price: 15000, name: 'NDOVU' },
  FARU: { days: 0, price: 20000, name: 'FARU' },
  TWIGA: { days: 0, price: 30000, name: 'TWIGA' }
};

// admin_settings row keys for each package set. These are intentionally
// distinct so editing one set never reads from or writes to the other.
export const PACKAGES_SETTINGS_KEY = 'packages';
export const LIVETV_PACKAGES_SETTINGS_KEY = 'packages_livetv';

// Key-based config reader shared by the general and Live TV sets.
const getPackagesConfigByKey = async (
  settingsKey: string,
  defaults: PackagesConfigMap
): Promise<PackagesConfigMap> => {
  try {
    const { data, error } = await supabase.from('admin_settings').select('data').eq('id', settingsKey).single();
    if (!error && (data as any)?.data) {
      const parsedData = typeof (data as any).data === 'string' ? JSON.parse((data as any).data) : (data as any).data;
      const cleanData: Partial<PackagesConfigMap> = {};
      for (const key of Object.keys(parsedData)) {
        if (isNaN(Number(key))) {
          cleanData[key as SubscriptionPackage] = parsedData[key];
        }
      }
      return { ...defaults, ...cleanData } as PackagesConfigMap;
    }
  } catch (error) {
    console.error(`Error fetching packages config (${settingsKey}):`, error);
  }
  return defaults;
};

// Key-based config writer shared by the general and Live TV sets.
const updatePackageConfigByKey = async (
  settingsKey: string,
  defaults: PackagesConfigMap,
  packageType: SubscriptionPackage,
  updates: Partial<PackageConfig>
): Promise<PackagesConfigMap> => {
  const currentConfig = await getPackagesConfigByKey(settingsKey, defaults);

  const updatedConfig = {
    ...currentConfig,
    [packageType]: {
      ...currentConfig[packageType],
      ...updates
    }
  };

  const cleanConfig: Partial<PackagesConfigMap> = {};
  for (const key of Object.keys(updatedConfig)) {
    if (isNaN(Number(key))) {
      cleanConfig[key as SubscriptionPackage] = updatedConfig[key as SubscriptionPackage];
    }
  }

  const { error } = await supabase
    .from('admin_settings')
    .upsert(
      { id: settingsKey, data: cleanConfig, updated_at: new Date().toISOString(), updated_by: 'admin' },
      { onConflict: 'id' }
    );
  if (error) throw error;
  return cleanConfig as PackagesConfigMap;
};

export const getPackagesConfig = async (): Promise<PackagesConfigMap> => {
  return getPackagesConfigByKey(PACKAGES_SETTINGS_KEY, SUBSCRIPTION_PACKAGES);
};

export const updatePackageConfig = async (packageType: SubscriptionPackage, updates: Partial<PackageConfig>) => {
  return updatePackageConfigByKey(PACKAGES_SETTINGS_KEY, SUBSCRIPTION_PACKAGES, packageType, updates);
};

// Live TV package set accessors — stored separately under packages_livetv.
export const getLiveTvPackagesConfig = async (): Promise<PackagesConfigMap> => {
  return getPackagesConfigByKey(LIVETV_PACKAGES_SETTINGS_KEY, LIVETV_SUBSCRIPTION_PACKAGES);
};

export const updateLiveTvPackageConfig = async (packageType: SubscriptionPackage, updates: Partial<PackageConfig>) => {
  return updatePackageConfigByKey(LIVETV_PACKAGES_SETTINGS_KEY, LIVETV_SUBSCRIPTION_PACKAGES, packageType, updates);
};

export const getPackageHierarchy = (): SubscriptionPackage[] => {
  return ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];
};

export const isUpgrade = (currentPackage: SubscriptionPackage, newPackage: SubscriptionPackage): boolean => {
  const hierarchy = getPackageHierarchy();
  return hierarchy.indexOf(newPackage) > hierarchy.indexOf(currentPackage);
};

export const calculateSubscriptionEndDate = (
  user: User,
  packageType: SubscriptionPackage,
  isRenewal: boolean = false,
  customPackageConfig?: PackageConfig
): Date => {
  const packageConfig = customPackageConfig || SUBSCRIPTION_PACKAGES[packageType];
  const now = new Date();

  if (user.subscription && user.subscription.isActive && isRenewal) {
    const currentEndDate = new Date(user.subscription.endDate);
    if (currentEndDate > now) {
      return new Date(currentEndDate.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
    }
  }

  return new Date(now.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
};

export const calculateDoubledDuration = (
  user: User,
  packageType: SubscriptionPackage,
  customPackageConfig?: PackageConfig
): Date => {
  const packageConfig = customPackageConfig || SUBSCRIPTION_PACKAGES[packageType];
  const now = new Date();
  let baseEndDate: Date;

  if (user.subscription && user.subscription.isActive) {
    const currentEndDate = new Date(user.subscription.endDate);
    if (currentEndDate > now) {
      baseEndDate = currentEndDate;
    } else {
      baseEndDate = now;
    }
  } else {
    baseEndDate = now;
  }

  const doubleDuration = packageConfig.days * 2;
  return new Date(baseEndDate.getTime() + (doubleDuration * 24 * 60 * 60 * 1000));
};

export const processSubscription = async (
  user: User,
  packageType: SubscriptionPackage,
  paymentId: string,
  isManuallyCompleted: boolean = false,
  completedBy?: string,
  customSupabaseClient?: any,
  category: PackageCategory = 'GENERAL'
): Promise<UserSubscription> => {
  const isLiveTv = category === 'LIVETV';
  const packagesConfig = isLiveTv ? await getLiveTvPackagesConfig() : await getPackagesConfig();
  const packageConfig = packagesConfig[packageType];
  const now = new Date();

  // Operate on the subscription belonging to this category only.
  const currentSub = isLiveTv ? user.liveTvSubscription : user.subscription;
  const currentHistory = isLiveTv
    ? (user.liveTvSubscriptionHistory || [])
    : (user.subscriptionHistory || []);

  const isRenewal = currentSub &&
    currentSub.packageType === packageType &&
    currentSub.isActive;

  const isUpgradeTransaction = currentSub &&
    currentSub.isActive &&
    isUpgrade(currentSub.packageType, packageType);

  let endDate: Date;
  let amount = packageConfig.price;

  if (isRenewal && currentSub && currentSub.isActive) {
    const currentEndDate = new Date(currentSub.endDate);
    endDate = new Date(currentEndDate.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
  } else if (isUpgradeTransaction && currentSub) {
    const currentEndDate = new Date(currentSub.endDate);
    endDate = new Date(currentEndDate.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
  } else if (currentSub && currentSub.isActive) {
    const remainingTime = new Date(currentSub.endDate).getTime() - now.getTime();
    const newPackageTime = packageConfig.days * 24 * 60 * 60 * 1000;
    endDate = new Date(now.getTime() + remainingTime + newPackageTime);
  } else {
    endDate = new Date(now.getTime() + (packageConfig.days * 24 * 60 * 60 * 1000));
  }

  const newSubscription: UserSubscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    packageType,
    startDate: now,
    endDate,
    isActive: true,
    transactionId: paymentId,
    amount,
    isRenewal: !!isRenewal,
    isUpgrade: !!isUpgradeTransaction,
    previousPackage: currentSub?.packageType || null,
    createdAt: now,
    category
  };

  const updatedSubscriptionHistory = [...currentHistory, newSubscription];
  if (currentSub) {
    const updatedHistory = updatedSubscriptionHistory.map(sub =>
      sub.id === currentSub.id ? { ...sub, isActive: false } : sub
    );
    updatedSubscriptionHistory.splice(0, updatedSubscriptionHistory.length, ...updatedHistory);
  }

  const client = customSupabaseClient || supabase;
  const updatePayload = isLiveTv
    ? {
        live_tv_subscription: JSON.parse(JSON.stringify(newSubscription)),
        live_tv_subscription_history: JSON.parse(JSON.stringify(updatedSubscriptionHistory))
      }
    : {
        subscription: JSON.parse(JSON.stringify(newSubscription)),
        subscription_history: JSON.parse(JSON.stringify(updatedSubscriptionHistory))
      };
  await client.from('rahapremium_users').update(updatePayload).eq('id', user.uid);

  return newSubscription;
};

export const checkSubscriptionExpiry = async (user: User): Promise<boolean> => {
  if (!user.subscription || !user.subscription.isActive) {
    return false;
  }

  const now = new Date();
  const endDate = new Date(user.subscription.endDate);

  if (endDate <= now) {
    await supabase.from('rahapremium_users').update({
      subscription: { ...user.subscription, isActive: false }
    }).eq('id', user.uid);
    return false;
  }

  return true;
};

// Global override: when enabled by an admin ("All Content Free" switch), every
// standard (movie/series) item is unlocked for everyone. Kept in sync by
// PlatformControlContext via setAllContentFree().
let allContentFreeOverride = false;
export const setAllContentFree = (value: boolean): void => {
  allContentFreeOverride = value;
};
export const isAllContentFree = (): boolean => allContentFreeOverride;

export const hasAccessToContent = (
  user: User | null,
  requiredPackages: SubscriptionPackage[]
): boolean => {
  // Admin override — everything is free.
  if (allContentFreeOverride) {
    return true;
  }

  // If no packages are required, content is freely accessible — no login needed
  if (!requiredPackages || requiredPackages.length === 0) {
    return true;
  }

  if (!user || !user.subscription || !user.subscription.isActive) {
    return false;
  }

  const now = new Date();
  const endDate = new Date(user.subscription.endDate);

  if (endDate <= now) {
    return false;
  }

  return requiredPackages.includes(user.subscription.packageType);
};

// When ON, an active general (movie) subscription ALSO unlocks Live TV — used
// only as a temporary transition courtesy. It is OFF so that Live TV requires
// its own dedicated subscription (channels use their own package).
export const LIVETV_TRANSITION_COURTESY = false;

const isSubscriptionActiveNow = (sub?: UserSubscription | null): boolean => {
  if (!sub || !sub.isActive) return false;
  return new Date(sub.endDate) > new Date();
};

/**
 * Access check for Live TV channels. Uses the user's independent Live TV
 * subscription. Free channels (no required packages) are always accessible.
 * During the transition window, an active general subscription also grants
 * access (see LIVETV_TRANSITION_COURTESY).
 */
export const hasLiveTvAccess = (
  user: User | null,
  requiredPackages: SubscriptionPackage[]
): boolean => {
  // Free channel — open to all
  if (!requiredPackages || requiredPackages.length === 0) {
    return true;
  }

  if (!user) return false;

  // Primary: active Live TV subscription covering the required package
  if (isSubscriptionActiveNow(user.liveTvSubscription)) {
    if (requiredPackages.includes(user.liveTvSubscription!.packageType)) {
      return true;
    }
  }

  // Transition courtesy: active general subscription unlocks Live TV
  if (LIVETV_TRANSITION_COURTESY && isSubscriptionActiveNow(user.subscription)) {
    return requiredPackages.includes(user.subscription!.packageType);
  }

  return false;
};

/**
 * Returns true if per-content-purchase content is effectively free:
 * - contentPurchaseEnabled is ON but price is 0/falsy, OR
 * - contentPurchaseEnabled is ON but contentPurchasePackages is empty
 */
export const isContentEffectivelyFree = (content: {
  contentPurchaseEnabled?: boolean;
  contentPrice?: number;
  contentPurchasePackages?: SubscriptionPackage[];
  requiredPackages?: SubscriptionPackage[];
}): boolean => {
  // Admin override — everything is free.
  if (allContentFreeOverride) return true;
  // No required packages at all → free
  if (!content.requiredPackages || content.requiredPackages.length === 0) {
    if (!content.contentPurchaseEnabled) return true;
  }
  // Per-price enabled but no valid price → free
  if (content.contentPurchaseEnabled) {
    const noPrice = !content.contentPrice || content.contentPrice <= 0;
    if (noPrice) return true;
  }
  return false;
};

/** Alias kept for backward compatibility — use isContentEffectivelyFree for new code */
export const isContentFree = isContentEffectivelyFree;

export const hasPurchasedContent = (user: User | null, contentId: string): boolean => {
  if (!user || !user.contentAccesses) return false;
  return user.contentAccesses.includes(contentId);
};

export const hasAccessToGame = async (
  user: User | null,
  gameId: string,
  requiredPackages: SubscriptionPackage[]
): Promise<boolean> => {
  if (!user) return false;

  try {
    const { getUserGameAccesses } = await import('./games');
    const accessResult = await getUserGameAccesses(user.uid);
    
    if (accessResult.success && accessResult.data) {
      const access = accessResult.data.find(a => a.gameId === gameId);
      const now = new Date();

      if (access && access.isActive && new Date(access.endDate) > now) {
        return true;
      }
    }
  } catch (error) {
    console.error('Error checking game access:', error);
  }

  return hasAccessToContent(user, requiredPackages);
};

export const getUserSubscriptionStatus = (user: User | null): {
  isActive: boolean;
  packageType?: SubscriptionPackage;
  daysRemaining?: number;
  endDate?: Date;
} => {
  if (!user || !user.subscription) {
    return { isActive: false };
  }

  const now = new Date();
  const endDate = new Date(user.subscription.endDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isActive: user.subscription.isActive && endDate > now,
    packageType: user.subscription.packageType,
    daysRemaining: Math.max(0, daysRemaining),
    endDate
  };
};

export const getUserLiveTvSubscriptionStatus = (user: User | null): {
  isActive: boolean;
  packageType?: SubscriptionPackage;
  daysRemaining?: number;
  endDate?: Date;
} => {
  if (!user || !user.liveTvSubscription) {
    return { isActive: false };
  }

  const now = new Date();
  const endDate = new Date(user.liveTvSubscription.endDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isActive: user.liveTvSubscription.isActive && endDate > now,
    packageType: user.liveTvSubscription.packageType,
    daysRemaining: Math.max(0, daysRemaining),
    endDate
  };
};

export const initiatePayment = async (
  user: User,
  packageType: SubscriptionPackage,
  phoneNumber: string,
  category: PackageCategory = 'GENERAL'
): Promise<PaymentRequest> => {
  const isLiveTv = category === 'LIVETV';
  const packagesConfig = isLiveTv ? await getLiveTvPackagesConfig() : await getPackagesConfig();
  const packageConfig = packagesConfig[packageType];

  const paymentId = crypto.randomUUID();
  const paymentRequest = {
    id: paymentId,
    user_id: user.uid,
    package_type: packageType,
    package_category: category,
    amount: packageConfig.price,
    phone_number: phoneNumber,
    status: 'pending',
    is_manually_completed: false,
    payment_type: 'subscription',
    created_at: new Date().toISOString()
  };

  const { data: docRef, error } = await supabase.from('payments').insert(paymentRequest).select().single();
  if (error) {
    console.error('Supabase insert error:', (error as any).code, error.message, (error as any).details);
    throw new Error(`Database error (${(error as any).code}): ${error.message}`);
  }

  const payment: PaymentRequest = {
    id: (docRef as any).id,
    userId: user.uid,
    packageType,
    packageCategory: category,
    amount: packageConfig.price,
    phoneNumber,
    status: 'pending',
    createdAt: new Date(),
    isManuallyCompleted: false,
    paymentType: 'subscription'
  };

  const updatedPaymentHistory = [...(user.paymentHistory || []), payment];
  await supabase.from('rahapremium_users').update({
    payment_history: JSON.parse(JSON.stringify(updatedPaymentHistory))
  }).eq('id', user.uid);

  try {
    const response = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        packageType, 
        phoneNumber,
        category,
        buyerName: user.displayName || user.username || 'Customer'
      })
    });

    const result = await response.json();

    if (result.success) {
      await supabase.from('payments').update({
        order_id: result.orderId,
        ussd_code: result.ussdCode || '*150*00#'
      }).eq('id', payment.id);

      return {
        ...payment,
        orderId: result.orderId,
        ussdCode: result.ussdCode || '*150*00#'
      };
    } else {
      throw new Error(result.message || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
};

export const initiateGamePayment = async (
  user: User,
  gameId: string,
  phoneNumber: string,
  amount: number
): Promise<PaymentRequest> => {
  const gamePaymentId = crypto.randomUUID();
  const paymentRequest = {
    id: gamePaymentId,
    user_id: user.uid,
    game_id: gameId,
    amount,
    phone_number: phoneNumber,
    status: 'pending',
    is_manually_completed: false,
    payment_type: 'game',
    created_at: new Date().toISOString()
  };

  const { data: docRef, error } = await supabase.from('payments').insert(paymentRequest).select().single();
  if (error) {
    console.error('Supabase game payment insert error:', (error as any).code, error.message, (error as any).details);
    throw new Error(`Database error (${(error as any).code}): ${error.message}`);
  }

  const payment: PaymentRequest = {
    id: (docRef as any).id,
    userId: user.uid,
    gameId,
    amount,
    phoneNumber,
    status: 'pending',
    createdAt: new Date(),
    isManuallyCompleted: false,
    paymentType: 'game'
  };

  const updatedPaymentHistory = [...(user.paymentHistory || []), payment];
  await supabase.from('rahapremium_users').update({
    payment_history: JSON.parse(JSON.stringify(updatedPaymentHistory))
  }).eq('id', user.uid);

  try {
    const response = await fetch('/api/payment/initiate-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        gameId, 
        phoneNumber, 
        amount,
        buyerName: user.displayName || user.username || 'Customer'
      })
    });

    const result = await response.json();

    if (result.success) {
      await supabase.from('payments').update({
        order_id: result.orderId,
        ussd_code: result.ussdCode || '*150*00#'
      }).eq('id', payment.id);

      return { ...payment, orderId: result.orderId, ussdCode: result.ussdCode || '*150*00#' };
    } else {
      throw new Error(result.message || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
};

export const initiateContentPayment = async (
  user: User,
  contentId: string,
  contentType: 'movie' | 'series' | 'episode' | 'story',
  phoneNumber: string,
  amount: number,
  durationDays: number
): Promise<PaymentRequest> => {
  const contentPaymentId = crypto.randomUUID();
  const paymentRequest = {
    id: contentPaymentId,
    user_id: user.uid,
    content_id: contentId,
    content_type: contentType,
    amount,
    phone_number: phoneNumber,
    status: 'pending',
    is_manually_completed: false,
    payment_type: 'content',
    content_duration_days: durationDays,
    created_at: new Date().toISOString()
  };

  const { data: docRef, error } = await supabase.from('payments').insert(paymentRequest).select().single();
  if (error) {
    console.error('Supabase content payment insert error:', (error as any).code, error.message, (error as any).details);
    throw new Error(`Database error (${(error as any).code}): ${error.message}`);
  }

  const payment: PaymentRequest = {
    id: (docRef as any).id,
    userId: user.uid,
    contentId,
    contentType,
    amount,
    phoneNumber,
    status: 'pending',
    createdAt: new Date(),
    isManuallyCompleted: false,
    paymentType: 'content',
    contentDurationDays: durationDays
  };

  const updatedPaymentHistory = [...(user.paymentHistory || []), payment];
  await supabase.from('rahapremium_users').update({
    payment_history: JSON.parse(JSON.stringify(updatedPaymentHistory))
  }).eq('id', user.uid);

  try {
    const response = await fetch('/api/payment/initiate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contentId, 
        contentType, 
        phoneNumber, 
        amount, 
        durationDays,
        buyerName: user.displayName || user.username || 'Customer'
      })
    });

    const result = await response.json();

    if (result.success) {
      await supabase.from('payments').update({
        order_id: result.orderId,
        ussd_code: result.ussdCode || '*150*00#'
      }).eq('id', payment.id);

      return { ...payment, orderId: result.orderId, ussdCode: result.ussdCode || '*150*00#' };
    } else {
      throw new Error(result.message || 'Payment initiation failed');
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
};

export const completePayment = async (
  paymentId: string,
  userOrIsManual?: User | boolean,
  isManualParam: boolean = false,
  completedBy?: string
) => {
  // Support both signatures:
  //   completePayment(id, user, isManual, completedBy)  - full call from admin
  //   completePayment(id, isManual, completedBy)         - short call from subscriptions page
  let user: User | null = null;
  let isManual = isManualParam;

  if (typeof userOrIsManual === 'boolean') {
    isManual = userOrIsManual;
    completedBy = isManualParam as unknown as string | undefined;
  } else if (userOrIsManual && typeof userOrIsManual === 'object') {
    user = userOrIsManual;
  }

  try {
    const { data: paymentDoc, error } = await supabase.from('payments').select('*').eq('id', paymentId).single();
    if (error || !paymentDoc) throw new Error('Payment not found');

    const paymentType = (paymentDoc as any).payment_type || 'subscription';
    const userId = user?.uid || (paymentDoc as any).user_id;

    // Update payment record — Firestore rejects `undefined` field values, use null instead.
    await supabase.from('payments').update({
      status: 'completed',
      is_manually_completed: isManual,
      completed_at: new Date().toISOString(),
      ...(completedBy !== undefined ? { completed_by: completedBy } : {}),
    }).eq('id', paymentId);

    if (user) {
      // Update user's payment history if we have a user object
      const updatedHistory = (user.paymentHistory || []).map(p =>
        p.id === paymentId ? { ...p, status: 'completed' as PaymentStatus, isManuallyCompleted: isManual, completedAt: new Date() } : p
      );
      await supabase.from('rahapremium_users').update({ payment_history: JSON.parse(JSON.stringify(updatedHistory)) }).eq('id', userId);
    }

    if (paymentType === 'game' && userId) {
      const { grantGameAccess } = await import('./games');
      const result = await grantGameAccess(userId, (paymentDoc as any).game_id, 3, paymentId);
      if (!result.success) throw new Error('Failed to grant game access');
    } else if (paymentType === 'content' && userId) {
      // Fetch fresh content_accesses from DB to avoid overwriting with stale client-side state
      const { data: freshUserData } = await supabase
        .from('rahapremium_users')
        .select('content_accesses')
        .eq('id', userId)
        .single();
      const currentAccesses: string[] = (freshUserData as any)?.content_accesses || [];
      // Only add if not already present (idempotent)
      if (!currentAccesses.includes((paymentDoc as any).content_id)) {
        currentAccesses.push((paymentDoc as any).content_id);
      }
      await supabase.from('rahapremium_users').update({ content_accesses: currentAccesses }).eq('id', userId);
    } else if (paymentType === 'subscription') {
      const category: PackageCategory = ((paymentDoc as any).package_category === 'LIVETV') ? 'LIVETV' : 'GENERAL';
      if (user) {
        await processSubscription(user, (paymentDoc as any).package_type, paymentId, isManual, completedBy, undefined, category);
      } else {
        // Fetch user and process subscription
        const { data: userData } = await supabase.from('rahapremium_users').select('*').eq('id', userId).single();
        if (userData) {
          // Build a minimal user object for processSubscription (both categories)
          const minUser = {
            uid: (userData as any).id,
            paymentHistory: (userData as any).payment_history || [],
            subscription: (userData as any).subscription,
            subscriptionHistory: (userData as any).subscription_history || [],
            liveTvSubscription: (userData as any).live_tv_subscription,
            liveTvSubscriptionHistory: (userData as any).live_tv_subscription_history || []
          } as unknown as User;
          await processSubscription(minUser, (paymentDoc as any).package_type, paymentId, isManual, completedBy, undefined, category);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error completing payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const failPayment = async (paymentId: string, user: User, reason: string = 'Payment failed') => {
  try {
    await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId);
    
    const updatedHistory = (user.paymentHistory || []).map(p => 
      p.id === paymentId ? { ...p, status: 'failed' as PaymentStatus } : p
    );
    await supabase.from('rahapremium_users').update({ payment_history: JSON.parse(JSON.stringify(updatedHistory)) }).eq('id', user.uid);

    return { success: true };
  } catch (error) {
    console.error('Error failing payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getPendingPayments = async (userId: string): Promise<PaymentRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return ((data as any) || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      packageType: p.package_type,
      amount: p.amount,
      phoneNumber: p.phone_number,
      status: p.status,
      createdAt: new Date(p.created_at),
      orderId: p.order_id,
      paymentType: p.payment_type,
      gameId: p.game_id,
      contentId: p.content_id,
      contentType: p.content_type,
      isManuallyCompleted: p.is_manually_completed || false,
    })) as PaymentRequest[];
  } catch (error) {
    console.error('Error getting pending payments:', error);
    return [];
  }
};

export const getSubscriptionStatusText = (user: User | null): string => {
  if (!user || !user.subscription || !user.subscription.isActive) {
    return 'Hajajiunga'; // Not subscribed
  }

  const now = new Date();
  const endDate = new Date(user.subscription.endDate);
  
  if (endDate <= now) {
    return 'Imeisha Muda'; // Expired
  }

  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining === 0) {
    return `Inaisha leo (${user.subscription.packageType})`; // Expires today
  }

  return `${user.subscription.packageType} (Siku ${daysRemaining})`; // e.g., FEDHA (Siku 3)
};

export const checkPaymentStatus = async (orderId: string): Promise<{
  success: boolean;
  status?: string;
  paymentId?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.from('payments').select('*').eq('order_id', orderId).single();
    if (error) throw error;
    return { success: true, status: (data as any).status, paymentId: (data as any).id };
  } catch (error) {
    return { success: false, error: 'Payment not found' };
  }
};

/**
 * Resolve the maximum number of simultaneous devices allowed for a user,
 * considering BOTH the general subscription and the Live TV subscription.
 * The highest limit among the currently-active subscriptions wins.
 *
 * Accepts either a raw DB row (`live_tv_subscription`) or a mapped User
 * object (`liveTvSubscription`).
 */
export const getUserDeviceLimit = async (u: any): Promise<number> => {
  const now = new Date();
  const [generalConfig, liveTvConfig] = await Promise.all([
    getPackagesConfig(),
    getLiveTvPackagesConfig()
  ]);

  let limit = 1;

  const consider = (sub: any, config: PackagesConfigMap) => {
    if (!sub) return;
    const active =
      sub.isActive === true && !!sub.endDate && new Date(sub.endDate) > now;
    if (!active) return;
    limit = Math.max(limit, getPackageDeviceLimit(config, sub.packageType));
  };

  consider(u?.subscription, generalConfig);
  consider(u?.live_tv_subscription ?? u?.liveTvSubscription, liveTvConfig);

  return limit;
};
