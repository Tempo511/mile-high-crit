/* Ambient world life: resident geese, feather bursts, paddle boats,
   and the item-box spin/cooldown/pickup loop. */
import * as THREE from 'three';
import { gooseMesh } from './riders.js';
import { giveItem } from './items.js';
import { makePerson, makePedestrian, makeDog, makeSurrey } from './props.js';
import { makeRng } from './rng.js';

/* Denver pedestrians who treat the racing line as a walking path.
   dodges: scrambles clear when a bike bears down. cross: wanders back
   and forth across the road. line: what they say when you clip them. */
const PED_TYPES = [
  { id:'hippie',     shirt:0xf25caf, tieDye:true, hair:true,
    speed:1.0, dodges:true,  cross:true,  line:'NAMASTE ✌️' },
  { id:'goth',       shirt:0x1a1423, pale:true, umbrella:true,
    speed:0.7, dodges:false, cross:false, line:'ugh.' },
  { id:'jock',       shirt:0xe8912d, headband:true,
    speed:2.6, dodges:true,  cross:false, line:'MY BAD BRO' },
  { id:'techbro',    shirt:0x4a5a6a, phone:true,
    speed:1.2, dodges:false, cross:true,  line:'sorry — on a call' },
  { id:'influencer', shirt:0xffd166, phone:true,
    speed:0.4, dodges:false, cross:false, line:'DID YOU GET THAT?!' },
];

export function buildWorld(scene, track){
  const geese = [];
  for(const gg of track.data.gaggles || []){
    let cx=gg.x, cz=gg.z;
    if(gg.t!==undefined){ const p=track.pointAt(gg.t); cx=p.x; cz=p.z; }
    for(let i=0;i<gg.count;i++){
      const gz = gooseMesh();
      gz.position.set(cx+(Math.random()-0.5)*gg.spread, 0, cz+(Math.random()-0.5)*gg.spread);
      gz.rotation.y = Math.random()*6;
      gz.userData = {home:gz.position.clone(), flee:0, phase:Math.random()*6, stunned:0};
      scene.add(gz); geese.push(gz);
    }
  }

  const feathers = [];
  for(let i=0;i<12;i++){
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.4,0.25),
      new THREE.MeshLambertMaterial({color:0xf5e9d0, side:THREE.DoubleSide, transparent:true}));
    f.visible=false; scene.add(f);
    feathers.push({m:f, vx:0, vy:0, vz:0, life:0});
  }

  const sparkles = [];
  for(let i=0;i<12;i++){
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,0.18),
      new THREE.MeshBasicMaterial({color:0xffd166, transparent:true}));
    s.visible=false; scene.add(s);
    sparkles.push({m:s, vx:0, vy:0, vz:0, life:0});
  }

  /* gravel-loop traffic: joggers, dog walkers, rollerbladers, and surreys */
  const joggers = [];
  const loop = track.dynamic.paths.find(p=>p.jog) || track.dynamic.paths[0];
  if(loop && track.data.joggers){
    const rng = makeRng((track.data.seed||1)+7);
    const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9,0xf5e9d0];
    for(let i=0;i<track.data.joggers;i++){
      const kind = i%5===0 ? 'surrey' : i%5===1 ? 'walker' : i%5===2 ? 'blader' : 'jogger';
      let m, dog=null, speed;
      if(kind==='surrey'){ m=makeSurrey(rng); speed=2.2+rng()*1.0; }
      else {
        m=makePerson(rng, shirts[i%shirts.length], 'stand');
        if(kind==='walker'){ dog=makeDog(rng); scene.add(dog); speed=1.5+rng()*0.6; }
        else if(kind==='blader'){ speed=5.0+rng()*1.6; }
        else speed=3.2+rng()*1.8;
      }
      scene.add(m);
      joggers.push({
        m, dog, kind, curve:loop.curve, len:loop.len,
        t: i/track.data.joggers,
        speed: speed * (i%2 ? 1 : -1),
        phase: rng()*6
      });
    }
  }

  /* geese floating on the lakes — scenery, not chaseable */
  const lakeGeese = [];
  for(const lg of track.data.lakeGeese || []){
    for(let i=0;i<lg.count;i++){
      const gz = gooseMesh(0.9);
      gz.position.set(lg.x+(Math.random()-0.5)*lg.spread, 0, lg.z+(Math.random()-0.5)*lg.spread);
      gz.rotation.y=Math.random()*6;
      gz.userData.phase=Math.random()*6;
      scene.add(gz); lakeGeese.push(gz);
    }
  }

  /* pedestrians on the racing line — confined to authored crossing zones
     so the hazard is readable ("that's a ped area") rather than diffuse */
  const peds = [];
  const pcfg = track.data.pedestrians;
  if(pcfg){
    const prng = makeRng((track.data.seed||1)+13);
    const zones = pcfg.zones || [{t:(pcfg.tMin+pcfg.tMax)/2,
      span:(pcfg.tMax-pcfg.tMin)/2, count:pcfg.count}];
    let pi=0;
    for(const zone of zones){
      for(let k=0;k<zone.count;k++,pi++){
        const type = PED_TYPES[pi%PED_TYPES.length];
        const m = makePedestrian(prng, type);
        scene.add(m);
        peds.push({
          m, type,
          t: zone.t + (prng()-0.5)*2*zone.span,
          tMin: zone.t-zone.span, tMax: zone.t+zone.span,
          dir: prng()<0.5 ? -1 : 1,
          lateral: (prng()-0.5)*5,
          latPhase: prng()*6,
          state:'walk', stateT:0, bumpCd:0, phase:prng()*6,
          lastX:0, lastZ:0
        });
      }
    }
  }

  /* goose-poop splats that geese leave on the path (a Wash Park classic) */
  const poops = [];
  for(let i=0;i<16;i++){
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.75,7),
      new THREE.MeshLambertMaterial({color:0xdce2b8, transparent:true, opacity:0.9}));
    m.rotation.x=-Math.PI/2; m.position.y=0.03; m.visible=false; scene.add(m);
    poops.push({m, x:0, z:0, active:false, life:0, cd:0});
  }

  return {
    geese, feathers, sparkles, joggers, lakeGeese, peds, poops, poopT:2,
    boats: track.dynamic.boats,
    clouds: track.dynamic.clouds,
    pads: track.dynamic.pads,
    cars: track.dynamic.cars,
    fans: track.dynamic.fans,
    boxes: track.boxes,
    projectiles: [],
    attackGeese: [],
    shields: [],
    slicks: []
  };
}

