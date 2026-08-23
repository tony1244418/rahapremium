'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlatformControls } from './PlatformControlContext';
import { User, AdminUser, AuthContextType } from '@/types';
import { DEVICE_KICKED_EVENT } from '@/components/DeviceConflictModal';
import { getUserDeviceLimit } from '@/lib/subscriptions';

// ─── Device session key ───────────────────────────────────────────────────────
const DEVICE_SESSION_KEY = 'raha_device_session_id';

/** Generate (or reuse) a stable per-browser device ID */
const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_SESSION_KEY, id);
  }
  return id;
};

/** Get a human-readable label for this device */
const getDeviceLabel = (): string => {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android Device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS Device';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Mac/i.test(ua)) return 'Mac';
  return 'Browser';
};

// Device limits are resolved from the admin-configured package settings via
// `getUserDeviceLimit` (see '@/lib/subscriptions'), considering both the
// general and Live TV subscriptions.

interface ActiveSession {
  deviceId: string;
  lastSeenAt: string;
  deviceLabel: string;
}

// Helper to safely convert timestamps to dates
const toDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  return new Date(dateStr);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toggles: platformToggles, loading: platformControlsLoading } = usePlatformControls();
  const isInitializedRef = React.useRef(false);
  // Tracks the last Supabase auth user id we processed, so token refreshes
  // (which fire on tab focus) don't trigger a full reload of the app/admin panel.
  const lastAuthIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkLocalSession = async () => {
      const storedUid = localStorage.getItem('supabase_uid');
      const storedPhone = localStorage.getItem('supabase_phone');

      if (storedUid && storedPhone) {
        try {
          const { data: userData, error } = await supabase.from('rahapremium_users').select('*').eq('id', storedUid).single();
          if (userData && !error) {
            const loadedUser: User = {
              ...(userData as any),
              uid: (userData as any).id,
              phoneNumber: (userData as any).phone_number,
              displayName: (userData as any).display_name,
              username: (userData as any).username || (userData as any).display_name || '',
              profilePhotoURL: (userData as any).profile_photo_url,
              isBlocked: (userData as any).is_blocked,
              isAdult: true,
              createdAt: toDate((userData as any).created_at),
              lastLoginAt: toDate((userData as any).last_login_at),
              subscription: (userData as any).subscription,
              subscriptionHistory: (userData as any).subscription_history || [],
              paymentHistory: (userData as any).payment_history || [],
              contentAccesses: (userData as any).content_accesses || [],
              liveTvSubscription: (userData as any).live_tv_subscription || null,
              liveTvSubscriptionHistory: (userData as any).live_tv_subscription_history || [],
            };

            // Add/update this device in active_sessions
            const deviceId = getOrCreateDeviceId();
            const deviceLabel = getDeviceLabel();
            // Limit considers BOTH the general and Live TV subscriptions,
            // using the admin-configured maxDevices per package.
            const limit = await getUserDeviceLimit(userData);
            let sessions: ActiveSession[] = Array.isArray((userData as any).active_sessions) ? (userData as any).active_sessions : [];
            sessions = sessions.filter(s => s.deviceId !== deviceId);
            while (sessions.length >= limit) {
              sessions.sort((a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime());
              sessions.shift();
            }
            sessions.push({ deviceId, lastSeenAt: new Date().toISOString(), deviceLabel });
            await supabase.from('rahapremium_users').update({ active_sessions: sessions, current_device_id: deviceId }).eq('id', storedUid);

            setUser(loadedUser);
            setAdminUser(null);
            setLoading(false);
            return true;
          }
        } catch (error: any) {
          console.error('Error restoring user session:', error);
          if (typeof window !== 'undefined') {
            localStorage.setItem('raha_debug_error', `Error restoring session: ${error.message || error.toString()}\nStack: ${error.stack || ''}`);
          }
        }
      }
      return false;
    };

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Token refreshes fire when the tab regains focus. They don't change who
      // is logged in, so skip them — otherwise the whole app (and admin panel)
      // flips to the loading state and visibly reloads on every tab switch.
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      // If the auth identity hasn't changed since we last processed it (e.g. a
      // duplicate SIGNED_IN on focus), don't reload either.
      const newAuthId = session?.user?.id ?? null;
      if (isInitializedRef.current && event !== 'SIGNED_OUT' && newAuthId === lastAuthIdRef.current) {
        return;
      }
      lastAuthIdRef.current = newAuthId;

      setLoading(true);
      
      try {
        if (session?.user) {
          // Check if this Supabase auth user is an admin in admins table
          const { data: adminData } = await supabase.from('admins').select('*').eq('email', session.user.email).single();
          
          if (adminData && (adminData as any).is_active) {
            const admin: AdminUser = {
              uid: (adminData as any).id,
              email: (adminData as any).email,
              displayName: (adminData as any).display_name || session.user.user_metadata?.display_name || '',
              role: (adminData as any).role || 'admin',
              permissions: (adminData as any).permissions || ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
              createdAt: toDate((adminData as any).created_at),
              lastLoginAt: toDate((adminData as any).last_login_at),
              isActive: (adminData as any).is_active
            };
            setAdminUser(admin);
            setUser(null);
          } else {
            // Not an admin, check local storage for standard users
            await checkLocalSession();
          }
        } else {
          const sessionRestored = await checkLocalSession();
          if (!sessionRestored) {
            setUser(null);
            setAdminUser(null);
          }
        }
      } catch (error: any) {
        console.error('Error in auth state change:', error);
        if (typeof window !== 'undefined') {
          localStorage.setItem('raha_debug_error', `Auth state change error: ${error.message || error.toString()}`);
        }
      } finally {
        setLoading(false);
        isInitializedRef.current = true;
      }
    });

    // Setup periodic polling for user updates + device session check (every 2s)
    intervalId = setInterval(async () => {
      const storedUid = localStorage.getItem('supabase_uid');
      if (!storedUid) return;

      // DO NOT run the kick-out check if the initial session check hasn't finished.
      // We check this by seeing if the user state is set yet. If we are still loading,
      // it means checkLocalSession hasn't added us to the DB yet!
      // But wait, user is state, which is stale in this closure. 
      // We can just rely on fetching the user. BUT if they just logged in, they might not be in active_sessions yet.
      // Instead, let's look at `supabase_uid`. 
      
      const { data } = await supabase
        .from('rahapremium_users')
        .select('*')
        .eq('id', storedUid)
        .single();

      if (data) {
        // ── Device session check ────────────────────────────────────────────
        const localDeviceId = localStorage.getItem(DEVICE_SESSION_KEY);
        if (localDeviceId && isInitializedRef.current) {
          const sessions: ActiveSession[] = Array.isArray((data as any).active_sessions) ? (data as any).active_sessions : [];
          const stillActive = sessions.some(s => s.deviceId === localDeviceId);
          if (sessions.length > 0 && !stillActive) {
            // This device was removed from active_sessions → kick out
            localStorage.removeItem('supabase_uid');
            localStorage.removeItem('supabase_phone');
            setUser(null);
            setAdminUser(null);
            window.dispatchEvent(new CustomEvent(DEVICE_KICKED_EVENT));
            return;
          }
          // Throttle lastSeenAt updates to once every 5 minutes (300000ms) to reduce DB writes and race conditions
          const lastUpdateKey = `last_seen_update_${localDeviceId}`;
          const lastUpdate = localStorage.getItem(lastUpdateKey);
          const now = Date.now();
          if (!lastUpdate || now - parseInt(lastUpdate) > 300000) {
            // Fetch absolute latest to prevent race condition overwriting new logins
            const { data: latestData } = await supabase.from('rahapremium_users').select('active_sessions').eq('id', storedUid).single();
            const latestSessions: ActiveSession[] = Array.isArray((latestData as any)?.active_sessions) ? (latestData as any).active_sessions : [];
            
            const updatedSessions = latestSessions.map(s =>
              s.deviceId === localDeviceId ? { ...s, lastSeenAt: new Date().toISOString() } : s
            );
            if (JSON.stringify(updatedSessions) !== JSON.stringify(latestSessions)) {
              await supabase.from('rahapremium_users').update({ active_sessions: updatedSessions }).eq('id', storedUid);
              localStorage.setItem(lastUpdateKey, now.toString());
            }
          }
        }
        // ───────────────────────────────────────────────────────────────────

        const updatedUser: User = {
          ...(data as any),
          uid: (data as any).id,
          phoneNumber: (data as any).phone_number,
          displayName: (data as any).display_name,
          profilePhotoURL: (data as any).profile_photo_url,
          isBlocked: (data as any).is_blocked,
          isAdult: true, // Auto-verified for adult content
          createdAt: toDate((data as any).created_at),
          lastLoginAt: toDate((data as any).last_login_at),
          subscription: (data as any).subscription,
          subscriptionHistory: (data as any).subscription_history || [],
          paymentHistory: (data as any).payment_history || [],
          contentAccesses: (data as any).content_accesses || [],
          liveTvSubscription: (data as any).live_tv_subscription || null,
          liveTvSubscriptionHistory: (data as any).live_tv_subscription_history || [],
        };

        // Check subscription expiry
        if (updatedUser.subscription && updatedUser.subscription.isActive) {
          const now = new Date();
          const endDate = new Date(updatedUser.subscription.endDate);
          if (endDate <= now) {
            updatedUser.subscription.isActive = false;
            await supabase
              .from('rahapremium_users')
              .update({ subscription: updatedUser.subscription })
              .eq('id', updatedUser.uid);
          }
        }

        setUser(updatedUser);
      }
    }, 2000);

    return () => {
      authSubscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    const { data } = await supabase.from('rahapremium_users').select('id').eq('phone_number', phoneNumber).limit(1);
    return !!(data && (data as any).length > 0);
  };

  const checkUsernameExists = async (username: string): Promise<boolean> => {
    const { data } = await supabase.from('rahapremium_users').select('id').eq('username', username).limit(1);
    return !!(data && (data as any).length > 0);
  };

  const signInWithPhone = async (phoneNumber: string, username?: string, displayName?: string) => {
    try {
      const phoneExists = await checkPhoneExists(phoneNumber);

      if (!phoneExists && (!username || !displayName)) {
        throw new Error('NEW_USER_NEEDS_INFO');
      }

      if (!phoneExists) {
        if (platformControlsLoading) {
          throw new Error('REGISTRATION_UNAVAILABLE');
        }

        if (!platformToggles.registrations) {
          throw new Error('REGISTRATION_DISABLED');
        }

        if (!username || !displayName) {
          throw new Error('Username and display name are required for new users');
        }

        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
          throw new Error('USERNAME_TAKEN');
        }

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newUserPayload = {
          id: userId,
          phone_number: phoneNumber,
          display_name: displayName,
          username: username,
          is_blocked: false,
          is_adult: true, // Auto-verified for adult content
          role: 'user',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        };

        const { error } = await supabase.from('rahapremium_users').insert(newUserPayload);
        if (error) throw error;

        // Claim device session for new user
        const newDeviceId = getOrCreateDeviceId();
        await supabase
          .from('rahapremium_users')
          .update({ current_device_id: newDeviceId })
          .eq('id', userId);

        localStorage.setItem('supabase_uid', userId);
        localStorage.setItem('supabase_phone', phoneNumber);

        const newUser: User = {
          uid: userId,
          phoneNumber,
          displayName,
          username,
          profilePhotoURL: null,
          subscription: null,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isBlocked: false,
          isAdult: true, // Auto-verified for adult content
          subscriptionHistory: [],
          paymentHistory: [],
          contentAccesses: []
        };

        setUser(newUser);
        return { isNewUser: true, user: newUser };
      } else {
        const { data: userData, error } = await supabase.from('rahapremium_users').select('*').eq('phone_number', phoneNumber).single();
        if (error || !userData) {
          throw new Error('INVALID_CREDENTIALS');
        }

        if ((userData as any).is_blocked) {
          throw new Error('ACCOUNT_BLOCKED');
        }

        // Claim device session — adds to active_sessions with plan-based limit.
        // Limit considers BOTH the general and Live TV subscriptions, using the
        // admin-configured maxDevices per package.
        const deviceId = getOrCreateDeviceId();
        const deviceLabel = getDeviceLabel();
        const limit = await getUserDeviceLimit(userData);
        let sessions: ActiveSession[] = Array.isArray((userData as any).active_sessions) ? (userData as any).active_sessions : [];
        sessions = sessions.filter(s => s.deviceId !== deviceId);
        while (sessions.length >= limit) {
          sessions.sort((a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime());
          sessions.shift();
        }
        sessions.push({ deviceId, lastSeenAt: new Date().toISOString(), deviceLabel });
        await supabase
          .from('rahapremium_users')
          .update({
            last_login_at: new Date().toISOString(),
            current_device_id: deviceId,
            active_sessions: sessions,
          })
          .eq('id', (userData as any).id);

        localStorage.setItem('supabase_uid', (userData as any).id);
        localStorage.setItem('supabase_phone', phoneNumber);

        const loggedInUser: User = {
          ...(userData as any),
          uid: (userData as any).id,
          phoneNumber: (userData as any).phone_number,
          displayName: (userData as any).display_name,
          profilePhotoURL: (userData as any).profile_photo_url,
          isBlocked: (userData as any).is_blocked,
          isAdult: true, // Auto-verified for adult content
          createdAt: toDate((userData as any).created_at),
          lastLoginAt: new Date(),
          subscription: (userData as any).subscription,
          subscriptionHistory: (userData as any).subscription_history || [],
          paymentHistory: (userData as any).payment_history || [],
          contentAccesses: (userData as any).content_accesses || [],
          liveTvSubscription: (userData as any).live_tv_subscription || null,
          liveTvSubscriptionHistory: (userData as any).live_tv_subscription_history || [],
        };

        setUser(loggedInUser);
        return { isNewUser: false, user: loggedInUser };
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      const supabaseUser = data.user;

      if (!supabaseUser) throw new Error('ADMIN_NOT_FOUND');

      // Check if admin exists in admins table
      const { data: adminRecord } = await supabase.from('admins').select('*').eq('email', email).single();
      
      if (!adminRecord) {
        throw new Error('ADMIN_NOT_FOUND');
      }
      
      if (!adminRecord.is_active) {
        throw new Error('ADMIN_DEACTIVATED');
      }

      await supabase.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', adminRecord.id);

      const admin: AdminUser = {
        uid: adminRecord.id,
        email: adminRecord.email,
        displayName: adminRecord.display_name || '',
        role: adminRecord.role || 'admin',
        permissions: adminRecord.permissions || ['manage_content', 'manage_users', 'view_analytics', 'manage_subscriptions'],
        createdAt: toDate(adminRecord.created_at),
        lastLoginAt: new Date(),
        isActive: adminRecord.is_active
      };
      setAdminUser(admin);
      setUser(null);
    } catch (error: any) {
      console.error('Admin sign in error:', error);
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('ADMIN_NOT_FOUND');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('ADMIN_DEACTIVATED');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const storedUid = localStorage.getItem('supabase_uid');
      const localDeviceId = localStorage.getItem(DEVICE_SESSION_KEY);
      if (storedUid && localDeviceId) {
        // Remove only this device from active_sessions
        const { data } = await supabase.from('rahapremium_users').select('active_sessions').eq('id', storedUid).single();
        if (data) {
          const sessions: ActiveSession[] = Array.isArray(data.active_sessions) ? data.active_sessions : [];
          const updated = sessions.filter(s => s.deviceId !== localDeviceId);
          await supabase.from('rahapremium_users').update({ active_sessions: updated, current_device_id: null }).eq('id', storedUid);
        }
      }
      localStorage.removeItem('supabase_uid');
      localStorage.removeItem('supabase_phone');
      setUser(null);
      setAdminUser(null);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  /**
   * Called when user taps "Endelea Hapa" (Continue Here) in the conflict modal.
   * Generates a fresh device ID for this browser and writes it to the DB,
   * which will cause the other device's polling loop to detect a mismatch
   * and log itself out automatically within ~15 seconds.
   */
  const claimDeviceSession = async (userId: string) => {
    try {
      const newDeviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_SESSION_KEY, newDeviceId);
      await supabase
        .from('rahapremium_users')
        .update({ current_device_id: newDeviceId })
        .eq('id', userId);
    } catch (error) {
      console.error('claimDeviceSession error:', error);
    }
  };

  const refreshUserData = async () => {
    try {
      if (user) {
        const { data } = await supabase.from('rahapremium_users').select('*').eq('id', user.uid).single();
        if (data) {
          const updatedUser: User = {
            ...data,
            uid: data.id,
            phoneNumber: data.phone_number,
            displayName: data.display_name,
            profilePhotoURL: data.profile_photo_url,
            isBlocked: data.is_blocked,
            isAdult: true, // Auto-verified for adult content
            createdAt: toDate(data.created_at),
            lastLoginAt: toDate(data.last_login_at),
            subscription: data.subscription,
            subscriptionHistory: data.subscription_history || [],
            paymentHistory: data.payment_history || [],
            contentAccesses: data.content_accesses || [],
            liveTvSubscription: data.live_tv_subscription || null,
            liveTvSubscriptionHistory: data.live_tv_subscription_history || [],
          };
          setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (data.displayName !== undefined) updatePayload.display_name = data.displayName;
      if (data.username !== undefined) updatePayload.username = data.username;
      if (data.profilePhotoURL !== undefined) updatePayload.profile_photo_url = data.profilePhotoURL;
      if (data.phoneNumber !== undefined) updatePayload.phone_number = data.phoneNumber;
      
      await supabase.from('rahapremium_users').update(updatePayload).eq('id', user.uid);
      setUser({ ...user, ...data });
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    adminUser,
    loading,
    signInWithPhone,
    signInWithEmail,
    signOut,
    updateUserProfile,
    checkPhoneExists,
    checkUsernameExists,
    refreshUserData,
    claimDeviceSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
