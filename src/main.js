/* =========================================================
   DENVER DASH — bootstrap + game loop.
   You vs the roster in src/characters.js.
   ========================================================= */
import './style.css';
import { ROSTER, PLAYER_CHARACTER } from './characters.js';
import washpark from './tracks/washpark.js';
import unionstation from './tracks/unionstation.js';
import { Track } from './track.js';
import { createRenderer, createRacerMeshes, draw } from './render.js';
import { createRacer } from './racers.js';
import { positionOnSpline, aiDriver } from './drivers.js';
import { buildWorld, updateAmbient } from './world.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createCharacterSelect } from './select.js';
import { createSession, snapshot, applyState, updateRemote, gridSlot, SEND_HZ } from './mp.js';
import { hasInternet } from './net.js';
import { remoteUseItem } from './items.js';
import { step } from './sim.js';

/* track select: ?track=<id> picks the course; the scene is built once at
   load, so the title-screen picker just reloads with the param set */
const TRACKS = { washpark, unionstation };
const trackData = TRACKS[new URLSearchParams(location.search).get('track')] || washpark;
document.querySelectorAll('#trackPick button').forEach(b=>{
  b.classList.toggle('on', (TRACKS[b.dataset.track]||washpark)===trackData);
  b.addEventListener('click', ()=>{
    if(TRACKS[b.dataset.track]===trackData) return;
    const q = new URLSearchParams(location.search);
    q.set('track', b.dataset.track);
    location.href = location.pathname + '?' + q + location.hash;
  });
});
document.querySelector('#title .badge').textContent = trackData.name;
const view = createRenderer(trackData);
const track = new Track(view.scene, trackData);
const world = buildWorld(view.scene, track);          // park backdrop for the menus
const input = createInput();
const audio = createAudio();
const startP = track.pointAt(0), startTan = track.tangentAt(0);

let game=null, hud=null;                               // null while in the menus
let countStart=0, earlyHold=0;
let mp=null, sendT=0;                                  // multiplayer session (rung 1)

/* ---------- start a race with the chosen character ---------- */
function beginRace(chosen){
  const startN = { x: startTan.z, z: -startTan.x };    // road normal at the line
  const player = createRacer({ ...chosen, driver:'player' });
  player.x=startP.x; player.z=startP.z;
  player.heading=Math.atan2(startTan.x, startTan.z);

  let rivals;
  if(mp){
    /* humans on a shared grid — every client derives the same slots from
       the same roster order (three across, rows falling back).
       In MP every racer's id is its peer's uid on EVERY client, so item
       targets and finish orders resolve to the same rider everywhere. */
    player.id = mp.myId;
    const place = (r, i) => {
      const g = gridSlot(i);
      r.x = startP.x + startN.x*g.lat - startTan.x*g.back;
      r.z = startP.z + startN.z*g.lat - startTan.z*g.back;
      r.heading = Math.atan2(startTan.x, startTan.z);
    };
    const myIdx = mp.roster.findIndex(p => p.uid===mp.myId);
    place(player, Math.max(0, myIdx));
    rivals = mp.roster.filter(p => p.uid!==mp.myId).map(p => {
      const r = createRacer({ ...p.char, id:p.uid, driver:'remote' });
      place(r, mp.roster.findIndex(q => q.uid===p.uid));
      return r;
    });
  } else {
    /* 5 rivals (6 racers total) drawn at random from the rest of the roster */
    const pool = ROSTER.filter(c=>c.id!==chosen.id);
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    rivals = pool.slice(0,5).map((c,i)=>{
      const r = createRacer({ ...c, driver:'ai', itemCd:6+Math.random()*6 });
      r.dist = 4+i*3; positionOnSpline(r, track);
      return r;
    });
  }

  game = {
    scene: view.scene, track, racers:[player, ...rivals], world, mp,
    race:{ phase:'count', laps:trackData.laps, t0:0, lapStart:0, best:Infinity,
           finishOrder:[], playerPlace:1, place:0 },
    events:[]
  };
  if(mp){
    const remotes = new Map(game.racers.filter(r=>r.driver==='remote').map(r=>[r.id, r]));
    mp.onState  = m => { const r = remotes.get(m.id); if(r) applyState(r, m); };
    mp.onFinish = m => { if(remotes.has(m.id) && !game.race.finishOrder.includes(m.id))
      game.race.finishOrder.push(m.id); };
    mp.onItem   = m => remoteUseItem(game, m);
    mp.onBox    = m => { const b = game.world.boxes[m.i];
      if(b){ b.cd=3; b.m.visible=b.shadow.visible=false; } };
  }
  view.meshes = createRacerMeshes(view.scene, game.racers);
  hud = createHud(track);
  document.body.classList.add('racing');    // reveal the HUD

  /* countdown with a timed launch: hold gas on the "1" */
  countStart=performance.now(); earlyHold=0;
  hud.toast('3', 700); audio.play('count');
  setTimeout(()=>{ hud.toast('2',700); audio.play('count'); }, 800);
  setTimeout(()=>{ hud.toast('1',700); audio.play('count'); }, 1600);
  setTimeout(()=>{
    game.race.phase='race';
    game.race.t0=performance.now(); game.race.lapStart=game.race.t0;
    audio.play('go');
    if(earlyHold>0.25){
      player.bonkT=1.4; hud.toast('JUMPED THE GUN!',1000); audio.play('bonk');
    } else if(input.get().sprint){
      player.boostT=1.3; hud.toast('PERFECT START!',1000); audio.play('boost');
    } else {
      hud.toast('GO!',900);
    }
  }, 2400);
}

