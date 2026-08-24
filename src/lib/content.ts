import { supabase } from './supabase';
import { Movie, Series, Story, Episode, Season, User, SubscriptionPackage, Game } from '@/types';

// Convert Google Drive share link to embed link
export const convertGoogleDriveUrl = (shareUrl: string): string => {
  if (!shareUrl) return '';

  // Extract file ID from various Google Drive URL formats
  const fileIdRegex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = shareUrl.match(fileIdRegex);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return shareUrl;
};

// Helper to safely convert timestamps to dates
const toDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date(0);
  return new Date(dateStr);
};

// --- Movie Display Order (Number Based) ---
const applyMovieOrder = (movies: Movie[], orders: Record<string, number>): Movie[] => {
  return movies.map(m => ({ ...m, sortOrder: orders[m.id] || 0 })).sort((a, b) => {
    const orderA = a.sortOrder!;
    const orderB = b.sortOrder!;
    if (orderA !== orderB) return orderA - orderB;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
};

const fetchMovieSortOrders = async (): Promise<Record<string, number>> => {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('data')
      .eq('id', 'movie_sort_orders')
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

// Movies
export const getMovies = async (isAdult: boolean = false, requiredPackages?: SubscriptionPackage[]): Promise<Movie[]> => {
  try {
    const [{ data, error }, orders] = await Promise.all([
      supabase
        .from('movies')
        .select('*')
        .eq('is_active', true)
        .eq('is_adult', isAdult)
        .order('created_at', { ascending: false }),
      isAdult ? Promise.resolve({}) : fetchMovieSortOrders(),
    ]);

    if (error) throw error;

    const mapped = ((data as any) || []).map((movie: any) => ({
      ...movie,
      id: movie.id,
      title: movie.title,
      description: movie.description,
      videoUrl: movie.video_url,
      downloadUrl: movie.download_url,
      googleDriveUrl: movie.google_drive_url,
      thumbnailUrl: movie.thumbnail_url,
      duration: movie.duration,
      releaseDate: toDate(movie.release_date),
      genre: movie.genre || [],
      language: movie.language,
      quality: movie.quality || [],
      requiredPackages: movie.required_packages || [],
      createdAt: toDate(movie.created_at),
      updatedAt: toDate(movie.updated_at),
      views: movie.views,
      isActive: movie.is_active,
      isAdult: movie.is_adult,
      adultCategory: movie.adult_category,
      rating: movie.rating,
      cast: movie.cast_list || [],
      director: movie.director,
      searchKeywords: movie.search_keywords || [],
      contentPurchaseEnabled: movie.content_purchase_enabled,
      contentPrice: movie.content_price,
      contentPriceDays: movie.content_price_days,
      contentPurchasePackages: movie.content_purchase_packages || [],
      videoEmbedCode: movie.video_embed_code,
    })) as Movie[];

    return applyMovieOrder(mapped, orders);
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
};

export const getMovieById = async (id: string): Promise<Movie | null> => {
  try {
    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !movie) return null;

    return {
      ...(movie as any),
      id: (movie as any).id,
      title: (movie as any).title,
      description: (movie as any).description,
      videoUrl: (movie as any).video_url,
      downloadUrl: (movie as any).download_url,
      googleDriveUrl: (movie as any).google_drive_url,
      thumbnailUrl: (movie as any).thumbnail_url,
      duration: (movie as any).duration,
      releaseDate: toDate((movie as any).release_date),
      genre: (movie as any).genre || [],
      language: (movie as any).language,
      quality: (movie as any).quality || [],
      requiredPackages: (movie as any).required_packages || [],
      createdAt: toDate((movie as any).created_at),
      updatedAt: toDate((movie as any).updated_at),
      views: (movie as any).views,
      isActive: (movie as any).is_active,
      isAdult: (movie as any).is_adult,
      adultCategory: (movie as any).adult_category,
      rating: (movie as any).rating,
      cast: (movie as any).cast_list || [],
      director: (movie as any).director,
      searchKeywords: (movie as any).search_keywords || [],
      contentPurchaseEnabled: (movie as any).content_purchase_enabled,
      contentPrice: (movie as any).content_price,
      contentPriceDays: (movie as any).content_price_days,
      contentPurchasePackages: (movie as any).content_purchase_packages || [],
      videoEmbedCode: (movie as any).video_embed_code,
    } as Movie;
  } catch (error) {
    console.error('Error fetching movie:', error);
    return null;
  }
};

export const incrementMovieViews = async (movieId: string): Promise<void> => {
  try {
    // We fetch current then add, or we could use an RPC
    const { data } = await supabase.from('movies').select('views').eq('id', movieId).single();
    if (data) {
      await supabase.from('movies').update({ views: ((data as any).views || 0) + 1 }).eq('id', movieId);
    }
  } catch (error) {
    console.error('Error incrementing movie views:', error);
  }
};

// Series
export const getSeries = async (isAdult: boolean = false, requiredPackages?: SubscriptionPackage[]): Promise<Series[]> => {
  try {
    const { data: seriesList, error } = await supabase
      .from('series')
      .select(`
        *,
        seasons:seasons (
          *,
          episodes:episodes (*)
        )
      `)
      .eq('is_active', true)
      .eq('is_adult', isAdult)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (seriesList || []).map((series: any) => {
      const seasons = (series.seasons || []).map((season: any) => {
        const episodes = (season.episodes || []).map((episode: any) => ({
          ...episode,
          id: (episode as any).id,
          seriesId: (episode as any).series_id,
          seasonId: (episode as any).season_id,
          episodeNumber: (episode as any).episode_number,
          videoUrl: (episode as any).video_url,
          downloadUrl: episode.download_url,
          googleDriveUrl: episode.google_drive_url,
          thumbnailUrl: episode.thumbnail_url,
          requiredPackages: episode.required_packages || [],
          isAdult: episode.is_adult,
          createdAt: toDate(episode.created_at),
          updatedAt: toDate(episode.updated_at),
          contentPurchaseEnabled: episode.content_purchase_enabled,
          contentPrice: episode.content_price,
          contentPriceDays: episode.content_price_days,
          videoEmbedCode: episode.video_embed_code,
        })).sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);

        return {
          ...season,
          id: season.id,
          seriesId: season.series_id,
          seasonNumber: season.season_number,
          videoUrl: season.video_url,
          downloadUrl: season.download_url,
          googleDriveUrl: (season as any).google_drive_url,
          thumbnailUrl: (season as any).thumbnail_url,
          totalEpisodes: (season as any).total_episodes,
          createdAt: toDate((season as any).created_at),
          updatedAt: toDate((season as any).updated_at),
          episodes
        };
      }).sort((a: any, b: any) => a.seasonNumber - b.seasonNumber);

      return {
        ...series,
        id: series.id,
        thumbnailUrl: series.thumbnail_url,
        totalSeasons: series.total_seasons,
        requiredPackages: series.required_packages || [],
        createdAt: toDate(series.created_at),
        updatedAt: toDate(series.updated_at),
        isActive: series.is_active,
        isAdult: series.is_adult,
        adultCategory: series.adult_category,
        cast: series.cast_list || [],
        searchKeywords: series.search_keywords || [],
        contentPurchaseEnabled: series.content_purchase_enabled,
        contentPrice: series.content_price,
        contentPriceDays: series.content_price_days,
        contentPurchasePackages: series.content_purchase_packages || [],
        videoEmbedCode: series.video_embed_code,
        seasons
      } as Series;
    });
  } catch (error) {
    console.error('Error fetching series:', error);
    return [];
  }
};

export const getSeriesById = async (id: string): Promise<Series | null> => {
  try {
    const { data: series, error } = await supabase
      .from('series')
      .select(`
        *,
        seasons:seasons (
          *,
          episodes:episodes (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !series) return null;

    const seasons = (series.seasons || []).map((season: any) => {
      const episodes = (season.episodes || []).map((episode: any) => ({
        ...episode,
        id: (episode as any).id,
        seriesId: (episode as any).series_id,
        seasonId: (episode as any).season_id,
        episodeNumber: (episode as any).episode_number,
        videoUrl: (episode as any).video_url,
        downloadUrl: episode.download_url,
        googleDriveUrl: episode.google_drive_url,
        thumbnailUrl: episode.thumbnail_url,
        requiredPackages: episode.required_packages || [],
        isAdult: episode.is_adult,
        createdAt: toDate(episode.created_at),
        updatedAt: toDate(episode.updated_at),
        contentPurchaseEnabled: episode.content_purchase_enabled,
        contentPrice: episode.content_price,
        contentPriceDays: episode.content_price_days,
        videoEmbedCode: episode.video_embed_code,
      })).sort((a: any, b: any) => a.episodeNumber - b.episodeNumber);

      return {
        ...season,
        id: season.id,
        seriesId: season.series_id,
        seasonNumber: season.season_number,
        videoUrl: season.video_url,
        downloadUrl: season.download_url,
        googleDriveUrl: season.google_drive_url,
        thumbnailUrl: season.thumbnail_url,
        totalEpisodes: season.total_episodes,
        createdAt: toDate(season.created_at),
        updatedAt: toDate(season.updated_at),
        episodes
      };
    }).sort((a: any, b: any) => a.seasonNumber - b.seasonNumber);

    return {
      ...series,
      id: series.id,
      thumbnailUrl: series.thumbnail_url,
      totalSeasons: series.total_seasons,
      requiredPackages: series.required_packages || [],
      createdAt: toDate(series.created_at),
      updatedAt: toDate(series.updated_at),
      isActive: series.is_active,
      isAdult: series.is_adult,
      adultCategory: series.adult_category,
      cast: series.cast_list || [],
      searchKeywords: series.search_keywords || [],
      contentPurchaseEnabled: series.content_purchase_enabled,
      contentPrice: series.content_price,
      contentPriceDays: series.content_price_days,
      contentPurchasePackages: series.content_purchase_packages || [],
      videoEmbedCode: series.video_embed_code,
      seasons
    } as Series;
  } catch (error) {
    console.error('Error fetching series:', error);
    return null;
  }
};

export const incrementSeriesViews = async (seriesId: string): Promise<void> => {
  try {
    const { data } = await supabase.from('series').select('views').eq('id', seriesId).single();
    if (data) {
      await supabase.from('series').update({ views: (data.views || 0) + 1 }).eq('id', seriesId);
    }
  } catch (error) {
    console.error('Error incrementing series views:', error);
  }
};

// Stories
export const getStories = async (): Promise<Story[]> => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(story => ({
      ...story,
      id: story.id,
      estimatedReadTime: story.estimated_read_time,
      thumbnailUrl: story.thumbnail_url,
      requiredPackages: story.required_packages || [],
      createdAt: toDate(story.created_at),
      updatedAt: toDate(story.updated_at),
      isActive: story.is_active,
      isAdult: story.is_adult,
      searchKeywords: story.search_keywords || [],
    })) as Story[];
  } catch (error) {
    console.error('Error fetching stories:', error);
    return [];
  }
};

export const getStoryById = async (id: string): Promise<Story | null> => {
  try {
    const { data: story, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !story) return null;

    return {
      ...story,
      id: story.id,
      estimatedReadTime: story.estimated_read_time,
      thumbnailUrl: story.thumbnail_url,
      requiredPackages: story.required_packages || [],
      createdAt: toDate(story.created_at),
      updatedAt: toDate(story.updated_at),
      isActive: story.is_active,
      isAdult: story.is_adult,
      searchKeywords: story.search_keywords || [],
    } as Story;
  } catch (error) {
    console.error('Error fetching story:', error);
    return null;
  }
};

export const incrementStoryViews = async (storyId: string): Promise<void> => {
  try {
    const { data } = await supabase.from('stories').select('views').eq('id', storyId).single();
    if (data) {
      await supabase.from('stories').update({ views: (data.views || 0) + 1 }).eq('id', storyId);
    }
  } catch (error) {
    console.error('Error incrementing story views:', error);
  }
};

// Subscriptions
export const subscribeToMovies = (callback: (movies: Movie[]) => void, isAdult: boolean = false) => {
  // Using polling for now since Realtime setup might be overkill for content lists
  const fetchInterval = setInterval(async () => {
    const movies = await getMovies(isAdult);
    callback(movies);
  }, 30000); // 30s

  // Initial fetch
  getMovies(isAdult).then(callback);

  return () => clearInterval(fetchInterval);
};

export const subscribeToSeries = (callback: (series: Series[]) => void, isAdult: boolean = false) => {
  const fetchInterval = setInterval(async () => {
    const series = await getSeries(isAdult);
    callback(series);
  }, 30000); // 30s

  // Initial fetch
  getSeries(isAdult).then(callback);

  return () => clearInterval(fetchInterval);
};

export const subscribeToStories = (callback: (stories: Story[]) => void) => {
  const fetchInterval = setInterval(async () => {
    const stories = await getStories();
    callback(stories);
  }, 30000); // 30s

  // Initial fetch
  getStories().then(callback);

  return () => clearInterval(fetchInterval);
};

// Admin specific functions below
export const addMovie = async (movieData: Omit<Movie, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const { data, error } = await supabase.from('movies').insert({
      id: crypto.randomUUID(),
      title: movieData.title,
      description: movieData.description,
      video_url: movieData.videoUrl,
      download_url: movieData.downloadUrl,
      google_drive_url: movieData.googleDriveUrl,
      thumbnail_url: movieData.thumbnailUrl,
      duration: movieData.duration,
      release_date: movieData.releaseDate ? movieData.releaseDate.toISOString() : null,
      genre: movieData.genre || [],
      language: movieData.language,
      quality: movieData.quality || [],
      required_packages: movieData.requiredPackages || [],
      views: 0,
      is_active: movieData.isActive !== undefined ? movieData.isActive : true,
      is_adult: movieData.isAdult || false,
      adult_category: movieData.adultCategory,
      rating: movieData.rating || 0,
      cast_list: movieData.cast || [],
      director: movieData.director,
      search_keywords: movieData.searchKeywords || [],
      content_purchase_enabled: movieData.contentPurchaseEnabled || false,
      content_price: movieData.contentPrice,
      content_price_days: movieData.contentPriceDays,
      content_purchase_packages: movieData.contentPurchasePackages || [],
      video_embed_code: movieData.videoEmbedCode,
    }).select().single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding movie:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateMovie = async (movieId: string, movieData: Partial<Movie>) => {
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    
    if (movieData.title !== undefined) updatePayload.title = movieData.title;
    if (movieData.description !== undefined) updatePayload.description = movieData.description;
    if (movieData.videoUrl !== undefined) updatePayload.video_url = movieData.videoUrl;
    if (movieData.downloadUrl !== undefined) updatePayload.download_url = movieData.downloadUrl;
    if (movieData.googleDriveUrl !== undefined) updatePayload.google_drive_url = movieData.googleDriveUrl;
    if (movieData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = movieData.thumbnailUrl;
    if (movieData.duration !== undefined) updatePayload.duration = movieData.duration;
    if (movieData.releaseDate !== undefined) updatePayload.release_date = movieData.releaseDate ? movieData.releaseDate.toISOString() : null;
    if (movieData.genre !== undefined) updatePayload.genre = movieData.genre;
    if (movieData.language !== undefined) updatePayload.language = movieData.language;
    if (movieData.quality !== undefined) updatePayload.quality = movieData.quality;
    if (movieData.requiredPackages !== undefined) updatePayload.required_packages = movieData.requiredPackages;
    if (movieData.isActive !== undefined) updatePayload.is_active = movieData.isActive;
    if (movieData.isAdult !== undefined) updatePayload.is_adult = movieData.isAdult;
    if (movieData.adultCategory !== undefined) updatePayload.adult_category = movieData.adultCategory;
    if (movieData.rating !== undefined) updatePayload.rating = movieData.rating;
    if (movieData.cast !== undefined) updatePayload.cast_list = movieData.cast;
    if (movieData.director !== undefined) updatePayload.director = movieData.director;
    if (movieData.searchKeywords !== undefined) updatePayload.search_keywords = movieData.searchKeywords;
    if (movieData.contentPurchaseEnabled !== undefined) updatePayload.content_purchase_enabled = movieData.contentPurchaseEnabled;
    if (movieData.contentPrice !== undefined) updatePayload.content_price = movieData.contentPrice;
    if (movieData.contentPriceDays !== undefined) updatePayload.content_price_days = movieData.contentPriceDays;
    if (movieData.contentPurchasePackages !== undefined) updatePayload.content_purchase_packages = movieData.contentPurchasePackages;
    if (movieData.videoEmbedCode !== undefined) updatePayload.video_embed_code = movieData.videoEmbedCode;

    const { error } = await supabase.from('movies').update(updatePayload).eq('id', movieId);
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating movie:', error);
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

// ... Similar Admin wrappers for Series, Seasons, Episodes
export const addSeries = async (seriesData: Omit<Series, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'seasons'>) => {
  try {
    const { data, error } = await supabase.from('series').insert({
      id: crypto.randomUUID(),
      title: seriesData.title,
      description: seriesData.description,
      thumbnail_url: seriesData.thumbnailUrl,
      genre: seriesData.genre || [],
      language: seriesData.language,
      total_seasons: seriesData.totalSeasons || 0,
      required_packages: seriesData.requiredPackages || [],
      views: 0,
      is_active: seriesData.isActive !== undefined ? seriesData.isActive : true,
      is_adult: seriesData.isAdult || false,
      adult_category: seriesData.adultCategory,
      rating: seriesData.rating || 0,
      cast_list: seriesData.cast || [],
      search_keywords: seriesData.searchKeywords || [],
      content_purchase_enabled: seriesData.contentPurchaseEnabled || false,
      content_price: seriesData.contentPrice,
      content_price_days: seriesData.contentPriceDays,
      content_purchase_packages: seriesData.contentPurchasePackages || [],
      video_embed_code: seriesData.videoEmbedCode,
    }).select().single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding series:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateSeries = async (seriesId: string, seriesData: Partial<Series>) => {
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    
    if (seriesData.title !== undefined) updatePayload.title = seriesData.title;
    if (seriesData.description !== undefined) updatePayload.description = seriesData.description;
    if (seriesData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = seriesData.thumbnailUrl;
    if (seriesData.genre !== undefined) updatePayload.genre = seriesData.genre;
    if (seriesData.language !== undefined) updatePayload.language = seriesData.language;
    if (seriesData.totalSeasons !== undefined) updatePayload.total_seasons = seriesData.totalSeasons;
    if (seriesData.requiredPackages !== undefined) updatePayload.required_packages = seriesData.requiredPackages;
    if (seriesData.isActive !== undefined) updatePayload.is_active = seriesData.isActive;
    if (seriesData.isAdult !== undefined) updatePayload.is_adult = seriesData.isAdult;
    if (seriesData.adultCategory !== undefined) updatePayload.adult_category = seriesData.adultCategory;
    if (seriesData.rating !== undefined) updatePayload.rating = seriesData.rating;
    if (seriesData.cast !== undefined) updatePayload.cast_list = seriesData.cast;
    if (seriesData.searchKeywords !== undefined) updatePayload.search_keywords = seriesData.searchKeywords;
    if (seriesData.contentPurchaseEnabled !== undefined) updatePayload.content_purchase_enabled = seriesData.contentPurchaseEnabled;
    if (seriesData.contentPrice !== undefined) updatePayload.content_price = seriesData.contentPrice;
    if (seriesData.contentPriceDays !== undefined) updatePayload.content_price_days = seriesData.contentPriceDays;
    if (seriesData.contentPurchasePackages !== undefined) updatePayload.content_purchase_packages = seriesData.contentPurchasePackages;
    if (seriesData.videoEmbedCode !== undefined) updatePayload.video_embed_code = seriesData.videoEmbedCode;

    const { error } = await supabase.from('series').update(updatePayload).eq('id', seriesId);
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

export const addSeason = async (seasonData: Omit<Season, 'id' | 'createdAt' | 'updatedAt' | 'episodes'>) => {
  try {
    const { data, error } = await supabase.from('seasons').insert({
      id: crypto.randomUUID(),
      series_id: seasonData.seriesId,
      season_number: seasonData.seasonNumber,
      title: seasonData.title,
      description: seasonData.description,
      video_url: seasonData.videoUrl,
      download_url: seasonData.downloadUrl,
      google_drive_url: seasonData.googleDriveUrl,
      thumbnail_url: seasonData.thumbnailUrl,
      total_episodes: seasonData.totalEpisodes || 0,
    }).select().single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding season:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateSeason = async (seasonId: string, seasonData: Partial<Season>) => {
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    
    if (seasonData.seasonNumber !== undefined) updatePayload.season_number = seasonData.seasonNumber;
    if (seasonData.title !== undefined) updatePayload.title = seasonData.title;
    if (seasonData.description !== undefined) updatePayload.description = seasonData.description;
    if (seasonData.videoUrl !== undefined) updatePayload.video_url = seasonData.videoUrl;
    if (seasonData.downloadUrl !== undefined) updatePayload.download_url = seasonData.downloadUrl;
    if (seasonData.googleDriveUrl !== undefined) updatePayload.google_drive_url = seasonData.googleDriveUrl;
    if (seasonData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = seasonData.thumbnailUrl;
    if (seasonData.totalEpisodes !== undefined) updatePayload.total_episodes = seasonData.totalEpisodes;

    const { error } = await supabase.from('seasons').update(updatePayload).eq('id', seasonId);
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating season:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteSeason = async (seasonId: string) => {
  try {
    const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting season:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const addEpisode = async (episodeData: Omit<Episode, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const { data, error } = await supabase.from('episodes').insert({
      id: crypto.randomUUID(),
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
      is_adult: episodeData.isAdult || false,
      views: 0,
      content_purchase_enabled: episodeData.contentPurchaseEnabled || false,
      content_price: episodeData.contentPrice,
      content_price_days: episodeData.contentPriceDays,
      video_embed_code: episodeData.videoEmbedCode,
    }).select().single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding episode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateEpisode = async (episodeId: string, episodeData: Partial<Episode>) => {
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    
    if (episodeData.episodeNumber !== undefined) updatePayload.episode_number = episodeData.episodeNumber;
    if (episodeData.title !== undefined) updatePayload.title = episodeData.title;
    if (episodeData.description !== undefined) updatePayload.description = episodeData.description;
    if (episodeData.videoUrl !== undefined) updatePayload.video_url = episodeData.videoUrl;
    if (episodeData.downloadUrl !== undefined) updatePayload.download_url = episodeData.downloadUrl;
    if (episodeData.googleDriveUrl !== undefined) updatePayload.google_drive_url = episodeData.googleDriveUrl;
    if (episodeData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = episodeData.thumbnailUrl;
    if (episodeData.duration !== undefined) updatePayload.duration = episodeData.duration;
    if (episodeData.quality !== undefined) updatePayload.quality = episodeData.quality;
    if (episodeData.requiredPackages !== undefined) updatePayload.required_packages = episodeData.requiredPackages;
    if (episodeData.isAdult !== undefined) updatePayload.is_adult = episodeData.isAdult;
    if (episodeData.contentPurchaseEnabled !== undefined) updatePayload.content_purchase_enabled = episodeData.contentPurchaseEnabled;
    if (episodeData.contentPrice !== undefined) updatePayload.content_price = episodeData.contentPrice;
    if (episodeData.contentPriceDays !== undefined) updatePayload.content_price_days = episodeData.contentPriceDays;
    if (episodeData.videoEmbedCode !== undefined) updatePayload.video_embed_code = episodeData.videoEmbedCode;

    const { error } = await supabase.from('episodes').update(updatePayload).eq('id', episodeId);
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating episode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteEpisode = async (episodeId: string) => {
  try {
    const { error } = await supabase.from('episodes').delete().eq('id', episodeId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting episode:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const addStory = async (storyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt' | 'views'>) => {
  try {
    const { data, error } = await supabase.from('stories').insert({
      id: crypto.randomUUID(),
      title: storyData.title,
      content: storyData.content,
      author: storyData.author,
      genre: storyData.genre || [],
      language: storyData.language,
      estimated_read_time: storyData.estimatedReadTime,
      thumbnail_url: storyData.thumbnailUrl,
      required_packages: storyData.requiredPackages || [],
      views: 0,
      is_active: storyData.isActive !== undefined ? storyData.isActive : true,
      is_adult: storyData.isAdult || false,
      rating: storyData.rating || 0,
      search_keywords: storyData.searchKeywords || [],
    }).select().single();

    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error adding story:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateStory = async (storyId: string, storyData: Partial<Story>) => {
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() };
    
    if (storyData.title !== undefined) updatePayload.title = storyData.title;
    if (storyData.content !== undefined) updatePayload.content = storyData.content;
    if (storyData.author !== undefined) updatePayload.author = storyData.author;
    if (storyData.genre !== undefined) updatePayload.genre = storyData.genre;
    if (storyData.language !== undefined) updatePayload.language = storyData.language;
    if (storyData.estimatedReadTime !== undefined) updatePayload.estimated_read_time = storyData.estimatedReadTime;
    if (storyData.thumbnailUrl !== undefined) updatePayload.thumbnail_url = storyData.thumbnailUrl;
    if (storyData.requiredPackages !== undefined) updatePayload.required_packages = storyData.requiredPackages;
    if (storyData.isActive !== undefined) updatePayload.is_active = storyData.isActive;
    if (storyData.isAdult !== undefined) updatePayload.is_adult = storyData.isAdult;
    if (storyData.rating !== undefined) updatePayload.rating = storyData.rating;
    if (storyData.searchKeywords !== undefined) updatePayload.search_keywords = storyData.searchKeywords;

    const { error } = await supabase.from('stories').update(updatePayload).eq('id', storyId);
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

export const searchContent = async (query: string, type: 'movies' | 'series' | 'stories' | 'all' = 'all', isAdult: boolean = false) => {
  const lowercaseQuery = query?.toLowerCase() || '';
  let results = { movies: [] as any[], series: [] as any[], stories: [] as any[] };
  
  if (type === 'all' || type === 'movies') {
    // Note: getMovies() fetches non-adult movies by default. If we need to search adult movies too, we should fetch both or update getMovies.
    // For now, let's fetch based on the isAdult flag to allow searching adult content if the user is an adult.
    // Actually, let's fetch both if isAdult is true to be safe, or just follow the existing logic.
    // Existing logic just called getMovies() which defaults to isAdult=false. We'll pass the isAdult flag so adult users search adult content, or if they want all, we might need a custom query. Let's keep it simple and fix the crash first.
    // Wait, the existing code has `(isAdult ? true : !m.isAdult)` which implies `movies` could contain both. To allow it to contain both, we should really query without the isAdult filter, but getMovies enforces it. 
    // Let's just fix the crash.
    const movies = await getMovies();
    let adultMovies: any[] = [];
    if (isAdult) {
      adultMovies = await getMovies(true);
    }
    const allMovies = [...movies, ...adultMovies];
    
    results.movies = allMovies.filter(m => 
      ((m.title || '').toLowerCase().includes(lowercaseQuery) || (m.description || '').toLowerCase().includes(lowercaseQuery)) && 
      (isAdult ? true : !m.isAdult)
    );
  }
  if (type === 'all' || type === 'series') {
    const series = await getSeries();
    let adultSeries: any[] = [];
    if (isAdult) {
      adultSeries = await getSeries(true);
    }
    const allSeries = [...series, ...adultSeries];
    
    results.series = allSeries.filter(s => 
      ((s.title || '').toLowerCase().includes(lowercaseQuery) || (s.description || '').toLowerCase().includes(lowercaseQuery)) && 
      (isAdult ? true : !s.isAdult)
    );
  }
  if (type === 'all' || type === 'stories') {
    const stories = await getStories();
    results.stories = stories.filter(s => 
      ((s.title || '').toLowerCase().includes(lowercaseQuery) || (s.content || '').toLowerCase().includes(lowercaseQuery)) && 
      (isAdult ? true : !s.isAdult)
    );
  }
  return results;
};

export const checkContentAccess = (user: User | null, content: any): boolean => {
  // Admin override — when "All Content Free" is ON, everything is unlocked.
  try {
    const { isAllContentFree } = require('./subscriptions');
    if (typeof isAllContentFree === 'function' && isAllContentFree()) return true;
  } catch {
    /* ignore */
  }

  // Support being called with either an array of requiredPackages OR a full content object
  const requiredPackages: string[] = Array.isArray(content)
    ? content
    : (content?.requiredPackages || []);

  // No required packages = open to all
  if (requiredPackages.length === 0) return true;

  if (!user) return false;

  // Check isFree flag on content object (only relevant when a full object is passed)
  if (!Array.isArray(content) && content?.isFree) return true;

  if (!user.subscription || !user.subscription.isActive) return false;

  const { getPackageHierarchy } = require('./subscriptions');
  const hierarchy = getPackageHierarchy();
  const userPackageIndex = hierarchy.indexOf(user.subscription.packageType);

  return requiredPackages.some((pkg: string) => {
    const requiredIndex = hierarchy.indexOf(pkg);
    return userPackageIndex >= requiredIndex;
  });
};

// Increment episode views
export const incrementEpisodeViews = async (episodeId: string): Promise<void> => {
  try {
    const { data: ep } = await supabase.from('episodes').select('views').eq('id', episodeId).single();
    if (ep) {
      await supabase.from('episodes').update({ views: (ep.views || 0) + 1 }).eq('id', episodeId);
    }
  } catch (error) {
    console.error('Error incrementing episode views:', error);
  }
};

