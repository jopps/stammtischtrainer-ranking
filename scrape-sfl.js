#!/usr/bin/env node
/*
 * scrape-sfl.js — holt den kompletten Spielerkader der Brack Super League von
 * sfl.ch und schreibt eine CSV für das Stammtischtrainer-Ranking-Tool.
 *
 *   node scrape-sfl.js [ziel.csv]
 *
 * Die Seite sfl.ch lädt ihre Spielerliste über diese öffentliche tRPC-API.
 * Die Liste ist per Cursor paginiert (max. 99 Treffer pro Request), das Skript
 * blättert alles durch und wartet zwischen den Requests.
 *
 * Die CSV enthält genau die vier Spalten, die das Ranking-Tool einliest:
 * Name, Position, Team, Geburtsdatum. Das Alter rechnet das Tool selbst aus dem
 * Geburtsdatum — so veraltet die Zahl nicht mit der Datei.
 *
 * ACHTUNG POSITIONEN: sfl.ch kennt nur vier Positionen — Goalkeeper, Defender,
 * Midfielder, Attacker. Torwart ist damit fertig, alles andere muss von Hand
 * verfeinert werden:
 *   Verteidiger        -> Innenverteidiger | Aussenverteidiger
 *   Mittelfeldspieler  -> Defensives Mittelfeld | Offensives Mittelfeld | Flügelspieler
 *   Stürmer            -> Stürmer | Flügelspieler
 * Am schnellsten geht das im Spielerpool des Tools per Drag & Drop.
 */

const ENDPOINT = 'https://origins-webex-orchestrator.origins-digital.com/trpc/playerList.getAll';
const ACCOUNT_KEY = 'Os-hXumIK';                    // öffentlicher Schlüssel von sfl.ch
const COMPETITION = 'e0lck99w8meo9qoalfrxgo33o';    // Brack Super League
const PAGE_SIZE = 99;                               // Maximum der API
const DELAY_MS = 600;                               // Pause zwischen den Requests

const POS_DE   = {Goalkeeper:'Torwart', Defender:'Verteidiger', Midfielder:'Mittelfeldspieler', Attacker:'Stürmer'};
const POS_SORT = {Goalkeeper:0, Defender:1, Midfielder:2, Attacker:3};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function page(after){
  const input = {competitionProviderId:COMPETITION, sortKey:'lastName', language:'de', order:'asc', limit:PAGE_SIZE};
  if(after) input.after = after;
  const res = await fetch(ENDPOINT + '?input=' + encodeURIComponent(JSON.stringify(input)), {
    headers:{'content-type':'application/json','x-account-key':ACCOUNT_KEY}
  });
  if(!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  const json = await res.json();
  if(json.error) throw new Error('API: ' + (json.error.message || 'unbekannter Fehler'));
  return json.result.data;
}

function csvCell(v){
  const s = String(v == null ? '' : v);
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}

(async () => {
  const out = process.argv[2] || 'spieler-super-league.csv';
  const seen = new Set();
  const players = [];
  let after, total = 0, requests = 0;

  do {
    const d = await page(after);
    requests++;
    total = d.totalItemsCount;
    for(const p of d.players){
      const key = p.providerId || p.id;
      if(seen.has(key)) continue;
      seen.add(key);
      players.push(p);
    }
    process.stderr.write('  ' + players.length + '/' + total + ' Spieler geladen\n');
    after = d.cursor && d.cursor.after;
    if(after && players.length < total) await sleep(DELAY_MS);
  } while(after && players.length < total && requests < 20);

  if(players.length !== total){
    process.stderr.write('  Warnung: ' + players.length + ' von ' + total + ' Spielern geladen.\n');
  }

  players.sort((a,b) =>
    a.teamName.localeCompare(b.teamName,'de') ||
    (POS_SORT[a.position] ?? 9) - (POS_SORT[b.position] ?? 9) ||
    (a.jerseyNumber || 999) - (b.jerseyNumber || 999) ||
    a.lastName.localeCompare(b.lastName,'de')
  );

  const lines = ['Name;Position;Team;Geburtsdatum'];
  for(const p of players){
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
    lines.push([name, POS_DE[p.position] || p.position || '', p.teamName || '',
                (p.dateOfBirth || '').slice(0,10)]
      .map(csvCell).join(';'));
  }

  require('fs').writeFileSync(out, lines.join('\n') + '\n', 'utf8');
  process.stderr.write('\n' + players.length + ' Spieler -> ' + out + ' (' + requests + ' Requests)\n');
})().catch(e => { console.error('Fehlgeschlagen:', e.message); process.exit(1); });
