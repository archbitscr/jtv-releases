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
  
  // Proxy endpoint to retrieve stream feeds
  if (pathname === '/api/streams') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    try {
      const title = parsedUrl.query.title;
      const sourcesJson = parsedUrl.query.sources;
      const sources = JSON.parse(sourcesJson || '[]');
      
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
      let combinedStreams = results.flat();
      
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
        const matches = await apiRes.json();
        res.end(JSON.stringify(matches));
      } else {
        res.end(JSON.stringify([]));
      }
    } catch (e) {
      res.end(JSON.stringify([]));
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
