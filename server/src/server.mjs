// Học Ăn Học Nấu — account + cloud-save API.
// Zero dependencies: node:http, node:sqlite, node:crypto (Node ≥ 22.13).
// Served behind nginx at /api/* on the same origin as the game, so no CORS.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const scrypt = promisify(scryptCb);

const PORT = Number(process.env.PORT ?? 8787);
const DB_PATH = process.env.DB_PATH ?? './data/haohn.db';
const SESSION_DAYS = 30;
const COOKIE = 'haohn_sid';
const MAX_BODY = 256 * 1024; // a save blob is a few KB; this is generous
const MAX_SAVE = 200 * 1024;

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    pw_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS saves (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const q = {
  userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
  insertUser: db.prepare('INSERT INTO users (username, display_name, pw_hash, created_at) VALUES (?, ?, ?, ?)'),
  insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
  sessionUser: db.prepare(
    'SELECT u.id, u.username, u.display_name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
  ),
  touchSession: db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  getSave: db.prepare('SELECT data, updated_at FROM saves WHERE user_id = ?'),
  putSave: db.prepare(
    'INSERT INTO saves (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
  ),
};

// ---------- helpers ----------
const now = () => Date.now();
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function verifyPassword(pw, stored) {
  const [alg, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(pw, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(key, expected);
}
// Same cost as a real check, so "no such user" and "wrong password" take equal time.
const DUMMY_HASH = await hashPassword(randomBytes(12).toString('hex'));

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(req, token, maxAgeSec) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
const fail = (res, status, code, message) => send(res, status, { error: { code, message } });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Fixed-window limiter for auth endpoints, keyed by client IP.
const hits = new Map();
function rateLimited(ip, limit = 10, windowMs = 60_000) {
  const t = now();
  const h = hits.get(ip);
  if (!h || t - h.start > windowMs) {
    hits.set(ip, { start: t, n: 1 });
    return false;
  }
  return ++h.n > limit;
}
setInterval(() => {
  const t = now();
  for (const [ip, h] of hits) if (t - h.start > 60_000) hits.delete(ip);
  q.purgeSessions.run(t);
}, 10 * 60_000).unref();

const clientIp = (req) => (req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '?').toString();

function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const hash = sha256(token);
  const row = q.sessionUser.get(hash, now());
  if (!row) return null;
  // Rolling expiry: refresh when less than half the lifetime is left.
  const full = SESSION_DAYS * 86_400_000;
  if (row.expires_at - now() < full / 2) q.touchSession.run(now() + full, hash);
  return { id: row.id, username: row.username, displayName: row.display_name, token };
}

async function startSession(req, res, user, status = 200) {
  const token = randomBytes(32).toString('base64url');
  q.insertSession.run(sha256(token), user.id, now() + SESSION_DAYS * 86_400_000);
  send(res, status, { user: { username: user.username, displayName: user.display_name } }, {
    'Set-Cookie': sessionCookie(req, token, SESSION_DAYS * 86_400),
  });
}

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/i;

// ---------- routes ----------
const routes = {
  'GET /api/health': (req, res) => send(res, 200, { ok: true }),

  'POST /api/auth/register': async (req, res) => {
    if (rateLimited(clientIp(req))) return fail(res, 429, 'RATE_LIMITED', 'Thử lại sau một phút nhé.');
    const { username = '', password = '', displayName } = await readBody(req);
    const name = String(username).trim();
    if (!USERNAME_RE.test(name)) return fail(res, 400, 'BAD_USERNAME', 'Tên đăng nhập 3–20 ký tự: chữ không dấu, số, _ hoặc .');
    if (typeof password !== 'string' || password.length < 6 || password.length > 128)
      return fail(res, 400, 'BAD_PASSWORD', 'Mật khẩu từ 6 ký tự trở lên.');
    const display = String(displayName ?? name).trim().slice(0, 24) || name;
    if (q.userByName.get(name)) return fail(res, 409, 'TAKEN', 'Tên này có người dùng rồi.');
    const info = q.insertUser.run(name, display, await hashPassword(password), now());
    await startSession(req, res, { id: Number(info.lastInsertRowid), username: name, display_name: display }, 201);
  },

  'POST /api/auth/login': async (req, res) => {
    if (rateLimited(clientIp(req))) return fail(res, 429, 'RATE_LIMITED', 'Thử lại sau một phút nhé.');
    const { username = '', password = '' } = await readBody(req);
    const user = q.userByName.get(String(username).trim());
    const ok = await verifyPassword(String(password), user ? user.pw_hash : DUMMY_HASH);
    if (!user || !ok) return fail(res, 401, 'BAD_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu.');
    await startSession(req, res, user);
  },

  'POST /api/auth/logout': (req, res) => {
    const u = currentUser(req);
    if (u) q.deleteSession.run(sha256(u.token));
    send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  },

  'GET /api/auth/me': (req, res) => {
    const u = currentUser(req);
    if (!u) return fail(res, 401, 'NO_SESSION', 'Chưa đăng nhập.');
    send(res, 200, { user: { username: u.username, displayName: u.displayName } });
  },

  'GET /api/save': (req, res) => {
    const u = currentUser(req);
    if (!u) return fail(res, 401, 'NO_SESSION', 'Chưa đăng nhập.');
    const row = q.getSave.get(u.id);
    send(res, 200, row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : { data: null, updatedAt: 0 });
  },

  'PUT /api/save': async (req, res) => {
    const u = currentUser(req);
    if (!u) return fail(res, 401, 'NO_SESSION', 'Chưa đăng nhập.');
    const { data, updatedAt } = await readBody(req);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(res, 400, 'BAD_SAVE', 'Dữ liệu lưu không hợp lệ.');
    const json = JSON.stringify(data);
    if (json.length > MAX_SAVE) return fail(res, 413, 'TOO_LARGE', 'Dữ liệu lưu quá lớn.');
    const ts = Number.isFinite(updatedAt) ? Math.min(Number(updatedAt), now() + 60_000) : now();
    q.putSave.run(u.id, json, ts);
    send(res, 200, { ok: true, updatedAt: ts });
  },
};

const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];
  const handler = routes[`${req.method} ${path}`];
  if (!handler) return fail(res, 404, 'NOT_FOUND', 'Không có đường này.');
  try {
    await handler(req, res);
  } catch (e) {
    if (e.status) return fail(res, e.status, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.');
    console.error(e);
    fail(res, 500, 'SERVER_ERROR', 'Server gặp sự cố, thử lại sau.');
  }
});

server.listen(PORT, () => console.log(`haohn api on :${PORT} (db ${DB_PATH})`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => (db.close(), process.exit(0))));
