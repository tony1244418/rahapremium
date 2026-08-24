import { supabase } from './supabase';
import { Movie, Series, Story, Season, Episode, SubscriptionPackage } from '@/types';

// Helper to generate IDs for new content
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Helper: convert empty string / falsy to null for optional numeric DB columns
const toIntOrNull = (val: any): number | null => {
  if (val === '' || val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

// Helper: safely convert releaseDate (string | Date | null) to ISO string or null
const toDateISOOrNull = (val: any): string | null => {
  if (!val || val === '') return null;
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// --- Mapping Helpers ---
const mapMovie = (data: any): Movie => ({
  id: data.id,
  title: data.title,
  description: data.description,
  videoUrl: data.video_url,
  downloadUrl: data.download_url,
  googleDriveUrl: data.google_drive_url,
  thumbnailUrl: data.thumbnail_url,
  duration: data.duration,
  releaseDate: data.release_date ? new Date(data.release_date) : null,
  genre: data.genre || [],
  language: data.language || 'sw',
  quality: data.quality || [],
  requiredPackages: data.required_packages || [],
  createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0),
  views: data.views || 0,
  isActive: data.is_active ?? true,
  isAdult: data.is_adult ?? false,
  adultCategory: data.adult_category || null,
  rating: data.rating || 0,
  cast: data.cast_list || [],
  director: data.director,
  searchKeywords: data.search_keywords || [],
  contentPurchaseEnabled: data.content_purchase_enabled ?? false,
  contentPrice: data.content_price ?? 0,
  contentPriceDays: data.content_price_days ?? 30,
  contentPurchasePackages: data.content_purchase_packages || [],
  videoEmbedCode: data.video_embed_code || ''
});

const mapSeries = (data: any, totalSeasons: number = 0): Series => ({
  id: data.id,
  title: data.title,
  description: data.description,
  thumbnailUrl: data.thumbnail_url,
  genre: data.genre || [],
  language: data.language || 'sw',
  totalSeasons: totalSeasons || data.total_seasons || 0,
  requiredPackages: data.required_packages || [],
  createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0),
  views: data.views || 0,
  isActive: data.is_active ?? true,
  isAdult: data.is_adult ?? false,
  adultCategory: data.adult_category || null,
  rating: data.rating || 0,
  cast: data.cast_list || [],
  seasons: [],
  searchKeywords: data.search_keywords || [],
  contentPurchaseEnabled: data.content_purchase_enabled ?? false,
  contentPrice: data.content_price ?? 0,
  contentPriceDays: data.content_price_days ?? 30,
  contentPurchasePackages: data.content_purchase_packages || [],
  videoEmbedCode: data.video_embed_code || ''
});

const mapSeason = (data: any): Season => ({
  id: data.id,
  seriesId: data.series_id,
  seasonNumber: data.season_number,
  title: data.title,
  description: data.description,
  videoUrl: data.video_url,
  downloadUrl: data.download_url,
  googleDriveUrl: data.google_drive_url,
  thumbnailUrl: data.thumbnail_url,
  totalEpisodes: data.total_episodes || 0,
  episodes: [],
  createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0)
});

const mapEpisode = (data: any): Episode => ({
  id: data.id,
  seriesId: data.series_id,
  seasonId: data.season_id,
  episodeNumber: data.episode_number,
  title: data.title,
  description: data.description,
  videoUrl: data.video_url,
  downloadUrl: data.download_url,
  googleDriveUrl: data.google_drive_url,
  thumbnailUrl: data.thumbnail_url,
  duration: data.duration || 0,
  quality: data.quality || [],
  requiredPackages: data.required_packages || [],
  isAdult: data.is_adult ?? false,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0),
  views: data.views || 0,
  contentPurchaseEnabled: data.content_purchase_enabled ?? false,
  contentPrice: data.content_price ?? 0,
  contentPriceDays: data.content_price_days ?? 30,
  videoEmbedCode: data.video_embed_code || ''
});