/* ---------- menu flow: title → character select → race ----------
   Multiplayer (rung 1, two tabs): host clicks "2P", picks a rider, then
   shares the #join URL; the join tab picks a rider and waits for the
   host's start. Both then run the same countdown. */
const mpWait = document.getElementById('mpWait');
const mpStatus = document.getElementById('mpStatus');
const mpGo = document.getElementById('mpGo');

function lobbyList(roster){
  return roster.map((p,i)=>`${i+1}. <b>${p.char.name}</b>`).join('<br>');
}

function onPick(chosen){
  audio.unlock();
  if(!mp){ beginRace(chosen); return; }
  if(mp.role==='host'){
    const joinUrl = location.origin + location.pathname + location.search + '#join-' + mpRoom;
    const localHost = /^(localhost|127\.)/.test(location.hostname);
    mp.roster = [{uid:mp.myId, char:chosen}, ...mp.roster.filter(p=>p.uid!==mp.myId)];
    mp.tp.send({type:'lobby', players:mp.roster, track:trackData.id});
    mpWait.style.display='flex';
    const wire = () => mp.tp.kind==='supabase' ? 'over the internet'
                 : mp.tp.kind==='ws-relay' ? 'same wifi' : 'this browser (tabs)';
    const render = ()=>{
      mpStatus.innerHTML =
        `ROOM CODE: <b>${mpRoom}</b> · racing ${wire()}<br>` +
        `friends join at <b>${joinUrl}</b><br>` +
        `<button id="copyLink">COPY LINK</button> (up to 6 riders)<br>` +
        (localHost ? `<small>on phones, use your Mac's network URL
          (e.g. http://10.0.0.244:5173/${location.search}#join-${mpRoom})</small><br>` : '') +
        `<br>IN THE LOBBY:<br>${lobbyList(mp.roster)}`;
      mpGo.style.display = mp.roster.length>=2 ? 'inline-block' : 'none';
    };
    render();
    mp.onLobby = render;
    mpGo.onclick = ()=>{
      mp.tp.send({type:'start', players:mp.roster, track:trackData.id});
      mpWait.style.display='none';
      beginRace(chosen);
    };
  } else {
    const sendHello = ()=> mp.tp.send({type:'hello', uid:mp.myId, char:chosen});
    sendHello();
    const helloTimer = setInterval(sendHello, 1500);   // retry until the lobby sees us
    mpWait.style.display='flex';
    mpStatus.textContent='joining the lobby…';
    mp.onLobby = roster => {
      mpStatus.innerHTML = `IN THE LOBBY (host starts the race):<br>${lobbyList(roster)}`;
    };
    mp.onStart = ()=>{
      clearInterval(helloTimer);
      mpWait.style.display='none';
      beginRace(chosen);
    };
  }
}

