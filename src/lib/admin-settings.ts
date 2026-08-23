import { supabase } from './supabase';

export interface ControlCenterSettings {
  supportEmail: string;
  supportWhatsapp: string;
  officeHours: string;
  maintenanceHeadline: string;
  maintenanceMessage: string;
  maintenanceSupportNote: string;
  socialWhatsapp?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialFacebook?: string;
  socialTiktok?: string;
  socialTelegram?: string;
  socialYoutube?: string;
  updatedAt?: Date | null;
}

export const DEFAULT_CONTROL_CENTER_SETTINGS: ControlCenterSettings = {
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '',
  officeHours: '08:00 - 22:00 EAT',
  maintenanceHeadline: 'We’ll be right back!',
  maintenanceMessage:
    'Our engineers are performing scheduled upgrades to keep RahaPremium smooth and blazing fast. Please check back in a short while.',
  maintenanceSupportNote:
    'Stay tuned! Refresh the page in a few minutes or reach out to our concierge team if you need immediate help.',
  socialWhatsapp: '',
  socialInstagram: '',
  socialTwitter: '',
  socialFacebook: '',
  socialTiktok: '',
  socialTelegram: '',
  socialYoutube: '',
  updatedAt: null
};

export const getControlCenterSettings = async (): Promise<ControlCenterSettings> => {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('data, updated_at')
      .eq('id', 'controlCenter')
      .single();

    if (!data || !data.data) {
      return DEFAULT_CONTROL_CENTER_SETTINGS;
    }

    const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    return {
      supportEmail: parsedData.supportEmail ?? DEFAULT_CONTROL_CENTER_SETTINGS.supportEmail,
      supportWhatsapp: parsedData.supportWhatsapp ?? DEFAULT_CONTROL_CENTER_SETTINGS.supportWhatsapp,
      officeHours: parsedData.officeHours ?? DEFAULT_CONTROL_CENTER_SETTINGS.officeHours,
      maintenanceHeadline: parsedData.maintenanceHeadline ?? DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceHeadline,
      maintenanceMessage: parsedData.maintenanceMessage ?? DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceMessage,
      maintenanceSupportNote: parsedData.maintenanceSupportNote ?? DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceSupportNote,
      socialWhatsapp: parsedData.socialWhatsapp ?? '',
      socialInstagram: parsedData.socialInstagram ?? '',
      socialTwitter: parsedData.socialTwitter ?? '',
      socialFacebook: parsedData.socialFacebook ?? '',
      socialTiktok: parsedData.socialTiktok ?? '',
      socialTelegram: parsedData.socialTelegram ?? '',
      socialYoutube: parsedData.socialYoutube ?? '',
      updatedAt: data.updated_at ? new Date(data.updated_at) : DEFAULT_CONTROL_CENTER_SETTINGS.updatedAt
    };
  } catch (error) {
    console.error('Failed to fetch control center settings:', error);
    return DEFAULT_CONTROL_CENTER_SETTINGS;
  }
};

export const updateControlCenterSettings = async (settings: ControlCenterSettings): Promise<void> => {
  try {
    const { error } = await supabase.from('admin_settings').upsert({
      id: 'controlCenter',
      data: {
        supportEmail: settings.supportEmail,
        supportWhatsapp: settings.supportWhatsapp,
        officeHours: settings.officeHours,
        maintenanceHeadline: settings.maintenanceHeadline,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceSupportNote: settings.maintenanceSupportNote,
        socialWhatsapp: settings.socialWhatsapp,
        socialInstagram: settings.socialInstagram,
        socialTwitter: settings.socialTwitter,
        socialFacebook: settings.socialFacebook,
        socialTiktok: settings.socialTiktok,
        socialTelegram: settings.socialTelegram,
        socialYoutube: settings.socialYoutube,
      },
      updated_at: new Date().toISOString()
    });
    
    if (error) throw error;
  } catch (error) {
    console.error('Failed to update control center settings:', error);
    throw error;
  }
};

