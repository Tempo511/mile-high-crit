/* Items: pickup (position-weighted), use, and all the projectiles/traps/
   shields. Everything lives in game.world; owners/targets are racer refs.

   The 7-item set, by role:
     coffee   ☕  self   — espresso boost + refill legs
     chile    🌶️  offense— straight thrown pepper, spins on hit
     frisbee  🥏  offense— homing disc, locks the nearest racer ahead
     goose    🪿  offense— homing attack goose (targets leader-ward)
     bison    🦬  defense— orbiting guard: blocks one hit, bumps rivals
     chinook  🌬️  catchup— big boost + full legs (only drops when behind)
     coldbrew 🥤  trap   — slick dropped behind; spins whoever hits it
*/
import { ITEMS } from './constants.js';
import { lambert } from './gfx.js';
import { gooseMesh } from './riders.js';
import { progressOf } from './racers.js';
import * as THREE from 'three';

/* ---------- meshes ---------- */
function chileMesh(){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.22,0.8,6), lambert(0x4c8c3f));
  body.rotation.z = Math.PI/2; g.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,5), lambert(0x3e6b35));
  tip.position.set(-0.5,0,0); tip.rotation.z = Math.PI/2 + 0.4; g.add(tip);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.2,4), lambert(0x6e4b2a));
  stem.position.set(0.42,0.1,0); stem.rotation.z = -0.5; g.add(stem);
  return g;
}
function frisbeeMesh(){
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.1,14), lambert(0xe84855));
  g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48,0.06,6,14), lambert(0xf5e9d0));
  rim.rotation.x = Math.PI/2; g.add(rim);
  return g;
}
function bisonMesh(){
  const g = new THREE.Group();
  const fur = lambert(0x5a4030);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.4), fur); body.position.y=0.4; g.add(body);
  const hump = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.4), fur); hump.position.set(0.18,0.62,0); g.add(hump);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.34,0.34), lambert(0x3a2a20));
  head.position.set(0.44,0.42,0); g.add(head);
  [-0.16,0.16].forEach(z=>{
    const horn=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.08,0.08), lambert(0xd8d2c5));
    horn.position.set(0.5,0.56,z); g.add(horn);
  });
  g.scale.setScalar(0.85);
  return g;
}

/* ---------- launchers ---------- */
export function throwChile(game, owner){
  const m = chileMesh();
  m.position.set(owner.x,0.8,owner.z); game.scene.add(m);
  game.world.projectiles.push({
    m, x:owner.x, z:owner.z, hx:Math.sin(owner.heading), hz:Math.cos(owner.heading),
    speed:34, life:2.4, owner, target:null
  });
}
export function throwFrisbee(game, owner){
  const me = progressOf(game.track, owner);
  let target=null, best=1e9;
  for(const o of game.racers){
    if(o===owner) continue;
    const gap=progressOf(game.track,o)-me;
    if(gap>0 && gap<best){ best=gap; target=o; }
  }
  const m = frisbeeMesh();
  m.position.set(owner.x,0.8,owner.z); game.scene.add(m);
  game.world.projectiles.push({
    m, x:owner.x, z:owner.z, hx:Math.sin(owner.heading), hz:Math.cos(owner.heading),
    speed:40, life:3.5, owner, target, homing:true
  });
}
export function launchGoose(game, owner, target){
  const m = gooseMesh(0.95);
  m.position.set(owner.x,0.4,owner.z); game.scene.add(m);
  game.world.attackGeese.push({m, target, x:owner.x, z:owner.z, life:6, owner});
}
export function launchShield(game, owner){
  owner.shieldT = 6;
  const m = bisonMesh(); game.scene.add(m);
  game.world.shields.push({ m, owner, ang:0 });
}
export function dropSlick(game, owner){
  const bx = owner.x - Math.sin(owner.heading)*2.2;
  const bz = owner.z - Math.cos(owner.heading)*2.2;
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.7,14),
    new THREE.MeshLambertMaterial({color:0x2a1c14, transparent:true, opacity:0.72}));
  m.rotation.x=-Math.PI/2; m.position.set(bx,0.05,bz); game.scene.add(m);
  game.world.slicks.push({ m, x:bx, z:bz, life:9, owner });
}

/* ---------- pickup: weighted by the player's current place ---------- */
export function giveItem(r, game){
  const total = game.racers.length;
  const place = game.race.playerPlace || 1;
  const frac = total>1 ? (place-1)/(total-1) : 0;   // 0 = leading, 1 = last
  const pool = [
    ['coffee',   2],
    ['chile',    2],
    ['coldbrew', 1 + (1-frac)*2],       // leaders get the defensive trap
    ['bison',    1.5],
    ['frisbee',  0.5 + frac*3],         // homing offense skews to the back
    ['goose',    0.5 + frac*2],
    ['chinook',  frac>0.4 ? frac*4 : 0] // catch-up only when mid-pack or worse
  ];
  let sum=0; for(const [,w] of pool) sum+=w;
  let x=Math.random()*sum;
  for(const [k,w] of pool){ x-=w; if(x<=0){ r.item=k; return k; } }
  r.item='coffee'; return 'coffee';
}

