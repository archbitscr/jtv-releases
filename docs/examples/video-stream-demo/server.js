const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const MOCK_MATCHES = [
  {
    id: "germany-vs-cura-ao-2391733",
    title: "Germany vs Curaçao",
    category: "football",
    date: 0,
    popular: true,
    teams: {
      home: {
        name: "Germany",
        badge: "GwZg7AZpYEZgHCAjAJgCzrAThFlBWSUYAUwVmDW2nmAmD32FrWGHXbeAENgBjUgg5sSdTt0z1Rvdqyw8xAkuhDcw4FAnYgSqkH1wgAJnpMHuO3AQpM+KLmDLwi80faa0wjsaIhA"
      },
      away: {
        name: "Curaçao",
        badge: "GwZg7AZpYEZgHCAjAJgCzrAThFlBWSUYAUwVmDW2nmAmD32FrWGHXbeAENgBjUgg5sSdTt0z1Rvdqyw8xAkhxTQU-MABMGIbiE0gYhkChAkzIRAfgEKTPurZgy8IvNHqmtMM7GiIQA"
      }
    },
    sources: [
      { source: "mock", id: "germany-vs-curacao" }
    ]
  }
];

function getMockStreams(id) {
  const mockStreams = {
    'germany-vs-curacao': [
      {
        id: 'mock-1',
        streamNo: 1,
        language: 'English (StreamsCenter)',
        hd: true,
        embedUrl: 'http://localhost:3000/api/stream-proxy?url=' + encodeURIComponent('https://streams.center/embed/ch3.php'),
        provider: 'StreamsCenter',
        viewers: 24500
      },
      {
        id: 'mock-2',
        streamNo: 2,
        language: 'English (FinalStreams)',
        hd: true,
        embedUrl: 'http://localhost:3000/api/stream-proxy?url=' + encodeURIComponent('https://finalstreams.xyz/sp12/3.php'),
        provider: 'FinalStreams',
        viewers: 18200
      },
      {
        id: 'mock-3',
        streamNo: 3,
        language: 'English (SporttsOnline)',
        hd: true,
        embedUrl: 'http://localhost:3000/api/stream-proxy?url=' + encodeURIComponent('https://ww2.sporttsonline.click/channels/hd/hd3.php'),
        provider: 'SporttsOnline',
        viewers: 11500
      }
    ]
  };
  
  return mockStreams[id] || [];
}

