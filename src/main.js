/* =========================================================
   MILE HIGH CRIT — bootstrap + game loop.
   You vs the roster in src/characters.js.
   ========================================================= */
import './style.css';
import { ROSTER, PLAYER_CHARACTER } from './characters.js';
import washpark from './tracks/washpark.js';
import { Track } from './track.js';
import { createRenderer, createRacerMeshes, draw } from './render.js';
import { createRacer } from './racers.js';
import { positionOnSpline, aiDriver } from './drivers.js';
import { buildWorld, updateAmbient } from './world.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createCharacterSelect } from './select.js';
import { createSession, snapshot, applyState, updateRemote, SEND_HZ } from './mp.js';
import { step } from './sim.js';

const trackData = washpark;
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
    /* two humans, side by side on the grid — host left, joiner right */
    const side = mp.role==='host' ? -1 : 1;
    player.x += startN.x*2*side; player.z += startN.z*2*side;
    const remote = createRacer({ ...mp.remoteChar, id:'remote', driver:'remote' });
    remote.x = startP.x - startN.x*2*side; remote.z = startP.z - startN.z*2*side;
    remote.heading = player.heading;
    rivals = [remote];
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
    const remote = game.racers.find(r=>r.driver==='remote');
    mp.onState  = m => applyState(remote, m);
    mp.onFinish = m => { if(!game.race.finishOrder.includes('remote'))
      game.race.finishOrder.push('remote'); };
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

function onPick(chosen){
  audio.unlock();
  if(!mp){ beginRace(chosen); return; }
  if(mp.role==='host'){
    const joinUrl = location.origin + location.pathname + '#join';
    mpWait.style.display='flex';
    mpStatus.innerHTML =
      `open <b>${joinUrl}</b> in a second tab<br>waiting for player 2…`;
    mp.onPeerHello = char => {
      mpStatus.innerHTML = `<b>${char.name}</b> is ready!`;
      mpGo.style.display='inline-block';
    };
    if(mp.remoteChar){ mp.onPeerHello(mp.remoteChar); }   // joiner arrived early
    mpGo.onclick = ()=>{
      mp.tp.send({type:'start', char:chosen});
      mpWait.style.display='none';
      beginRace(chosen);
    };
  } else {
    mp.tp.send({type:'hello', id:mp.myId, char:chosen});
    mpWait.style.display='flex';
    mpStatus.textContent='waiting for the host to start the race…';
    mp.onStart = ()=>{ mpWait.style.display='none'; beginRace(chosen); };
  }
}

const select = createCharacterSelect(onPick);
document.getElementById('startBtn').addEventListener('click', ()=>{
  audio.unlock();                             // AudioContext needs a user gesture
  document.getElementById('title').style.display='none';
  select.open();
});
document.getElementById('btn2p').addEventListener('click', ()=>{
  audio.unlock();
  mp = createSession('host');
  document.getElementById('title').style.display='none';
  select.open();
});
if(location.hash.includes('join')){           // second tab: straight to select
  mp = createSession('join');
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
  }
  const remote = mp ? game.racers.find(r=>r.driver==='remote') : null;
  if(game.race.phase==='race'){
    step(game, input.get(), dt, now);
    audio.ambient(dt);
  } else if(game.race.phase==='done'){
    // everyone coasts on (remotes stay net-driven); the camera keeps following
    for(const r of game.racers) if(r.driver!=='remote') aiDriver(r, game, dt);
    updateAmbient(game, dt, now);
  }
  if(remote){
    updateRemote(remote, dt);                       // smooth the net player
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
