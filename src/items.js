/* Items: pickup, use, projectiles (sopapillas), attack geese, spin-outs.
   Projectiles/geese live in game.world; owners/targets are racer refs. */
import { ITEMS } from './constants.js';
import { lambert } from './gfx.js';
import { gooseMesh } from './riders.js';
import { progressOf } from './racers.js';
import * as THREE from 'three';

const sopG = new THREE.BoxGeometry(0.7,0.32,0.7);

export function throwSopapilla(game, owner){
  const m = new THREE.Mesh(sopG, lambert(0xe0b487));
  m.position.set(owner.x,0.8,owner.z); game.scene.add(m);
  game.world.projectiles.push({
    m, x:owner.x, z:owner.z,
    hx:Math.sin(owner.heading), hz:Math.cos(owner.heading),
    life:2.4, owner
  });
}

export function launchGoose(game, owner, target){
  const m = gooseMesh(0.95);
  m.position.set(owner.x,0.4,owner.z); game.scene.add(m);
  game.world.attackGeese.push({m, target, x:owner.x, z:owner.z, life:6, owner});
}

export function giveItem(r){
  const roll=['coffee','coffee','sopapilla','sopapilla','goose'][Math.floor(Math.random()*5)];
  r.item=roll;
  return roll;
}

export function useItem(game, r){
  if(!r.item || game.race.phase!=='race' || r.spin>0) return;
  const it=r.item; r.item=null;
  if(it==='coffee'){ r.boostT=1.25; r.energy=1;   // caffeine refills the legs too
    game.events.push({type:'toast', msg:'ESPRESSO!', ms:700}); }
  if(it==='sopapilla'){ throwSopapilla(game, r); }
  if(it==='goose'){
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

export function spinRacer(game, r){
  if(r.spin>0) return;
  r.spin=1.0;
  if(r.driver==='player'){
    r.drifting=false; r.driftCharge=0; r.shake=0.4;
    game.events.push({type:'feathers', x:r.x, z:r.z});
  }
  game.events.push({type:'toast', msg:'HONK!!', ms:700});
}

export function updateProjectiles(game, dt){
  const { projectiles } = game.world;
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];
    pr.life-=dt;
    pr.x+=pr.hx*34*dt; pr.z+=pr.hz*34*dt;
    pr.m.position.set(pr.x,0.8,pr.z); pr.m.rotation.y+=dt*10;
    let hit=false;
    for(const r of game.racers){
      if(r===pr.owner) continue;
      if((pr.x-r.x)**2+(pr.z-r.z)**2<2){ spinRacer(game, r); hit=true; break; }
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

export { ITEMS };