// Cache for thetvapp.link matches
let extraMatchesCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function normalizeTitle(title) {
  if (!title) return '';
  let clean = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  clean = clean
    .replace(/live stream(ing)?/g, '')
    .replace(/[._'":,;()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  let parts = clean.split(/\b(vs|at)\b/);
  let teams = parts.map(p => p.trim()).filter(p => p && p !== 'vs' && p !== 'at');
  if (teams.length >= 2) {
    return teams.map(t => t.replace(/[^a-z0-9]/g, '')).sort().join('-');
  }
  return clean.replace(/[^a-z0-9]/g, '');
}

async function updateExtraMatchesCache() {
  try {
    console.log('Refreshing thetvapp.link cache...');
    const homeRes = await fetch('https://thetvapp.link/');
    if (!homeRes.ok) throw new Error(`Failed to fetch thetvapp.link home: ${homeRes.status}`);
    const homeHtml = await homeRes.text();
    
    const regex = /<a[^>]+list-group-item[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const items = [];
    let match;
    
    while ((match = regex.exec(homeHtml)) !== null) {
      const urlStr = match[1];
      const anchorContent = match[2];
      
      let title = anchorContent
        .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '') // remove tags
        .replace(/<[^>]+>/g, '')
        .split(':')[0]
        .replace(/\r?\n|\r/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      items.push({
        url: urlStr,
        title,
        normalized: normalizeTitle(title)
      });
    }
    
    extraMatchesCache = items;
    lastCacheUpdate = Date.now();
    console.log(`Cache updated. Found ${extraMatchesCache.length} matches from thetvapp.link`);
  } catch (err) {
    console.error('Error updating cache:', err);
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Local proxy for bypass of X-Frame-Options, Referer, and ad-blocking
  if (pathname === '/api/stream-proxy') {
    const targetUrl = parsedUrl.query.url;
    const refererUrl = parsedUrl.query.referer || '';
    
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }
    
    try {
      const fetchHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (refererUrl) {
        fetchHeaders['Referer'] = refererUrl;
      } else {
        fetchHeaders['Referer'] = 'https://finalstreams.xyz/';
      }
      
      const fetchRes = await fetch(targetUrl, { headers: fetchHeaders });
      const contentType = fetchRes.headers.get('content-type') || 'text/html';
      
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval'; frame-ancestors *"
      });
      
      if (contentType.includes('text/html') || contentType.includes('text/javascript')) {
        let bodyText = await fetchRes.text();
        const targetOrigin = new URL(targetUrl).origin;
        
        // Resolve relative paths to absolute in HTML
        bodyText = bodyText.replace(/(src|href)=["']\/\/([^"']+)["']/g, '$1="https://$2"');
        bodyText = bodyText.replace(/(src|href)=["']\/([^"']+)["']/g, `$1="${targetOrigin}/$2"`);
        
        // Resolve relative paths that don't start with protocol or slash
        bodyText = bodyText.replace(/(src|href)=["'](?!https?:\/\/|\/|\/\/)([^"']+)["']/gi, (match, p1, p2) => {
          try {
            const absolutePath = new URL(p2, targetUrl).href;
            return `${p1}="${absolutePath}"`;
          } catch (e) {
            return match;
          }
        });
        
        // Rewrite iframe tags to go through this proxy
        bodyText = bodyText.replace(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi, (match, p1) => {
          const proxiedUrl = `http://localhost:3000/api/stream-proxy?url=${encodeURIComponent(p1)}&referer=${encodeURIComponent(targetUrl)}`;
          return match.replace(p1, proxiedUrl);
        });
        
        // Strip ad scripts/malware
        bodyText = bodyText.replace(/<script[^>]+src=["']https?:\/\/acscdn\.com\/[^"']+["'][^>]*><\/script>/gi, '<!-- blocked ad script -->');
        bodyText = bodyText.replace(/<script[^>]+src=["']https?:\/\/highperformanceformat\.com\/[^"']+["'][^>]*><\/script>/gi, '<!-- blocked ad script -->');
        bodyText = bodyText.replace(/window\.open\(/g, 'console.log("Blocked window.open: ", ');
        
        res.end(bodyText);
      } else {
        const arrayBuffer = await fetchRes.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));
      }
    } catch (err) {
      console.error(`[Proxy Error] Failed to fetch ${targetUrl}:`, err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Proxy error: ${err.message}`);
    }
    return;
  }
  
  // Proxy endpoint to retrieve stream feeds
  if (pathname === '/api/streams') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    try {
      const title = parsedUrl.query.title;
      const sourcesJson = parsedUrl.query.sources;
      const sources = JSON.parse(sourcesJson || '[]');
      
      let combinedStreams = [];
      const hasMockSource = sources.some(s => s.source === 'mock');
      
      if (hasMockSource) {
        const mockSource = sources.find(s => s.source === 'mock');
        combinedStreams = getMockStreams(mockSource.id);
      } else {
        // 1. Fetch default streams in parallel from handleapi.win
        const streamPromises = sources.map(async s => {
          try {
            const apiRes = await fetch(`https://api.handleapi.win/streams/${encodeURIComponent(s.source)}/${encodeURIComponent(s.id)}`);
            if (!apiRes.ok) return [];
            const streams = await apiRes.json();
            return streams.map(str => ({ ...str, provider: s.source }));
          } catch (e) {
            return [];
          }
        });
        
        const results = await Promise.all(streamPromises);
        combinedStreams = results.flat();
      }
      
      // 2. Refresh thetvapp.link cache if duration expired
      if (extraMatchesCache.length === 0 || Date.now() - lastCacheUpdate > CACHE_DURATION) {
        await updateExtraMatchesCache();
      }
      
      // 3. Check for matching event on thetvapp.link
      const normTitle = normalizeTitle(title);
      const matchInLink = extraMatchesCache.find(item => item.normalized === normTitle);
      
      if (matchInLink) {
        console.log(`Matched [${title}] to thetvapp.link event [${matchInLink.title}]`);
        try {
          const innerRes = await fetch(matchInLink.url);
          if (innerRes.ok) {
            const innerHtml = await innerRes.text();
            
            // Extract changeStream(id) parameter references
            const streamIdRegex = /changeStream\((\d+)\)/g;
            const streamIds = new Set();
            let streamMatch;
            while ((streamMatch = streamIdRegex.exec(innerHtml)) !== null) {
              streamIds.add(streamMatch[1]);
            }
            
            // Extract new-stream-embed/id iframe links
            const iframeRegex = /new-stream-embed\/(\d+)/g;
            let iframeMatch;
            while ((iframeMatch = iframeRegex.exec(innerHtml)) !== null) {
              streamIds.add(iframeMatch[1]);
            }
            
            const extraStreamIds = Array.from(streamIds);
            console.log(`Found ${extraStreamIds.length} extra streams from thetvapp.link for this match.`);
            
            extraStreamIds.forEach((id, idx) => {
              combinedStreams.push({
                id: id,
                streamNo: idx + 1,
                language: `Backup Feed ${idx + 1}`,
                hd: true,
                embedUrl: `https://gooz.aapmains.net/new-stream-embed/${id}`,
                source: 'gooz',
                viewers: Math.floor(Math.random() * 80) + 15
              });
            });
          }
        } catch (innerErr) {
          console.error(`Error scraping inner page ${matchInLink.url}:`, innerErr);
        }
      }
      
      res.end(JSON.stringify(combinedStreams));
    } catch (err) {
      console.error('Error serving streams API:', err);
      res.end(JSON.stringify([]));
    }
    return;
  }
  
  // Proxy endpoint to retrieve matches (prevents CORS blocks in frontend)
  if (pathname === '/api/matches') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    try {
      const apiRes = await fetch('https://api.handleapi.win/matches');
      if (apiRes.ok) {
        let matches = await apiRes.json();
        if (!matches || matches.length === 0) {
          console.log('API returned no matches, using premium mock fallback matches');
          matches = MOCK_MATCHES;
        }
        res.end(JSON.stringify(matches));
      } else {
        console.log('API call failed (not ok), using premium mock fallback matches');
        res.end(JSON.stringify(MOCK_MATCHES));
      }
    } catch (e) {
      console.log('Error fetching matches, using premium mock fallback matches:', e.message);
      res.end(JSON.stringify(MOCK_MATCHES));
    }
    return;
  }
  
  // Standard static file server
  let filePath = path.join(__dirname, req.url === '/' || pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop.');
});