export function useItem(game, r){
  if(!r.item || game.race.phase!=='race' || r.spin>0) return;
  const it=r.item; r.item=null;
  if(it==='coffee'){ r.boostT=1.25; r.energy=1;
    game.events.push({type:'toast', msg:'ESPRESSO!', ms:700}); }
  else if(it==='chile'){ throwChile(game, r);
    game.events.push({type:'toast', msg:'GREEN CHILE!', ms:700}); }
  else if(it==='frisbee'){ throwFrisbee(game, r);
    game.events.push({type:'toast', msg:'FRISBEE!', ms:700}); }
  else if(it==='bison'){ launchShield(game, r);
    game.events.push({type:'toast', msg:'BISON GUARD', ms:800}); }
  else if(it==='chinook'){ r.boostT=1.9; r.energy=1;
    game.events.push({type:'toast', msg:'CHINOOK WIND!', ms:900}); }
  else if(it==='coldbrew'){ dropSlick(game, r);
    game.events.push({type:'toast', msg:'COLD BREW SPILL', ms:800}); }
  else if(it==='goose'){
    const me=progressOf(game.track, r);
    let target=null, bestGap=1e9;
    for(const o of game.racers){
      if(o===r) continue;
      const gap=progressOf(game.track,o)-me;
      if(gap>0 && gap<bestGap){bestGap=gap; target=o;}
    }
    launchGoose(game, r, target);
    game.events.push({type:'toast', msg:'GOOSE DEPLOYED', ms:700});
  }
}

/* a shielded racer eats the hit instead of spinning */
export function spinRacer(game, r){
  if(r.spin>0) return;
  const isPlayer = r.driver==='player';
  if(r.shieldT>0){
    r.shieldT=0;
    if(isPlayer){ r.shake=0.25; game.events.push({type:'toast', msg:'BLOCKED!', ms:600}); }
    return;
  }
  r.spin=1.0;
  if(isPlayer){
    r.drifting=false; r.driftCharge=0; r.shake=0.4;
    game.events.push({type:'feathers', x:r.x, z:r.z});
    game.events.push({type:'toast', msg:'SPUN OUT!', ms:700});   // player-only feedback
  }
}

/* ---------- per-frame updates ---------- */
export function updateProjectiles(game, dt){
  const { projectiles } = game.world;
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];
    pr.life-=dt;
    if(pr.homing && pr.target && !pr.target.finished){   // steer toward the mark
      const dx=pr.target.x-pr.x, dz=pr.target.z-pr.z, L=Math.hypot(dx,dz)||1;
      pr.hx += (dx/L-pr.hx)*Math.min(1,dt*4);
      pr.hz += (dz/L-pr.hz)*Math.min(1,dt*4);
      const n=Math.hypot(pr.hx,pr.hz)||1; pr.hx/=n; pr.hz/=n;
    }
    pr.x+=pr.hx*pr.speed*dt; pr.z+=pr.hz*pr.speed*dt;
    pr.m.position.set(pr.x,0.8,pr.z);
    pr.m.rotation.y+=dt*12; if(pr.homing) pr.m.rotation.x+=dt*8;
    let hit=false;
    for(const rr of game.racers){
      if(rr===pr.owner) continue;
      if((pr.x-rr.x)**2+(pr.z-rr.z)**2<2){ spinRacer(game, rr); hit=true; break; }
    }
    if(hit || pr.life<=0){ game.scene.remove(pr.m); projectiles.splice(i,1); }
  }
}

export function updateAttackGeese(game, dt, now){
  const { attackGeese } = game.world;
  for(let i=attackGeese.length-1;i>=0;i--){
    const g=attackGeese[i];
    g.life-=dt;
    let tx, tz;
    if(g.target && !g.target.finished){ tx=g.target.x; tz=g.target.z; }
    else { tx=g.x+Math.sin(g.owner.heading)*10; tz=g.z+Math.cos(g.owner.heading)*10; }
    const dx=tx-g.x, dz=tz-g.z, L=Math.hypot(dx,dz)||1;
    g.x+=dx/L*30*dt; g.z+=dz/L*30*dt;
    g.m.position.set(g.x, 0.5+Math.abs(Math.sin(now/70))*0.5, g.z);
    g.m.rotation.y=Math.atan2(dx,dz)+Math.PI/2;
    let hit=false;
    if(g.target && (g.x-g.target.x)**2+(g.z-g.target.z)**2<2){ spinRacer(game, g.target); hit=true; }
    if(!hit && g.owner.driver!=='player'){
      const p=game.racers.find(o=>o.driver==='player');
      if(p && (g.x-p.x)**2+(g.z-p.z)**2<2){ spinRacer(game, p); hit=true; }
    }
    if(hit || g.life<=0){ game.scene.remove(g.m); attackGeese.splice(i,1); }
  }
}

export function updateShields(game, dt, now){
  const { shields } = game.world;
  for(let i=shields.length-1;i>=0;i--){
    const s=shields[i];
    s.owner.shieldT-=dt;
    if(s.owner.shieldT<=0){ game.scene.remove(s.m); shields.splice(i,1); continue; }
    s.ang += dt*3;
    const ox=s.owner.x+Math.cos(s.ang)*1.7, oz=s.owner.z+Math.sin(s.ang)*1.7;
    s.m.position.set(ox, 0.5+Math.abs(Math.sin(now/120))*0.15, oz);
    s.m.rotation.y = -s.ang;
    for(const rr of game.racers){   // the guard bumps rivals it runs into
      if(rr===s.owner) continue;
      if((ox-rr.x)**2+(oz-rr.z)**2<1.6){ spinRacer(game, rr); }
    }
  }
}

export function updateSlicks(game, dt){
  const { slicks } = game.world;
  for(let i=slicks.length-1;i>=0;i--){
    const s=slicks[i];
    s.life-=dt;
    for(const rr of game.racers){
      if(rr===s.owner) continue;
      if(Math.abs(rr.speed)>4 && (s.x-rr.x)**2+(s.z-rr.z)**2<2.2){ spinRacer(game, rr); }
    }
    if(s.life<=0){ game.scene.remove(s.m); slicks.splice(i,1); }
    else s.m.material.opacity = Math.min(0.72, s.life*0.4);   // fade out
  }
}

export { ITEMS };
