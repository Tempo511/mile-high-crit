/* FLYCAM — a free-fly camera over the actual Wash Park map. Dev tool only
   (open /flycam.html on the dev server). Reuses the game's Track + world so
   what you see is exactly what races. Renders full-res (not the retro 320p)
   for inspecting detail, and shows the world coordinate under the crosshair —
   handy for placing props while editing src/tracks/washpark.js. */
import * as THREE from 'three';
import washpark from './tracks/washpark.js';
import { Track } from './track.js';
import { buildWorld, updateAmbient } from './world.js';

const canvas = document.getElementById('cam');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(washpark.sky);
scene.fog = new THREE.Fog(washpark.sky, 260, 1100);   // pushed back to see the whole park

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 3000);
camera.rotation.order = 'YXZ';

const amb = washpark.ambient || [0xffe6c7,0.55];
scene.add(new THREE.AmbientLight(amb[0], amb[1]));
const sunDef = washpark.sun || [0xfff1d0,0.95];
const sun = new THREE.DirectionalLight(sunDef[0], sunDef[1]); sun.position.set(-140,150,40); scene.add(sun);
const fill = new THREE.DirectionalLight(0x9b8ec4,0.3); fill.position.set(120,60,-80); scene.add(fill);

const track = new Track(scene, washpark);
const world = buildWorld(scene, track);
const gameStub = { scene, track, world, racers:[], race:{phase:'race'}, events:[] };

function resize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* start high, looking down over the park center */
camera.position.set(0, 140, 250);
let yaw=0, pitch=-0.5;

canvas.addEventListener('click', ()=> canvas.requestPointerLock());
window.addEventListener('mousemove', e=>{
  if(document.pointerLockElement!==canvas) return;
  yaw   -= e.movementX*0.0022;
  pitch -= e.movementY*0.0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch));
});

const keys={};
window.addEventListener('keydown', e=>{ keys[e.code]=true; });
window.addEventListener('keyup',   e=>{ keys[e.code]=false; });

const $coord = document.getElementById('coord');
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
let prev = performance.now();

function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min((now-prev)/1000, 0.05); prev = now;

  camera.rotation.y = yaw; camera.rotation.x = pitch;
  camera.getWorldDirection(fwd);
  right.crossVectors(fwd, up).normalize();

  const speed = (keys['ShiftLeft']||keys['ShiftRight'] ? 190 : 60) * dt;
  if(keys['KeyW']) camera.position.addScaledVector(fwd,  speed);
  if(keys['KeyS']) camera.position.addScaledVector(fwd, -speed);
  if(keys['KeyD']) camera.position.addScaledVector(right, speed);
  if(keys['KeyA']) camera.position.addScaledVector(right,-speed);
  if(keys['Space']) camera.position.y += speed;
  if(keys['KeyQ']||keys['ControlLeft']) camera.position.y -= speed;

  updateAmbient(gameStub, dt, now);   // cars, surreys, clouds, boost pads, boats, fans…
  renderer.render(scene, camera);

  /* world coord under the crosshair (ray to the ground plane y=0) */
  let ground = '—';
  if(fwd.y < -0.001){
    const t = -camera.position.y / fwd.y;
    const gx = camera.position.x + fwd.x*t, gz = camera.position.z + fwd.z*t;
    ground = `x ${gx.toFixed(0)}, z ${gz.toFixed(0)}`;
  }
  $coord.textContent =
    `cam  x ${camera.position.x.toFixed(0)}  y ${camera.position.y.toFixed(0)}  z ${camera.position.z.toFixed(0)}   ·   ground ${ground}`;
}
requestAnimationFrame(frame);
