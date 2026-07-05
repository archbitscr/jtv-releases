import IPC from '../../shared/ipcChannels.json' with { type: 'json' };
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

function getMoviesDir() {
  return path.join(app.getPath('userData'), 'movies');
}

function getDbFile() {
  return path.join(getMoviesDir(), 'movies-db.json');
}

function getPosterDir() {
  return path.join(getMoviesDir(), 'posters');
}

function ensureDirs() {
  const dir = getMoviesDir();
  const posterDir = getPosterDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(posterDir)) fs.mkdirSync(posterDir, { recursive: true });
}

function readDb() {
  try {
    const file = getDbFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('[MoviesDB] Read error:', e.message);
  }
  return { movies: [], updatedAt: null };
}

function writeDb(data) {
  ensureDirs();
  fs.writeFileSync(getDbFile(), JSON.stringify(data), 'utf8');
}

export function registerMoviesDbIpc({ ipcMain }) {
  ensureDirs();

  ipcMain.handle(IPC.MOVIES_DB_GET, () => {
    const db = readDb();
    console.log(`[MoviesDB] Get: ${db.movies.length} movies`);
    return db;
  });

  ipcMain.handle(IPC.MOVIES_DB_SAVE, (_event, { movies }) => {
    const db = readDb();
    const map = new Map(db.movies.map(m => [m.id, m]));
    let added = 0, updated = 0;
    for (const m of movies) {
      if (map.has(m.id)) { map.set(m.id, { ...map.get(m.id), ...m }); updated++; }
      else { map.set(m.id, m); added++; }
    }
    db.movies = Array.from(map.values());
    db.updatedAt = new Date().toISOString();
    writeDb(db);
    console.log(`[MoviesDB] Save: +${added} new, ~${updated} updated → ${db.movies.length} total`);
    return { ok: true, total: db.movies.length, added, updated };
  });

  ipcMain.handle(IPC.MOVIES_DB_DELETE, () => {
    writeDb({ movies: [], updatedAt: new Date().toISOString() });
    console.log('[MoviesDB] Cleared');
    return { ok: true };
  });

  ipcMain.handle(IPC.MOVIES_DB_SAVE_POSTER, (_event, { id, data }) => {
    if (!id || !data) return { error: 'missing id or data' };
    try {
      ensureDirs();
      const base64 = data.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const file = path.join(getPosterDir(), `${id}.jpg`);
      fs.writeFileSync(file, buf);
      const db = readDb();
      const idx = db.movies.findIndex(m => m.id === id);
      const posterLocal = `jtv-poster://${id}`;
      if (idx >= 0) { db.movies[idx].posterLocal = posterLocal; writeDb(db); }
      return { ok: true, posterLocal };
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle(IPC.MOVIES_DB_GET_POSTER, (_event, { id }) => {
    try {
      const file = path.join(getPosterDir(), `${id}.jpg`);
      if (!fs.existsSync(file)) return { error: 'not found' };
      const data = fs.readFileSync(file);
      return { data: 'data:image/jpeg;base64,' + data.toString('base64') };
    } catch (e) {
      return { error: e.message };
    }
  });
}