/* Geese leave slick poop splats on the racing line near where they gather;
   hit one at speed and you skid (speed cut + wobble) — a nuisance, not a
   spin-out, since the goose zones are littered with them. */
export function updateGoosePoop(game, dt, now){
  const w = game.world, track = game.track;
  w.poopT -= dt;
  if(w.poopT<=0){
    w.poopT = 0.7 + Math.random()*1.1;
    const g = w.geese[(Math.random()*w.geese.length)|0];
    if(g){
      const [idx] = track.nearestIdx(g.position.x, g.position.z, 0);
      const s = track.samples[idx];
      if((s.x-g.position.x)**2 + (s.z-g.position.z)**2 < 900){   // only near the road
        const slot = w.poops.find(p=>!p.active)
          || w.poops.reduce((a,b)=>a.life<b.life?a:b);
        slot.active=true; slot.life=13; slot.cd=0;
        slot.x = s.x + (Math.random()-0.5)*5;
        slot.z = s.z + (Math.random()-0.5)*5;
        slot.m.position.set(slot.x, 0.03, slot.z);
        slot.m.material.opacity=0.9; slot.m.visible=true;
      }
    }
  }
  /* splats are visual-only flavor — the geese themselves are the hazard.
     (Doubling up poop + geese in the same zones read as annoying, not funny.
     To restore hard mode: re-add a hit check here that cuts player.speed.) */
  for(const p of w.poops){
    if(!p.active) continue;
    p.life-=dt;
    if(p.life<3) p.m.material.opacity = Math.max(0, p.life/3*0.9);
    if(p.life<=0){ p.active=false; p.m.visible=false; }
  }
}

export function burstSparkles(world, x, z){
  world.sparkles.forEach(s=>{
    s.m.visible=true; s.life=0.45+Math.random()*0.3;
    s.m.position.set(x,1.1,z);
    s.vx=(Math.random()-0.5)*6; s.vy=2.5+Math.random()*3.5; s.vz=(Math.random()-0.5)*6;
    s.m.material.opacity=1;
  });
}

export function burstFeathers(world, x, z){
  world.feathers.forEach(f=>{
    f.m.visible=true; f.life=0.9+Math.random()*0.5;
    f.m.position.set(x,1,z);
    f.vx=(Math.random()-0.5)*7; f.vy=3+Math.random()*4; f.vz=(Math.random()-0.5)*7;
    f.m.material.opacity=1;
  });
}

