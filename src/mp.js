/* Multiplayer session (rung 2.5: N players on the LAN relay).
   Host-authoritative lobby: joiners send hello{uid,char}; the host keeps
   the roster and rebroadcasts it; START ships the final roster and every
   client builds the same grid from it. Remote players are racers with
   driver:'remote', dead-reckoned between 15Hz snapshots. */
import { createTransport } from './net.js';

export const SEND_HZ = 15;
export const MAX_PLAYERS = 6;

export function createSession(role, room='local'){
  const tp = createTransport(room);
  const myId = Math.random().toString(36).slice(2,8);
  const s = {
    role, tp, myId,
    roster: [],                    // [{uid, char}] in grid order, host first
    track: null,                   // host's track id, stamped into lobby/start
    onLobby: null, onStart: null, onState: null, onFinish: null,
    onItem: null, onBox: null, onWrongTrack: null,
  };
  tp.onMessage(m => {
    if(m.type==='hello' && role==='host'){
      const i = s.roster.findIndex(p => p.uid===m.uid);
      if(i>=0) s.roster[i].char = m.char;
      else if(s.roster.length < MAX_PLAYERS) s.roster.push({uid:m.uid, char:m.char});
      tp.send({type:'lobby', players:s.roster, track:s.track});
      s.onLobby && s.onLobby(s.roster);
    } else if(m.type==='lobby' && role==='join'){
      if(m.track && s.track && m.track!==s.track){ s.onWrongTrack && s.onWrongTrack(m.track); return; }
      s.roster = m.players;
      s.onLobby && s.onLobby(s.roster);
    } else if(m.type==='start' && role==='join'){
      if(m.track && s.track && m.track!==s.track){ s.onWrongTrack && s.onWrongTrack(m.track); return; }
      s.roster = m.players;
      s.onStart && s.onStart(m);
    } else if(m.type==='state' && m.id!==s.myId){
      s.onState && s.onState(m);
    } else if(m.type==='finish' && m.id!==s.myId){
      s.onFinish && s.onFinish(m);
    } else if(m.type==='item' && m.id!==s.myId){
      s.onItem && s.onItem(m);
    } else if(m.type==='box' && m.id!==s.myId){
      s.onBox && s.onBox(m);
    }
  });
  return s;
}

/* grid slot for roster index i: columns across, rows fall back behind.
   Tracks may override the column lats (Colfax keeps the grid out of the
   red bus lanes). */
export function gridSlot(i, cols){
  const c = cols || [-2.8, 0, 2.8];
  return { lat: c[i%c.length], back: Math.floor(i/c.length)*4.5 };
}

/* pack the local player's racer state into a wire snapshot */
export function snapshot(session, r){
  return {
    type:'state', id: session.myId,
    x:r.x, z:r.z, h:r.heading, s:r.speed,
    dr:r.drifting, dd:r.driftDir, sp:r.spin, b:r.boostT,
    sh:r.shieldT, d:r.dist, lap:r.lap
  };
}

/* apply an incoming snapshot to a remote racer's net-targets */
export function applyState(r, m){
  r.netX=m.x; r.netZ=m.z; r.netH=m.h;
  r.speed=m.s; r.drifting=m.dr; r.driftDir=m.dd;
  r.spin=m.sp; r.boostT=m.b;
  if(m.sh!==undefined) r.shieldT=m.sh;   // their machine owns their shield
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
