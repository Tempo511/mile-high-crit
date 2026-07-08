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
import { step } from './sim.js';

const trackData = washpark;
const view = createRenderer(trackData);
const track = new Track(view.scene, trackData);

/* ---------- racers ---------- */
const startP = track.pointAt(0), startTan = track.tangentAt(0);
const player = createRacer({ ...PLAYER_CHARACTER, driver:'player' });
player.x=startP.x; player.z=startP.z;
player.heading=Math.atan2(startTan.x, startTan.z);

const ais = ROSTER.map((c,i)=>{
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

/* ---------- race start ---------- */
document.getElementById('startBtn').addEventListener('click', ()=>{
  document.getElementById('title').style.display='none';
  game.race.phase='count';
  hud.toast('3', 700);
  setTimeout(()=>hud.toast('2',700), 800);
  setTimeout(()=>hud.toast('1',700), 1600);
  setTimeout(()=>{ hud.toast('GO!',900); game.race.phase='race';
    game.race.t0=performance.now(); game.race.lapStart=game.race.t0; }, 2400);
});

/* ---------- loop ---------- */
let prev=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min((now-prev)/1000,0.05); prev=now;
  game.events.length=0;
  if(game.race.phase==='race'){
    step(game, input.get(), dt, now);
  } else if(game.race.phase==='done'){
    for(const r of game.racers) if(r.driver==='ai') aiDriver(r, game, dt);
    updateAmbient(game, dt, now);
  }
  draw(game, view, dt, now);
  hud.update(game, now);
}
requestAnimationFrame(frame);
