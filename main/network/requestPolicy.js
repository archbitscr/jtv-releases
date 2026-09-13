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

      if (
        parsedUrl.pathname.includes('/ad.html') ||
        parsedUrl.pathname.includes('adbanner') ||
        parsedUrl.pathname.includes('rs4k') ||
        parsedUrl.pathname.includes('/pop.') ||
        parsedUrl.pathname.includes('/ad/') ||
        parsedUrl.pathname.endsWith('/ad.php')
      ) {
        console.log(`[AdBlock] Blocked ad path request: ${hostname}${parsedUrl.pathname}`);
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
            pathStr.includes('/strm/') ||
            pathStr.includes('/stream/') ||
            pathStr.includes('strm.php') ||
            pathStr.includes('clappr') ||
            pathStr.includes('hls.js') ||
            searchStr.includes('?id=') ||
            searchStr.includes('&id=') ||
            pathStr.includes('bundle.js') ||
            pathStr.includes('bundle-jw.js') ||
            pathStr.includes('p2p-engine.min.js') ||
            pathStr.includes('p2p-engine.js') ||
            pathStr.includes('p2p-engine-own') ||
            pathStr.includes('swarmcloud') ||
            pathStr.includes('clappr.min.js') ||
            pathStr.includes('clappr-pip.min.js') ||
            pathStr.includes('hls.min.js') ||
            pathStr === '/ch' ||
            pathStr.startsWith('/ch/') ||
            pathStr.startsWith('/e/') ||
            pathStr.includes('api/player.php');

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

  electronSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  electronSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const activeDomain = context.state.globalDomain || 'https://dlhd.st/';

    // Dynamically resolve target base domain from request URL if it matches any DaddyLive host
    let targetBaseDomain = activeDomain;
    try {
      const parsed = new URL(details.url);
      if (parsed.hostname.includes('dlive.') || parsed.hostname.includes('dlhd.') || parsed.hostname.includes('daddylive.')) {
        targetBaseDomain = `${parsed.protocol}//${parsed.hostname}/`;
      }
    } catch (e) {}

    const originDomain = targetBaseDomain.endsWith('/') ? targetBaseDomain.slice(0, -1) : targetBaseDomain;

    if (details.url.includes('stream-') || details.url.includes('daddy') || details.url.includes('watch.php')) {
      // Use watch page as Referer for stream-{id}.php to pass server anti-hotlinking checks
      const streamIdMatch = details.url.match(/stream-(\d+)\.php/);
      if (streamIdMatch) {
        details.requestHeaders['Referer'] = `${targetBaseDomain}watch.php?id=${streamIdMatch[1]}`;
      } else {
        details.requestHeaders['Referer'] = targetBaseDomain;
      }
      details.requestHeaders['Origin'] = originDomain;
    } else if (details.url.includes('embed.st')) {
      if (!details.requestHeaders['Referer'] || !details.requestHeaders['Referer'].includes('dlive.')) {
        details.requestHeaders['Referer'] = `${targetBaseDomain}stream/stream-5070.php`;
      }
    } else if (details.url.includes('strmd.st')) {
      details.requestHeaders['Referer'] = 'https://embed.st/';
      details.requestHeaders['Origin'] = 'https://embed.st';
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
