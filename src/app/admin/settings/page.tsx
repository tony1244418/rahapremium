'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatformControls } from '@/contexts/PlatformControlContext';
import {
  Settings,
  Sparkles,
  ShieldCheck,
  Smartphone,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Headphones,
  Server,
  Activity,
  RefreshCw,
  HardDrive,
  Database,
  Globe,
  AlertCircle,
  Send,
  Zap,
  Wrench,
  CheckCircle2,
  XCircle,
  X,
  ToggleRight,
  ToggleLeft,
  Shield,
  CloudLightning,
  Rocket,
  Eye,
  EyeOff,
  Clock,
  Radio
} from 'lucide-react';
import { AdminAnalytics, getAnalytics, subscribeToAnalytics } from '@/lib/admin';
import {
  ContentSyncStatus,
  DEFAULT_CONTENT_SYNC_STATUS,
  subscribeToContentSyncStatus
} from '@/lib/content-sync';

import {
  DEFAULT_CONTROL_CENTER_SETTINGS,
  DEFAULT_ADMIN_TOGGLE_SETTINGS,
  getControlCenterSettings,
  updateControlCenterSettings,
  updateAdminToggleSetting,
  AdminToggleKey
} from '@/lib/admin-settings';

const formatTimestamp = (date: Date) =>
  date.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    day: '2-digit',
    month: 'short'
  });

const formatRelativeTime = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
};

type ToggleDefinition = {
  key: AdminToggleKey;
  label: string;
  description: string;
  icon: React.ElementType;
};

type IntegrationStatus = 'active' | 'warning' | 'offline';

type IntegrationDefinition = {
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: React.ElementType;
  actionLabel: string;
};

type HighlightMetric = {
  title: string;
  value: string;
  change: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  gradient: string;
};

type ActivityItem = {
  title: string;
  time: string;
  description: string;
  icon: React.ElementType;
  accent: string;
};

type SupportSettingsForm = {
  supportEmail: string;
  supportWhatsapp: string;
  officeHours: string;
  maintenanceHeadline: string;
  maintenanceMessage: string;
  maintenanceSupportNote: string;
  socialWhatsapp: string;
  socialInstagram: string;
  socialTwitter: string;
  socialFacebook: string;
  socialTiktok: string;
  socialTelegram: string;
  socialYoutube: string;
};

