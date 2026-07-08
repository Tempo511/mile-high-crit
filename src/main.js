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

/* ---------- start a race with the chosen character ---------- */
function beginRace(chosen){
  const player = createRacer({ ...chosen, driver:'player' });
  player.x=startP.x; player.z=startP.z;
  player.heading=Math.atan2(startTan.x, startTan.z);

  /* 8 rivals drawn at random from the rest of the roster */
  const pool = ROSTER.filter(c=>c.id!==chosen.id);
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  const ais = pool.slice(0,8).map((c,i)=>{
    const r = createRacer({ ...c, driver:'ai', itemCd:6+Math.random()*6 });
    r.dist = 4+i*3; positionOnSpline(r, track);
    return r;
  });

  game = {
    scene: view.scene, track, racers:[player, ...ais], world,
    race:{ phase:'count', laps:trackData.laps, t0:0, lapStart:0, best:Infinity,
           finishOrder:[], playerPlace:1, place:0 },
    events:[]
  };
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

/* ---------- menu flow: title → character select → race ---------- */
const select = createCharacterSelect(beginRace);
document.getElementById('startBtn').addEventListener('click', ()=>{
  audio.unlock();                             // AudioContext needs a user gesture
  document.getElementById('title').style.display='none';
  select.open();
});

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
let prev=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-prev)/1000,0.05); prev=now;
  if(!game){ flyover(now); return; }

  game.events.length=0;
  if(game.race.phase==='count'){
    if(now-countStart<1600 && input.get().sprint) earlyHold+=dt;
  }
  if(game.race.phase==='race'){
    step(game, input.get(), dt, now);
    audio.ambient(dt);
  } else if(game.race.phase==='done'){
    // everyone (incl. the finished player) coasts on; the camera keeps following
    for(const r of game.racers) aiDriver(r, game, dt);
    updateAmbient(game, dt, now);
  }
  for(const e of game.events) audio.handle(e);
  draw(game, view, dt, now);
  hud.update(game, now);
}
requestAnimationFrame(frame);
