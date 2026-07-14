import IPC from '../../shared/ipcChannels.json' with { type: 'json' };
import { ALLOWED_DOMAINS, KNOWN_AD_DOMAINS } from './policyConfig.js';

export function attachRequestPolicy(electronSession, context) {
  electronSession.webRequest.onBeforeRequest((details, callback) => {
    const urlStr = (details.url || '').toLowerCase();
    // Allow Electron/Chromium internal schemes (file, devtools, chrome) through
    // so DevTools and internal pages can load their own resources.
    if (
      urlStr.startsWith('file://') ||
      urlStr.startsWith('devtools://') ||
      urlStr.startsWith('chrome://') ||
      urlStr.startsWith('chrome-extension://') ||
      urlStr.startsWith('chrome-devtools://')
    ) {
      return callback({ cancel: false });
    }

    try {
      const parsedUrl = new URL(urlStr);
      const hostname = parsedUrl.hostname;

      if (KNOWN_AD_DOMAINS.some(ad => hostname.includes(ad))) {
        console.log(`[AdBlock] Blocked known ad domain request: ${hostname}`);
        return callback({ cancel: true });
      }

      // Block service worker scripts from any non-allowed domain
      // (covers romponalis.st/premiumtv/sw.js and similar ad SW injectors)
      if (parsedUrl.pathname.endsWith('/sw.js') || parsedUrl.pathname.endsWith('/service-worker.js')) {
        const isAllowedSW = ALLOWED_DOMAINS.some(allowed => hostname.endsWith(allowed) || hostname === allowed);
        if (!isAllowedSW) {
          console.log(`[AdBlock] Blocked service worker from untrusted domain: ${hostname}${parsedUrl.pathname}`);
          return callback({ cancel: true });
        }
      }

      if (
        parsedUrl.pathname.endsWith('.m3u8') ||
        parsedUrl.pathname.endsWith('.ts') ||
        parsedUrl.pathname.endsWith('.key') ||
        parsedUrl.pathname.endsWith('.mp4')
      ) {
        return callback({ cancel: false });
      }

      if (details.resourceType === 'script' || details.resourceType === 'subFrame') {
        let isAllowed = ALLOWED_DOMAINS.some(allowed => hostname.endsWith(allowed) || hostname === allowed);

        if (!isAllowed) {
          const pathStr = parsedUrl.pathname;
          const searchStr = parsedUrl.search;

          const isPlayerSignature =
            pathStr.includes('daddy.php') ||
            pathStr.includes('daddyhd.php') ||
            pathStr.includes('stream.php') ||
            pathStr.includes('cast.php') ||
            pathStr.includes('watch.php') ||
            pathStr.includes('player.php') ||
            pathStr.includes('embed.php') ||
            pathStr.includes('play.php') ||
            pathStr.includes('/premiumtv/') ||
            pathStr.includes('/embed/') ||
            pathStr.includes('clappr') ||
            pathStr.includes('hls.js') ||
            searchStr.includes('?id=') ||
            searchStr.includes('&id=') ||
            pathStr.includes('bundle.js') ||
            pathStr.includes('bundle-jw.js') ||
            pathStr.includes('p2p-engine.min.js') ||
            pathStr.includes('p2p-engine.js') ||
            pathStr.includes('clappr.min.js') ||
            pathStr.includes('clappr-pip.min.js') ||
            pathStr.includes('hls.min.js') ||
            pathStr === '/ch' ||
            pathStr.startsWith('/ch/') ||
            pathStr.startsWith('/e/');

          if (isPlayerSignature) {
            isAllowed = true;
            console.log(`[ZeroTrust Allow] Allowed legitimate player request to: ${hostname}${pathStr}`);
          }
        }

        if (!isAllowed) {
          console.log(`[ZeroTrust Block] Cancelled untrusted ${details.resourceType} load from: ${hostname}`);
          return callback({ cancel: true });
        }
      }

      callback({ cancel: false });
    } catch (e) {
      callback({ cancel: false });
    }
  });

  // Inject script-blocking CSP on casting/watch stream pages.
  // #thatframe (the player iframe) is static HTML rendered server-side by PHP,
  // so blocking all scripts does NOT break the player.
  electronSession.webRequest.onHeadersReceived((details, callback) => {
    const url = details.url || '';
    if (
      (url.includes('/casting/stream-') || url.includes('/watch/stream-')) &&
      details.resourceType === 'mainFrame'
    ) {
      const headers = { ...details.responseHeaders };
      headers['content-security-policy'] = ["script-src 'none'"];
      console.log(`[AdBlock] Injected script-src none CSP on: ${url.slice(0, 80)}`);
      return callback({ cancel: false, responseHeaders: headers });
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  electronSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const activeDomain = context.state.globalDomain || 'https://dlhd.pk/';
    const originDomain = activeDomain.endsWith('/') ? activeDomain.slice(0, -1) : activeDomain;

    if (details.url.includes('stream-') || details.url.includes('daddy') || details.url.includes('watch.php')) {
      details.requestHeaders['Referer'] = activeDomain;
      details.requestHeaders['Origin'] = originDomain;
    }
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  electronSession.webRequest.onCompleted((details) => {
    if (details.resourceType === 'xhr' || details.resourceType === 'fetch' || details.resourceType === 'media') {
      const url = (details.url || '').toLowerCase();
      if (url.includes('.ts') || url.includes('.m3u8') || url.includes('.key')) {
        const win = context.windowManager.getMainWindow();
        if (win) {
          console.log(`[NetworkMonitor] Stream network active: ${url}`);
          win.webContents.send(IPC.STREAM_NETWORK_ACTIVE, { url });
        }
      }
    }
  });
}
