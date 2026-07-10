/* The simulation step: advances every racer via its driver, then applies
   world interactions in the same order as the original monolith so
   gameplay is unchanged. DOM-free — presentation reads state + events. */
import { playerDriver, aiDriver } from './drivers.js';
import { useItem, updateProjectiles, updateAttackGeese, updateShields, updateSlicks, spinRacer } from './items.js';
import { updateBoxes, updateGeese, updateGoosePoop, updateAmbient, burstFeathers } from './world.js';
import { progressOf } from './racers.js';
import { PLACES } from './constants.js';

export function respawn(track, r){
  /* never respawn inside a solid — walk forward to a clear sample, else
     the stuck-rescue re-triggers forever */
  let guard=0;
  while(guard++<track.NS){
    const sp=track.samples[r.lastIdx];
    const blocked=track.solids.some(o=>
      (sp.x-o.x)**2+(sp.z-o.z)**2 < (o.r+1.3)**2);
    if(!blocked) break;
    r.lastIdx=(r.lastIdx+4)%track.NS;
  }
  const s = track.samples[r.lastIdx], s2 = track.samples[(r.lastIdx+2)%track.NS];
  r.x=s.x; r.z=s.z;
  r.heading=Math.atan2(s2.x-s.x, s2.z-s.z);
  r.speed=0; r.drifting=false; r.boostT=0; r.stuckT=0;
}

