/*
 * /api/roster — holt den aktuellen Kader der Brack Super League direkt von der
 * öffentlichen sfl.ch-Schnittstelle und gibt ihn normalisiert zurück.
 *
 * Warum serverseitig: Der Browser dürfte sfl.ch nicht direkt abfragen
 * (fremde Herkunft), und im Artifact sperrt die CSP solche Aufrufe ohnehin.
 * Diese Funktion ist deshalb nur in der auf Vercel gehosteten Fassung verfügbar.
 *
 * Antwort: { rows: [{name, team, position, birth, photo}], total }
 */

const ENDPOINT = 'https://origins-webex-orchestrator.origins-digital.com/trpc/playerList.getAll?input=';
const HEADERS = { 'content-type': 'application/json', 'x-account-key': 'Os-hXumIK' };
const COMPETITION = 'e0lck99w8meo9qoalfrxgo33o';
const PAGE = 99;

const POS_DE = {
  Goalkeeper: 'Torwart', Defender: 'Verteidiger',
  Midfielder: 'Mittelfeldspieler', Attacker: 'Stürmer'
};

function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function page(after) {
  const input = { competitionProviderId: COMPETITION, sortKey: 'lastName', language: 'de', order: 'asc', limit: PAGE };
  if (after) input.after = after;
  const r = await fetch(ENDPOINT + encodeURIComponent(JSON.stringify(input)), { headers: HEADERS });
  if (!r.ok) throw new Error('sfl.ch antwortete mit HTTP ' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('sfl.ch: ' + String(j.error.message || '').slice(0, 120));
  return j.result.data;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-sst-key');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method' }); return; }

  const secret = process.env.SST_KEY;
  if (!secret) { res.status(503).json({ error: 'setup', message: 'SST_KEY ist auf dem Server nicht gesetzt.' }); return; }
  if (!sameSecret(req.headers['x-sst-key'] || '', secret)) {
    res.status(401).json({ error: 'auth', message: 'Passwort fehlt oder stimmt nicht.' });
    return;
  }

  try {
    const seen = new Set();
    const rows = [];
    let after, total = 0, guard = 0;
    do {
      const d = await page(after);
      total = d.totalItemsCount;
      for (const p of d.players) {
        const key = p.providerId || p.id;
        if (seen.has(key)) continue;
        seen.add(key);
        const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
        if (!name) continue;
        rows.push({
          name,
          team: p.teamName || '',
          position: POS_DE[p.position] || p.position || '',
          birth: (p.dateOfBirth || '').slice(0, 10),
          photo: p.profilePicture || p.profilePictureThumb || ''
        });
      }
      after = d.cursor && d.cursor.after;
    } while (after && rows.length < total && ++guard < 20);

    res.status(200).json({ rows, total: rows.length });
  } catch (e) {
    res.status(502).json({ error: 'upstream', message: (e && e.message) || 'sfl.ch nicht erreichbar.' });
  }
};
