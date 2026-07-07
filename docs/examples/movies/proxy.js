// Local CORS proxy — node proxy.js
const http  = require('http');
const https = require('https');
const url   = require('url');

const PORT = 7655;

http.createServer((req, res) => {
  // Allow CORS from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Expect: GET /?url=https://...
  const params = url.parse(req.url, true);
  const target = params.query.url;
  if (!target) { res.writeHead(400); res.end('Missing ?url= param'); return; }

  const parsed = url.parse(target);
  const lib = parsed.protocol === 'https:' ? https : http;

  const options = {
    hostname: parsed.hostname,
    port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path:     parsed.path,
    method:   'GET',
    headers:  {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    let body = '';
    proxyRes.setEncoding('utf8');
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ contents: body, status: { http_code: proxyRes.statusCode } }));
    });
  });

  proxyReq.on('error', e => {
    res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
  });
  proxyReq.setTimeout(12000, () => { proxyReq.destroy(new Error('timeout')); });
  proxyReq.end();

}).listen(PORT, () => {
  console.log(`CORS proxy running at http://localhost:${PORT}/?url=...`);
});