/* item boxes: spin, respawn cooldown, pickups */
export function updateBoxes(game, dt, now){
  const player = game.racers.find(r=>r.driver==='player');
  game.world.boxes.forEach((b, bi)=>{
    if(b.cd>0){ b.cd-=dt; b.m.visible=b.shadow.visible=b.cd<=0; }
    b.m.rotation.y += dt*1.6;
    b.m.position.y = 1.1+Math.sin(now/400+b.x)*0.18;
    if(b.gem){                                  // gem counter-spins and pulses
      b.gem.rotation.y -= dt*3.2; b.gem.rotation.x += dt*1.4;
      const s = 1+Math.sin(now/220+b.x)*0.18; b.gem.scale.setScalar(s);
    }
    if(b.cd<=0){
      if(player && !player.item && (b.x-player.x)**2+(b.z-player.z)**2<2.6){
        giveItem(player, game); b.cd=3; b.m.visible=b.shadow.visible=false;
        burstSparkles(game.world, b.x, b.z);
        game.events.push({type:'pickup'});
        // peers see the same box wink out (box order is deterministic)
        if(game.mp) game.mp.tp.send({type:'box', id:game.mp.myId, i:bi});
      }
      // AIs consume boxes too (their actual item use runs on a timer in aiDriver)
      for(const r of game.racers){
        if(r.driver!=='ai') continue;
        if(b.cd<=0 && (b.x-r.x)**2+(b.z-r.z)**2<2.6 && Math.random()<0.5){
          b.cd=3; b.m.visible=b.shadow.visible=false;
        }
      }
    }
  });
}

/* resident geese: flee from the player, get honked, waddle home */
export function updateGeese(game, dt, now){
  const player = game.racers.find(r=>r.driver==='player');
  if(!player) return;
  for(const g of game.world.geese){
    const dx=g.position.x-player.x, dz=g.position.z-player.z;
    const d2=dx*dx+dz*dz;
    if(d2<1.7 && Math.abs(player.speed)>4 && g.userData.stunned<=0){
      g.userData.stunned=2;
      burstFeathers(game.world, g.position.x, g.position.z);
      player.speed*=0.3; player.shake=0.35;
      game.events.push({type:'toast', msg:'HONK!!', ms:700});
      const L=Math.sqrt(d2)||1;
      g.userData.flee=1.6; g.userData.dir=new THREE.Vector3(dx/L,0,dz/L);
    } else if(d2<48 && g.userData.flee<=0){
      g.userData.flee=1.2;
      const away=g.position.clone().sub(new THREE.Vector3(player.x,0,player.z)); away.y=0; away.normalize();
      g.userData.dir=away;
    }
    if(g.userData.stunned>0) g.userData.stunned-=dt;
    if(g.userData.flee>0){
      g.userData.flee-=dt;
      g.position.addScaledVector(g.userData.dir, dt*9);
      g.rotation.y=Math.atan2(g.userData.dir.x,g.userData.dir.z)+Math.PI/2;
      g.position.y=Math.abs(Math.sin(now/60))*0.35;
    } else {
      g.position.y=0;
      g.rotation.y+=Math.sin(now/900+g.userData.phase)*0.004;
      g.position.lerp(g.userData.home, dt*0.15);
    }
  }
}

function updatePeds(game, dt, now){
  const { track } = game;
  const player = game.racers.find(r=>r.driver==='player');
  for(const pd of game.world.peds){
    pd.bumpCd = Math.max(0, pd.bumpCd-dt);
    if(pd.state==='flee'){ pd.stateT-=dt; if(pd.stateT<=0){ pd.state='walk'; } }

    const spd = pd.state==='flee' ? 4 : pd.type.speed;
    pd.t += pd.dir*spd*dt/track.length;
    if(pd.t > pd.tMax){ pd.t = pd.tMax; pd.dir = -1; }   // pace within the zone
    else if(pd.t < pd.tMin){ pd.t = pd.tMin; pd.dir = 1; }

    if(pd.state==='flee'){
      pd.lateral += Math.sign(pd.lateral||1)*6*dt;
      pd.lateral = Math.max(-6, Math.min(6, pd.lateral));
    } else if(pd.type.cross){
      pd.lateral = Math.sin(now/2600 + pd.latPhase)*3.4;
    }

    const p=track.pointAt(pd.t), tan=track.tangentAt(pd.t);
    const x = p.x + tan.z*pd.lateral, z = p.z - tan.x*pd.lateral;
    const mx=x-pd.lastX, mz=z-pd.lastZ;
    if(mx*mx+mz*mz>1e-6) pd.m.rotation.y = Math.atan2(mx,mz);
    pd.lastX=x; pd.lastZ=z;
    pd.m.position.set(x,0,z);

    const [l,r]=pd.m.userData.legs;
    const swing = Math.min(1, spd/2);
    l.position.y=0.3+Math.sin(now/110+pd.phase)*0.1*swing;
    r.position.y=0.3+Math.sin(now/110+pd.phase+Math.PI)*0.1*swing;

    if(game.race.phase!=='race' || !player) continue;
    const dx=x-player.x, dz=z-player.z, d2=dx*dx+dz*dz;
    if(d2<64 && pd.type.dodges && pd.state==='walk' && Math.abs(player.speed)>6){
      pd.state='flee'; pd.stateT=1.6;
      if(Math.abs(pd.lateral)<0.5) pd.lateral = dx*tan.z - dz*tan.x > 0 ? 0.6 : -0.6;
    }
    if(d2<1.6 && pd.bumpCd<=0 && Math.abs(player.speed)>4){
      pd.bumpCd=1.2;
      player.speed*=0.45; player.shake=0.35;
      game.events.push({type:'toast', msg:pd.type.line, ms:900});
      pd.state='flee'; pd.stateT=1.8;
      pd.lateral += pd.lateral>=0 ? 2 : -2;
    }
  }
}

