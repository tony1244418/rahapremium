import { supabase } from './supabase';
import { Game, GameAccess } from '@/types';

// Helper to safely convert timestamps to dates
const toDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  return new Date(dateStr);
};

// Games Management Functions

export const addGame = async (gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const { data, error } = await supabase.from('games').insert({
      id: crypto.randomUUID(),
      title: gameData.title,
      description: gameData.description,
      thumbnail_url: gameData.thumbnailUrl,
      how_to_set_video_link: gameData.howToSetVideoLink,
      download_link: gameData.downloadLink,
      category: gameData.category || 'Other',
      platform: gameData.platform || 'Both',
      is_active: gameData.isActive !== undefined ? gameData.isActive : true,
      is_adult: gameData.isAdult || false,
      content_price: gameData.contentPrice || 0,
      content_price_days: gameData.contentPriceDays || 0,
      search_keywords: gameData.searchKeywords || [],
      genre: gameData.genre || [],
      required_packages: gameData.requiredPackages || [],
      is_free: gameData.isFree || false,
      mode: gameData.mode || 'Original',
      views: 0
    }).select().single();

    if (error) throw error;
    return { success: true, id: (data as any).id };
  } catch (error) {
    console.error('Error adding game:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateGame = async (gameId: string, gameData: Partial<Game>) => {
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };

    if (gameData.title !== undefined) updatePayload.title = gameData.title;
    if (gameData.description !== undefined) updatePayload.description = gameData.description;
    if (gameData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = gameData.thumbnailUrl;
    if (gameData.howToSetVideoLink !== undefined) updatePayload.how_to_set_video_link = gameData.howToSetVideoLink;
    if (gameData.downloadLink !== undefined) updatePayload.download_link = gameData.downloadLink;
    if (gameData.category !== undefined) updatePayload.category = gameData.category;
    if (gameData.platform !== undefined) updatePayload.platform = gameData.platform;
    if (gameData.isActive !== undefined) updatePayload.is_active = gameData.isActive;
    if (gameData.isAdult !== undefined) updatePayload.is_adult = gameData.isAdult;
    if (gameData.contentPrice !== undefined) updatePayload.content_price = gameData.contentPrice;
    if (gameData.contentPriceDays !== undefined) updatePayload.content_price_days = gameData.contentPriceDays;
    if (gameData.searchKeywords !== undefined) updatePayload.search_keywords = gameData.searchKeywords;
    if (gameData.genre !== undefined) updatePayload.genre = gameData.genre;
    if (gameData.requiredPackages !== undefined) updatePayload.required_packages = gameData.requiredPackages;
    if (gameData.isFree !== undefined) updatePayload.is_free = gameData.isFree;
    if (gameData.mode !== undefined) updatePayload.mode = gameData.mode;

    const { error } = await supabase.from('games').update(updatePayload).eq('id', gameId);
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating game:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteGame = async (gameId: string) => {
  try {
    const { error } = await supabase.from('games').delete().eq('id', gameId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting game:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getGames = async (includeAdult: boolean = false) => {
  try {
    let query = supabase.from('games').select('*').order('created_at', { ascending: false });
    
    if (!includeAdult) {
      query = query.eq('is_adult', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    const games = ((data as any) || []).map((game: any) => ({
      ...game,
      id: game.id,
      title: game.title,
      description: game.description,
      thumbnailUrl: game.thumbnail_url,
      howToSetVideoLink: game.how_to_set_video_link,
      downloadLink: game.download_link,
      category: game.category || 'Other',
      platform: game.platform || 'Both',
      isActive: game.is_active,
      isAdult: game.is_adult,
      price: game.price,
      priceDays: game.price_days,
      searchKeywords: game.search_keywords || [],
      genre: game.genre || [],
      requiredPackages: game.required_packages || [],
      isFree: game.is_free || false,
      mode: game.mode || 'Original',
      rating: game.rating,
      views: game.views,
      language: game.language,
      createdAt: toDate(game.created_at),
      updatedAt: toDate(game.updated_at),
    })) as Game[];

    return { success: true, data: games };
  } catch (error) {
    console.error('Error getting games:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const getActiveGames = async (includeAdult: boolean = false) => {
  try {
    let query = supabase.from('games').select('*').eq('is_active', true).order('created_at', { ascending: false });
    
    if (!includeAdult) {
      query = query.eq('is_adult', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    const games = ((data as any) || []).map((game: any) => ({
      ...game,
      id: game.id,
      title: game.title,
      description: game.description,
      thumbnailUrl: game.thumbnail_url,
      howToSetVideoLink: game.how_to_set_video_link,
      downloadLink: game.download_link,
      category: game.category || 'Other',
      platform: game.platform || 'Both',
      isActive: game.is_active,
      isAdult: game.is_adult,
      price: game.price,
      priceDays: game.price_days,
      searchKeywords: game.search_keywords || [],
      genre: game.genre || [],
      requiredPackages: game.required_packages || [],
      isFree: game.is_free || false,
      mode: game.mode || 'Original',
      rating: game.rating,
      views: game.views,
      language: game.language,
      createdAt: toDate(game.created_at),
      updatedAt: toDate(game.updated_at),
    })) as Game[];

    return { success: true, data: games };
  } catch (error) {
    console.error('Error getting active games:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const getGameById = async (gameId: string) => {
  try {
    const { data: game, error } = await supabase.from('games').select('*').eq('id', gameId).single();

    if (error || !game) {
      return { success: false, error: 'Game not found', data: null };
    }

    return { 
      success: true, 
      data: {
        ...(game as any),
        id: (game as any).id,
        title: (game as any).title,
        description: (game as any).description,
        thumbnailUrl: (game as any).thumbnail_url,
        howToSetVideoLink: (game as any).how_to_set_video_link,
        downloadLink: (game as any).download_link,
        category: (game as any).category || 'Other',
        platform: (game as any).platform || 'Both',
        isActive: (game as any).is_active,
        isAdult: (game as any).is_adult,
        price: (game as any).price,
        priceDays: (game as any).price_days,
        searchKeywords: (game as any).search_keywords || [],
        genre: (game as any).genre || [],
        requiredPackages: (game as any).required_packages || [],
        isFree: (game as any).is_free || false,
        mode: (game as any).mode || 'Original',
        rating: (game as any).rating,
        views: (game as any).views,
        language: (game as any).language,
        createdAt: toDate((game as any).created_at),
        updatedAt: toDate((game as any).updated_at),
      } as Game 
    };
  } catch (error) {
    console.error('Error getting game:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: null };
  }
};

export const subscribeToGames = (callback: (games: Game[]) => void, includeAdult: boolean = false) => {
  // Initial fetch
  getGames(includeAdult).then(({ data }) => {
    if (data) callback(data);
  });

  // Real-time updates via Supabase Realtime
  const channel = supabase
    .channel(`games_all_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, async () => {
      const { data } = await getGames(includeAdult);
      if (data) callback(data);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};

// Game Access Management

export const checkGameAccess = async (userId: string, gameId: string) => {
  try {
    if (!userId) return { success: false, hasAccess: false, error: 'User not authenticated' };
    
    // Check if the user is an admin (we can skip this check here if the UI handles it, but let's query the DB)
    const { data: userData } = await supabase.from('rahapremium_users').select('role').eq('id', userId).single();
    if (userData && (userData as any).role === 'admin') {
      return { success: true, hasAccess: true, adminOverride: true };
    }

    const { data: gameAccess, error } = await supabase
      .from('game_accesses')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .eq('is_active', true)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    // No rows returned means no access
    if (error && (error as any).code !== 'PGRST116') throw error;
    if (!gameAccess) {
      return { success: true, hasAccess: false, reason: 'No active access found' };
    }

    const endDate = toDate((gameAccess as any).end_date);
    const now = new Date();

    if (endDate < now) {
      // Access expired, update it
      await supabase.from('game_accesses').update({ is_active: false }).eq('id', (gameAccess as any).id);
      return { success: true, hasAccess: false, reason: 'Access expired', expiredAt: endDate };
    }

    return { 
      success: true, 
      hasAccess: true, 
      access: {
        id: (gameAccess as any).id,
        userId: (gameAccess as any).user_id,
        gameId: (gameAccess as any).game_id,
        paymentId: (gameAccess as any).payment_id,
        startDate: toDate((gameAccess as any).start_date),
        endDate: endDate,
        isActive: (gameAccess as any).is_active,
        createdAt: toDate((gameAccess as any).created_at)
      } as GameAccess 
    };
  } catch (error) {
    console.error('Error checking game access:', error);
    return { success: false, hasAccess: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const grantGameAccess = async (userId: string, gameId: string, durationDays: number, paymentId: string) => {
  try {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const { data, error } = await supabase.from('game_accesses').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      game_id: gameId,
      payment_id: paymentId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true
    }).select().single();

    if (error) throw error;
    return { success: true, accessId: (data as any).id };
  } catch (error) {
    console.error('Error granting game access:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const recordGamePlay = async (userId: string, gameId: string) => {
  try {
    const { data: game, error } = await supabase.from('games').select('views').eq('id', gameId).single();
    if (game && !error) {
      await supabase.from('games').update({ views: ((game as any).views || 0) + 1 }).eq('id', gameId);
    }
    
    // Also record it in user's recently played if we want (not strictly required by current schema)
    return { success: true };
  } catch (error) {
    console.error('Error recording game play:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getUserGameAccesses = async (userId: string) => {
  try {
    if (!userId) return { success: false, data: [], error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('game_accesses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('end_date', { ascending: false });

    if (error) throw error;

    // Filter out expired ones in memory and update DB
    const now = new Date();
    const validAccesses = [];
    
    for (const access of (data || [])) {
      const endDate = toDate(access.end_date);
      if (endDate < now) {
        // Expired, mark inactive
        await supabase.from('game_accesses').update({ is_active: false }).eq('id', access.id);
      } else {
        validAccesses.push({
          id: access.id,
          userId: access.user_id,
          gameId: access.game_id,
          paymentId: access.payment_id,
          startDate: toDate(access.start_date),
          endDate: endDate,
          isActive: access.is_active,
          createdAt: toDate(access.created_at)
        } as GameAccess);
      }
    }

    return { success: true, data: validAccesses };
  } catch (error) {
    console.error('Error getting user game accesses:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const incrementGameViews = async (gameId: string) => {
  try {
    const { data: game } = await supabase.from('games').select('views').eq('id', gameId).single();
    if (game) {
      await supabase.from('games').update({ views: (game.views || 0) + 1 }).eq('id', gameId);
    }
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
};

export const subscribeToActiveGames = (callback: (games: Game[]) => void, includeAdult: boolean = false) => {
  // Initial fetch
  getActiveGames(includeAdult).then(result => {
    if (result.success && result.data) callback(result.data);
  });

  // Real-time updates via Supabase Realtime
  const channel = supabase
    .channel(`games_active_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, async () => {
      const result = await getActiveGames(includeAdult);
      if (result.success && result.data) callback(result.data);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
};
