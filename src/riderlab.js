/* RIDER LAB — dev tool for reviewing rider designs on turntables.
   Not part of the game: open /riders.html on the dev server.
   Shows the current roster + experimental characters at full resolution. */
import * as THREE from 'three';
import { makeRider } from './riders.js';
import { ROSTER, PLAYER_CHARACTER } from './characters.js';

/* new concepts audition here before being promoted into characters.js */
const YOU = { torso:PLAYER_CHARACTER.torso, helmet:PLAYER_CHARACTER.helmet };
const EXPERIMENTS = [
  { name:'NEW DEFAULT',    ...YOU, look:{} },
  { name:'OLD BOXY',       ...YOU, look:{ tw:0.5, th:0.72, td:0.42, lean:0.5, ty:1.35 } },
  { name:'TORSO: SHORT',   ...YOU, look:{ tw:0.5, th:0.55, td:0.42, lean:0.5, ty:1.43 } },
  { name:'TORSO: LOW PRO', ...YOU, look:{ th:0.5, ty:1.38, lean:0.7, tw:0.46, td:0.38 } },
];

const LINEUP = [
  { name:'YOU', torso:PLAYER_CHARACTER.torso, helmet:PLAYER_CHARACTER.helmet, look:{} },
  ...ROSTER.map(c=>({ name:c.name, torso:c.torso, helmet:c.helmet, look:c.look||{} })),
  ...EXPERIMENTS.map(c=>({ ...c, exp:true })),
];

/* ---------- scene ---------- */
const canvas = document.getElementById('lab');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x241832);
scene.fog = new THREE.Fog(0x241832, 30, 70);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
let zoom = 1;

scene.add(new THREE.AmbientLight(0xffe6c7, 0.6));
const sun = new THREE.DirectionalLight(0xfff1d0, 0.95);
sun.position.set(-30, 40, 25);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9b8ec4, 0.35);
fill.position.set(25, 15, -20);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),
  new THREE.MeshLambertMaterial({color:0x2e2140}));
floor.rotation.x=-Math.PI/2; scene.add(floor);

/* ---------- riders on pedestals ---------- */
const COLS = 6, SX = 4.2, SZ = 5.2;
const riders = [];
const tagBox = document.getElementById('tags');
LINEUP.forEach((c,i)=>{
  const col = i%COLS, row = Math.floor(i/COLS);
  const x = (col-(COLS-1)/2)*SX, z = row*SZ;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.7,0.22,18),
    new THREE.MeshLambertMaterial({color:0x1a1423}));
  ped.position.set(x,0.11,z); scene.add(ped);
  const m = makeRider({torso:c.torso, helmet:c.helmet, ...c.look});
  m.position.set(x,0.22,z);
  scene.add(m);
  const tag = document.createElement('div');
  tag.className = 'tag'+(c.exp?' exp':'');
  tag.textContent = c.name;
  tagBox.appendChild(tag);
  riders.push({m, tag, x, z});
});
const rows = Math.ceil(LINEUP.length/COLS);
const midZ = (rows-1)*SZ/2;

function resize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ---------- input: drag = spin, scroll = zoom ---------- */
let theta = 0.5, spin = true, lastX = 0, dragging = false;
canvas.addEventListener('pointerdown', e=>{ dragging=true; lastX=e.clientX; spin=false; });
addEventListener('pointerup', ()=> dragging=false);
addEventListener('pointermove', e=>{
  if(dragging){ theta += (e.clientX-lastX)*0.012; lastX=e.clientX; }
});
addEventListener('wheel', e=>{
  zoom = Math.max(0.45, Math.min(2.2, zoom + e.deltaY*0.001));
}, {passive:true});
setInterval(()=>{ if(!dragging) spin=true; }, 4000);   // resume auto-spin after idle

/* ---------- loop ---------- */
const v = new THREE.Vector3();
let prev = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min((now-prev)/1000, 0.05); prev = now;
  if(spin) theta += dt*0.45;

  for(const r of riders){
    r.m.rotation.y = theta;
    /* gentle pedaling so they look alive */
    const [l,rr] = r.m.userData.legs;
    l.position.y = 0.95+Math.sin(now/300)*0.1;
    rr.position.y = 0.95+Math.sin(now/300+Math.PI)*0.1;
    for(const w of r.m.userData.wheels) w.rotation.z -= dt*2;
  }

  camera.position.set(0, 7.5*zoom, midZ + 16*zoom);
  camera.lookAt(0, 1, midZ - 1);
  renderer.render(scene, camera);

  /* project name tags */
  for(const r of riders){
    v.set(r.x, 2.9, r.z).project(camera);
    const sx = (v.x*0.5+0.5)*window.innerWidth;
    const sy = (-v.y*0.5+0.5)*window.innerHeight;
    r.tag.style.left = sx+'px';
    r.tag.style.top = (sy-14)+'px';
    r.tag.style.display = v.z<1 ? 'block' : 'none';
  }
}
requestAnimationFrame(frame);
