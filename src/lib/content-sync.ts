import { supabase } from './supabase';
import { Movie, Series, Story } from '@/types';

export const AUTO_CONTENT_SYNC_INTERVAL_MS = 1000 * 60 * 60 * 2; // 2 hours

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'from', 'this', 'have', 'has', 'are', 'was', 'were', 'will', 'shall', 'into',
  'over', 'under', 'about', 'after', 'before', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'is', 'be', 'or', 'as',
  'na', 'ya', 'kwa', 'hii', 'sana', 'bila', 'katika', 'kwenye'
]);

const MAX_KEYWORDS = 80;

export type ContentSyncSource = 'auto' | 'manual';

export interface ContentSyncSummary {
  moviesChecked: number;
  moviesUpdated: number;
  seriesChecked: number;
  seriesUpdated: number;
  storiesChecked: number;
  storiesUpdated: number;
  totalChecked: number;
  totalUpdated: number;
  durationMs: number;
}

export interface ContentSyncStatus {
  status: 'idle' | 'running';
  runningSince: Date | null;
  lastRunAt: Date | null;
  lastRunSource: ContentSyncSource | null;
  lastRunBy: string | null;
  lastRunSummary: ContentSyncSummary | null;
  lastError: string | null;
}

export const DEFAULT_CONTENT_SYNC_STATUS: ContentSyncStatus = {
  status: 'idle',
  runningSince: null,
  lastRunAt: null,
  lastRunSource: null,
  lastRunBy: null,
  lastRunSummary: null,
  lastError: null
};

// ── Keyword helpers ───────────────────────────────────────────────────────────

const tokenize = (value: string): string[] => {
  if (!value) return [];
  const normalized = value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return normalized.split(/[^a-z0-9]+/).map(t => t.trim()).filter(t => t.length > 1 && !STOP_WORDS.has(t));
};

const keywordSetFromParts = (parts: Array<string | string[] | null | undefined>): string[] => {
  const keywords = new Set<string>();
  parts.forEach(part => {
    if (!part) return;
    if (Array.isArray(part)) {
      part.forEach(entry => {
        if (!entry) return;
        const compact = entry.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        if (compact && compact.length <= 48) keywords.add(compact);
        tokenize(entry).forEach(t => keywords.add(t));
      });
    } else {
      const compact = part.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
      if (compact && compact.length <= 64) keywords.add(compact);
      tokenize(part).forEach(t => keywords.add(t));
    }
  });
  const results = Array.from(keywords).filter(Boolean);
  results.sort();
  return results.length > MAX_KEYWORDS ? results.slice(0, MAX_KEYWORDS) : results;
};

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

// ── Sync state (stored in admin_settings table) ───────────────────────────────

const SYNC_ROW_ID = 'contentSync';

const normalizeDate = (value: any): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const readSyncStatus = (row: any): ContentSyncStatus => {
  let parsedData: any = {};
  if (row?.data) {
    try {
      parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    } catch (e) {
      console.error('Error parsing sync status:', e);
    }
  }
  return {
    status: parsedData?.status === 'running' ? 'running' : 'idle',
    runningSince: normalizeDate(parsedData?.runningSince || parsedData?.running_since),
    lastRunAt: normalizeDate(parsedData?.lastRunAt || parsedData?.last_run_at),
    lastRunSource: parsedData?.lastRunSource || parsedData?.last_run_source || null,
    lastRunBy: parsedData?.lastRunBy || parsedData?.last_run_by || null,
    lastRunSummary: parsedData?.lastRunSummary || parsedData?.last_run_summary || null,
    lastError: parsedData?.lastError || parsedData?.last_error || null,
  };
};

const upsertSyncState = async (patch: Record<string, any>) => {
  const current = await getContentSyncStatus();
  const updatedData = {
    status: patch.status !== undefined ? patch.status : current.status,
    running_since: patch.running_since !== undefined ? patch.running_since : (patch.runningSince !== undefined ? patch.runningSince : current.runningSince),
    last_run_at: patch.last_run_at !== undefined ? patch.last_run_at : (patch.lastRunAt !== undefined ? patch.lastRunAt : current.lastRunAt),
    last_run_source: patch.last_run_source !== undefined ? patch.last_run_source : (patch.lastRunSource !== undefined ? patch.lastRunSource : current.lastRunSource),
    last_run_by: patch.last_run_by !== undefined ? patch.last_run_by : (patch.lastRunBy !== undefined ? patch.lastRunBy : current.lastRunBy),
    last_run_summary: patch.last_run_summary !== undefined ? patch.last_run_summary : (patch.lastRunSummary !== undefined ? patch.lastRunSummary : current.lastRunSummary),
    last_error: patch.last_error !== undefined ? patch.last_error : (patch.lastError !== undefined ? patch.lastError : current.lastError),
  };

  await supabase.from('admin_settings').upsert({
    id: SYNC_ROW_ID,
    data: updatedData,
    updated_at: new Date().toISOString()
  });
};

export const getContentSyncStatus = async (): Promise<ContentSyncStatus> => {
  try {
    const { data } = await supabase.from('admin_settings').select('*').eq('id', SYNC_ROW_ID).maybeSingle();
    return data ? readSyncStatus(data) : DEFAULT_CONTENT_SYNC_STATUS;
  } catch {
    return DEFAULT_CONTENT_SYNC_STATUS;
  }
};

