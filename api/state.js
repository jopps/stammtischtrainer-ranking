/*
 * /api/state — gemeinsamer Zustand für die auf Vercel gehostete Fassung.
 *
 *   GET  /api/state            -> { version, updatedAt, state }
 *   PUT  /api/state            -> { version, baseVersion, state }
 *
 * Der Schreibzugriff ist ein Vergleiche-und-Setze: wer mit einer veralteten
 * baseVersion schreibt, bekommt 409 und muss neu laden — dieselbe Semantik wie
 * beim Artifact, damit sich beide Hosts nicht gegenseitig überschreiben.
 *
 * Erwartete Umgebungsvariablen (Vercel setzt die KV_* beim Verbinden eines
 * Redis-Stores automatisch):
 *   KV_REST_API_URL / KV_REST_API_TOKEN   (oder UPSTASH_REDIS_REST_*)
 *   SST_KEY                                gemeinsames Passwort, selbst gesetzt
 */

const STATE_KEY = 'sst:state';
const VERSION_KEY = 'sst:version';
const MAX_BYTES = 4 * 1024 * 1024;

/* Atomar: nur schreiben, wenn die Version noch stimmt. Gibt -1 bei Konflikt. */
const CAS = `
local v = redis.call('GET', KEYS[2])
if v == false then v = '0' end
if v ~= ARGV[1] then return -1 end
redis.call('SET', KEYS[1], ARGV[2])
return redis.call('INCR', KEYS[2])
`;

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(args) {
  const s = store();
  const r = await fetch(s.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + s.token, 'content-type': 'application/json' },
    body: JSON.stringify(args)
  });
  const j = await r.json().catch(() => ({ error: 'Antwort nicht lesbar' }));
  if (j.error) throw new Error(String(j.error).slice(0, 200));
  return j.result;
}

function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = '', size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BYTES) { reject(new Error('Zu viele Daten.')); req.destroy(); return; }
      raw += c;
    });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (e) { reject(new Error('Ungültiges JSON.')); } });
    req.on('error', reject);
  });
}

/* Konstante Laufzeit, damit das Passwort nicht zeichenweise erraten werden kann. */
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-sst-key');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const secret = process.env.SST_KEY;
  if (!secret) {
    res.status(503).json({ error: 'setup', message: 'SST_KEY ist auf dem Server nicht gesetzt.' });
    return;
  }
  if (!store()) {
    res.status(503).json({ error: 'setup', message: 'Kein Redis-Store verbunden (KV_REST_API_URL/TOKEN fehlen).' });
    return;
  }
  if (!sameSecret(req.headers['x-sst-key'] || '', secret)) {
    res.status(401).json({ error: 'auth', message: 'Passwort fehlt oder stimmt nicht.' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const [raw, version] = await redis(['MGET', STATE_KEY, VERSION_KEY]);
      res.status(200).json({
        version: Number(version || 0),
        state: raw ? JSON.parse(raw) : null
      });
      return;
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (!body || typeof body.state !== 'object' || body.state === null) {
        res.status(400).json({ error: 'bad_request', message: 'Feld "state" fehlt.' });
        return;
      }
      const base = String(Number(body.baseVersion || 0));
      const payload = JSON.stringify(body.state);
      if (payload.length > MAX_BYTES) {
        res.status(413).json({ error: 'too_large', message: 'Zustand zu gross.' });
        return;
      }
      const next = await redis(['EVAL', CAS, '2', STATE_KEY, VERSION_KEY, base, payload]);
      if (Number(next) === -1) {
        const [, live] = await redis(['MGET', STATE_KEY, VERSION_KEY]);
        res.status(409).json({ error: 'conflict', message: 'Jemand anderes hat zuerst gespeichert.', version: Number(live || 0) });
        return;
      }
      res.status(200).json({ version: Number(next) });
      return;
    }

    res.status(405).json({ error: 'method', message: 'Nur GET und PUT.' });
  } catch (e) {
    res.status(502).json({ error: 'upstream', message: (e && e.message) || 'Speicher nicht erreichbar.' });
  }
};