export function updateAmbient(game, dt, now){
  for(const f of game.world.feathers){
    if(f.life>0){
      f.life-=dt;
      f.m.position.x+=f.vx*dt; f.m.position.y+=f.vy*dt; f.m.position.z+=f.vz*dt;
      f.vy-=9*dt; f.m.rotation.x+=dt*6; f.m.rotation.z+=dt*4;
      f.m.material.opacity=Math.max(0,f.life);
      if(f.life<=0) f.m.visible=false;
    }
  }
  for(const s of game.world.sparkles){
    if(s.life>0){
      s.life-=dt;
      s.m.position.x+=s.vx*dt; s.m.position.y+=s.vy*dt; s.m.position.z+=s.vz*dt;
      s.vy-=7*dt; s.m.rotation.y+=dt*9; s.m.rotation.x+=dt*7;
      s.m.material.opacity=Math.max(0,s.life*2);
      if(s.life<=0) s.m.visible=false;
    }
  }
  for(const b of game.world.boats){
    b.position.y=Math.sin(now/900+b.userData.phase)*0.12;
    b.rotation.y+=dt*0.03;
  }
  for(const c of game.world.clouds){
    c.position.x += dt*1.4;
    if(c.position.x > 420) c.position.x = -420;
  }
  for(const pd of game.world.pads){
    // a bright band chases front-to-back so the arrows read as "go this way"
    pd.chevs.forEach((c,i)=>{
      const ph = Math.sin(now/180 - i*1.1);
      c.userData.mat.emissiveIntensity = 0.4 + 0.8*(0.5+0.5*ph);
    });
  }
  for(const f of game.world.fans){    // cheering crowd bobs and sways
    f.m.position.y = f.baseY + Math.abs(Math.sin(now/210 + f.phase))*f.amp;
    f.m.rotation.y = f.baseRot + Math.sin(now/300 + f.phase)*0.12;
  }
  for(const car of game.world.cars){
    car.pos += car.dir*car.speed*dt;
    if(car.pos>car.max) car.pos=car.min;
    else if(car.pos<car.min) car.pos=car.max;
    if(car.axis==='z') car.m.position.set(car.fixed, 0, car.pos);
    else car.m.position.set(car.pos, 0, car.fixed);
  }
  updatePeds(game, dt, now);
  for(const gz of game.world.lakeGeese){
    gz.position.y = -0.25+Math.sin(now/1100+gz.userData.phase)*0.06;
    gz.rotation.y += Math.sin(now/1300+gz.userData.phase)*0.003;
  }
  for(const j of game.world.joggers){
    j.t = ((j.t + j.speed*dt/j.len) % 1 + 1) % 1;
    const p = j.curve.getPointAt(j.t), tan = j.curve.getTangentAt(j.t);
    const dir = Math.sign(j.speed);
    const bob = j.kind==='surrey' ? 0 : Math.abs(Math.sin(now/95+j.phase))*0.12;
    j.m.position.set(p.x, bob, p.z);
    j.m.rotation.y = Math.atan2(tan.x*dir, tan.z*dir);
    const legs = j.m.userData.legs;               // surreys have none
    if(legs){
      legs[0].position.y = 0.3+Math.sin(now/95+j.phase)*0.12;
      legs[1].position.y = 0.3+Math.sin(now/95+j.phase+Math.PI)*0.12;
    }
    if(j.dog){   // trot alongside, offset perpendicular to travel
      j.dog.position.set(p.x + tan.z*dir*0.9, Math.abs(Math.sin(now/80+j.phase))*0.05,
                         p.z - tan.x*dir*0.9);
      j.dog.rotation.y = j.m.rotation.y;
    }
  }
}
