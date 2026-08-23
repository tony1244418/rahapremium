'use client';

// ────────────────────────────────────────────────────────────────────────────
// Live TV (token-service reference page)
//
// Minimal channel list + DASH player wired to the token service via the
// server-side /api/cdn-token and /api/play/<channel> proxies.
//
// Replace SAMPLE_CHANNELS with your own list (or load them from Supabase like
// the production /live-tv page does). The `id` must match the channel name the
// token service expects (e.g. "AzamOne").
// ────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import nextDynamic from 'next/dynamic';

// Shaka touches `window`, so load the player only on the client.
const CdnLiveStreamPlayer = nextDynamic(() => import('@/components/CdnLiveStreamPlayer'), {
  ssr: false,
});

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface SampleChannel {
  id: string; // must match the token service channel name
  name: string;
}

const SAMPLE_CHANNELS: SampleChannel[] = [
  { id: 'AzamOne', name: 'Azam One' },
  { id: 'AzamTwo', name: 'Azam Two' },
  { id: 'AzamSports1', name: 'Azam Sports 1' },
];

export default function LiveTvDemoPage() {
  const [selected, setSelected] = useState<SampleChannel | null>(null);

  return (
    <div className="min-h-screen text-white p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Live TV</h1>

      {selected && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{selected.name}</h2>
            <button
              onClick={() => setSelected(null)}
              className="text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
          {/* key forces a full remount on channel switch → clean teardown/init */}
          <CdnLiveStreamPlayer key={selected.id} channel={selected.id} title={selected.name} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {SAMPLE_CHANNELS.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelected(ch)}
            className={`group rounded-xl border p-4 text-left transition-all ${
              selected?.id === ch.id
                ? 'border-red-500 bg-red-500/10'
                : 'border-white/10 bg-white/5 hover:border-red-500/60 hover:bg-white/10'
            }`}
          >
            <div className="aspect-video rounded-lg bg-black/40 mb-3 flex items-center justify-center">
              <span className="text-xs text-white/50">DASH</span>
            </div>
            <div className="font-semibold text-sm">{ch.name}</div>
            <div className="text-xs text-white/40 mt-0.5">{ch.id}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
