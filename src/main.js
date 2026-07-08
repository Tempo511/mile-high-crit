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
import { step } from './sim.js';

const trackData = washpark;
const view = createRenderer(trackData);
const track = new Track(view.scene, trackData);

/* ---------- racers ---------- */
const startP = track.pointAt(0), startTan = track.tangentAt(0);
const player = createRacer({ ...PLAYER_CHARACTER, driver:'player' });
player.x=startP.x; player.z=startP.z;
player.heading=Math.atan2(startTan.x, startTan.z);

/* the roster is bigger than one race — draw 8 random rivals per race */
const pool = [...ROSTER];
for(let i=pool.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]];
}
const ais = pool.slice(0,8).map((c,i)=>{
  const r = createRacer({ ...c, driver:'ai', itemCd:6+Math.random()*6 });
  r.dist = 4+i*3;
  positionOnSpline(r, track);
  return r;
});

const game = {
  scene: view.scene,
  track,
  racers: [player, ...ais],
  world: null,
  race: {
    phase:'title',
    laps: trackData.laps,
    t0:0, lapStart:0, best:Infinity,
    finishOrder:[], playerPlace:1, place:0
  },
  events: []
};
game.world = buildWorld(view.scene, track);
view.meshes = createRacerMeshes(view.scene, game.racers);

const input = createInput();
const hud = createHud(track);
const audio = createAudio();

/* ---------- race start (with timed launch: hold drift on the "1") ---------- */
let countStart=0, earlyHold=0;
document.getElementById('startBtn').addEventListener('click', ()=>{
  audio.unlock();                             // AudioContext needs a user gesture
  document.getElementById('title').style.display='none';
  game.race.phase='count';
  countStart=performance.now(); earlyHold=0;
  hud.toast('3', 700); audio.play('count');
  setTimeout(()=>{ hud.toast('2',700); audio.play('count'); }, 800);
  setTimeout(()=>{ hud.toast('1',700); audio.play('count'); }, 1600);
  setTimeout(()=>{
    game.race.phase='race';
    game.race.t0=performance.now(); game.race.lapStart=game.race.t0;
    audio.play('go');
    if(earlyHold>0.25){
      player.bonkT=1.4;                       // wobbly legs off the line
      hud.toast('JUMPED THE GUN!',1000); audio.play('bonk');
    } else if(input.get().sprint){
      player.boostT=1.3;
      hud.toast('PERFECT START!',1000); audio.play('boost');
    } else {
      hud.toast('GO!',900);
    }
  }, 2400);
});

/* ---------- loop ---------- */
let prev=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-prev)/1000,0.05); prev=now;
  game.events.length=0;
  if(game.race.phase==='count'){
    // holding the gas before the "1" shows counts as jumping the gun
    if(now-countStart<1600 && input.get().sprint) earlyHold+=dt;
  }
  if(game.race.phase==='race'){
    step(game, input.get(), dt, now);
    audio.ambient(dt);
  } else if(game.race.phase==='done'){
    for(const r of game.racers) if(r.driver==='ai') aiDriver(r, game, dt);
    updateAmbient(game, dt, now);
  }
  for(const e of game.events) audio.handle(e);
  draw(game, view, dt, now);
  hud.update(game, now);
}
requestAnimationFrame(frame);