// ── Per-collection sync (update search_keywords in Supabase) ──────────────────

interface SyncCollectionResult { checked: number; updated: number; }

const syncMovies = async (): Promise<SyncCollectionResult> => {
  const { data: rows } = await supabase.from('mods').select('id, title, description, director, language, genre, cast, required_packages, search_keywords, synced_at').eq('type', 'movie');
  let updated = 0;
  for (const row of ((rows as any) || [])) {
    const keywords = keywordSetFromParts([row.title, row.description, row.director, row.language, row.genre, row.cast, row.required_packages]);
    const existing = Array.isArray(row.search_keywords) ? [...row.search_keywords].sort() : [];
    if (!arraysEqual(keywords, existing) || !row.synced_at) {
      await supabase.from('mods').update({ search_keywords: keywords, synced_at: new Date().toISOString() }).eq('id', row.id);
      updated++;
    }
  }
  return { checked: ((rows as any) || []).length, updated };
};

const syncSeries = async (): Promise<SyncCollectionResult> => {
  const { data: rows } = await supabase.from('series').select('id, title, description, language, genre, cast, required_packages, search_keywords, synced_at');
  let updated = 0;
  for (const row of ((rows as any) || [])) {
    const keywords = keywordSetFromParts([row.title, row.description, row.language, row.genre, row.cast, row.required_packages]);
    const existing = Array.isArray(row.search_keywords) ? [...row.search_keywords].sort() : [];
    if (!arraysEqual(keywords, existing) || !row.synced_at) {
      await supabase.from('series').update({ search_keywords: keywords, synced_at: new Date().toISOString() }).eq('id', row.id);
      updated++;
    }
  }
  return { checked: ((rows as any) || []).length, updated };
};

const syncStories = async (): Promise<SyncCollectionResult> => {
  // Stories table may not exist — skip gracefully
  try {
    const { data: rows } = await supabase.from('stories').select('id, title, content, author, language, genre, required_packages, search_keywords, synced_at');
    let updated = 0;
    for (const row of ((rows as any) || [])) {
      const keywords = keywordSetFromParts([row.title, row.content, row.author, row.language, row.genre, row.required_packages]);
      const existing = Array.isArray(row.search_keywords) ? [...row.search_keywords].sort() : [];
      if (!arraysEqual(keywords, existing) || !row.synced_at) {
        await supabase.from('stories').update({ search_keywords: keywords, synced_at: new Date().toISOString() }).eq('id', row.id);
        updated++;
      }
    }
    return { checked: ((rows as any) || []).length, updated };
  } catch {
    return { checked: 0, updated: 0 };
  }
};

// ── Main sync ─────────────────────────────────────────────────────────────────

export const synchronizeContentLibrary = async ({
  source,
  requestedBy
}: {
  source: ContentSyncSource;
  requestedBy?: string | null;
}): Promise<{ summary: ContentSyncSummary; status: ContentSyncStatus }> => {
  // Check if already running
  const current = await getContentSyncStatus();
  if (current.status === 'running') throw new Error('SYNC_ALREADY_RUNNING');

  await upsertSyncState({
    status: 'running',
    running_since: new Date().toISOString(),
    last_run_source: source,
    last_run_by: requestedBy ?? null,
    last_error: null,
  });

  const startedAt = Date.now();
  const summary: ContentSyncSummary = {
    moviesChecked: 0, moviesUpdated: 0,
    seriesChecked: 0, seriesUpdated: 0,
    storiesChecked: 0, storiesUpdated: 0,
    totalChecked: 0, totalUpdated: 0,
    durationMs: 0
  };

  try {
    const [movies, series, stories] = await Promise.all([syncMovies(), syncSeries(), syncStories()]);
    summary.moviesChecked = movies.checked;
    summary.moviesUpdated = movies.updated;
    summary.seriesChecked = series.checked;
    summary.seriesUpdated = series.updated;
    summary.storiesChecked = stories.checked;
    summary.storiesUpdated = stories.updated;
    summary.totalChecked = movies.checked + series.checked + stories.checked;
    summary.totalUpdated = movies.updated + series.updated + stories.updated;
    summary.durationMs = Date.now() - startedAt;

    await upsertSyncState({
      status: 'idle',
      running_since: null,
      last_run_at: new Date().toISOString(),
      last_run_source: source,
      last_run_by: requestedBy ?? null,
      last_run_summary: summary,
      last_error: null,
    });
  } catch (error: any) {
    console.error('Content sync failed:', error);
    await upsertSyncState({
      status: 'idle',
      running_since: null,
      last_run_at: new Date().toISOString(),
      last_run_source: source,
      last_run_by: requestedBy ?? null,
      last_run_summary: summary,
      last_error: error instanceof Error ? error.message : 'Content sync failed',
    });
    throw error;
  }

  const status = await getContentSyncStatus();
  return { summary, status };
};

// Polling-based subscription (replaces Firestore onSnapshot)
export const subscribeToContentSyncStatus = (
  callback: (status: ContentSyncStatus) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let cancelled = false;

  const fetch = async () => {
    try {
      const status = await getContentSyncStatus();
      if (!cancelled) callback(status);
    } catch (err) {
      if (onError && err instanceof Error) onError(err);
    }
  };

  fetch();
  const intervalId = setInterval(fetch, 5000); // poll every 5s while sync may be running

  return () => {
    cancelled = true;
    clearInterval(intervalId);
  };
};
