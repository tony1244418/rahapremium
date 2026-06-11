'use client';

import { useEffect } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// DevToolsGuard
//
// Casual deterrent against right-click "Inspect" and common DevTools/view-source
// keyboard shortcuts. This is NOT real security — a determined user can bypass
// it (disable JS, use a network proxy, etc.). Real protection lives server-side
// (secret API key, short-lived CDN tokens). This just discourages casual poking.
//
// Disabled automatically on localhost so development isn't hindered.
// ────────────────────────────────────────────────────────────────────────────

export default function DevToolsGuard() {
  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + Shift + I / J / C  (DevTools / console / inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + U  (view-source)
      if ((e.ctrlKey || e.metaKey) && key === 'u') {
        e.preventDefault();
        return;
      }
      // Ctrl/Cmd + S  (save page)
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
