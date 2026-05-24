import { supabase } from './supabase';
import { LiveChannel, SubscriptionPackage } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mapChannel = (row: any): LiveChannel => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  streamUrl: row.stream_url,
  streamFormat: row.stream_format || 'other',
  thumbnailUrl: row.thumbnail_url || '/logo.png',
  category: row.category || [],
  language: row.language || 'sw',
  isActive: row.is_active ?? true,
  isMaintenance: row.is_maintenance ?? false,
  isAdult: row.is_adult ?? false,
  order: row.display_order ?? row.order ?? 0,
  viewerCount: row.viewer_count ?? 0,
  totalViews: row.total_views ?? 0,
  requiredPackages: row.required_packages || [],
  searchKeywords: Array.isArray(row.search_keywords) ? row.search_keywords.filter((kw: string) => kw !== '__slider__') : [],
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  encryptionType: row.encryption_type || undefined,
  clearKeys: row.clear_keys || undefined,
  contentPurchaseEnabled: row.content_purchase_enabled || false,
  contentPrice: row.content_price || undefined,
  contentPriceDays: row.content_price_days || undefined,
  contentPurchasePackages: row.content_purchase_packages || undefined,
  videoEmbedCode: row.video_embed_code || undefined,
  showInSlider: Array.isArray(row.search_keywords) && row.search_keywords.includes('__slider__'),
});

// ── Utility functions (no Firebase dependency) ────────────────────────────────

export const detectStreamFormat = (streamUrl: string): LiveChannel['streamFormat'] => {
  if (!streamUrl) return 'other';
  const url = streamUrl.toLowerCase();
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mpd')) return 'dash';
  if (url.includes('.mp4')) return 'mp4';
  if (url.includes('.webm')) return 'webm';
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('googleusercontent.com')) return 'youtube';
  if (url.includes('.ts') || url.includes('extension=ts')) return 'hls';
  return 'other';
};

