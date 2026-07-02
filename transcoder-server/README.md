# DASH → HLS Transcoder Server

This server runs on any PC and converts your DASH (.mpd) live channels into HLS (.m3u8) so **iPhone/Safari can play them**.

Safari on iPhone does NOT support DASH. This server fixes that by transcoding on-the-fly.

---

## How It Works

```
iPhone user clicks channel
        ↓
Your website detects iPhone
        ↓
Sends DASH url to THIS server
        ↓
FFmpeg converts DASH → HLS (live)
        ↓
iPhone plays HLS natively ✅
```

---

## Setup on the PC (one time)

### 1. Install Node.js
Download and install from: https://nodejs.org (choose LTS version)

### 2. Install FFmpeg

**Easiest way (Windows 10/11):**
```
winget install ffmpeg
```

**Manual way:**
1. Download from https://www.gyan.dev/ffmpeg/builds/ (get `ffmpeg-release-essentials.zip`)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your Windows PATH environment variable
4. Restart your terminal

**Verify it works:**
```
ffmpeg -version
```

### 3. Start the Server
Double-click **START-SERVER.bat**

Or manually:
```
npm install
npm start
```

You should see:
```
DASH → HLS Transcoder running
Local:   http://localhost:3001
```

---

## Make It Public (so iPhone users on the internet can reach it)

The server runs on `localhost:3001` which only works on the same PC.
To let your website use it, expose it to the internet with **Cloudflare Tunnel** (free):

### Install Cloudflare Tunnel
```
winget install --id Cloudflare.cloudflared
```

### Run the tunnel
```
cloudflared tunnel --url http://localhost:3001
```

It gives you a public URL like:
```
https://random-name.trycloudflare.com
```

Now your transcoder is reachable at that URL from anywhere.

---

## Connect It To Your Website

Add the public transcoder URL to your website environment variables:

```
NEXT_PUBLIC_TRANSCODER_URL=https://random-name.trycloudflare.com
```

Then the Live TV page will automatically send iPhone users through the transcoder.

---

## Testing

Test in a browser (any device):
```
https://YOUR-TRANSCODER-URL/play?url=<ENCODED_DASH_URL>
```

Example:
```
http://localhost:3001/play?url=https%3A%2F%2Fcdn.example.com%2Fchannel.mpd
```

It should return/redirect to an HLS playlist that plays.

---

## Notes & Limits

- **PC must stay ON** while users watch.
- Uses `-c copy` (no re-encoding) so CPU usage is LOW and quality stays original.
- Each active channel = 1 FFmpeg process.
- Idle streams auto-stop after 60 seconds (saves resources).
- Good home PC can handle ~5-15 concurrent viewers depending on internet upload speed.
- The `streams/` folder holds temporary segments and is auto-cleaned.

---

## Troubleshooting

**"FFmpeg is not installed"** → Install FFmpeg and make sure `ffmpeg -version` works.

**Stream won't play** → The DASH URL might need a CDN token. Make sure you pass a FRESH tokenized URL.

**Slow to start** → First segment takes 3-8 seconds to buffer. This is normal for live transcoding.