export const subscribeToControlCenterSettings = (
  callback: (settings: ControlCenterSettings) => void,
  onError?: (error: Error) => void
) => {
  const channel = supabase
    .channel('control-center-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_settings', filter: 'id=eq.controlCenter' }, (payload) => {
      const data = payload.new as any;
      if (!data || !data.data) {
        callback(DEFAULT_CONTROL_CENTER_SETTINGS);
        return;
      }
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      callback({
        supportEmail: parsedData.supportEmail ?? DEFAULT_CONTROL_CENTER_SETTINGS.supportEmail,
        supportWhatsapp: parsedData.supportWhatsapp ?? DEFAULT_CONTROL_CENTER_SETTINGS.supportWhatsapp,
        officeHours: parsedData.officeHours ?? DEFAULT_CONTROL_CENTER_SETTINGS.officeHours,
        maintenanceHeadline: parsedData.maintenanceHeadline ?? DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceHeadline,
        maintenanceMessage: parsedData.maintenanceMessage ?? DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceMessage,
        maintenanceSupportNote: parsedData.maintenanceSupportNote ?? DEFAULT_CONTROL_CENTER_SETTINGS.maintenanceSupportNote,
        socialWhatsapp: parsedData.socialWhatsapp ?? '',
        socialInstagram: parsedData.socialInstagram ?? '',
        socialTwitter: parsedData.socialTwitter ?? '',
        socialFacebook: parsedData.socialFacebook ?? '',
        socialTiktok: parsedData.socialTiktok ?? '',
        socialTelegram: parsedData.socialTelegram ?? '',
        socialYoutube: parsedData.socialYoutube ?? '',
        updatedAt: data.updated_at ? new Date(data.updated_at) : DEFAULT_CONTROL_CENTER_SETTINGS.updatedAt
      });
    })
    .subscribe((status, err) => {
      if (err && onError) {
        onError(err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

export type AdminToggleKey =
  | 'maintenanceMode'
  | 'manualPayments'
  | 'registrations'
  | 'weeklyDigest'
  | 'autoContentSync'
  | 'feedbackEnabled'
  | 'feedbackIconVisible'
  | 'liveTvEnabled'
  | 'liveTvSliderEnabled'
  | 'liveTvAllFree'
  | 'liveTvFreeTrialForAll'
  | 'adultSectionEnabled'
  | 'allContentFree';

export type AdminToggleSettings = Record<AdminToggleKey, boolean>;

export interface AdminToggleSettingsWithMetadata {
  values: AdminToggleSettings;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export interface UpdateToggleResult {
  updatedAt: Date;
}

export const DEFAULT_ADMIN_TOGGLE_SETTINGS: AdminToggleSettings = {
  maintenanceMode: false,
  manualPayments: true,
  registrations: true,
  weeklyDigest: true,
  autoContentSync: false,
  feedbackEnabled: true,
  feedbackIconVisible: true,
  // Live TV section visibility — ON by default.
  liveTvEnabled: true,
  liveTvSliderEnabled: false,
  // Live TV global access switches — OFF by default (no behaviour change).
  liveTvAllFree: false,
  liveTvFreeTrialForAll: false,
  // +18 (adult) section — ON by default (no behaviour change).
  adultSectionEnabled: true,
  // Make all standard (movie/series) content free — OFF by default.
  allContentFree: false
};

export const getAdminToggleSettings = async (): Promise<AdminToggleSettingsWithMetadata> => {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('data, updated_at, updated_by')
      .eq('id', 'toggleControls')
      .single();

    if (!data || !data.data) {
      return {
        values: DEFAULT_ADMIN_TOGGLE_SETTINGS,
        updatedAt: null,
        updatedBy: null
      };
    }

    const toggleData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
    const values = { ...DEFAULT_ADMIN_TOGGLE_SETTINGS };

    (Object.keys(values) as AdminToggleKey[]).forEach((key) => {
      if (typeof toggleData[key] === 'boolean') {
        values[key] = toggleData[key] as boolean;
      }
    });

    return {
      values,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      updatedBy: data.updated_by || null
    };
  } catch (error) {
    console.error('Failed to fetch admin toggle settings:', error);
    return {
      values: DEFAULT_ADMIN_TOGGLE_SETTINGS,
      updatedAt: null,
      updatedBy: null
    };
  }
};

export const updateAdminToggleSetting = async (
  key: AdminToggleKey,
  value: boolean,
  updatedBy?: string | null
): Promise<UpdateToggleResult> => {
  try {
    const current = await getAdminToggleSettings();
    const newValues = { ...current.values, [key]: value };
    const now = new Date();

    const { error } = await supabase.from('admin_settings').upsert({
      id: 'toggleControls',
      data: newValues,
      updated_at: now.toISOString(),
      updated_by: updatedBy ?? null
    });

    if (error) throw error;

    return {
      updatedAt: now
    };
  } catch (error) {
    console.error(`Failed to update admin toggle setting "${key}":`, error);
    throw error;
  }
};

export const isManualPaymentsEnabled = async (): Promise<boolean> => {
  const settings = await getAdminToggleSettings();
  return settings.values.manualPayments;
};

export const isFeedbackEnabled = async (): Promise<boolean> => {
  const settings = await getAdminToggleSettings();
  return settings.values.feedbackEnabled;
};

export const isLiveTvEnabled = async (): Promise<boolean> => {
  const settings = await getAdminToggleSettings();
  return settings.values.liveTvEnabled;
};

export const isAdultSectionEnabled = async (): Promise<boolean> => {
  const settings = await getAdminToggleSettings();
  return settings.values.adultSectionEnabled;
};

export const isFeedbackIconVisible = async (): Promise<boolean> => {
  const settings = await getAdminToggleSettings();
  if (settings.values.feedbackEnabled) {
    return true;
  }
  return settings.values.feedbackIconVisible;
};


