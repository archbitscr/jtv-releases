// Combined server: sirve HTML + proxy CORS + base de datos local en disco
// Uso: node server.cjs   → abre http://localhost:7654
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT       = 7654;
const DIR        = __dirname;
const DB_FILE    = path.join(DIR, 'movies-db.json');
const POSTER_DIR = path.join(DIR, 'posters');

if (!fs.existsSync(POSTER_DIR)) fs.mkdirSync(POSTER_DIR);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ── DB helpers ─────────────────────────────────────────────────────
function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) { console.error('DB read error:', e.message); }
  return { movies: [], updatedAt: null };
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Request handler ────────────────────────────────────────────────
http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS headers para todas las respuestas
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── GET /db/movies — cargar librería desde disco ─────────────────
  if (pathname === '/db/movies' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db));
    console.log(`[DB] Read: ${db.movies.length} movies`);
    return;
  }

  // ── POST /db/movies — guardar/merge de nuevas películas ──────────
  if (pathname === '/db/movies' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);   // { movies: [...] }
        const db = readDB();

        // Merge por id: actualiza si existe, agrega si no
        const map = new Map(db.movies.map(m => [m.id, m]));
        let added = 0, updated = 0;
        for (const m of incoming.movies) {
          if (map.has(m.id)) { map.set(m.id, { ...map.get(m.id), ...m }); updated++; }
          else                { map.set(m.id, m); added++; }
        }
        db.movies    = Array.from(map.values());
        db.updatedAt = new Date().toISOString();
        writeDB(db);

        console.log(`[DB] Merge: +${added} new, ~${updated} updated → ${db.movies.length} total`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, total: db.movies.length, added, updated }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── DELETE /db/movies — limpiar base de datos ────────────────────
  if (pathname === '/db/movies' && req.method === 'DELETE') {
    writeDB({ movies: [], updatedAt: new Date().toISOString() });
    console.log('[DB] Cleared');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── GET /posters/:id.jpg — servir poster local ───────────────────
  if (req.method === 'GET' && pathname.startsWith('/posters/')) {
    const file = path.join(POSTER_DIR, path.basename(pathname));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(data);
    });
    return;
  }

  // ── POST /db/poster — guardar imagen redimensionada en disco ─────
  if (pathname === '/db/poster' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { id, data } = JSON.parse(body);   // data = base64 JPEG
        if (!id || !data) { res.writeHead(400); res.end(JSON.stringify({ error: 'missing id or data' })); return; }
        const buf  = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const file = path.join(POSTER_DIR, `${id}.jpg`);
        fs.writeFile(file, buf, err => {
          if (err) { res.writeHead(500); res.end(JSON.stringify({ error: err.message })); return; }
          // Actualizar posterLocal en la DB
          const db  = readDB();
          const idx = db.movies.findIndex(m => m.id === id);
          if (idx >= 0) { db.movies[idx].posterLocal = `/posters/${id}.jpg`; writeDB(db); }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, path: `/posters/${id}.jpg` }));
        });
      } catch(e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  // ── PROXY endpoint: /?url=https://... ────────────────────────────
  if (parsed.query.url) {
    const target       = parsed.query.url;
    const targetParsed = url.parse(target);
    const lib          = targetParsed.protocol === 'https:' ? https : http;

    const opts = {
      hostname: targetParsed.hostname,
      port:     targetParsed.port || (targetParsed.protocol === 'https:' ? 443 : 80),
      path:     targetParsed.path || '/',
      method:   'GET',
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124',
        'Accept':          'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
      }
    };

    const proxyReq = lib.request(opts, proxyRes => {
      let chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ contents: body, status: { http_code: proxyRes.statusCode } }));
      });
    });

    proxyReq.on('error', e => {
      if (!res.headersSent) { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); }
    });
    proxyReq.setTimeout(15000, () => proxyReq.destroy(new Error('timeout')));
    proxyReq.end();
    return;
  }

  // ── Static file server ────────────────────────────────────────────
  let filePath = pathname === '/' ? '/movies-explorer.html' : pathname;
  filePath = path.join(DIR, filePath.replace(/\.\./g, ''));
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });

}).listen(PORT, () => {
  const db = readDB();
  console.log(`\n  JTV Movies Explorer → http://localhost:${PORT}`);
  console.log(`  Local DB: ${db.movies.length} movies in ${DB_FILE}\n`);
});