const mapStory = (data: any): Story => ({
  id: data.id,
  title: data.title,
  content: data.content,
  author: data.author,
  genre: data.genre || [],
  language: data.language || 'sw',
  estimatedReadTime: data.estimated_read_time || 0,
  thumbnailUrl: data.thumbnail_url,
  requiredPackages: data.required_packages || [],
  createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0),
  views: data.views || 0,
  isActive: data.is_active ?? true,
  isAdult: data.is_adult ?? false,
  rating: data.rating || 0,
  searchKeywords: data.search_keywords || []
});

// --- Movie Display Order (Number Based) ---
const MOVIE_ORDER_KEY = 'movie_sort_orders';

export const getMovieSortOrders = async (): Promise<Record<string, number>> => {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('data')
      .eq('id', MOVIE_ORDER_KEY)
      .maybeSingle();
      
    if ((data as any)?.data) {
      const parsed = typeof (data as any).data === 'string' ? JSON.parse((data as any).data) : (data as any).data;
      return parsed.orders || {};
    }
    return {};
  } catch {
    return {};
  }
};

export const saveMovieSortOrder = async (id: string, sortOrder: number): Promise<boolean> => {
  try {
    const orders = await getMovieSortOrders();
    orders[id] = sortOrder;
    const { error } = await supabase
      .from('admin_settings')
      .upsert(
        { id: MOVIE_ORDER_KEY, data: { orders }, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    return !error;
  } catch {
    return false;
  }
};

/**
 * Persist an explicit display order for many movies at once. `orders` maps a
 * movie id to its sortOrder (lower = shown first). Merges with any existing
 * saved orders. Used by the admin "arrange" controls.
 */
export const saveMovieSortOrders = async (orders: Record<string, number>): Promise<boolean> => {
  try {
    const existing = await getMovieSortOrders();
    const merged = { ...existing, ...orders };
    const { error } = await supabase
      .from('admin_settings')
      .upsert(
        { id: MOVIE_ORDER_KEY, data: { orders: merged }, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    return !error;
  } catch {
    return false;
  }
};

/** Sort movies by sortOrder ASC, then by createdAt DESC (new movies appear first in their group). */
const applyMovieOrder = (movies: Movie[], orders: Record<string, number>): Movie[] => {
  return movies.map(m => ({ ...m, sortOrder: orders[m.id] || 0 })).sort((a, b) => {
    const orderA = a.sortOrder!;
    const orderB = b.sortOrder!;
    if (orderA !== orderB) return orderA - orderB;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
};

// --- Movies Management ---
export const addMovie = async (movieData: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'views'> & { sortOrder?: number }) => {
  try {
    const id = generateId();
    const { error } = await supabase.from('movies').insert([{
      id,
      title: movieData.title,
      description: movieData.description,
      video_url: movieData.videoUrl,
      download_url: movieData.downloadUrl,
      google_drive_url: movieData.googleDriveUrl,
      thumbnail_url: movieData.thumbnailUrl,
      duration: toIntOrNull(movieData.duration),
      release_date: toDateISOOrNull(movieData.releaseDate),
      genre: movieData.genre || [],
      language: movieData.language || 'sw',
      quality: movieData.quality || [],
      required_packages: movieData.requiredPackages || [],
      is_active: movieData.isActive ?? true,
      is_adult: movieData.isAdult ?? false,
      adult_category: movieData.adultCategory,
      rating: movieData.rating ?? 0,
      cast_list: movieData.cast || [],
      director: movieData.director,
      search_keywords: movieData.searchKeywords || [],
      content_purchase_enabled: movieData.contentPurchaseEnabled ?? false,
      content_price: movieData.contentPrice ?? 0,
      content_price_days: movieData.contentPriceDays ?? 30,
      content_purchase_packages: movieData.contentPurchasePackages || [],
      video_embed_code: movieData.videoEmbedCode ?? '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0
    }]);

    if (error) throw error;

    if (movieData.sortOrder !== undefined) {
      await saveMovieSortOrder(id, movieData.sortOrder);
    }

    return { success: true, id };
  } catch (error) {
    console.error('Error adding movie:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateMovie = async (movieId: string, movieData: Partial<Movie> & { sortOrder?: number }) => {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    
    if (movieData.sortOrder !== undefined) {
      await saveMovieSortOrder(movieId, movieData.sortOrder);
    }
    if (movieData.title !== undefined) payload.title = movieData.title;
    if (movieData.description !== undefined) payload.description = movieData.description;
    if (movieData.videoUrl !== undefined) payload.video_url = movieData.videoUrl;
    if (movieData.downloadUrl !== undefined) payload.download_url = movieData.downloadUrl;
    if (movieData.googleDriveUrl !== undefined) payload.google_drive_url = movieData.googleDriveUrl;
    if (movieData.thumbnailUrl !== undefined) payload.thumbnail_url = movieData.thumbnailUrl;
    if (movieData.duration !== undefined) payload.duration = toIntOrNull(movieData.duration);
    if (movieData.releaseDate !== undefined) payload.release_date = toDateISOOrNull(movieData.releaseDate);
    if (movieData.genre !== undefined) payload.genre = movieData.genre;
    if (movieData.language !== undefined) payload.language = movieData.language;
    if (movieData.quality !== undefined) payload.quality = movieData.quality;
    if (movieData.requiredPackages !== undefined) payload.required_packages = movieData.requiredPackages;
    if (movieData.isActive !== undefined) payload.is_active = movieData.isActive;
    if (movieData.isAdult !== undefined) payload.is_adult = movieData.isAdult;
    if (movieData.adultCategory !== undefined) payload.adult_category = movieData.adultCategory;
    if (movieData.rating !== undefined) payload.rating = movieData.rating;
    if (movieData.cast !== undefined) payload.cast_list = movieData.cast;
    if (movieData.director !== undefined) payload.director = movieData.director;
    if (movieData.searchKeywords !== undefined) payload.search_keywords = movieData.searchKeywords;
    if (movieData.contentPurchaseEnabled !== undefined) payload.content_purchase_enabled = movieData.contentPurchaseEnabled;
    if (movieData.contentPrice !== undefined) payload.content_price = movieData.contentPrice;
    if (movieData.contentPriceDays !== undefined) payload.content_price_days = movieData.contentPriceDays;
    if (movieData.contentPurchasePackages !== undefined) payload.content_purchase_packages = movieData.contentPurchasePackages;
    if (movieData.videoEmbedCode !== undefined) payload.video_embed_code = movieData.videoEmbedCode;

    const { error } = await supabase.from('movies').update(payload).eq('id', movieId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating movie:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const postMovieNow = async (movieId: string) => {
  try {
    // 1. Reset sort order to 0 FIRST so that when the movies table update triggers a realtime 
    //    refresh on the client, the new sort order is already saved in admin_settings.
    await saveMovieSortOrder(movieId, 0);

    // 2. Update created_at to trigger realtime refresh and put it at the top of the 0 group
    const { error } = await supabase
      .from('movies')
      .update({ created_at: new Date().toISOString() })
      .eq('id', movieId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error posting movie now:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteMovie = async (movieId: string) => {
  try {
    const { error } = await supabase.from('movies').delete().eq('id', movieId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting movie:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getMovies = async () => {
  try {
    const [{ data, error }, orders] = await Promise.all([
      supabase.from('movies').select('*').order('created_at', { ascending: false }),
      getMovieSortOrders(),
    ]);
    if (error) throw error;

    const movies = applyMovieOrder(
      (data as any).map(mapMovie).filter((m: any) => !m.isAdult),
      orders
    );
    return { success: true, data: movies };
  } catch (error) {
    console.error('Error getting movies:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const getAllMovies = async () => {
  try {
    const [{ data, error }, orders] = await Promise.all([
      supabase.from('movies').select('*').order('created_at', { ascending: false }),
      getMovieSortOrders(),
    ]);
    if (error) throw error;

    const movies = applyMovieOrder((data as any).map(mapMovie), orders);
    return { success: true, data: movies };
  } catch (error) {
    console.error('Error getting all movies:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const subscribeToMovies = (callback: (movies: Movie[]) => void) => {
  let currentMovies: Movie[] = [];
  
  const fetchAndCallback = async () => {
    const res = await getMovies();
    if (res.success && res.data) {
      currentMovies = res.data;
      callback(currentMovies);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`movies_changes_public_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToAdultMovies = (callback: (movies: Movie[]) => void) => {
  const fetchAndCallback = async () => {
    const { data, error } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const movies = (data as any).map(mapMovie).filter((m: any) => m.isAdult && m.isActive);
      callback(movies);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`movies_changes_adult_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToAllMovies = (callback: (movies: Movie[]) => void) => {
  const fetchAndCallback = async () => {
    const res = await getAllMovies();
    if (res.success && res.data) {
      callback(res.data);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`movies_changes_all_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// --- Series Management ---
export const addSeries = async (seriesData: Omit<Series, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'seasons' | 'totalSeasons'>) => {
  try {
    const id = generateId();
    const { error } = await supabase.from('series').insert([{
      id,
      title: seriesData.title,
      description: seriesData.description,
      thumbnail_url: seriesData.thumbnailUrl,
      genre: seriesData.genre || [],
      language: seriesData.language || 'sw',
      required_packages: seriesData.requiredPackages || [],
      is_active: seriesData.isActive ?? true,
      is_adult: seriesData.isAdult ?? false,
      adult_category: seriesData.adultCategory,
      rating: seriesData.rating ?? 0,
      cast_list: seriesData.cast || [],
      search_keywords: seriesData.searchKeywords || [],
      content_purchase_enabled: seriesData.contentPurchaseEnabled ?? false,
      content_price: seriesData.contentPrice ?? 0,
      content_price_days: seriesData.contentPriceDays ?? 30,
      content_purchase_packages: seriesData.contentPurchasePackages || [],
      video_embed_code: seriesData.videoEmbedCode ?? '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0,
      total_seasons: 0
    }]);

    if (error) throw error;
    return { success: true, id };
  } catch (error) {
    console.error('Error adding series:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateSeries = async (seriesId: string, seriesData: Partial<Series>) => {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (seriesData.title !== undefined) payload.title = seriesData.title;
    if (seriesData.description !== undefined) payload.description = seriesData.description;
    if (seriesData.thumbnailUrl !== undefined) payload.thumbnail_url = seriesData.thumbnailUrl;
    if (seriesData.genre !== undefined) payload.genre = seriesData.genre;
    if (seriesData.language !== undefined) payload.language = seriesData.language;
    if (seriesData.totalSeasons !== undefined) payload.total_seasons = seriesData.totalSeasons;
    if (seriesData.requiredPackages !== undefined) payload.required_packages = seriesData.requiredPackages;
    if (seriesData.isActive !== undefined) payload.is_active = seriesData.isActive;
    if (seriesData.isAdult !== undefined) payload.is_adult = seriesData.isAdult;
    if (seriesData.adultCategory !== undefined) payload.adult_category = seriesData.adultCategory;
    if (seriesData.rating !== undefined) payload.rating = seriesData.rating;
    if (seriesData.cast !== undefined) payload.cast_list = seriesData.cast;
    if (seriesData.searchKeywords !== undefined) payload.search_keywords = seriesData.searchKeywords;
    if (seriesData.contentPurchaseEnabled !== undefined) payload.content_purchase_enabled = seriesData.contentPurchaseEnabled;
    if (seriesData.contentPrice !== undefined) payload.content_price = seriesData.contentPrice;
    if (seriesData.contentPriceDays !== undefined) payload.content_price_days = seriesData.contentPriceDays;
    if (seriesData.contentPurchasePackages !== undefined) payload.content_purchase_packages = seriesData.contentPurchasePackages;
    if (seriesData.videoEmbedCode !== undefined) payload.video_embed_code = seriesData.videoEmbedCode;

    const { error } = await supabase.from('series').update(payload).eq('id', seriesId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating series:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteSeries = async (seriesId: string) => {
  try {
    const { error } = await supabase.from('series').delete().eq('id', seriesId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting series:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getSeries = async () => {
  try {
    const { data, error } = await supabase.from('series').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const seriesList = await Promise.all(
      (data as any).map(async (doc: any) => {
        const { data: seasons } = await supabase.from('seasons').select('id').eq('series_id', doc.id);
        const count = ((seasons as any) || []).length;
        return mapSeries(doc, count);
      })
    );

    return { success: true, data: seriesList.filter((s: any) => !s.isAdult) };
  } catch (error) {
    console.error('Error getting series:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const subscribeToSeries = (callback: (series: Series[]) => void) => {
  const fetchAndCallback = async () => {
    const res = await getSeries();
    if (res.success && res.data) {
      callback(res.data);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`series_changes_public_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToAdultSeries = (callback: (series: Series[]) => void) => {
  const fetchAndCallback = async () => {
    const { data, error } = await supabase.from('series').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const seriesList = await Promise.all(
        (data as any).map(async (doc: any) => {
          const { data: seasons } = await supabase.from('seasons').select('id').eq('series_id', doc.id);
          const count = ((seasons as any) || []).length;
          return mapSeries(doc, count);
        })
      );
      callback(seriesList.filter((s: any) => s.isAdult && s.isActive));
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`series_changes_adult_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// --- Stories Management ---
export const addStory = async (storyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const id = generateId();
    const { error } = await supabase.from('stories').insert([{
      id,
      title: storyData.title,
      content: storyData.content,
      author: storyData.author,
      genre: storyData.genre || [],
      language: storyData.language || 'sw',
      estimated_read_time: storyData.estimatedReadTime || 0,
      thumbnail_url: storyData.thumbnailUrl,
      required_packages: storyData.requiredPackages || [],
      is_active: storyData.isActive ?? true,
      is_adult: storyData.isAdult ?? false,
      rating: storyData.rating ?? 0,
      search_keywords: storyData.searchKeywords || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0
    }]);

    if (error) throw error;
    return { success: true, id };
  } catch (error) {
    console.error('Error adding story:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateStory = async (storyId: string, storyData: Partial<Story>) => {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (storyData.title !== undefined) payload.title = storyData.title;
    if (storyData.content !== undefined) payload.content = storyData.content;
    if (storyData.author !== undefined) payload.author = storyData.author;
    if (storyData.genre !== undefined) payload.genre = storyData.genre;
    if (storyData.language !== undefined) payload.language = storyData.language;
    if (storyData.estimatedReadTime !== undefined) payload.estimated_read_time = storyData.estimatedReadTime;
    if (storyData.thumbnailUrl !== undefined) payload.thumbnail_url = storyData.thumbnailUrl;
    if (storyData.requiredPackages !== undefined) payload.required_packages = storyData.requiredPackages;
    if (storyData.isActive !== undefined) payload.is_active = storyData.isActive;
    if (storyData.isAdult !== undefined) payload.is_adult = storyData.isAdult;
    if (storyData.rating !== undefined) payload.rating = storyData.rating;
    if (storyData.searchKeywords !== undefined) payload.search_keywords = storyData.searchKeywords;

    const { error } = await supabase.from('stories').update(payload).eq('id', storyId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating story:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteStory = async (storyId: string) => {
  try {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting story:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getStories = async () => {
  try {
    const { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    const stories = (data as any).map(mapStory);
    return { success: true, data: stories.filter((s: any) => !s.isAdult) };
  } catch (error) {
    console.error('Error getting stories:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const subscribeToStories = (callback: (stories: Story[]) => void) => {
  const fetchAndCallback = async () => {
    const res = await getStories();
    if (res.success && res.data) {
      callback(res.data);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`stories_changes_public_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// --- Content Statistics ---
export const getContentStats = async () => {
  try {
    const [moviesRes, seriesRes, storiesRes] = await Promise.all([
      supabase.from('movies').select('is_active'),
      supabase.from('series').select('is_active'),
      supabase.from('stories').select('is_active')
    ]);

    const movies = moviesRes.data || [];
    const series = seriesRes.data || [];
    const stories = storiesRes.data || [];

    const totalMovies = movies.length;
    const totalSeries = series.length;
    const totalStories = stories.length;
    const totalContent = totalMovies + totalSeries + totalStories;

    const activeMovies = movies.filter(m => m.is_active).length;
    const activeSeries = series.filter(s => s.is_active).length;
    const activeStories = stories.filter(s => s.is_active).length;
    const activeContent = activeMovies + activeSeries + activeStories;

    return {
      success: true,
      data: {
        totalMovies,
        totalSeries,
        totalStories,
        totalContent,
        activeMovies,
        activeSeries,
        activeStories,
        activeContent
      }
    };
  } catch (error) {
    console.error('Error getting content stats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// --- Utility Functions ---
export const formatDuration = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export const formatReadTime = (minutes: number) => {
  return `${minutes} min read`;
};

export const getContentTypeIcon = (type: 'movie' | 'series' | 'story' | 'game') => {
  switch (type) {
    case 'movie': return '';
    case 'series': return '';
    case 'story': return '';
    case 'game': return '';
    default: return '';
  }
};

export const getContentTypeColor = (type: 'movie' | 'series' | 'story' | 'game') => {
  switch (type) {
    case 'movie': return 'text-red-400 bg-red-500/20';
    case 'series': return 'text-blue-400 bg-blue-500/20';
    case 'story': return 'text-green-400 bg-green-500/20';
    case 'game': return 'text-purple-400 bg-purple-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
};

// --- Seasons Management ---
export const addSeason = async (seasonData: Omit<Season, 'id' | 'createdAt' | 'updatedAt' | 'episodes'>) => {
  try {
    const id = generateId();
    const { error } = await supabase.from('seasons').insert([{
      id,
      series_id: seasonData.seriesId,
      season_number: seasonData.seasonNumber,
      title: seasonData.title,
      description: seasonData.description,
      video_url: seasonData.videoUrl,
      download_url: seasonData.downloadUrl,
      google_drive_url: seasonData.googleDriveUrl,
      thumbnail_url: seasonData.thumbnailUrl,
      total_episodes: seasonData.totalEpisodes || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]);

    if (error) throw error;
    return { success: true, id };
  } catch (error) {
    console.error('Error adding season:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateSeason = async (seasonId: string, seasonData: Partial<Season>) => {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (seasonData.seasonNumber !== undefined) payload.season_number = seasonData.seasonNumber;
    if (seasonData.title !== undefined) payload.title = seasonData.title;
    if (seasonData.description !== undefined) payload.description = seasonData.description;
    if (seasonData.videoUrl !== undefined) payload.video_url = seasonData.videoUrl;
    if (seasonData.downloadUrl !== undefined) payload.download_url = seasonData.downloadUrl;
    if (seasonData.googleDriveUrl !== undefined) payload.google_drive_url = seasonData.googleDriveUrl;
    if (seasonData.thumbnailUrl !== undefined) payload.thumbnail_url = seasonData.thumbnailUrl;
    if (seasonData.totalEpisodes !== undefined) payload.total_episodes = seasonData.totalEpisodes;

    const { error } = await supabase.from('seasons').update(payload).eq('id', seasonId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating season:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteSeason = async (seasonId: string) => {
  try {
    // Delete all episodes in this season first
    await supabase.from('episodes').delete().eq('season_id', seasonId);

    // Then delete the season
    const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting season:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getSeasonsBySeries = async (seriesId: string) => {
  try {
    const { data, error } = await supabase.from('seasons').select('*').eq('series_id', seriesId);
    if (error) throw error;
    
    const seasons = (data as any).map(mapSeason);
    seasons.sort((a: any, b: any) => a.seasonNumber - b.seasonNumber);
    return { success: true, data: seasons };
  } catch (error) {
    console.error('Error getting seasons:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const subscribeToSeasons = (seriesId: string, callback: (seasons: Season[]) => void) => {
  const fetchAndCallback = async () => {
    const res = await getSeasonsBySeries(seriesId);
    if (res.success && res.data) {
      callback(res.data);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`seasons_changes_${seriesId}_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons', filter: `series_id=eq.${seriesId}` }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// --- Episodes Management ---
export const addEpisode = async (episodeData: Omit<Episode, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const id = generateId();
    const { error } = await supabase.from('episodes').insert([{
      id,
      series_id: episodeData.seriesId,
      season_id: episodeData.seasonId,
      episode_number: episodeData.episodeNumber,
      title: episodeData.title,
      description: episodeData.description,
      video_url: episodeData.videoUrl,
      download_url: episodeData.downloadUrl,
      google_drive_url: episodeData.googleDriveUrl,
      thumbnail_url: episodeData.thumbnailUrl,
      duration: episodeData.duration,
      quality: episodeData.quality || [],
      required_packages: episodeData.requiredPackages || [],
      is_adult: episodeData.isAdult ?? false,
      content_purchase_enabled: episodeData.contentPurchaseEnabled ?? false,
      content_price: episodeData.contentPrice ?? 0,
      content_price_days: episodeData.contentPriceDays ?? 30,
      video_embed_code: episodeData.videoEmbedCode ?? '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views: 0
    }]);

    if (error) throw error;

    // Update season episodes count
    const { data: season } = await supabase.from('seasons').select('total_episodes').eq('id', episodeData.seasonId).single();
    if (season) {
      await supabase.from('seasons').update({ total_episodes: (season.total_episodes || 0) + 1 }).eq('id', episodeData.seasonId);
    }

    return { success: true, id };
  } catch (error) {
    console.error('Error adding episode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateEpisode = async (episodeId: string, episodeData: Partial<Episode>) => {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (episodeData.episodeNumber !== undefined) payload.episode_number = episodeData.episodeNumber;
    if (episodeData.title !== undefined) payload.title = episodeData.title;
    if (episodeData.description !== undefined) payload.description = episodeData.description;
    if (episodeData.videoUrl !== undefined) payload.video_url = episodeData.videoUrl;
    if (episodeData.downloadUrl !== undefined) payload.download_url = episodeData.downloadUrl;
    if (episodeData.googleDriveUrl !== undefined) payload.google_drive_url = episodeData.googleDriveUrl;
    if (episodeData.thumbnailUrl !== undefined) payload.thumbnail_url = episodeData.thumbnailUrl;
    if (episodeData.duration !== undefined) payload.duration = episodeData.duration;
    if (episodeData.quality !== undefined) payload.quality = episodeData.quality;
    if (episodeData.requiredPackages !== undefined) payload.required_packages = episodeData.requiredPackages;
    if (episodeData.isAdult !== undefined) payload.is_adult = episodeData.isAdult;
    if (episodeData.contentPurchaseEnabled !== undefined) payload.content_purchase_enabled = episodeData.contentPurchaseEnabled;
    if (episodeData.contentPrice !== undefined) payload.content_price = episodeData.contentPrice;
    if (episodeData.contentPriceDays !== undefined) payload.content_price_days = episodeData.contentPriceDays;
    if (episodeData.videoEmbedCode !== undefined) payload.video_embed_code = episodeData.videoEmbedCode;

    const { error } = await supabase.from('episodes').update(payload).eq('id', episodeId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating episode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteEpisode = async (episodeId: string) => {
  try {
    // Get seasonId before deleting to update count
    const { data: episode } = await supabase.from('episodes').select('season_id').eq('id', episodeId).single();
    
    const { error } = await supabase.from('episodes').delete().eq('id', episodeId);
    if (error) throw error;

    if (episode?.season_id) {
      const { data: season } = await supabase.from('seasons').select('total_episodes').eq('id', episode.season_id).single();
      if (season) {
        await supabase.from('seasons').update({ total_episodes: Math.max(0, (season.total_episodes || 0) - 1) }).eq('id', episode.season_id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting episode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const getEpisodesBySeason = async (seasonId: string) => {
  try {
    const { data, error } = await supabase.from('episodes').select('*').eq('season_id', seasonId);
    if (error) throw error;
    
    const episodes = (data as any).map(mapEpisode);
    episodes.sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);
    return { success: true, data: episodes };
  } catch (error) {
    console.error('Error getting episodes:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
};

export const subscribeToEpisodes = (seasonId: string, callback: (episodes: Episode[]) => void) => {
  const fetchAndCallback = async () => {
    const res = await getEpisodesBySeason(seasonId);
    if (res.success && res.data) {
      callback(res.data);
    }
  };

  fetchAndCallback();

  const channel = supabase.channel(`episodes_changes_${seasonId}_${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'episodes', filter: `season_id=eq.${seasonId}` }, () => {
      fetchAndCallback();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