export default function AdminSettingsPage() {
  const { adminUser } = useAuth();
  const {
    toggles: globalToggles,
    loading: globalTogglesLoading,
    lastUpdated: globalTogglesUpdatedAt,
    setToggleSaving,
    isToggleSaving
  } = usePlatformControls();
  const [toggles, setToggles] = useState(DEFAULT_ADMIN_TOGGLE_SETTINGS);
  const [lastSavedAt, setLastSavedAt] = useState<string>('--');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [toggleLastSavedAt, setToggleLastSavedAt] = useState<string>('--');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [contentSyncStatus, setContentSyncStatus] = useState<ContentSyncStatus>(DEFAULT_CONTENT_SYNC_STATUS);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployState, setDeployState] = useState<'idle' | 'running' | 'done'>('idle');
  const [deployStepIndex, setDeployStepIndex] = useState(0);
  const deployTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [settingsForm, setSettingsForm] = useState<SupportSettingsForm>({
    supportEmail: DEFAULT_CONTROL_CENTER_SETTINGS.supportEmail,
    supportWhatsapp: DEFAULT_CONTROL_CENTER_SETTINGS.supportWhatsapp,
    officeHours: DEFAULT_CONTROL_CENTER_SETTINGS.officeHours,
    maintenanceHeadline: DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceHeadline,
    maintenanceMessage: DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceMessage,
    maintenanceSupportNote: DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceSupportNote,
    socialWhatsapp: DEFAULT_CONTROL_CENTER_SETTINGS.socialWhatsapp || '',
    socialInstagram: DEFAULT_CONTROL_CENTER_SETTINGS.socialInstagram || '',
    socialTwitter: DEFAULT_CONTROL_CENTER_SETTINGS.socialTwitter || '',
    socialFacebook: DEFAULT_CONTROL_CENTER_SETTINGS.socialFacebook || '',
    socialTiktok: DEFAULT_CONTROL_CENTER_SETTINGS.socialTiktok || '',
    socialTelegram: DEFAULT_CONTROL_CENTER_SETTINGS.socialTelegram || '',
    socialYoutube: DEFAULT_CONTROL_CENTER_SETTINGS.socialYoutube || '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setLoadingSettings(true);
      try {
        const data = await getControlCenterSettings();
        if (!isMounted) {
          return;
        }
        setSettingsForm({
          supportEmail: data.supportEmail,
          supportWhatsapp: data.supportWhatsapp,
          officeHours: data.officeHours,
          maintenanceHeadline: data.maintenanceHeadline,
          maintenanceMessage: data.maintenanceMessage,
          maintenanceSupportNote: data.maintenanceSupportNote,
          socialWhatsapp: data.socialWhatsapp || '',
          socialInstagram: data.socialInstagram || '',
          socialTwitter: data.socialTwitter || '',
          socialFacebook: data.socialFacebook || '',
          socialTiktok: data.socialTiktok || '',
          socialTelegram: data.socialTelegram || '',
          socialYoutube: data.socialYoutube || '',
        });
        if (data.updatedAt) {
          setLastSavedAt(formatTimestamp(data.updatedAt));
        }
      } catch (error) {
        console.error('Error loading control center settings:', error);
        if (isMounted) {
          setStatusMessage('Failed to load control center settings. Using defaults for now.');
        }
      } finally {
        if (isMounted) {
          setLoadingSettings(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setToggles(globalToggles);
  }, [globalToggles]);

  useEffect(() => {
    if (globalTogglesUpdatedAt) {
      setToggleLastSavedAt(formatTimestamp(globalTogglesUpdatedAt));
    }
  }, [globalTogglesUpdatedAt]);

  useEffect(() => {
    if (!adminUser) {
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setAnalyticsLoading(true);

    getAnalytics()
      .then((data) => {
        setAnalytics(data);
        setAnalyticsLoading(false);
      })
      .catch((error) => {
        console.error('Error loading analytics for settings page:', error);
        setAnalytics(null);
        setAnalyticsLoading(false);
      });

    unsubscribe = subscribeToAnalytics((data) => {
      setAnalytics(data);
      setAnalyticsLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [adminUser]);

  useEffect(() => {
    const unsubscribe = subscribeToContentSyncStatus((status) => {
      setContentSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  const deploymentSteps = useMemo(
    () => [
      {
        title: 'Building optimized bundles',
        description: 'Tree-shaking components, compressing assets, and preparing Next.js routes.',
        duration: 1400
      },
      {
        title: 'Validating secure routes',
        description: 'Ensuring protected admin paths and middleware rules are ready.',
        duration: 1100
      },
      {
        title: 'Publishing to the edge',
        description: 'Replicating the latest experience across global CDN nodes.',
        duration: 1500
      }
    ],
    []
  );

  const resetDeploymentSimulation = useCallback(() => {
    if (deployTimerRef.current) {
      clearTimeout(deployTimerRef.current);
      deployTimerRef.current = null;
    }
    setDeployState('idle');
    setDeployStepIndex(0);
  }, []);

  const handleOpenPreviewModal = () => setShowPreviewModal(true);
  const handleClosePreviewModal = () => setShowPreviewModal(false);

  const handleOpenDeployModal = () => {
    setShowDeployModal(true);
    resetDeploymentSimulation();
  };

  const handleCloseDeployModal = useCallback(() => {
    setShowDeployModal(false);
    resetDeploymentSimulation();
  }, [resetDeploymentSimulation]);

  const handleStartDeployment = () => {
    resetDeploymentSimulation();
    setDeployState('running');
  };

  useEffect(() => {
    if (deployState !== 'running') {
      if (deployTimerRef.current) {
        clearTimeout(deployTimerRef.current);
        deployTimerRef.current = null;
      }
      return;
    }

    const currentStep = deploymentSteps[deployStepIndex];

    if (!currentStep) {
      setDeployState('done');
      return;
    }

    deployTimerRef.current = setTimeout(() => {
      setDeployStepIndex((prev) => prev + 1);
    }, currentStep.duration);

    return () => {
      if (deployTimerRef.current) {
        clearTimeout(deployTimerRef.current);
        deployTimerRef.current = null;
      }
    };
  }, [deployState, deployStepIndex, deploymentSteps]);

  useEffect(
    () => () => {
      if (deployTimerRef.current) {
        clearTimeout(deployTimerRef.current);
      }
    },
    []
  );

  const platformControls = useMemo<ToggleDefinition[]>(
    () => [
      {
        key: 'maintenanceMode',
        label: 'Maintenance Mode',
        description: 'Temporarily pause public access with a branded message',
        icon: Wrench
      },
      {
        key: 'manualPayments',
        label: 'Manual Payment Approvals',
        description: 'Allow admins to approve M-Pesa & Airtel payments manually',
        icon: ShieldCheck
      },
      {
        key: 'registrations',
        label: 'New User Registrations',
        description: 'Enable sign-ups while watching fraudulent activity',
        icon: Sparkles
      },
      {
        key: 'feedbackEnabled',
        label: 'Feedback Section',
        description: 'Enable or disable the feedback/comment section for users',
        icon: MessageSquare
      },
      {
        key: 'feedbackIconVisible',
        label: 'Show Feedback Icon When Disabled',
        description: 'Show feedback icon in navigation even when feedback is disabled',
        icon: Eye
      },
      {
        key: 'liveTvSliderEnabled',
        label: 'Live TV Slider',
        description: 'Show a featured channel slider on the Live TV page',
        icon: Radio
      },
      {
        key: 'liveTvAllFree',
        label: 'All Channels Free',
        description: 'Make every live channel free to watch (no login or subscription needed)',
        icon: Radio
      },
      {
        key: 'liveTvFreeTrialForAll',
        label: 'Free Trial for Everyone',
        description: 'Give every viewer the Live TV free trial, ignoring the 24-hour cooldown',
        icon: Sparkles
      },
      {
        key: 'adultSectionEnabled',
        label: '+18 Adult Section',
        description: 'Show or hide the +18 section and block access when turned off',
        icon: AlertCircle
      }
    ],
    []
  );

  const automationControls = useMemo<ToggleDefinition[]>(
    () => [
      {
        key: 'weeklyDigest',
        label: 'Executive Weekly Digest',
        description: 'Email highlights to leadership every Monday 08:00',
        icon: Mail
      },
      {
        key: 'autoContentSync',
        label: 'Auto Content Sync',
        description: 'Refresh Google Drive playlists every 2 hours',
        icon: CloudLightning
      }
    ],
    []
  );

  const toggleDefinitions = useMemo(
    () => [...platformControls, ...automationControls],
    [platformControls, automationControls]
  );

  const integrations: IntegrationDefinition[] = [
    {
      name: 'ClickPesa & Pressso',
      description: 'Real-time subscription syncing',
      status: 'active',
      icon: Send,
      actionLabel: 'Re-sync now'
    },
    {
      name: 'Firebase Auth',
      description: 'Secure sign-in & tokens',
      status: 'active',
      icon: Shield,
      actionLabel: 'Review'
    },
    {
      name: 'Content Delivery',
      description: 'Google Drive & Cloudflare cache',
      status: 'warning',
      icon: Globe,
      actionLabel: 'Inspect'
    },
    {
      name: 'Analytics Stream',
      description: 'Realtime analytics pipeline',
      status: 'offline',
      icon: Database,
      actionLabel: 'Retry'
    }
  ];

  const activityLog: ActivityItem[] = [
    {
      title: 'Mobile onboarding flow published',
      time: '2 minutes ago',
      description: 'New swipeable quick-start is live for Android users',
      icon: Smartphone,
      accent: 'text-blue-400'
    },
    {
      title: 'Manual payout approved',
      time: '12 minutes ago',
      description: 'TSH 29,000 credited to account #2341 by Sophia',
      icon: Send,
      accent: 'text-green-400'
    },
    {
      title: 'Security policy updated',
      time: '1 hour ago',
      description: '2FA enforced for all elevated roles',
      icon: ShieldCheck,
      accent: 'text-primary-400'
    },
    {
      title: 'Content sync failed & retried',
      time: '3 hours ago',
      description: 'Episode metadata refreshed after retry attempt',
      icon: RefreshCw,
      accent: 'text-primary-400'
    }
  ];

  const normalizedWhatsappNumber = useMemo(() => {
    const digitsOnly = settingsForm.supportWhatsapp.replace(/\D+/g, '');
    if (!digitsOnly) {
      return '255700000000';
    }
    if (digitsOnly.startsWith('0')) {
      return `255${digitsOnly.slice(1)}`;
    }
    return digitsOnly;
  }, [settingsForm.supportWhatsapp]);

  const supportChannels = useMemo(
    () => [
      {
        icon: MessageCircle,
        title: 'WhatsApp Command Center',
        detail: settingsForm.supportWhatsapp,
        action: 'Open chat',
        href: `https://wa.me/${normalizedWhatsappNumber}`
      },
      {
        icon: Headphones,
        title: 'Priority Phone Line',
        detail: '+255 755 123 123',
        action: 'Call now',
        href: 'tel:+255755123123'
      },
      {
        icon: Mail,
        title: 'Escalation Email',
        detail: settingsForm.supportEmail,
        action: 'Compose',
        href: `mailto:${settingsForm.supportEmail}`
      }
    ],
    [normalizedWhatsappNumber, settingsForm.supportEmail, settingsForm.supportWhatsapp]
  );

  const highlightMetrics = useMemo<HighlightMetric[]>(() => {
    const totalUsers = analytics?.totalUsers ?? 0;
    const blockedUsers = analytics?.blockedUsers ?? 0;
    const activeSubs = analytics?.activeSubscriptions ?? 0;
    const healthyPercent = totalUsers > 0 ? ((totalUsers - blockedUsers) / totalUsers) * 100 : totalUsers === 0 ? 100 : 0;
    const platformValue = analyticsLoading ? '—' : `${healthyPercent.toFixed(2)}%`;
    const platformChange = analyticsLoading
      ? 'Loading…'
      : blockedUsers > 0
      ? `${blockedUsers.toLocaleString()} blocked`
      : 'Operational';
    const mobileUsagePercent = totalUsers > 0 ? (activeSubs / totalUsers) * 100 : 0;
    const mobileValue = analyticsLoading ? '—' : `${mobileUsagePercent.toFixed(1)}%`;
    const mobileChange = analyticsLoading
      ? 'Loading…'
      : activeSubs > 0
      ? `${activeSubs.toLocaleString()} active subs`
      : 'No active subs';
    const automationSummary = contentSyncStatus?.lastRunSummary ?? null;
    const automationValue =
      contentSyncStatus.status === 'running'
        ? 'Running…'
        : automationSummary
        ? automationSummary.totalUpdated.toLocaleString()
        : '0';

    const automationChange = (() => {
      if (contentSyncStatus.status === 'running') {
        return 'Running now';
      }
      if (contentSyncStatus.lastRunAt) {
        return `Last run ${formatRelativeTime(contentSyncStatus.lastRunAt)}`;
      }
      return 'Not run yet';
    })();

    return [
      {
        title: 'Platform Health',
        value: platformValue,
        change: platformChange,
        description: analyticsLoading
          ? 'Gathering health insights…'
          : `${(totalUsers - blockedUsers).toLocaleString()} active · ${blockedUsers.toLocaleString()} blocked`,
        icon: Activity,
        accent: healthyPercent >= 97 ? 'text-green-400' : healthyPercent >= 90 ? 'text-yellow-400' : 'text-red-400',
        gradient:
          healthyPercent >= 97
            ? 'from-green-500/20 via-emerald-500/10 to-transparent'
            : healthyPercent >= 90
            ? 'from-yellow-500/20 via-primary-500/10 to-transparent'
            : 'from-red-500/20 via-rose-500/10 to-transparent'
      },
      {
        title: 'Mobile Usage',
        value: mobileValue,
        change: mobileChange,
        description: analyticsLoading
          ? 'Evaluating subscription activity…'
          : `${totalUsers.toLocaleString()} total users · ${(totalUsers - activeSubs).toLocaleString()} inactive`,
        icon: Smartphone,
        accent: 'text-blue-400',
        gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent'
      },
      {
        title: 'Automation Runs',
        value: automationValue,
        change: automationChange,
        description:
          automationSummary && automationSummary.totalChecked > 0
            ? `${automationSummary.totalChecked.toLocaleString()} assets scanned`
            : 'Awaiting first automation run',
        icon: RefreshCw,
        accent: 'text-primary-400',
        gradient: 'from-primary-500/20 via-primary-500/10 to-transparent'
      }
    ];
  }, [analytics, analyticsLoading, contentSyncStatus]);

  const deploymentProgress = useMemo(() => {
    if (deployState === 'done') return 100;
    if (!deploymentSteps.length) return 0;
    return Math.min((deployStepIndex / deploymentSteps.length) * 100, 99);
  }, [deployState, deployStepIndex, deploymentSteps]);

  const activeDeploymentStep =
    deployState === 'running'
      ? deploymentSteps[Math.min(deployStepIndex, deploymentSteps.length - 1)]
      : null;

  const handleToggle = async (key: AdminToggleKey) => {
    if (globalTogglesLoading || isToggleSaving(key)) {
      return;
    }

    const currentValue = toggles[key];
    const nextValue = !currentValue;
    const definition = toggleDefinitions.find((item) => item.key === key);

    setToggles((prev) => ({ ...prev, [key]: nextValue }));
    setToggleSaving(key);

    try {
      const result = await updateAdminToggleSetting(key, nextValue, adminUser?.uid ?? null);
      setToggleLastSavedAt(formatTimestamp(result.updatedAt));
      const label = definition?.label ?? 'Setting';
      setStatusMessage(`${label} ${nextValue ? 'enabled' : 'disabled'} and synced`);
    } catch (error) {
      console.error(`Error updating toggle "${key}":`, error);
      setToggles((prev) => ({ ...prev, [key]: currentValue }));
      setStatusMessage('Failed to update setting. Please try again.');
    } finally {
      setToggleSaving(null);
    }
  };

  const handleFormChange = (field: keyof SupportSettingsForm, value: string) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    try {
      await updateControlCenterSettings(settingsForm);
      const now = new Date();
      setLastSavedAt(formatTimestamp(now));
      setStatusMessage('Control center settings saved successfully');
    } catch (error) {
      console.error('Error saving control center settings:', error);
      setStatusMessage('Failed to save control center settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleIntegrationAction = (integration: IntegrationDefinition) => {
    const actionMessage =
      integration.status === 'active'
        ? `${integration.name} looks healthy. ${integration.actionLabel} triggered.`
        : `Investigating ${integration.name}. ${integration.actionLabel} queued.`;
    setStatusMessage(actionMessage);
  };

  const renderStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-300">
            <CheckCircle2 size={12} />
            <span>Operational</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-300">
            <AlertCircle size={12} />
            <span>Needs attention</span>
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-300">
            <XCircle size={12} />
            <span>Offline</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="container-mobile space-y-8 pb-12">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl border border-dark-700/40 bg-gradient-to-br from-blue-500/10 via-primary-500/5 to-transparent p-6 sm:p-8 glass-effect"
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-10 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-accent-500/10 blur-3xl" />
            </div>
            <div className="relative space-y-6">
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-2 rounded-full bg-dark-900/60 px-3 py-1 text-xs uppercase tracking-wide text-dark-400">
                    <Sparkles size={14} className="text-primary-400" />
                    <span>Mobile-first control center</span>
                  </div>
                  <h1 className="text-responsive-2xl font-bold text-gradient">
                    System Settings & Experience Tuning
                  </h1>
                  <p className="max-w-2xl text-sm text-dark-300 sm:text-base">
                    Fine-tune RahaPremium without code. Every toggle is crafted for blazing-fast mobile experiences,
                    while keeping the platform resilient for millions of sessions.
                  </p>
                </div>
                <div className="flex flex-col items-start space-y-3 sm:items-end">
                  <div className="rounded-xl bg-dark-900/70 px-4 py-3 text-sm text-dark-300">
                    <p className="font-semibold text-dark-100">Signed in as</p>
                    <p>{adminUser?.displayName ?? 'Administrator'}</p>
                    <p className="text-xs text-dark-500">Last saved: {lastSavedAt}</p>
                  </div>
                  <div className="flex w-full flex-wrap gap-3 sm:justify-end">
                    <button
                      onClick={handleOpenPreviewModal}
                      className="button-secondary flex-1 sm:flex-none sm:px-6"
                    >
                      Preview mobile flow
                    </button>
                    <button
                      onClick={handleOpenDeployModal}
                      className="button-primary flex-1 sm:flex-none sm:px-6"
                    >
                      Deploy updates
                    </button>
                  </div>
                </div>
              </div>
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center space-x-3 rounded-2xl border border-primary-500/40 bg-primary-500/10 px-4 py-3 text-sm text-primary-100"
                >
                  <Zap size={18} className="text-primary-300" />
                  <p>{statusMessage}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {highlightMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`relative overflow-hidden rounded-2xl border border-dark-700/30 bg-dark-900/70 p-5 glass-effect`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient}`} />
                  <div className="relative space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-dark-400">
                        <Icon size={18} className={metric.accent} />
                        <span>{metric.title}</span>
                      </div>
                      <span className={`text-xs font-semibold ${metric.accent}`}>{metric.change}</span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-dark-50">{metric.value}</p>
                      <p className="text-sm text-dark-400">{metric.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {toggles.maintenanceMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-200 glass-effect"
            >
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={24} className="mt-0.5 text-yellow-300" />
                  <div>
                    <p className="font-semibold text-yellow-200">Maintenance mode is active</p>
                    <p className="text-yellow-100/90">
                      Users see a luxury intermission screen with a countdown timer. Switch off when ready to go live.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('maintenanceMode')}
                  type="button"
                  disabled={globalTogglesLoading || isToggleSaving('maintenanceMode')}
                  className="button-secondary border-yellow-500/50 bg-dark-900/60 text-yellow-100 hover:text-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Resume live experience
                </button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-responsive-xl font-semibold text-dark-50">Platform Controls</h2>
                    <p className="text-sm text-dark-400">Craft the experience your audience feels in real time.</p>
                    <p className="mt-2 text-xs text-dark-500">
                      {globalTogglesLoading ? 'Syncing saved states…' : `Last synced ${toggleLastSavedAt}`}
                    </p>
                  </div>
                  <Settings className="hidden text-primary-400 sm:block" size={26} />
                </div>
                {globalTogglesLoading && (
                  <div className="mb-4 rounded-2xl border border-dark-700/60 bg-dark-900/80 px-4 py-3 text-sm text-dark-300">
                    Syncing saved platform settings...
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {platformControls.map((control) => {
                    // Hide feedbackIconVisible toggle when feedbackEnabled is true
                    if (control.key === 'feedbackIconVisible' && toggles.feedbackEnabled) {
                      return null;
                    }
                    
                    const Icon = control.icon;
                    const isActive = toggles[control.key];
                    const isDisabled = globalTogglesLoading || isToggleSaving(control.key);
                    return (
                      <button
                        key={control.key}
                        onClick={() => handleToggle(control.key)}
                        type="button"
                        disabled={isDisabled}
                        aria-pressed={isActive}
                        className={`rounded-2xl border p-4 text-left transition-all duration-200 focus-ring ${
                          isActive
                            ? 'border-primary-500/50 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                            : 'border-dark-700/60 bg-dark-900/70 hover:border-primary-500/40 hover:bg-dark-900'
                        } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                isActive ? 'bg-primary-500/20 text-primary-200' : 'bg-dark-800 text-dark-300'
                              }`}
                            >
                              <Icon size={20} />
                            </span>
                            <div>
                              <p className="font-semibold text-dark-100">{control.label}</p>
                              <p className="text-xs text-dark-400">{control.description}</p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              isActive ? 'bg-primary-500/20 text-primary-100' : 'bg-dark-800 text-dark-400'
                            }`}
                          >
                            {isActive ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-end">
                          {isToggleSaving(control.key) ? (
                            <div className="h-6 w-6 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
                          ) : isActive ? (
                            <ToggleRight size={28} className="text-primary-400" />
                          ) : (
                            <ToggleLeft size={28} className="text-dark-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-responsive-xl font-semibold text-dark-50">Experience Automation</h2>
                    <p className="text-sm text-dark-400">
                      Automate the heavy lifting so the team can focus on storytelling.
                    </p>
                    <p className="mt-2 text-xs text-dark-500">
                      {globalTogglesLoading ? 'Syncing saved states…' : `Last synced ${toggleLastSavedAt}`}
                    </p>
                  </div>
                  <Zap className="hidden text-accent-400 sm:block" size={26} />
                </div>
                {globalTogglesLoading && (
                  <div className="mb-4 rounded-2xl border border-dark-700/60 bg-dark-900/80 px-4 py-3 text-sm text-dark-300">
                    Fetching automation toggles...
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {automationControls.map((control) => {
                    const Icon = control.icon;
                    const isActive = toggles[control.key];
                    const isDisabled = globalTogglesLoading || isToggleSaving(control.key);
                    return (
                      <button
                        key={control.key}
                        onClick={() => handleToggle(control.key)}
                        type="button"
                        disabled={isDisabled}
                        aria-pressed={isActive}
                        className={`rounded-2xl border p-4 text-left transition-all duration-200 focus-ring ${
                          isActive
                            ? 'border-accent-500/40 bg-accent-500/10 shadow-lg shadow-accent-500/10'
                            : 'border-dark-700/60 bg-dark-900/70 hover:border-accent-500/40 hover:bg-dark-900'
                        } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                isActive ? 'bg-accent-500/20 text-accent-200' : 'bg-dark-800 text-dark-300'
                              }`}
                            >
                              <Icon size={20} />
                            </span>
                            <div>
                              <p className="font-semibold text-dark-100">{control.label}</p>
                              <p className="text-xs text-dark-400">{control.description}</p>
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              isActive ? 'bg-accent-500/20 text-accent-100' : 'bg-dark-800 text-dark-400'
                            }`}
                          >
                            {isActive ? 'On' : 'Off'}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-end">
                          {isToggleSaving(control.key) ? (
                            <div className="h-6 w-6 rounded-full border-2 border-accent-300 border-t-transparent animate-spin" />
                          ) : isActive ? (
                            <ToggleRight size={28} className="text-accent-300" />
                          ) : (
                            <ToggleLeft size={28} className="text-dark-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-responsive-xl font-semibold text-dark-50">Command Center</h2>
                    <p className="text-sm text-dark-400">
                      Keep mission-critical information aligned across the team.
                    </p>
                  </div>
                  <LifeBuoy className="hidden text-green-300 sm:block" size={26} />
                </div>
                <form onSubmit={handleSaveSettings} className="space-y-4" aria-busy={savingSettings}>
                  {loadingSettings && (
                    <div className="rounded-2xl border border-dark-700/40 bg-dark-900/80 px-4 py-3 text-sm text-dark-300">
                      Syncing latest saved settings...
                    </div>
                  )}
                  <div>
                    <label className="form-label">Support Email</label>
                    <input
                      type="email"
                      value={settingsForm.supportEmail}
                      onChange={(event) => handleFormChange('supportEmail', event.target.value)}
                      className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={loadingSettings || savingSettings}
                    />
                  </div>
                  <div>
                    <label className="form-label">WhatsApp Hotline</label>
                    <input
                      type="tel"
                      value={settingsForm.supportWhatsapp}
                      onChange={(event) => handleFormChange('supportWhatsapp', event.target.value)}
                      className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={loadingSettings || savingSettings}
                    />
                  </div>
                  <div>
                    <label className="form-label">Support Availability</label>
                    <input
                      type="text"
                      value={settingsForm.officeHours}
                      onChange={(event) => handleFormChange('officeHours', event.target.value)}
                      className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={loadingSettings || savingSettings}
                    />
                  </div>
                  <div>
                    <label className="form-label">Maintenance Headline</label>
                    <input
                      type="text"
                      value={settingsForm.maintenanceHeadline}
                      onChange={(event) => handleFormChange('maintenanceHeadline', event.target.value)}
                      className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                      maxLength={120}
                      disabled={loadingSettings || savingSettings}
                    />
                  </div>
                  <div>
                    <label className="form-label">Maintenance Message</label>
                    <textarea
                      value={settingsForm.maintenanceMessage}
                      onChange={(event) => handleFormChange('maintenanceMessage', event.target.value)}
                      className="form-input disabled:opacity-60 disabled:cursor-not-allowed min-h-[120px]"
                      maxLength={600}
                      disabled={loadingSettings || savingSettings}
                    />
                    <p className="mt-1 text-xs text-dark-500">
                      This message appears on the maintenance screen immediately after you save changes.
                    </p>
                  </div>
                  <div>
                    <label className="form-label">Maintenance Support Note</label>
                    <textarea
                      value={settingsForm.maintenanceSupportNote}
                      onChange={(event) => handleFormChange('maintenanceSupportNote', event.target.value)}
                      className="form-input disabled:opacity-60 disabled:cursor-not-allowed min-h-[80px]"
                      maxLength={200}
                      disabled={loadingSettings || savingSettings}
                    />
                    <p className="mt-1 text-xs text-dark-500">
                      Short call-to-action or guidance shown beneath the maintenance message.
                    </p>
                  </div>
                  
                  <div className="pt-4 mt-4 border-t border-dark-700/60">
                    <h3 className="text-lg font-semibold text-dark-100 mb-4">Follow Us (Social Media Links)</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="form-label">WhatsApp Channel URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialWhatsapp}
                          onChange={(event) => handleFormChange('socialWhatsapp', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://whatsapp.com/channel/..."
                        />
                      </div>
                      <div>
                        <label className="form-label">Instagram URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialInstagram}
                          onChange={(event) => handleFormChange('socialInstagram', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                      <div>
                        <label className="form-label">Twitter/X URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialTwitter}
                          onChange={(event) => handleFormChange('socialTwitter', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://x.com/..."
                        />
                      </div>
                      <div>
                        <label className="form-label">Facebook URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialFacebook}
                          onChange={(event) => handleFormChange('socialFacebook', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                      <div>
                        <label className="form-label">TikTok URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialTiktok}
                          onChange={(event) => handleFormChange('socialTiktok', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://tiktok.com/@..."
                        />
                      </div>
                      <div>
                        <label className="form-label">Telegram URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialTelegram}
                          onChange={(event) => handleFormChange('socialTelegram', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://t.me/..."
                        />
                      </div>
                      <div>
                        <label className="form-label">YouTube URL</label>
                        <input
                          type="url"
                          value={settingsForm.socialYoutube}
                          onChange={(event) => handleFormChange('socialYoutube', event.target.value)}
                          className="form-input disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={loadingSettings || savingSettings}
                          placeholder="https://youtube.com/..."
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100">
                      <span className="font-semibold text-green-200">Live concierge ready</span>
                      <p className="text-xs text-green-100/80">Customer delight team is on standby.</p>
                    </div>
                    <button
                      type="submit"
                      className="button-primary w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={savingSettings || loadingSettings}
                    >
                      {savingSettings ? 'Saving...' : 'Save control center'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-5">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-200 flex items-center justify-center">
                      <CloudLightning size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-dark-100">Maintenance Preview</p>
                      <p className="text-xs text-dark-400">
                        Users will instantly see this message when maintenance mode is on.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-dark-50">
                      {settingsForm.maintenanceHeadline || DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceHeadline}
                    </h3>
                    <p className="text-sm text-dark-200 whitespace-pre-line">
                      {settingsForm.maintenanceMessage || DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceMessage}
                    </p>
                    <p className="text-xs text-dark-400 whitespace-pre-line">
                      {settingsForm.maintenanceSupportNote || DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceSupportNote}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-responsive-xl font-semibold text-dark-50">Support Shortcuts</h2>
                    <p className="text-sm text-dark-400">
                      One-tap access for mobile agents to resolve escalations quickly.
                    </p>
                  </div>
                  <Headphones className="hidden text-primary-300 sm:block" size={26} />
                </div>
                <div className="space-y-3">
                  {supportChannels.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <a
                        key={channel.title}
                        href={channel.href}
                        className="flex items-center justify-between rounded-2xl border border-dark-700/50 bg-dark-900/70 p-4 transition-all duration-200 hover:border-primary-500/40 hover:bg-dark-900"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-200">
                            <Icon size={20} />
                          </span>
                          <div>
                            <p className="font-semibold text-dark-100">{channel.title}</p>
                            <p className="text-sm text-dark-400">{channel.detail}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary-300">
                          {channel.action}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect"
          >
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-responsive-xl font-semibold text-dark-50">Integrations & Infrastructure</h2>
                <p className="text-sm text-dark-400">
                  Monitor every link in the chain, from payments to content delivery.
                </p>
              </div>
              <div className="flex items-center space-x-2 rounded-full border border-dark-700/60 bg-dark-900 px-4 py-2 text-xs text-dark-400">
                <Server size={16} className="text-primary-400" />
                <span>Edge network optimized for mobile streams</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.name}
                    className={`rounded-2xl border p-5 transition-all duration-200 glass-effect ${
                      integration.status === 'offline'
                        ? 'border-red-500/40 bg-red-500/10'
                        : integration.status === 'warning'
                        ? 'border-yellow-500/40 bg-yellow-500/10'
                        : 'border-dark-700/40 bg-dark-900/70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span
                          className={`mt-1 flex h-10 w-10 items-center justify-center rounded-xl ${
                            integration.status === 'offline'
                              ? 'bg-red-500/20 text-red-200'
                              : integration.status === 'warning'
                              ? 'bg-yellow-500/20 text-yellow-200'
                              : 'bg-primary-500/10 text-primary-200'
                          }`}
                        >
                          <Icon size={20} />
                        </span>
                        <div>
                          <p className="font-semibold text-dark-100">{integration.name}</p>
                          <p className="text-sm text-dark-400">{integration.description}</p>
                        </div>
                      </div>
                      {renderStatusBadge(integration.status)}
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center space-x-2 text-xs text-dark-500">
                        <Activity size={14} />
                        <span>
                          {integration.status === 'active'
                            ? 'All signals nominal'
                            : integration.status === 'warning'
                            ? 'Some latency detected'
                            : 'Awaiting reconnection'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleIntegrationAction(integration)}
                        className="button-secondary w-full sm:w-auto"
                        type="button"
                      >
                        {integration.actionLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect lg:col-span-2"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-responsive-xl font-semibold text-dark-50">Live Activity Timeline</h2>
                  <p className="text-sm text-dark-400">
                    Track critical admin moves and automated workflows in one stream.
                  </p>
                </div>
                <RefreshCw className="hidden text-primary-300 sm:block" size={24} />
              </div>
              <div className="space-y-4">
                {activityLog.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="relative rounded-2xl border border-dark-700/50 bg-dark-900/70 p-4 transition-all duration-200 hover:border-primary-500/40 hover:bg-dark-900"
                    >
                      <div className="absolute left-4 top-4">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-dark-800 ${item.accent}`}>
                          <Icon size={18} />
                        </span>
                      </div>
                      <div className="pl-16">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-semibold text-dark-100">{item.title}</p>
                          <span className="text-xs text-dark-500">{item.time}</span>
                        </div>
                        <p className="mt-2 text-sm text-dark-400">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-dark-50">Storage Snapshot</h2>
                    <p className="text-xs text-dark-400">Fast loads, low buffering on mobile.</p>
                  </div>
                  <HardDrive className="text-primary-300" size={22} />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm text-dark-400">
                      <span>Content CDN</span>
                      <span>72% used</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-dark-800">
                      <div className="h-full w-[72%] rounded-full bg-primary-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm text-dark-400">
                      <span>Database</span>
                      <span>54% used</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-dark-800">
                      <div className="h-full w-[54%] rounded-full bg-accent-500" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm text-dark-400">
                      <span>Preview Assets</span>
                      <span>39% used</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-dark-800">
                      <div className="h-full w-[39%] rounded-full bg-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-dark-700/40 bg-dark-900/70 p-6 glass-effect">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-dark-50">Rapid Actions</h2>
                    <p className="text-xs text-dark-400">One-tap fixes crafted for mobile workflows.</p>
                  </div>
                  <Shield className="text-green-300" size={22} />
                </div>
                <div className="space-y-3">
                  <button className="w-full rounded-2xl border border-primary-500/40 bg-primary-500/10 py-3 text-sm font-semibold text-primary-100 transition-all duration-200 hover:bg-primary-500/20">
                    Trigger instant cache refresh
                  </button>
                  <button className="w-full rounded-2xl border border-accent-500/40 bg-accent-500/10 py-3 text-sm font-semibold text-accent-100 transition-all duration-200 hover:bg-accent-500/20">
                    Launch VIP onboarding tour
                  </button>
                  <button className="w-full rounded-2xl border border-green-500/40 bg-green-500/10 py-3 text-sm font-semibold text-green-100 transition-all duration-200 hover:bg-green-500/20">
                    Start emergency broadcast SMS
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        <AnimatePresence>
          {showPreviewModal && (
            <motion.div
              key="preview-modal"
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePreviewModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="modal-content max-w-3xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-dark-50">Preview Mobile Flow</h2>
                      <p className="text-sm text-dark-400">
                        Experience RahaPremium the way your mobile audience does.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClosePreviewModal}
                    className="text-dark-400 hover:text-dark-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="relative">
                    <div className="relative mx-auto h-[420px] w-[220px] rounded-[2.5rem] border border-primary-500/30 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 shadow-[0_20px_60px_-10px_rgba(59,130,246,0.35)] p-5">
                      <div className="mx-auto mb-4 h-6 w-16 rounded-full bg-dark-700" />
                      <div className="space-y-3 text-left">
                        <motion.div
                          className="rounded-2xl border border-primary-500/30 bg-primary-500/10 px-4 py-3"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                        >
                          <p className="text-[11px] uppercase tracking-wide text-primary-300">Welcome back</p>
                          <p className="text-sm font-semibold text-dark-50">RahaPremium Mobile</p>
                          <p className="mt-1 text-xs text-dark-300">
                            Continue watching right where you left off.
                          </p>
                        </motion.div>
                        <div className="rounded-2xl border border-dark-600 bg-dark-800/70 px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-dark-400">
                            <span>Featured Story</span>
                            <span className="text-primary-300">Today</span>
                          </div>
                          <p className="text-sm font-semibold text-dark-50">Royal Destiny S04</p>
                          <p className="text-xs text-dark-400 line-clamp-2">
                            Episodes based on your viewing pattern are queued for instant access.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-dark-600 bg-dark-800/70 px-4 py-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                            <p className="text-xs text-green-300">Live servers operational</p>
                          </div>
                          <p className="text-xs text-dark-400">
                            Payment webhooks, Firebase realtime, and CDN cache are all green.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 h-10 w-24 -translate-x-1/2 rounded-full bg-black/30 blur-xl" />
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-primary-500/30 bg-primary-500/10 p-4">
                      <div className="flex items-center gap-2 text-primary-200">
                        <Sparkles size={16} />
                        <p className="text-xs font-semibold uppercase tracking-wide">What this preview shows</p>
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-dark-200">
                        <li>• Mobile navigation, hero spotlight, and quick actions.</li>
                        <li>• Live authentication guard, maintenance banners, and concierge CTA.</li>
                        <li>• Real-time content stats mirrored from production data.</li>
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-dark-700/50 bg-dark-900/70 p-4 space-y-3 text-sm text-dark-300">
                      <p className="font-semibold text-dark-100">Quick tips</p>
                      <ul className="space-y-2">
                        <li>• Use Chrome device toolbar to switch between iOS and Android breakpoints.</li>
                        <li>• Test swipe gestures in the timeline and subscription cards.</li>
                        <li>• Validate multilingual copy by toggling languages in the settings panel.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    onClick={handleClosePreviewModal}
                    className="button-secondary w-full sm:w-auto"
                  >
                    Close
                  </button>
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-primary w-full sm:w-auto"
                  >
                    Open live site
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showDeployModal && (
            <motion.div
              key="deploy-modal"
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDeployModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="modal-content max-w-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent-500/20 text-accent-200 flex items-center justify-center">
                      <Rocket size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-dark-50">Deployment Control Center</h2>
                      <p className="text-sm text-dark-400">
                        Simulate a production release straight from the dashboard.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseDeployModal}
                    className="text-dark-400 hover:text-dark-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-dark-700/60 bg-dark-900/80 p-4 space-y-3">
                    {deploymentSteps.map((step, index) => {
                      const isCompleted = deployState === 'done' || index < deployStepIndex;
                      const isActive = deployState === 'running' && index === deployStepIndex;
                      return (
                        <div
                          key={step.title}
                          className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                            isCompleted
                              ? 'border-green-500/30 bg-green-500/10'
                              : isActive
                              ? 'border-primary-500/40 bg-primary-500/10'
                              : 'border-dark-700/60 bg-dark-900/60'
                          }`}
                        >
                          <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-dark-800">
                            {isCompleted ? (
                              <CheckCircle2 size={16} className="text-green-300" />
                            ) : isActive ? (
                              <RefreshCw size={16} className="text-primary-300 animate-spin" />
                            ) : (
                              <Clock size={16} className="text-dark-400" />
                            )}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-dark-100">{step.title}</p>
                            <p className="text-xs text-dark-400">{step.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-dark-400">
                      <span>
                        {deployState === 'running'
                          ? 'Deployment in progress'
                          : deployState === 'done'
                          ? 'Deployment completed'
                          : 'Ready to deploy'}
                      </span>
                      <span>{Math.round(deploymentProgress)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-dark-800">
                      <motion.div
                        className="h-full rounded-full bg-primary-500"
                        animate={{ width: `${deploymentProgress}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                    {activeDeploymentStep && (
                      <p className="text-xs text-dark-400">
                        Currently: {activeDeploymentStep.description}
                      </p>
                    )}
                    {deployState === 'done' && (
                      <div className="flex items-start gap-3 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3">
                        <CheckCircle2 size={20} className="text-green-300 mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-green-200">Deployment complete</p>
                          <p className="text-xs text-green-200/80">
                            Build artifacts, health checks, and CDN refresh all passed with flying colours.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    onClick={handleCloseDeployModal}
                    className="button-secondary w-full sm:w-auto"
                  >
                    Close
                  </button>
                  {deployState === 'idle' && (
                    <button
                      onClick={handleStartDeployment}
                      className="button-primary w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      <Rocket size={16} />
                      <span>Start deployment</span>
                    </button>
                  )}
                  {deployState === 'running' && (
                    <button
                      disabled
                      className="button-secondary w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Deploying…</span>
                    </button>
                  )}
                  {deployState === 'done' && (
                    <button
                      onClick={handleCloseDeployModal}
                      className="button-primary w-full sm:w-auto"
                    >
                      Celebrate
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );
}


