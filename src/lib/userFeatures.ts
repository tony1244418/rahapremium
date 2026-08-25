import { supabase } from './supabase';

export interface WatchHistoryEntry {
  id: string;
  userId: string;
  movieId?: string;
  seriesId?: string;
  episodeId?: string;
  contentType: 'movie' | 'episode';
  progress: number; // 0-100
  duration: number; // in seconds
  completed: boolean;
  lastPosition: number; // in seconds
  lastWatched: Date;
  seasonNumber?: number;
  episodeNumber?: number;
}

export const watchHistoryService = {
  async updateWatchHistory(data: Partial<WatchHistoryEntry>): Promise<void> {
    try {
      const historyId = `${data.userId}_${data.movieId || data.episodeId}_${Date.now()}`;

      const historyData = {
        id: historyId,
        user_id: data.userId!,
        movie_id: data.movieId || null,
        series_id: data.seriesId || null,
        episode_id: data.episodeId || null,
        content_type: data.contentType!,
        progress: data.progress!,
        duration: data.duration!,
        completed: data.completed!,
        last_position: data.lastPosition!,
        last_watched: new Date().toISOString(),
        season_number: data.seasonNumber || null,
        episode_number: data.episodeNumber || null,
      };

      const { error } = await supabase
        .from('watch_history')
        .upsert(historyData, { onConflict: 'id' });

      if (error) throw error;
    } catch (error) {
      // Silently fail — watch history is non-critical
      console.error('Error updating watch history:', error);
    }
  },

  async getWatchHistory(userId: string, limitCount: number = 50): Promise<WatchHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .order('last_watched', { ascending: false })
        .limit(limitCount);

      if (error) throw error;

      return ((data as any) || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        movieId: row.movie_id,
        seriesId: row.series_id,
        episodeId: row.episode_id,
        contentType: row.content_type,
        progress: row.progress,
        duration: row.duration,
        completed: row.completed,
        lastPosition: row.last_position,
        lastWatched: new Date(row.last_watched),
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
      }));
    } catch (error) {
      console.error('Error getting watch history:', error);
      return [];
    }
  },

  async getWatchHistoryForContent(userId: string, contentId: string, contentType: 'movie' | 'episode'): Promise<WatchHistoryEntry | null> {
    try {
      const field = contentType === 'movie' ? 'movie_id' : 'episode_id';
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .eq(field, contentId)
        .order('last_watched', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        movieId: data.movie_id,
        seriesId: data.series_id,
        episodeId: data.episode_id,
        contentType: data.content_type,
        progress: data.progress,
        duration: data.duration,
        completed: data.completed,
        lastPosition: data.last_position,
        lastWatched: new Date(data.last_watched),
        seasonNumber: data.season_number,
        episodeNumber: data.episode_number,
      };
    } catch (error) {
      console.error('Error getting watch history for content:', error);
      return null;
    }
  }
};
