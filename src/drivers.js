/* Drivers: the things that advance a racer's state each tick.
   Same state shape in, same state shape out — only the brain differs. */
import * as THREE from 'three';
import { MAX_SPEED, BOOST_SPEED, OFFROAD_MAX, ACCEL, BRAKE,
         TURN, GRIP_LOSS, SCRUB, DRIFT_TURN, DRIFT_STEER, DRIFT_SLIP,
         MINI, SUPER, ULTRA,
         SPRINT_SPEED, ENERGY_DRAIN, ENERGY_REGEN, DRAFT_REGEN, DRAFT_PULL,
         BONK_TIME, BONK_SPEED } from './constants.js';
import { progressOf } from './racers.js';
import { throwSopapilla } from './items.js';

function endDrift(r, events){
  if(r.driftCharge>=ULTRA){ r.boostT=1.7; events.push({type:'toast', msg:'ULTRA BOOST!', ms:900}); }
  else if(r.driftCharge>=SUPER){ r.boostT=1.15; events.push({type:'toast', msg:'SUPER BOOST!', ms:800}); }
  else if(r.driftCharge>=MINI){ r.boostT=0.6; }
  r.drifting=false; r.driftCharge=0;
}

/* Local-input physics. Returns the racer's nearest spline index for the
   lap/progress bookkeeping in sim.js. */
export function playerDriver(r, inputs, game, dt){
  const { track, events } = game;
  const rate = inputs.steer===0 ? 30 : 20;
  r.steer += (inputs.steer-r.steer)*Math.min(1,dt*rate);
  if(Math.abs(r.steer)<0.02) r.steer=0;

  const [idx, roadDist] = track.nearestIdx(r.x, r.z, r.lastIdx);
  const offroad = roadDist > track.roadHalf+0.3;

  if(r.spin>0){
    r.spin-=dt;
    r.heading+=12*dt;
    r.speed=Math.max(2,r.speed-20*dt);
  } else {
    if(inputs.drift && !r.drifting && r.speed>11 && Math.abs(r.steer)>0.3){
      r.drifting=true; r.driftDir=Math.sign(r.steer); r.driftCharge=0;
      r.hopV=5;
    }
    if(r.drifting){
      if(!inputs.drift){ endDrift(r, events); }
      else if(r.speed<7){ r.drifting=false; r.driftCharge=0; }
      else {
        const before=r.driftCharge;
        r.driftCharge += dt;
        [MINI,SUPER,ULTRA].forEach((th,i)=>{
          if(before<th && r.driftCharge>=th) events.push({type:'driftTier', tier:i+1});
        });
      }
    }
  }
  const braking = r.spin<=0 && inputs.drift && !r.drifting;

  /* slipstream: a racer shortly ahead, roughly on your line */
  r.drafting=false;
  if(r.speed>10 && r.spin<=0){
    const fx=Math.sin(r.heading), fz=Math.cos(r.heading);
    for(const o of game.racers){
      if(o===r) continue;
      const dx=o.x-r.x, dz=o.z-r.z, d2=dx*dx+dz*dz;
      if(d2<3 || d2>56) continue;
      const along=dx*fx+dz*fz, side=Math.abs(dx*fz-dz*fx);
      if(along>1.5 && side<1.6){ r.drafting=true; break; }
    }
  }

  /* the LEGS meter: sprint burns it, drafting banks it, empty = bonk */
  const boosting = r.boostT>0; r.boostT=Math.max(0,r.boostT-dt);
  r.sprinting = inputs.sprint && r.energy>0 && r.bonkT<=0 && r.spin<=0
                && !offroad && !braking;
  if(r.sprinting){
    r.energy=Math.max(0, r.energy-ENERGY_DRAIN*dt);
    if(r.energy<=0){ r.bonkT=BONK_TIME; r.sprinting=false;
      events.push({type:'toast', msg:'BONKED! 🥴', ms:1100}); }
  } else {
    r.energy=Math.min(1, r.energy+(ENERGY_REGEN+(r.drafting?DRAFT_REGEN:0))*dt);
  }
  if(r.bonkT>0) r.bonkT-=dt;

  let target = boosting ? BOOST_SPEED : (offroad ? OFFROAD_MAX : MAX_SPEED);
  if(!boosting && !offroad){
    if(r.sprinting) target = SPRINT_SPEED;
    if(r.drafting)  target += DRAFT_PULL;
    if(r.bonkT>0)   target = Math.min(target, BONK_SPEED);
  }
  if(r.drifting) target *= 0.95;
  if(braking){
    r.speed=Math.max(0, r.speed-BRAKE*dt);   // bikes don't reverse
  } else if(r.spin<=0){
    r.speed += Math.max(-ACCEL*1.6*dt, Math.min(ACCEL*dt, target-r.speed));
  }

  const spdFrac = Math.min(1, Math.abs(r.speed)/MAX_SPEED);
  if(r.spin<=0){
    if(r.drifting){
      r.heading -= r.driftDir*(DRIFT_TURN + r.steer*r.driftDir*DRIFT_STEER)*spdFrac*dt;
    } else {
      r.heading -= r.steer*TURN*(1 - GRIP_LOSS*spdFrac)*Math.min(1,spdFrac*3)*dt;
      if(Math.abs(r.steer)>0.5 && spdFrac>0.6 && !boosting)
        r.speed -= Math.abs(r.steer)*spdFrac*SCRUB*dt;
    }
  }

  let moveH = r.heading;
  if(r.drifting) moveH += r.driftDir*DRIFT_SLIP;
  r.x += Math.sin(moveH)*r.speed*dt;
  r.z += Math.cos(moveH)*r.speed*dt;
  const bounds = track.data.bounds;
  r.x = Math.max(-bounds.x,Math.min(bounds.x,r.x));
  r.z = Math.max(-bounds.z,Math.min(bounds.z,r.z));

  r.hopY += r.hopV*dt; r.hopV -= 28*dt;
  if(r.hopY<0){ r.hopY=0; r.hopV=0; }

  for(const p of track.pads){
    if((p.x-r.x)**2+(p.z-r.z)**2 < p.r*p.r && r.boostT<0.9){
      r.boostT=0.9; events.push({type:'toast', msg:'BOOST!', ms:500});
    }
  }
  return idx;
}

