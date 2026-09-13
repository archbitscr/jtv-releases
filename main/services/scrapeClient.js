export const CANDIDATE_DOMAINS = [
  'https://dlhd.st/',
  'https://dlhd.pk/',
  'https://dlive.sx/',
  'https://dlive.to/',
  'https://dlhd.sx/',
  'https://dlhd.is/',
  'https://dlhd.se/',
  'https://dlhd.to/',
  'https://dlive.is/',
  'https://dlive.st/'
];

export async function fetchChannels(domain) {
  const candidateDomains = [
    domain,
    'https://dlhd.st/',
    'https://dlhd.pk/',
    'https://dlive.sx/',
    'https://dlive.to/'
  ];
  const uniqueDomains = [...new Set(candidateDomains.filter(Boolean))];

  for (const dom of uniqueDomains) {
    const formattedDom = dom.endsWith('/') ? dom : `${dom}/`;
    const url = `${formattedDom}24-7-channels.php`;
    console.log('[scrapeClient] Fetching channels from:', url);
    try {
      const fetchUrl = new URL(url);
      fetchUrl.searchParams.append('t', Date.now().toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(fetchUrl.toString(), {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[scrapeClient] fetchChannels received HTTP ${response.status} from ${url}`);
        continue;
      }

      const text = await response.text();
      const channels = [];
      const regex = /<a[^>]+href=["']?([^"'>]*watch\.php\?id=([0-9]+))["']?[^>]*>(.*?)<\/a>/gis;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const id = match[2];
        const content = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const name = content.split('ID:')[0].trim();
        if (name && id) {
          channels.push({ id, name, path: `watch.php?id=${id}`, favorite: false });
        }
      }
      if (channels.length > 0) {
        console.log(`[scrapeClient] Successfully scraped ${channels.length} channels from ${formattedDom}`);
        return channels;
      }
    } catch (err) {
      console.warn(`[scrapeClient] fetchChannels failed on ${url}:`, err.message);
    }
  }
  console.error('[scrapeClient] All candidate domains failed for fetchChannels.');
  return [];
}

export async function fetchSchedule(domain) {
  const candidateDomains = [
    domain,
    'https://dlhd.st/',
    'https://dlhd.pk/',
    'https://dlive.sx/',
    'https://dlive.to/'
  ];
  const uniqueDomains = [...new Set(candidateDomains.filter(Boolean))];

  for (const dom of uniqueDomains) {
    const formattedDom = dom.endsWith('/') ? dom : `${dom}/`;
    console.log('[scrapeClient] Fetching schedule from:', formattedDom);
    try {
      const fetchUrl = new URL(formattedDom);
      fetchUrl.searchParams.append('t', Date.now().toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(fetchUrl.toString(), {
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[scrapeClient] fetchSchedule received HTTP ${response.status} from ${formattedDom}`);
        continue;
      }

      const text = await response.text();
      const schedule = [];
      const eventRegex = /<div class="schedule__event">.*?<span class="schedule__time"[^>]*>(.*?)<\/span>.*?<span class="schedule__eventTitle">(.*?)<\/span>.*?<div class="schedule__channels">(.*?)<\/div>\s*<\/div>/gis;
      const idRegex = /watch\.php\?id=([0-9]+)/gi;

      let eventMatch;
      while ((eventMatch = eventRegex.exec(text)) !== null) {
        const time = eventMatch[1].replace(/<[^>]*>/g, '').trim();
        const programName = eventMatch[2].replace(/<[^>]*>/g, '').trim();
        const channelsHtml = eventMatch[3];

        let idMatch;
        while ((idMatch = idRegex.exec(channelsHtml)) !== null) {
          const id = idMatch[1];
          if (id && programName) {
            schedule.push({ event: programName, time, id });
          }
        }
      }

      if (schedule.length > 0) {
        console.log(`[scrapeClient] Successfully scraped ${schedule.length} schedule entries from ${formattedDom}`);
        return schedule;
      }
    } catch (err) {
      console.warn(`[scrapeClient] fetchSchedule failed on ${formattedDom}:`, err.message);
    }
  }
  console.error('[scrapeClient] All candidate domains failed for fetchSchedule.');
  return [];
}

export async function checkDomain() {
  for (const url of CANDIDATE_DOMAINS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return url;
    } catch (e) {}
  }
  return null;
}

export async function checkChannelStatus(url) {
  try {
    console.log('[scrapeClient] checkChannelStatus checking url:', url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { online: false, status: response.status, reason: 'http_error' };
    }

    const text = await response.text();
    const lowerText = text.toLowerCase();
    
    // Check if the stream page contains common offline terms or is empty
    if (lowerText.includes('offline') || 
        lowerText.includes('not streaming') || 
        lowerText.includes('stream not found') ||
        lowerText.includes('currently offline') ||
        lowerText.includes('not broadcasting')) {
      return { online: false, reason: 'stream_offline', video: false, audio: false };
    }

    const hasStream = lowerText.includes('player') || lowerText.includes('hls') || lowerText.includes('m3u8') || lowerText.includes('iframe') || lowerText.includes('stream') || lowerText.includes('source');
    return { online: true, video: hasStream, audio: hasStream };
  } catch (e) {
    console.error('[scrapeClient] checkChannelStatus error:', e.message);
    return { online: false, reason: 'exception', error: e.message, video: false, audio: false };
  }
}

