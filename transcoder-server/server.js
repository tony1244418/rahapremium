/**
 * DASH → HLS Transcoding Server
 * ------------------------------------------------------------------
 * Runs on any PC with Node.js + FFmpeg installed.
 * Converts DASH (.mpd) live streams to HLS (.m3u8) so iPhone/Safari
 * can play them (Safari does NOT support DASH natively).
 *
 * USAGE (from your website):
 *   https://YOUR-SERVER/play?url=<ENCODED_DASH_URL>
 *
 * It returns an HLS master playlist that iPhone plays natively.
 * ------------------------------------------------------------------
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Where HLS segments are written (temporary)
const STREAMS_DIR = path.join(__dirname, 'streams');
if (!fs.existsSync(STREAMS_DIR)) fs.mkdirSync(STREAMS_DIR, { recursive: true });

app.use(cors()); // allow your website to call this server

// Track active FFmpeg processes so we don't start duplicates
// key = hash of the DASH url, value = { proc, dir, lastAccess, ready }
const activeStreams = new Map();

// How long a stream can be idle before we kill FFmpeg and clean up (ms)
const IDLE_TIMEOUT = 60 * 1000; // 60 seconds after last request

// Make a short stable id from a URL
function streamId(url) {
  return crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
}

// Start FFmpeg to transcode a DASH url into an HLS playlist inside outDir
function startFFmpeg(dashUrl, outDir) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const playlistPath = path.join(outDir, 'index.m3u8');

  // FFmpeg command:
  //  -i <dash>                 input DASH manifest
  //  -c copy                   copy codecs (no re-encode = fast, low CPU)
  //  -f hls                    output HLS
  //  -hls_time 4               4-second segments
  //  -hls_list_size 6          keep last 6 segments (live window)
  //  -hls_flags delete_segments+append_list+omit_endlist
  //  -hls_segment_type mpegts  standard TS segments (iPhone friendly)
  const args = [
    '-loglevel', 'warning',
    '-user_agent', 'Mozilla/5.0',
    '-i', dashUrl,
    '-c', 'copy',
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_list_size', '6',
    '-hls_flags', 'delete_segments+append_list+omit_endlist',
    '-hls_segment_type', 'mpegts',
    '-hls_segment_filename', path.join(outDir, 'seg_%05d.ts'),
    playlistPath,
  ];

  console.log(`[FFmpeg] starting for ${dashUrl}`);
  const proc = spawn('ffmpeg', args);

  proc.stderr.on('data', (d) => {
    const msg = d.toString();
    // Uncomment for verbose debugging:
    // console.log('[ffmpeg]', msg);
    if (msg.toLowerCase().includes('error')) {
      console.error('[ffmpeg error]', msg.trim());
    }
  });

  proc.on('exit', (code) => {
    console.log(`[FFmpeg] exited (code ${code}) for ${dashUrl}`);
  });

  return proc;
}

// Wait until the playlist file exists (FFmpeg needs a moment to buffer)
function waitForPlaylist(playlistPath, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (fs.existsSync(playlistPath)) {
        // Also make sure it has at least one segment listed
        try {
          const content = fs.readFileSync(playlistPath, 'utf8');
          if (content.includes('.ts')) return resolve();
        } catch {}
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error('Timed out waiting for HLS playlist'));
      }
      setTimeout(check, 300);
    };
    check();
  });
}

/**
 * MAIN ENDPOINT
 * GET /play?url=<encoded DASH url>
 * Redirects to the generated HLS playlist.
 */
app.get('/play', async (req, res) => {
  const dashUrl = req.query.url;
  if (!dashUrl) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  const id = streamId(dashUrl);
  const outDir = path.join(STREAMS_DIR, id);
  const playlistPath = path.join(outDir, 'index.m3u8');

  let entry = activeStreams.get(id);

  // Start a new FFmpeg if not already running
  if (!entry || entry.proc.killed) {
    const proc = startFFmpeg(dashUrl, outDir);
    entry = { proc, dir: outDir, lastAccess: Date.now(), ready: false };
    activeStreams.set(id, entry);
  }

  entry.lastAccess = Date.now();

  try {
    await waitForPlaylist(playlistPath);
    entry.ready = true;
    // Redirect the iPhone player to the HLS playlist
    return res.redirect(302, `/hls/${id}/index.m3u8`);
  } catch (err) {
    console.error('[play] error:', err.message);
    // Clean up the failed stream
    try { entry.proc.kill('SIGKILL'); } catch {}
    activeStreams.delete(id);
    return res.status(500).json({ error: 'Failed to start stream', details: err.message });
  }
});

/**
 * Serve HLS files (playlist + segments).
 * We set proper headers so iPhone/Safari plays them.
 */
app.get('/hls/:id/:file', (req, res) => {
  const { id, file } = req.params;
  const filePath = path.join(STREAMS_DIR, id, file);

  // Update last access so idle cleanup doesn't kill an active viewer
  const entry = activeStreams.get(id);
  if (entry) entry.lastAccess = Date.now();

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }

  if (file.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  } else if (file.endsWith('.ts')) {
    res.setHeader('Content-Type', 'video/mp2t');
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');

  fs.createReadStream(filePath).pipe(res);
});

// Health check / info page
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'DASH to HLS Transcoder',
    activeStreams: activeStreams.size,
    usage: '/play?url=<ENCODED_DASH_URL>',
  });
});

// Idle cleanup — kills FFmpeg + deletes files for streams nobody is watching
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of activeStreams.entries()) {
    if (now - entry.lastAccess > IDLE_TIMEOUT) {
      console.log(`[cleanup] stopping idle stream ${id}`);
      try { entry.proc.kill('SIGKILL'); } catch {}
      try { fs.rmSync(entry.dir, { recursive: true, force: true }); } catch {}
      activeStreams.delete(id);
    }
  }
}, 15000);

// Graceful shutdown — kill all FFmpeg processes
process.on('SIGINT', () => {
  console.log('\nShutting down, killing FFmpeg processes...');
  for (const [, entry] of activeStreams.entries()) {
    try { entry.proc.kill('SIGKILL'); } catch {}
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`  DASH → HLS Transcoder running`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Usage:   http://localhost:${PORT}/play?url=<DASH_URL>`);
  console.log('='.repeat(50));
});