/* On-rails AI: follows the spline with corner-aware speed, lateral sway,
   rubber-banding vs the local player, and occasional item use. */
export function aiDriver(r, game, dt){
  const { track, racers } = game;
  if(r.finished){ r.dist+=r.speed*dt; positionOnSpline(r, track); return; }

  const player = racers.find(o=>o.driver==='player');
  const ahead = r.corner?.ahead ?? 6;      // how early they read the corner
  const grip  = r.corner?.grip  ?? 0.55;   // how hard corners slow them
  const bend = track.curvatureAt(r.dist+ahead);
  let target = r.base * (1 - Math.min(grip, bend*grip));
  const gap = progressOf(track, player) - progressOf(track, r);
  if(gap>25) target*=1.22; else if(gap<-35) target*=0.94;
  if(r.boostT>0){ target=BOOST_SPEED; r.boostT-=dt; }
  if(r.spin>0){ target=2; r.spin-=dt; }
  r.speed += Math.max(-14*dt, Math.min(9*dt, target-r.speed));
  r.dist += r.speed*dt;

  // items: espresso when far behind, sopapilla when tailing someone
  r.itemCd-=dt;
  if(r.itemCd<=0 && r.spin<=0){
    r.itemCd=5+Math.random()*5;
    if(gap>r.boostThreshold){ r.boostT=1.1; }
    else {
      const myP=progressOf(track, r);
      const someoneAhead = racers.some(o=>{
        if(o===r) return false;
        const g2=progressOf(track,o)-myP;
        return g2>2 && g2<20;
      });
      if(someoneAhead) throwSopapilla(game, r);
    }
  }
  positionOnSpline(r, track);

  const lapNow = Math.floor(r.dist/track.length)+1;
  if(lapNow>game.race.laps && !r.finished){
    r.finished=true; game.race.finishOrder.push(r.id);
  }
}

export function positionOnSpline(r, track){
  const t=((r.dist%track.length)+track.length)%track.length/track.length;
  const p=track.pointAt(t), tan=track.tangentAt(t);
  const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
  const lat = Math.sin(r.dist*0.02+r.ph)*r.amp;
  r.x=p.x+n.x*lat; r.z=p.z+n.z*lat;
  r.heading=Math.atan2(tan.x,tan.z);
}
