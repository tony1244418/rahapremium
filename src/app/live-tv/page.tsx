'use client';

import { useEffect } from 'react';

/**
 * /live-tv page – now just a safety redirect.
 *
 * The internal Live TV streaming system has been removed.
 * The "Live TV" button in the navigation opens the external Live TV URL
 * (NEXT_PUBLIC_LIVE_TV_URL) in a new tab directly, so users should never
 * land here through normal navigation.
 *
 * This page exists only as a fallback for users who may have bookmarked
 * /live-tv or followed an old link:
 *   - If the external URL is configured, redirect there.
 *   - Otherwise, redirect to the home page.
 */
export default function LiveTvRedirectPage() {
  useEffect(() => {
    const externalUrl = process.env.NEXT_PUBLIC_LIVE_TV_URL;
    if (externalUrl && (externalUrl.startsWith('http://') || externalUrl.startsWith('https://'))) {
      window.location.href = externalUrl;
    } else {
      window.location.replace('/');
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'sans-serif',
        fontSize: '14px',
      }}
    >
      Redirecting…
    </div>
  );
}
