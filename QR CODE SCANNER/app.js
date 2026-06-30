/* ============================================
   QR Scanner Pro — Application Logic
   Library: html5-qrcode v2.3.8
   Cross-browser: Chrome, Firefox, Safari, Brave
   ============================================ */

(function () {
    'use strict';

    // ═══════════════════════════════════════
    //  MEDIA DEVICES POLYFILL
    //  Ensures getUserMedia works on older
    //  browsers (webkit/moz prefixed APIs)
    // ═══════════════════════════════════════
    function polyfillMediaDevices() {
        if (navigator.mediaDevices === undefined) {
            navigator.mediaDevices = {};
        }
        if (navigator.mediaDevices.getUserMedia === undefined) {
            navigator.mediaDevices.getUserMedia = function (constraints) {
                var legacyGetUserMedia =
                    navigator.getUserMedia ||
                    navigator.webkitGetUserMedia ||
                    navigator.mozGetUserMedia ||
                    navigator.msGetUserMedia;
                if (!legacyGetUserMedia) {
                    return Promise.reject(
                        new Error('getUserMedia is not supported in this browser.')
                    );
                }
                return new Promise(function (resolve, reject) {
                    legacyGetUserMedia.call(navigator, constraints, resolve, reject);
                });
            };
        }
        // Polyfill enumerateDevices
        if (navigator.mediaDevices.enumerateDevices === undefined) {
            navigator.mediaDevices.enumerateDevices = function () {
                return Promise.resolve([]);
            };
        }
    }

    // ═══════════════════════════════════════
    //  SECURE CONTEXT CHECK
    // ═══════════════════════════════════════
    function checkCameraSupport() {
        // Check 1: Secure context (HTTPS or localhost)
        var isSecure =
            window.isSecureContext === true ||
            location.protocol === 'https:' ||
            location.hostname === 'localhost' ||
            location.hostname === '127.0.0.1' ||
            location.hostname === '[::1]';

        if (!isSecure) {
            return {
                supported: false,
                reason: 'insecure',
                message:
                    'Camera requires a secure connection (HTTPS).\n\n' +
                    'You are currently on HTTP which blocks camera access on all modern browsers.\n\n' +
                    '• On mobile: use HTTPS (deploy to Netlify/Vercel/GitHub Pages for free)\n' +
                    '• On desktop: use localhost or 127.0.0.1\n\n' +
                    'You can still scan QR codes using the Upload option below.',
            };
        }

        // Check 2: getUserMedia API available
        polyfillMediaDevices();
        if (
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== 'function'
        ) {
            return {
                supported: false,
                reason: 'unsupported',
                message:
                    'Camera API is not available in this browser.\n\n' +
                    'Please try:\n' +
                    '• Updating your browser to the latest version\n' +
                    '• Using Chrome, Firefox, Safari, or Brave\n\n' +
                    'You can still scan QR codes using the Upload option below.',
            };
        }

        return { supported: true };
    }

    // ── DOM References ──
    var $ = function (sel) { return document.querySelector(sel); };
    var views = {
        home:    $('#homeView'),
        scanner: $('#scannerView'),
        upload:  $('#uploadView'),
        result:  $('#resultView'),
        error:   $('#errorView'),
    };

    var header        = $('#appHeader');
    var reader        = $('#reader');
    var scanOverlay   = $('#scanOverlay');
    var dropZone      = $('#dropZone');
    var fileInput     = $('#fileInput');
    var previewWrap   = $('#uploadPreview');
    var previewImg    = $('#previewImg');
    var resultContent = $('#resultContent');
    var resultBadge   = $('#resultBadge');
    var btnOpenLink   = $('#btnOpenLink');
    var errorMsgEl    = $('#errorMsg');
    var toastEl       = $('#toast');
    var btnUploadFallback = $('#btnUploadFallback');

    // ── State ──
    var html5Qrcode      = null;
    var isScanning       = false;
    var currentFacingMode = 'environment'; // back camera default

    // ── Navigation ──
    function showView(name) {
        Object.keys(views).forEach(function (key) {
            views[key].classList.remove('active');
        });
        views[name].classList.add('active');
        header.style.display = (name === 'home') ? '' : 'none';
    }

    // ── Toast ──
    function toast(msg, duration) {
        duration = duration || 2200;
        toastEl.textContent = msg;
        toastEl.classList.remove('hidden');
        toastEl.classList.add('visible');
        setTimeout(function () {
            toastEl.classList.remove('visible');
            toastEl.classList.add('hidden');
        }, duration);
    }

    // ── Content type detection ──
    function detectType(text) {
        if (!text) return { type: 'TEXT', label: 'Text' };
        var t = text.trim();
        if (/^https?:\/\//i.test(t) || /^www\./i.test(t))        return { type: 'URL',     label: 'Link' };
        if (/^mailto:/i.test(t) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return { type: 'EMAIL',   label: 'Email' };
        if (/^tel:/i.test(t))                                      return { type: 'PHONE',   label: 'Phone' };
        if (/^sms:/i.test(t))                                      return { type: 'SMS',     label: 'SMS' };
        if (/^WIFI:/i.test(t))                                     return { type: 'WIFI',    label: 'Wi-Fi' };
        if (/^BEGIN:VCARD/i.test(t))                                return { type: 'CONTACT', label: 'Contact' };
        if (/^geo:/i.test(t))                                      return { type: 'GEO',     label: 'Location' };
        return { type: 'TEXT', label: 'Text' };
    }

    // ── Show result ──
    var OPEN_LINK_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

    function showResult(decodedText) {
        var info = detectType(decodedText);
        resultBadge.textContent = info.label;
        resultContent.textContent = decodedText;

        // Reset button
        btnOpenLink.innerHTML = OPEN_LINK_SVG + ' Open Link';
        btnOpenLink.classList.add('hidden');
        btnOpenLink.onclick = null;

        if (info.type === 'URL') {
            btnOpenLink.classList.remove('hidden');
            btnOpenLink.innerHTML = OPEN_LINK_SVG + ' Open Link';
            btnOpenLink.onclick = function () {
                var url = decodedText.trim();
                if (/^www\./i.test(url)) url = 'https://' + url;
                window.open(url, '_blank', 'noopener');
            };
        } else if (info.type === 'EMAIL') {
            btnOpenLink.classList.remove('hidden');
            btnOpenLink.innerHTML = OPEN_LINK_SVG + ' Send Email';
            var email = decodedText.replace(/^mailto:/i, '').trim();
            btnOpenLink.onclick = function () { window.open('mailto:' + email); };
        } else if (info.type === 'PHONE') {
            btnOpenLink.classList.remove('hidden');
            btnOpenLink.innerHTML = OPEN_LINK_SVG + ' Call';
            btnOpenLink.onclick = function () { window.open(decodedText.trim()); };
        } else if (info.type === 'WIFI') {
            btnOpenLink.classList.remove('hidden');
            btnOpenLink.innerHTML = OPEN_LINK_SVG + ' View Details';
            btnOpenLink.onclick = function () {
                var parts = decodedText.match(/S:(.*?);/);
                var ssid = parts ? parts[1] : 'Unknown';
                alert('Wi-Fi Network: ' + ssid + '\n\nConnect to this network from your device Wi-Fi settings.');
            };
        }

        showView('result');
    }

    // ── Show error with optional upload fallback ──
    function showError(msg, showUploadBtn) {
        errorMsgEl.textContent = msg;
        // Show/hide the "Upload Instead" button
        if (btnUploadFallback) {
            btnUploadFallback.style.display = showUploadBtn ? '' : 'none';
        }
        showView('error');
    }

    // ═══════════════════════════════════════
    //  CAMERA SCANNING
    // ═══════════════════════════════════════

    // Quick pre-flight: actually request camera to verify permission works
    async function testCameraAccess() {
        try {
            var stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            // Camera works — stop the test stream immediately
            stream.getTracks().forEach(function (t) { t.stop(); });
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err };
        }
    }

    async function startCameraScanner() {
        // Step 1: Check if camera is even possible
        var support = checkCameraSupport();
        if (!support.supported) {
            showError(support.message, true);
            return;
        }

        showView('scanner');
        scanOverlay.classList.remove('hidden');

        // Step 2: Test actual camera access before giving to html5-qrcode
        var test = await testCameraAccess();
        if (!test.ok) {
            var errName = test.error && test.error.name ? test.error.name : '';
            var errMsg  = test.error ? String(test.error.message || test.error) : '';
            console.error('Camera test failed:', errName, errMsg);

            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                showError(
                    'Camera permission was denied.\n\n' +
                    'Please allow camera access:\n' +
                    '• Tap the lock/info icon in your address bar\n' +
                    '• Enable Camera permission\n' +
                    '• Reload the page\n\n' +
                    'Or use Upload instead.',
                    true
                );
            } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                showError(
                    'No camera detected on this device.\n\n' +
                    'Use the Upload option to scan QR codes from saved images.',
                    true
                );
            } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                showError(
                    'Camera is being used by another app.\n\n' +
                    'Close other apps using the camera and try again.',
                    true
                );
            } else if (errName === 'OverconstrainedError') {
                // Try again without facingMode constraint
                currentFacingMode = 'user';
                var retry = await testCameraAccess();
                if (retry.ok) {
                    return launchScanner();
                }
                showError(
                    'Camera constraints not supported.\n\n' +
                    'Your device camera may not support the requested mode. Try again or use Upload.',
                    true
                );
            } else if (errName === 'TypeError') {
                showError(
                    'Camera access is blocked.\n\n' +
                    'This usually happens on HTTP connections. Please use HTTPS.\n\n' +
                    'You can still use the Upload option.',
                    true
                );
            } else {
                showError(
                    'Could not start camera.\n\n' + errMsg + '\n\nTry the Upload option instead.',
                    true
                );
            }
            return;
        }

        // Step 3: Camera verified, launch scanner
        await launchScanner();
    }

    async function launchScanner() {
        // Destroy previous instance to avoid stale state
        if (html5Qrcode) {
            if (isScanning) {
                try { await html5Qrcode.stop(); } catch (_) {}
                isScanning = false;
            }
            html5Qrcode = null;
        }
        reader.innerHTML = '';

        html5Qrcode = new Html5Qrcode('reader', { verbose: false });

        var config = {
            fps: 12,
            qrbox: function (viewfinderWidth, viewfinderHeight) {
                var size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
                return { width: Math.floor(size), height: Math.floor(size) };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            // Use experimentalFeatures for better decoding
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        try {
            await html5Qrcode.start(
                { facingMode: currentFacingMode },
                config,
                onScanSuccess,
                function () {} // ignore per-frame "not found"
            );
            isScanning = true;
        } catch (err) {
            console.error('html5Qrcode.start() error:', err);
            showError(
                'Scanner failed to start.\n\n' + String(err) +
                '\n\nPlease try the Upload option.',
                true
            );
        }
    }

    async function stopCameraScanner() {
        if (html5Qrcode && isScanning) {
            try { await html5Qrcode.stop(); } catch (_) {}
            isScanning = false;
        }
        reader.innerHTML = '';
    }

    function onScanSuccess(decodedText) {
        // Vibrate on supported devices
        if (navigator.vibrate) {
            try { navigator.vibrate(100); } catch (_) {}
        }
        stopCameraScanner();
        showResult(decodedText);
    }

    // Switch camera (front ↔ back)
    async function switchCamera() {
        currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
        if (isScanning) {
            await stopCameraScanner();
            await launchScanner();
        }
    }

    // ═══════════════════════════════════════
    //  FILE UPLOAD SCANNING
    // ═══════════════════════════════════════
    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showError('Please select a valid image file (PNG, JPG, etc.).', false);
            return;
        }

        // Show preview
        var url = URL.createObjectURL(file);
        previewImg.src = url;
        dropZone.classList.add('hidden');
        previewWrap.classList.remove('hidden');

        // Create a fresh hidden instance for file scanning
        var tempId = 'fileScannerTemp_' + Date.now();
        var fileScannerEl = document.createElement('div');
        fileScannerEl.id = tempId;
        fileScannerEl.style.display = 'none';
        document.body.appendChild(fileScannerEl);

        var fileScanner = new Html5Qrcode(tempId, { verbose: false });

        fileScanner
            .scanFile(file, false)
            .then(function (decodedText) {
                showResult(decodedText);
            })
            .catch(function () {
                showError(
                    'No QR code was found in this image.\n\n' +
                    'Tips:\n' +
                    '• Make sure the QR code is clearly visible\n' +
                    '• Crop the image to focus on the QR code\n' +
                    '• Ensure good lighting and no blur',
                    false
                );
            })
            .finally(function () {
                URL.revokeObjectURL(url);
                fileScannerEl.remove();
            });
    }

    // ── Drag & Drop ──
    function setupDragDrop() {
        ['dragenter', 'dragover'].forEach(function (evt) {
            dropZone.addEventListener(evt, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            });
        });
        ['dragleave', 'drop'].forEach(function (evt) {
            dropZone.addEventListener(evt, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            });
        });
        dropZone.addEventListener('drop', function (e) {
            var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
        // Click on drop zone triggers file input
        dropZone.addEventListener('click', function (e) {
            if (e.target.closest('.choose-file-btn') || e.target === fileInput) return;
            fileInput.click();
        });
    }

    // ═══════════════════════════════════════
    //  COPY TO CLIPBOARD
    // ═══════════════════════════════════════
    function copyResult() {
        var text = resultContent.textContent;
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text)
                .then(function () { toast('Copied to clipboard!'); })
                .catch(function () { fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            toast('Copied to clipboard!');
        } catch (_) {
            toast('Could not copy — please copy manually');
        }
        ta.remove();
    }

    // ═══════════════════════════════════════
    //  RESET VIEWS
    // ═══════════════════════════════════════
    function resetToHome() {
        stopCameraScanner();
        // Reset upload view
        dropZone.classList.remove('hidden');
        previewWrap.classList.add('hidden');
        previewImg.src = '';
        fileInput.value = '';
        // Reset open link button
        btnOpenLink.classList.add('hidden');
        btnOpenLink.innerHTML = OPEN_LINK_SVG + ' Open Link';
        btnOpenLink.onclick = null;
        showView('home');
    }

    function goToUpload() {
        stopCameraScanner();
        dropZone.classList.remove('hidden');
        previewWrap.classList.add('hidden');
        previewImg.src = '';
        fileInput.value = '';
        showView('upload');
    }

    // ═══════════════════════════════════════
    //  INITIALIZATION
    // ═══════════════════════════════════════
    function init() {
        // Apply polyfill at boot
        polyfillMediaDevices();

        // Home buttons
        $('#btnScanCamera').addEventListener('click', startCameraScanner);
        $('#btnUpload').addEventListener('click', function () {
            showView('upload');
        });

        // Scanner back & switch
        $('#btnBackScanner').addEventListener('click', resetToHome);
        $('#btnSwitchCam').addEventListener('click', switchCamera);

        // Upload back & file
        $('#btnBackUpload').addEventListener('click', resetToHome);
        fileInput.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (file) handleFile(file);
        });
        setupDragDrop();

        // Result actions
        $('#btnCopy').addEventListener('click', copyResult);
        $('#btnScanAgain').addEventListener('click', resetToHome);

        // Error actions
        $('#btnRetry').addEventListener('click', resetToHome);
        if (btnUploadFallback) {
            btnUploadFallback.addEventListener('click', goToUpload);
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', function () {
            stopCameraScanner();
        });

        // Log camera support status for debugging
        var support = checkCameraSupport();
        console.log('[QR Scanner] Camera support:', support);
        if (!support.supported) {
            console.warn('[QR Scanner] Camera unavailable:', support.reason);
        }
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
