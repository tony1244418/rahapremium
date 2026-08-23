/* ============================================
   QR Scanner Pro — HTTPS Development Server
   Serves the app over HTTPS so camera works 
   on ALL browsers & devices (mobile + desktop)
   ============================================ */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const PORT_HTTPS = 8443;
const PORT_HTTP  = 8080;
const ROOT = __dirname;

// ── MIME types ──
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.webp': 'image/webp',
};

// ── Static file server handler ──
function serveFile(req, res) {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(ROOT, urlPath);
    const safePath = path.resolve(filePath);

    if (!safePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(safePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => {
                    if (e2) { res.writeHead(404); res.end('Not found'); return; }
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(d2);
                });
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }
        const ext  = path.extname(safePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
}

// ── Get local network IPs ──
function getLocalIPs() {
    const os = require('os');
    const ips = [];
    const ifaces = os.networkInterfaces();
    Object.values(ifaces).forEach(arr => {
        arr.forEach(info => {
            if (info.family === 'IPv4' && !info.internal) {
                ips.push(info.address);
            }
        });
    });
    return ips;
}

// ── Generate self-signed certificate using selfsigned package ──
async function getCertificate() {
    const certDir  = path.join(ROOT, '.cert');
    const keyFile  = path.join(certDir, 'key.pem');
    const certFile = path.join(certDir, 'cert.pem');

    // Reuse existing cert if available
    if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
        return {
            key:  fs.readFileSync(keyFile, 'utf8'),
            cert: fs.readFileSync(certFile, 'utf8'),
        };
    }

    // Generate using selfsigned package
    console.log('  Generating self-signed certificate...');
    const selfsigned = require('selfsigned');
    const ips = getLocalIPs();
    
    const altNames = [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
    ];
    ips.forEach(ip => altNames.push({ type: 7, ip }));

    const attrs = [{ name: 'commonName', value: 'QR Scanner Dev' }];
    const pems = await selfsigned.generate(attrs, {
        algorithm: 'sha256',
        days: 3650,
        keySize: 2048,
        extensions: [
            { name: 'subjectAltName', altNames },
        ],
    });

    // Save for reuse
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
    fs.writeFileSync(keyFile,  pems.private);
    fs.writeFileSync(certFile, pems.cert);

    return { key: pems.private, cert: pems.cert };
}

// ── Start servers ──
async function start() {
    let creds;
    try {
        creds = await getCertificate();
    } catch (err) {
        console.error('  Failed to generate certificate:', err.message);
        console.log('  Tip: Run "npm install selfsigned" first, then restart.');
        console.log('  Starting HTTP-only server...\n');
        
        const httpServer = http.createServer(serveFile);
        httpServer.listen(PORT_HTTP, '0.0.0.0', () => {
            const ips = getLocalIPs();
            console.log(`  HTTP server: http://localhost:${PORT_HTTP}`);
            ips.forEach(ip => console.log(`  LAN:         http://${ip}:${PORT_HTTP}`));
            console.log('\n  ⚠  Camera will only work on localhost (not LAN IP)');
            console.log('  To enable camera on mobile, install selfsigned:');
            console.log('  npm install selfsigned\n');
        });
        return;
    }

    // HTTPS server (camera works here!)
    const httpsServer = https.createServer(creds, serveFile);
    httpsServer.listen(PORT_HTTPS, '0.0.0.0', () => {
        const ips = getLocalIPs();
        console.log('');
        console.log('  ┌──────────────────────────────────────────────────┐');
        console.log('  │          QR Scanner Pro — HTTPS Server           │');
        console.log('  ├──────────────────────────────────────────────────┤');
        console.log('  │                                                  │');
        console.log(`  │  Desktop:  https://localhost:${PORT_HTTPS}              │`);
        ips.forEach(ip => {
            const url = `https://${ip}:${PORT_HTTPS}`;
            const padded = url.padEnd(36);
            console.log(`  │  Mobile:   ${padded}  │`);
        });
        console.log('  │                                                  │');
        console.log('  │  📷 Camera works on ALL browsers via HTTPS      │');
        console.log('  │                                                  │');
        console.log('  │  ⚠  Accept the self-signed certificate          │');
        console.log('  │     warning in your browser to proceed.          │');
        console.log('  │     (This is safe for local development)         │');
        console.log('  │                                                  │');
        console.log('  └──────────────────────────────────────────────────┘');
        console.log('');
    });

    // Also start HTTP server for convenience
    const httpServer = http.createServer(serveFile);
    httpServer.listen(PORT_HTTP, '0.0.0.0', () => {
        console.log(`  HTTP also on: http://localhost:${PORT_HTTP}`);
        console.log('');
    });
}

start();