export function step(game, inputs, dt, now){
  const { track, racers, race, events } = game;
  const player = racers.find(r=>r.driver==='player');

  /* player physics (+ item use) */
  if(inputs.useItem) useItem(game, player);
  const idx = playerDriver(player, inputs, game, dt);

  /* item boxes */
  updateBoxes(game, dt, now);

  /* solid collisions (player only — AIs are on rails) */
  for(const s of track.solids){
    const dx=player.x-s.x, dz=player.z-s.z, d=Math.hypot(dx,dz), min=s.r+0.7;
    if(d<min && d>0.001){
      player.x=s.x+dx/d*min; player.z=s.z+dz/d*min;
      if(Math.abs(player.speed)>6){ player.shake=0.35; events.push({type:'toast', msg:'OOF', ms:450}); }
      player.speed*=0.25; player.drifting=false; player.driftCharge=0;
    }
  }

  /* BRT buses: moving walls in the red lanes */
  for(const b of game.world.brtBuses||[]){
    const fx=Math.sin(b.m.rotation.y), fz=Math.cos(b.m.rotation.y);
    for(const k of [-3.6,0,3.6]){
      const cx=b.m.position.x+fx*k, cz=b.m.position.z+fz*k;
      const dx=player.x-cx, dz=player.z-cz, d=Math.hypot(dx,dz), min=1.9;
      if(d<min && d>0.001){
        player.x=cx+dx/d*min; player.z=cz+dz/d*min;
        if(Math.abs(player.speed)>6){ player.shake=0.4; events.push({type:'toast', msg:'THE BUS!!', ms:600}); }
        player.speed*=0.2; player.drifting=false; player.driftCharge=0;
      }
    }
  }

  /* water hazards */
  for(const wt of track.waters){
    if(((player.x-wt[0])/wt[2])**2 + ((player.z-wt[1])/wt[3])**2 < 1){
      events.push({type:'toast', msg:'SPLASH! 🪿', ms:1100}); player.shake=0.4;
      /* respawn on guaranteed-dry road: walk forward past the waterline */
      player.lastIdx=idx;
      let guard=0;
      while(guard++<track.NS){
        const s=track.samples[player.lastIdx];
        const dry=track.waters.every(w=>
          ((s.x-w[0])/w[2])**2 + ((s.z-w[1])/w[3])**2 >= 1.15);
        if(dry) break;
        player.lastIdx=(player.lastIdx+5)%track.NS;
      }
      respawn(track, player); break;
    }
  }

  /* resident geese + their poop-slick gauntlet */
  updateGeese(game, dt, now);
  updateGoosePoop(game, dt, now);

  /* AI racers */
  for(const r of racers) if(r.driver==='ai') aiDriver(r, game, dt);

  /* player <-> AI bumps: separate, rub off a little speed (dt-scaled so
     sustained contact is an annoyance, not a wall), and never below a
     floor speed so you can always ride out of a tangle */
  for(const a of racers){
    if(a===player) continue;
    const dx=player.x-a.x, dz=player.z-a.z, d=Math.hypot(dx,dz);
    if(d<1.5 && d>0.001){
      player.x=a.x+dx/d*1.5; player.z=a.z+dz/d*1.5;
      if(player.speed>8) player.speed=Math.max(8, player.speed*(1-0.9*dt));
      if(a.speed>8)      a.speed=Math.max(8, a.speed*(1-0.6*dt));
    }
  }

  /* projectiles & attack geese */
  updateProjectiles(game, dt);
  updateAttackGeese(game, dt, now);
  updateShields(game, dt, now);
  updateSlicks(game, dt);

  /* feather bursts requested by events (decoupled from items.js) */
  for(const e of events) if(e.type==='feathers') burstFeathers(game.world, e.x, e.z);

  /* feathers physics + boats */
  updateAmbient(game, dt, now);

  /* player progress / laps / wrong way */
  let delta = idx-player.lastIdx;
  if(delta>track.NS/2) delta-=track.NS; if(delta<-track.NS/2) delta+=track.NS;
  player.lastIdx=idx;
  const prevProg=player.prog;
  player.prog=idx/track.NS;
  /* stage (point-to-point): cross the line at the end of the spline once */
  if(track.data.format==='stage' && player.prog>=(track.data.finishT ?? 0.996) && !player.finished){
    race.phase='done'; player.finished=true;
    race.finishOrder.push(player.id);
    const place=race.finishOrder.indexOf(player.id)+1;
    race.place=place;
    player.dist = progressOf(track, player);
    events.push({type:'finish', place, total: now-race.t0});
  }
  if(player.prog>0.45 && player.prog<0.55) player.passedHalf=true;
  if(track.data.format!=='stage' && prevProg>0.9 && player.prog<0.1 && player.passedHalf){
    player.passedHalf=false;
    const lapTime = now-race.lapStart; race.lapStart=now;
    if(lapTime<race.best) race.best=lapTime;
    if(player.lap>=race.laps){
      race.phase='done'; player.finished=true;
      race.finishOrder.push(player.id);
      const place=race.finishOrder.indexOf(player.id)+1;
      race.place=place;
      /* seed dist so the coast-forward path picks up from the finish line */
      player.dist = progressOf(track, player);
      events.push({type:'finish', place, total: now-race.t0});
    } else {
      player.lap++;
      events.push({type:'lap', lap:player.lap, final:player.lap===race.laps, lapTime});
    }
  }
  if(delta<0 && player.speed>6) player.wrongT+=dt; else player.wrongT=0;
  if(player.wrongT>1.2 && now-player.lastWrongToast>2200){
    player.lastWrongToast=now; events.push({type:'toast', msg:'WRONG WAY!', ms:900});
  }

  /* stuck rescue */
  if(Math.abs(player.speed)<0.8 && race.phase==='race') player.stuckT+=dt; else player.stuckT=0;
  if(player.stuckT>3){ events.push({type:'toast', msg:'RESET', ms:700}); respawn(track, player); }

  player.shake=Math.max(0,player.shake-dt);
  for(const r of racers) r.spinImmune=Math.max(0,(r.spinImmune||0)-dt);

  /* live standings */
  const me=progressOf(track, player);
  let place=1;
  for(const r of racers){ if(r!==player && progressOf(track,r)>me) place++; }
  race.playerPlace=place;
}

export { PLACES, progressOf };
