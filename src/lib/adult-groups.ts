import { supabase } from './supabase';
import { AdultGroup, SubscriptionPackage } from '@/types';

// ── Helper ────────────────────────────────────────────────────────────────────

const mapGroup = (row: any): AdultGroup => ({
  id: row.id,
  label: row.label || row.name || '',
  url: row.url || row.whatsapp_link || '',
  description: row.description || '',
  icon: row.icon || '',
  requiredPackages: row.required_packages || [],
  isActive: row.is_active ?? true,
  views: row.views ?? 0,
  order: row.display_order ?? row.order ?? 0,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
});

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const addAdultGroup = async (groupData: Omit<AdultGroup, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const { data, error } = await supabase.from('adult_groups').insert({
      id: crypto.randomUUID(),
      label: groupData.label,
      url: groupData.url,
      description: groupData.description || null,
      icon: groupData.icon || null,
      required_packages: groupData.requiredPackages || [],
      is_active: groupData.isActive ?? true,
      order: groupData.order ?? 0,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('id').single();

    if (error) throw error;
    return { success: true, id: (data as any).id };
  } catch (error) {
    console.error('Error adding adult group:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateAdultGroup = async (groupId: string, groupData: Partial<AdultGroup>) => {
  try {
    const updateData: any = {};
    if (groupData.label !== undefined) updateData.label = groupData.label;
    if (groupData.url !== undefined) updateData.url = groupData.url;
    if (groupData.description !== undefined) updateData.description = groupData.description;
    if (groupData.icon !== undefined) updateData.icon = groupData.icon;
    if (groupData.requiredPackages !== undefined) updateData.required_packages = groupData.requiredPackages;
    if (groupData.isActive !== undefined) updateData.is_active = groupData.isActive;
    if (groupData.order !== undefined) updateData.order = groupData.order;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase.from('adult_groups').update(updateData).eq('id', groupId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating adult group:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteAdultGroup = async (groupId: string) => {
  try {
    const { error } = await supabase.from('adult_groups').delete().eq('id', groupId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting adult group:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getAdultGroups = async () => {
  try {
    const { data, error } = await supabase
      .from('adult_groups')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;

    const groups = (data || []).map(mapGroup);
    groups.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return { success: true, data: groups };
  } catch (error) {
    console.error('Error getting adult groups:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

// Polling-based subscription (replaces Firestore onSnapshot)
export const subscribeToAdultGroups = (callback: (groups: AdultGroup[]) => void): (() => void) => {
  let cancelled = false;

  const fetch = async () => {
    const result = await getAdultGroups();
    if (!cancelled) callback(result.data || []);
  };

  fetch();
  const intervalId = setInterval(fetch, 30000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

export const getActiveAdultGroups = async (requiredPackages?: SubscriptionPackage[]) => {
  try {
    const { data, error } = await supabase
      .from('adult_groups')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });

    if (error) throw error;

    let groups = (data || []).map(mapGroup);

    if (requiredPackages && requiredPackages.length > 0) {
      groups = groups.filter(group =>
        group.requiredPackages.some(pkg => requiredPackages.includes(pkg))
      );
    }

    return { success: true, data: groups };
  } catch (error) {
    console.error('Error getting active adult groups:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const incrementAdultGroupViews = async (groupId: string) => {
  try {
    const { data: group } = await supabase.from('adult_groups').select('views').eq('id', groupId).single();
    if (group) {
      await supabase.from('adult_groups').update({
        views: (group.views || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', groupId);
    }
    return { success: true };
  } catch (error) {
    console.error('Error incrementing adult group views:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getAdultGroupById = async (groupId: string) => {
  try {
    const { data, error } = await supabase.from('adult_groups').select('*').eq('id', groupId).single();
    if (error || !data) return { success: false, error: 'Adult group not found' };
    return { success: true, data: mapGroup(data) };
  } catch (error) {
    console.error('Error getting adult group:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
