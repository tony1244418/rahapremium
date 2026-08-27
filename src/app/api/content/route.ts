import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-memory cache for ultra-fast (sub-20ms) responses
let cache: {
  adult?: { movies: any[]; series: any[]; timestamp: number };
  movies?: { data: any[]; timestamp: number };
  series?: { data: any[]; timestamp: number };
  items: Map<string, { data: any; timestamp: number }>;
} = {
  items: new Map()
};

const CACHE_TTL_MS = 60 * 1000; // 60 seconds memory cache

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'movies';
  const id = searchParams.get('id');
  const now = Date.now();

  try {
    // 1. Adult content (movies + series)
    if (type === 'adult') {
      if (cache.adult && (now - cache.adult.timestamp) < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          movies: cache.adult.movies,
          series: cache.adult.series,
          cached: true
        });
      }

      const [moviesRes, seriesRes] = await Promise.all([
        supabase.from('movies').select('*').eq('is_adult', true),
        supabase.from('series').select('*').eq('is_adult', true)
      ]);

      const movies = (moviesRes.data as any[] || []).filter(m => m.is_active !== false && m.isActive !== false);
      const series = (seriesRes.data as any[] || []).filter(s => s.is_active !== false && s.isActive !== false);

      cache.adult = { movies, series, timestamp: now };

      return NextResponse.json({
        success: true,
        movies,
        series
      });
    }

    // 2. Regular movies
    if (type === 'movies') {
      if (cache.movies && (now - cache.movies.timestamp) < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, data: cache.movies.data, cached: true });
      }

      const { data } = await supabase.from('movies').select('*').eq('is_adult', false);
      const movies = (data as any[] || []).filter(m => m.is_active !== false && m.isActive !== false);
      cache.movies = { data: movies, timestamp: now };

      return NextResponse.json({ success: true, data: movies });
    }

    // 3. Regular series
    if (type === 'series') {
      if (cache.series && (now - cache.series.timestamp) < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, data: cache.series.data, cached: true });
      }

      const { data } = await supabase.from('series').select('*').eq('is_adult', false);
      const seriesList = (data as any[] || []).filter(s => s.is_active !== false && s.isActive !== false);
      cache.series = { data: seriesList, timestamp: now };

      return NextResponse.json({ success: true, data: seriesList });
    }

    // 4. Single movie details
    if (type === 'movie' && id) {
      const cached = cache.items.get(`movie_${id}`);
      if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, data: cached.data, cached: true });
      }

      const { data } = await supabase.from('movies').select('*').eq('id', id).single();
      if (data) {
        cache.items.set(`movie_${id}`, { data, timestamp: now });
      }

      return NextResponse.json({ success: !!data, data });
    }

    // 5. Single series details (with seasons and episodes)
    if (type === 'series_single' && id) {
      const cached = cache.items.get(`series_${id}`);
      if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        return NextResponse.json({ success: true, ...cached.data, cached: true });
      }

      const [{ data: series }, { data: seasons }] = await Promise.all([
        supabase.from('series').select('*').eq('id', id).single(),
        supabase.from('seasons').select('*').eq('series_id', id)
      ]);

      const seasonIds = (seasons as any[] || []).map(s => s.id);
      let episodes: any[] = [];
      if (seasonIds.length > 0) {
        const { data: epData } = await supabase.from('episodes').select('*').in('season_id', seasonIds);
        episodes = epData as any[] || [];
      }

      const payload = { series, seasons: seasons || [], episodes };
      if (series) {
        cache.items.set(`series_${id}`, { data: payload, timestamp: now });
      }

      return NextResponse.json({ success: !!series, ...payload });
    }

    return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/content:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
