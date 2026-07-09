/* Multiplayer session glue (rung 1: two tabs, one host + one joiner).
   The remote player is just a racer with driver:'remote' whose state
   arrives over the transport; we dead-reckon it between snapshots and
   converge smoothly so it never teleports. */
import { createTransport } from './net.js';

export const SEND_HZ = 15;

export function createSession(role, room='local'){
  const tp = createTransport(room);
  const s = {
    role, tp,
    myId: role==='host' ? 'p1' : 'p2',
    remoteChar: null,
    onPeerHello: null, onStart: null, onState: null, onFinish: null,
  };
  tp.onMessage(m => {
    if(m.type==='hello' && role==='host'){
      s.remoteChar = m.char;
      s.onPeerHello && s.onPeerHello(m.char);
    } else if(m.type==='start' && role==='join'){
      s.remoteChar = m.char;
      s.onStart && s.onStart(m);
    } else if(m.type==='state' && m.id!==s.myId){
      s.onState && s.onState(m);
    } else if(m.type==='finish' && m.id!==s.myId){
      s.onFinish && s.onFinish(m);
    }
  });
  return s;
}

/* pack the local player's racer state into a wire snapshot */
export function snapshot(session, r){
  return {
    type:'state', id: session.myId,
    x:r.x, z:r.z, h:r.heading, s:r.speed,
    dr:r.drifting, dd:r.driftDir, sp:r.spin, b:r.boostT,
    d:r.dist, lap:r.lap
  };
}

/* apply an incoming snapshot to the remote racer's net-targets */
export function applyState(r, m){
  r.netX=m.x; r.netZ=m.z; r.netH=m.h;
  r.speed=m.s; r.drifting=m.dr; r.driftDir=m.dd;
  r.spin=m.sp; r.boostT=m.b;
  r.dist=m.d; r.lap=m.lap;
  if(!r.netInit){ r.x=m.x; r.z=m.z; r.heading=m.h; r.netInit=true; }
}

/* per-frame: dead-reckon the last snapshot forward, converge toward it */
export function updateRemote(r, dt){
  if(!r.netInit) return;
  const fx=Math.sin(r.netH), fz=Math.cos(r.netH);
  r.netX += fx*r.speed*dt;
  r.netZ += fz*r.speed*dt;
  const k = Math.min(1, dt*10);
  r.x += (r.netX - r.x)*k;
  r.z += (r.netZ - r.z)*k;
  let dh = r.netH - r.heading;
  while(dh> Math.PI) dh -= 2*Math.PI;
  while(dh<-Math.PI) dh += 2*Math.PI;
  r.heading += dh*k;
}
