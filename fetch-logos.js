#!/usr/bin/env node
/*
 * fetch-logos.js — holt die Klublogos der Super League von der offiziellen
 * sfl.ch-API, verkleinert sie und schreibt sie als Data-URIs nach
 * team-logos.json. Diese Datei wird ins Ranking-Tool eingebettet (der
 * Artifact-CSP lässt keine externen Bilder zu).
 *
 *   node fetch-logos.js
 *
 * "tone" sagt, welche Kachelfarbe das Logo braucht: manche Klubs liefern nur
 * eine weisse Variante (Lausanne), andere nur eine schwarze (Lugano).
 */
const fs=require('fs'), os=require('os'), path=require('path');
const {execFileSync}=require('child_process');

const ENDPOINT='https://origins-webex-orchestrator.origins-digital.com/trpc/';
const H={'content-type':'application/json','x-account-key':'Os-hXumIK'};
const COMPETITION='e0lck99w8meo9qoalfrxgo33o';
const SIZE=72;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fold(s){
  return String(s==null?'':s).toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
async function trpc(proc,input){
  const r=await fetch(ENDPOINT+proc+'?input='+encodeURIComponent(JSON.stringify(input)),{headers:H});
  const j=await r.json();
  if(j.error) throw new Error(proc+': '+(j.error.message||'').slice(0,120));
  return j.result.data;
}

/* Mittlere Helligkeit über ein auf 1x1 verkleinertes PNG. */
function meanLuma(pngPath,tmp){
  const one=path.join(tmp,'one.png');
  execFileSync('sips',['-z','1','1',pngPath,'--out',one],{stdio:'ignore'});
  const buf=fs.readFileSync(one);
  let off=8, px=null;
  while(off<buf.length-8){
    const len=buf.readUInt32BE(off), type=buf.toString('ascii',off+4,off+8);
    if(type==='IDAT'){
      const raw=require('zlib').inflateSync(buf.slice(off+8,off+8+len));
      px=raw.slice(1);            /* Byte 0 ist der Filtertyp */
      break;
    }
    off+=12+len;
  }
  if(!px||px.length<3) return null;
  const [r,g,b]=[px[0],px[1],px[2]];
  return (0.2126*r+0.7152*g+0.0722*b)/255;
}

(async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sfl-logos-'));
  /* Teams aus der Spielerliste einsammeln */
  let after, teams={};
  for(let i=0;i<6;i++){
    const q={competitionProviderId:COMPETITION,sortKey:'lastName',language:'de',order:'asc',limit:99};
    if(after) q.after=after;
    const d=await trpc('playerList.getAll',q);
    d.players.forEach(p=>{ if(p.teamName&&p.teamSlug) teams[p.teamName]=p.teamSlug; });
    after=d.cursor&&d.cursor.after;
    if(!after) break;
    await sleep(400);
  }

  const out={};
  for(const [name,slug] of Object.entries(teams).sort()){
    let d;
    try{ d=await trpc('team.getOne',{slug,language:'de'}); }
    catch(e){ process.stderr.write('  ! '+name+': '+e.message+'\n'); continue; }
    const url=d.logo&&d.logo.url;
    if(!url){ process.stderr.write('  ! '+name+': kein Logo\n'); continue; }

    const res=await fetch(url);
    if(!res.ok){ process.stderr.write('  ! '+name+': HTTP '+res.status+'\n'); continue; }
    const ext=(url.split('.').pop().split('?')[0]||'png').toLowerCase();
    const src=path.join(tmp,'src.'+ext);
    fs.writeFileSync(src,Buffer.from(await res.arrayBuffer()));

    const dst=path.join(tmp,'out.png');
    try{
      execFileSync('sips',['-s','format','png','-Z',String(SIZE),src,'--out',dst],{stdio:'ignore'});
    }catch(e){ process.stderr.write('  ! '+name+': sips fehlgeschlagen\n'); continue; }

    let tone='normal';
    try{
      const l=meanLuma(dst,tmp);
      if(l!==null&&l>0.72) tone='light';    /* helles Logo -> dunkle Kachel */
    }catch(e){}

    const b64=fs.readFileSync(dst).toString('base64');
    out[fold(name)]={name:name,code:d.code||'',tone:tone,src:'data:image/png;base64,'+b64};
    process.stderr.write('  '+name.padEnd(26)+tone.padEnd(8)+Math.round(b64.length/1024)+' KB\n');
    await sleep(250);
  }

  fs.writeFileSync('team-logos.json',JSON.stringify(out));
  fs.rmSync(tmp,{recursive:true,force:true});
  const kb=Math.round(fs.statSync('team-logos.json').size/1024);
  process.stderr.write('\n'+Object.keys(out).length+' Logos -> team-logos.json ('+kb+' KB)\n');
})().catch(e=>{ console.error('Fehlgeschlagen:',e.message); process.exit(1); });
