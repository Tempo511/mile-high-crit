/* Global leaderboards: a single dash_times table (Supabase PostgREST,
   plain fetch — no client needed). Ranking flows through Time Trials
   only; ghosts ride along with each row for stage-3 rival downloads. */

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const hasBoard = !!(URL && KEY);
const H = { apikey:KEY, Authorization:'Bearer '+KEY, 'Content-Type':'application/json' };

const esc = s => String(s).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function todayISO(){
  const d=new Date(); d.setHours(0,0,0,0);
  return d.toISOString();
}

export function playerName(){ return localStorage.getItem('dash-name') || ''; }
export function cleanName(n){
  return String(n).replace(/[^A-Za-z0-9 _.\-]/g,'').trim().slice(0,12);
}
export function saveName(n){ localStorage.setItem('dash-name', cleanName(n)); }

const ping = p => { if(window.goatcounter && window.goatcounter.count)
  window.goatcounter.count({path:p, event:true}); };

export async function submitTime(row){   // {track, name, char, ms, ghost}
  ping('board-post-'+row.track);
  try{
    const r = await fetch(`${URL}/rest/v1/dash_times`, {
      method:'POST', headers:H,
      body:JSON.stringify({...row, ms: Math.round(row.ms)})   // integer column
    });
    return r.ok;
  }catch(e){ return false; }
}

/* straight top N by time — arcade rules, duplicates welcome (many people
   can share a name; one person can fill the board on a hot streak) */
export async function topTimes(track, daily, limit=10){
  try{
    let q=`${URL}/rest/v1/dash_times?track=eq.${encodeURIComponent(track)}`
         +`&select=name,char,ms&order=ms.asc&limit=${limit}`;
    if(daily) q+=`&created_at=gte.${todayISO()}`;
    const r=await fetch(q, {headers:H});
    return r.ok ? r.json() : [];
  }catch(e){ return []; }
}

export async function rankOf(track, ms, daily){
  try{
    let q=`${URL}/rest/v1/dash_times?track=eq.${encodeURIComponent(track)}`
         +`&ms=lt.${ms}&select=id`;
    if(daily) q+=`&created_at=gte.${todayISO()}`;
    const r=await fetch(q, {headers:{...H, Prefer:'count=exact', Range:'0-0'}});
    const cr=r.headers.get('content-range');
    const total=cr ? parseInt(cr.split('/')[1]) : NaN;
    return isNaN(total) ? null : total+1;
  }catch(e){ return null; }
}

/* shared board widget: tabs + rows into a container element */
export function renderBoard(el, track, fmt, highlightName){
  let daily=true;
  const draw = async ()=>{
    el.innerHTML =
      `<div class="boardTabs">
         <button class="${daily?'on':''}" data-d="1">TODAY</button>
         <button class="${daily?'':'on'}" data-d="0">ALL-TIME</button>
       </div>
       <div class="boardRows">loading…</div>`;
    el.querySelectorAll('.boardTabs button').forEach(b=>{
      b.addEventListener('click', ()=>{ daily = b.dataset.d==='1'; draw(); });
    });
    const rows = await topTimes(track, daily);
    const box = el.querySelector('.boardRows');
    if(!box) return;
    box.innerHTML = rows.length
      ? rows.map((r,i)=>{
          const you = highlightName && r.name.toUpperCase()===highlightName.toUpperCase();
          const place = i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'.';
          return `<div class="${you?'you':''}">${place} ${esc(r.name)} · ${fmt(r.ms)}</div>`;
        }).join('')
      : `<div style="opacity:.7">no times ${daily?'today':''} yet — set the first!</div>`;
  };
  draw();
}