/* room codes: #join-XXXXX carries the room across the internet transport;
   a bare #join keeps the old same-wifi/two-tab behavior */
let mpRoom = 'local';
function makeRoomCode(){
  const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L lookalikes
  return Array.from({length:5},()=>A[Math.floor(Math.random()*A.length)]).join('');
}
/* one delegated listener survives the lobby re-renders.
   clipboard API needs a secure context (https) — fall back to the old
   hidden-textarea trick so the button also works over plain http */
async function copyText(text){
  try { await navigator.clipboard.writeText(text); return true; } catch(e){}
  const ta=document.createElement('textarea');
  ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { return document.execCommand('copy'); }
  catch(e){ return false; }
  finally { ta.remove(); }
}
mpStatus.addEventListener('click', async e=>{
  if(e.target.id!=='copyLink') return;
  const joinUrl = location.origin + location.pathname + location.search + '#join-' + mpRoom;
  e.target.textContent = await copyText(joinUrl) ? 'COPIED!' : joinUrl;
});

const select = createCharacterSelect(onPick);
document.getElementById('startBtn').addEventListener('click', ()=>{
  audio.unlock();                             // AudioContext needs a user gesture
  document.getElementById('title').style.display='none';
  select.open();
});
if(hasInternet)
  document.getElementById('btn2p').textContent = '👥 RACE A FRIEND — share a link (beta)';
document.getElementById('btn2p').addEventListener('click', ()=>{
  audio.unlock();
  mpRoom = makeRoomCode();
  mp = createSession('host', mpRoom);
  mp.track = trackData.id;
  document.getElementById('title').style.display='none';
  select.open();
});
const joinMatch = location.hash.match(/#join(?:-([A-Z0-9]+))?/);
if(joinMatch){                                // joiner: straight to select
  mpRoom = joinMatch[1] || 'local';
  mp = createSession('join', mpRoom);
  mp.track = trackData.id;
  mp.onWrongTrack = id => {                   // host is on another course: follow it
    if(!TRACKS[id]) return;
    const q = new URLSearchParams(location.search);
    q.set('track', id);
    location.href = location.pathname + '?' + q + location.hash;
  };
  document.getElementById('title').style.display='none';
  select.open();
}

/* slow scenic orbit over the park behind the menus */
function flyover(now){
  const a = now*0.00005;
  view.camera.fov = 58;
  view.camera.position.set(Math.sin(a)*155, 54, Math.cos(a)*155);
  view.camera.lookAt(0, 6, 0);
  view.camera.updateProjectionMatrix();
  view.renderer.render(view.scene, view.camera);
}

/* ---------- loop ---------- */
let prev=performance.now(), booted=false;
function revealOnce(){
  if(booted) return; booted=true;
  const b=document.getElementById('boot');
  if(b){ b.style.opacity='0'; setTimeout(()=>b.remove(),450); }
}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-prev)/1000,0.05); prev=now;
  if(!game){ flyover(now); revealOnce(); return; }
  revealOnce();

  game.events.length=0;
  if(game.race.phase==='count'){
    if(now-countStart<1600 && input.get().sprint) earlyHold+=dt;
    updateAmbient(game, dt, now);   // the city keeps moving during the countdown
  }
  if(game.race.phase==='race'){
    step(game, input.get(), dt, now);
    audio.ambient(dt);
  } else if(game.race.phase==='done'){
    // everyone coasts on (remotes stay net-driven); the camera keeps following
    for(const r of game.racers) if(r.driver!=='remote') aiDriver(r, game, dt);
    updateAmbient(game, dt, now);
  }
  if(mp){
    for(const r of game.racers)
      if(r.driver==='remote') updateRemote(r, dt);  // smooth every net player
    sendT += dt;
    if(sendT >= 1/SEND_HZ){
      sendT = 0;
      mp.tp.send(snapshot(mp, game.racers[0]));
    }
    for(const e of game.events)
      if(e.type==='finish') mp.tp.send({type:'finish', id:mp.myId, total:e.total});
  }
  for(const e of game.events) audio.handle(e);
  draw(game, view, dt, now);
  hud.update(game, now);
}
requestAnimationFrame(frame);