export const getAlphabeticalOrder = (channelName: string, existingChannels: LiveChannel[]): number => {
  const allNames = [...existingChannels.map(c => c.name.toLowerCase()), channelName.toLowerCase()];
  allNames.sort();
  const position = allNames.indexOf(channelName.toLowerCase());
  return position * 100;
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const addLiveChannel = async (channelData: Omit<LiveChannel, 'id' | 'createdAt' | 'updatedAt' | 'viewerCount' | 'totalViews'>) => {
  try {
    // Use explicitly provided streamFormat, or auto-detect from URL as fallback
    const streamFormat = channelData.streamFormat || detectStreamFormat(channelData.streamUrl);
    const allChannels = await getLiveChannels();
    const order = channelData.order !== undefined ? channelData.order : getAlphabeticalOrder(channelData.name, allChannels.data || []);

    const { data, error } = await supabase.from('live_channels').insert({
      id: crypto.randomUUID(),
      name: channelData.name,
      description: channelData.description,
      stream_url: channelData.streamUrl,
      stream_format: streamFormat,
      thumbnail_url: channelData.thumbnailUrl || '/logo.png',
      category: channelData.category,
      language: channelData.language || 'sw',
      required_packages: channelData.requiredPackages || [],
      search_keywords: (() => {
        const kw = new Set(channelData.searchKeywords || []);
        if (channelData.showInSlider) kw.add('__slider__');
        else kw.delete('__slider__');
        return Array.from(kw);
      })(),
      is_active: true,
      is_maintenance: false,
      is_adult: channelData.isAdult || false,
      display_order: order,
      viewer_count: 0,
      total_views: 0,
      encryption_type: channelData.encryptionType || 'none',
      clear_keys: channelData.clearKeys || {},
      content_purchase_enabled: channelData.contentPurchaseEnabled || false,
      content_price: channelData.contentPrice || 0,
      content_price_days: channelData.contentPriceDays || 30,
      content_purchase_packages: channelData.contentPurchasePackages || [],
      video_embed_code: channelData.videoEmbedCode || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select('id').single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding live channel:', error);
    return { success: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
  }
};

export const updateLiveChannel = async (channelId: string, channelData: Partial<LiveChannel>) => {
  try {
    const updateData: any = {};
    if (channelData.name !== undefined) updateData.name = channelData.name;
    if (channelData.description !== undefined) updateData.description = channelData.description;
    if (channelData.streamUrl !== undefined) {
      updateData.stream_url = channelData.streamUrl;
      // Use explicitly provided streamFormat, or auto-detect from URL as fallback
      updateData.stream_format = channelData.streamFormat || detectStreamFormat(channelData.streamUrl);
    } else if (channelData.streamFormat !== undefined) {
      // streamFormat changed without URL change (e.g. switching linkType)
      updateData.stream_format = channelData.streamFormat;
    }
    if (channelData.thumbnailUrl !== undefined) updateData.thumbnail_url = channelData.thumbnailUrl;
    if (channelData.category !== undefined) updateData.category = channelData.category;
    if (channelData.language !== undefined) updateData.language = channelData.language;
    if (channelData.requiredPackages !== undefined) updateData.required_packages = channelData.requiredPackages;
    if (channelData.searchKeywords !== undefined) updateData.search_keywords = channelData.searchKeywords;

    if (channelData.showInSlider !== undefined) {
      if (updateData.search_keywords) {
        const kw = new Set(updateData.search_keywords);
        if (channelData.showInSlider) kw.add('__slider__');
        else kw.delete('__slider__');
        updateData.search_keywords = Array.from(kw);
      } else {
        const { data: curr } = await supabase.from('live_channels').select('search_keywords').eq('id', channelId).single();
        const kw = new Set(curr?.search_keywords || []);
        if (channelData.showInSlider) kw.add('__slider__');
        else kw.delete('__slider__');
        updateData.search_keywords = Array.from(kw);
      }
    }

    if (channelData.isActive !== undefined) updateData.is_active = channelData.isActive;
    if (channelData.isMaintenance !== undefined) updateData.is_maintenance = channelData.isMaintenance;
    if (channelData.isAdult !== undefined) updateData.is_adult = channelData.isAdult;
    if (channelData.order !== undefined) updateData.display_order = channelData.order;
    if (channelData.encryptionType !== undefined) updateData.encryption_type = channelData.encryptionType;
    if (channelData.clearKeys !== undefined) updateData.clear_keys = channelData.clearKeys;
    if (channelData.contentPurchaseEnabled !== undefined) updateData.content_purchase_enabled = channelData.contentPurchaseEnabled;
    if (channelData.contentPrice !== undefined) updateData.content_price = channelData.contentPrice;
    if (channelData.contentPriceDays !== undefined) updateData.content_price_days = channelData.contentPriceDays;
    if (channelData.contentPurchasePackages !== undefined) updateData.content_purchase_packages = channelData.contentPurchasePackages;
    if (channelData.videoEmbedCode !== undefined) updateData.video_embed_code = channelData.videoEmbedCode;
    
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase.from('live_channels').update(updateData).eq('id', channelId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating live channel:', error);
    return { success: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
  }
};

export const deleteLiveChannel = async (channelId: string) => {
  try {
    const { error } = await supabase.from('live_channels').delete().eq('id', channelId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting live channel:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getLiveChannels = async (activeOnly: boolean = false, includeAdult: boolean = false) => {
  try {
    let query = supabase.from('live_channels').select('*').order('display_order', { ascending: true });
    if (activeOnly) {
      query = query.eq('is_active', true).eq('is_maintenance', false);
    }
    if (!includeAdult) {
      query = query.eq('is_adult', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data || []).map(mapChannel) };
  } catch (error) {
    console.error('Error getting live channels:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const getLiveChannelById = async (channelId: string) => {
  try {
    const { data, error } = await supabase.from('live_channels').select('*').eq('id', channelId).single();
    if (error || !data) return { success: false, error: 'Channel not found' };
    return { success: true, data: mapChannel(data) };
  } catch (error) {
    console.error('Error getting live channel:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Polling-based subscription (replaces Firestore onSnapshot)
export const subscribeToLiveChannels = (
  callback: (channels: LiveChannel[]) => void,
  activeOnly: boolean = false,
  includeAdult: boolean = false
): (() => void) => {
  let cancelled = false;

  const fetch = async () => {
    const result = await getLiveChannels(activeOnly, includeAdult);
    if (!cancelled) callback(result.data || []);
  };

  fetch();
  const intervalId = setInterval(fetch, 30000);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};

export const getLiveChannelsByCategory = async (category: string, activeOnly: boolean = true, includeAdult: boolean = false) => {
  try {
    const result = await getLiveChannels(activeOnly, includeAdult);
    if (!result.success) return result;
    const filtered = (result.data || []).filter(ch =>
      Array.isArray(ch.category) && ch.category.includes(category as any)
    );
    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error getting live channels by category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

// ── Viewer tracking ───────────────────────────────────────────────────────────

export const incrementChannelViewer = async (channelId: string) => {
  try {
    const { data: ch } = await supabase.from('live_channels').select('viewer_count, total_views').eq('id', channelId).single();
    if (ch) {
      await supabase.from('live_channels').update({
        viewer_count: (ch.viewer_count || 0) + 1,
        total_views: (ch.total_views || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', channelId);
    }
    return { success: true };
  } catch (error) {
    console.error('Error incrementing channel viewer:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const decrementChannelViewer = async (channelId: string) => {
  try {
    const { data: ch } = await supabase.from('live_channels').select('viewer_count').eq('id', channelId).single();
    if (ch && ch.viewer_count > 0) {
      await supabase.from('live_channels').update({
        viewer_count: ch.viewer_count - 1,
        updated_at: new Date().toISOString(),
      }).eq('id', channelId);
    }
    return { success: true };
  } catch (error) {
    console.error('Error decrementing channel viewer:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const toggleMaintenanceMode = async (channelId: string, isMaintenance: boolean) => {
  try {
    const { error } = await supabase.from('live_channels').update({
      is_maintenance: isMaintenance,
      updated_at: new Date().toISOString(),
    }).eq('id', channelId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const reorderChannelsAlphabetically = async () => {
  try {
    const result = await getLiveChannels(false, true);
    if (!result.success || !result.data) return { success: false, error: 'Failed to get channels' };

    const channels = result.data;
    const sortedNames = channels.map(c => c.name.toLowerCase()).sort();

    await Promise.all(channels.map(channel => {
      const newOrder = sortedNames.indexOf(channel.name.toLowerCase()) * 100;
      if (channel.order !== newOrder) {
        return supabase.from('live_channels').update({ display_order: newOrder, updated_at: new Date().toISOString() }).eq('id', channel.id);
      }
      return Promise.resolve();
    }));

    return { success: true };
  } catch (error) {
    console.error('Error reordering channels:', error);
    return { success: false, error: error instanceof Error ? error.message : JSON.stringify(error) };
  }
};

export const searchLiveChannels = async (searchQuery: string, includeAdult: boolean = false) => {
  try {
    const result = await getLiveChannels(true, includeAdult);
    if (!result.success || !result.data) return { success: false, data: [] };

    const q = searchQuery.toLowerCase().trim();
    if (!q) return { success: true, data: result.data };

    const filtered = result.data.filter(channel => {
      const nameMatch = channel.name.toLowerCase().includes(q);
      const descriptionMatch = channel.description?.toLowerCase().includes(q);
      const keywordMatch = channel.searchKeywords?.some(kw => kw.toLowerCase().includes(q));
      const categoryMatch = Array.isArray(channel.category) && channel.category.some(cat => cat.toLowerCase().includes(q));
      return nameMatch || descriptionMatch || keywordMatch || categoryMatch;
    });

    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error searching live channels:', error);
    return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
