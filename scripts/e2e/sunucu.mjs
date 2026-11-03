// Yerel test sunucusu: dist/ + sahte veritabanlı API (functions/app.js). Yalnızca testler için.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { createApp } from '../../functions/app.js';
import { FakeDb, FieldValue, Timestamp } from '../../functions/test/fakeDb.js';
const ROOT = path.resolve('dist');
const FIRMS = JSON.parse(await readFile('functions/firms.json', 'utf8'));
const MODELS = JSON.parse(await readFile('functions/models.json', 'utf8'));
const db = new FakeDb(); const mails = [];
await db.collection('firmalar').doc('kardesler-celik-yapi').set({ aktif: true, eposta: 'satis@kardesler.com', panelEpostalari: ['satis@kardesler.com'], tipler: ['prefabrik', 'celik'], iller: ['*'], abonelik: { durum: 'aktif' } });
const jwt = (t) => { try { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()); } catch { throw new Error('bad'); } };
const app = createApp({ db, FieldValue, Timestamp, FIRMS, MODELS, mail: async (to, subject, html, o) => { mails.push({ to, subject, html, o }); },
  auth: { verifyIdToken: async (t) => { const p = jwt(t); return { uid: p.user_id, email: p.email, email_verified: p.email_verified, name: p.name }; } },
  ayar: () => ({ site: 'http://localhost:4400', admin: 'info@mitraajans.com', yoneticiler: ['info@mitraajans.com'], placesKey: '' }) });
const TIP = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.woff2': 'font/woff2' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__mails') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(mails)); }
  if (u.pathname === '/__/firebase/init.json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ apiKey: 'test-key', authDomain: 'localhost', projectId: 'prefabrikteklif', appId: '1:1:web:1' })); }
  if (u.pathname.startsWith('/api/')) {
    let body = ''; for await (const c of req) body += c;
    const r = { statusCode: 200, h: {}, status(c) { this.statusCode = c; return this; }, set(k, v) { this.h[k.toLowerCase()] = v; return this; }, getHeader(k) { return this.h[k.toLowerCase()]; }, json(b) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this.h }); res.end(JSON.stringify(b)); } };
    return app.handle({ method: req.method, path: u.pathname, query: Object.fromEntries(u.searchParams), body: body ? JSON.parse(body) : {}, headers: req.headers }, r);
  }
  let p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { if ((await stat(p)).isDirectory()) { if (!u.pathname.endsWith('/')) { res.writeHead(301, { Location: u.pathname + '/' + u.search }); return res.end(); } p = path.join(p, 'index.html'); } }
  catch { try { await stat(p + '/index.html'); res.writeHead(301, { Location: u.pathname + '/' }); return res.end(); } catch { p = path.join(ROOT, '404.html'); res.statusCode = 404; } }
  try { let d = await readFile(p); res.setHeader('Content-Type', TIP[path.extname(p)] || 'application/octet-stream'); if (/\.(html|js|css|json|txt|xml)$/.test(p) && /gzip/.test(req.headers['accept-encoding'] || '')) { d = zlib.gzipSync(d); res.setHeader('Content-Encoding', 'gzip'); } if (/\.(webp|jpg|png|woff2|js|css)$/.test(p)) res.setHeader('Cache-Control', 'public, max-age=31536000'); res.end(d); } catch { res.writeHead(404); res.end('yok'); }
}).listen(4400, () => console.log('http://localhost:4400'));
