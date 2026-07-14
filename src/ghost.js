/* Time Trial ghosts. A ghost is the player's run recorded as sparse
   frames — deliberately the same shape as netcode snapshots — replayed
   through a translucent rider. PBs live in localStorage per track;
   leaderboard ghosts (stage 3) will ride the exact same format. */

export function loadPB(trackId){
  try{ return JSON.parse(localStorage.getItem('dash-pb-'+trackId)); }
  catch(e){ return null; }
}
export function savePB(trackId, pb){
  try{ localStorage.setItem('dash-pb-'+trackId, JSON.stringify(pb)); }catch(e){}
}

/* frames: [ms, x, z, heading, dist, flags] at ~15Hz.
   flags: 1=drifting  2=driftDir>0  4=sprinting  8=boosting */
export function createRecorder(){
  const frames=[];
  let acc=1;                        // capture the very first tick
  return {
    frames,
    tick(r, dist, ms, dt){
      acc+=dt;
      if(acc < 1/15) return;
      acc=0;
      const flags = (r.drifting?1:0) | (r.driftDir>0?2:0)
                  | (r.sprinting?4:0) | (r.boostT>0?8:0);
      frames.push([Math.round(ms), +r.x.toFixed(2), +r.z.toFixed(2),
                   +r.heading.toFixed(3), Math.round(dist*10)/10, flags]);
    }
  };
}

export function createPlayback(frames){
  let i=0, j=0, charge=0, lastMs=0;
  return {
    /* drive racer r to elapsed time ms */
    at(ms, r){
      while(i<frames.length-1 && frames[i+1][0]<=ms) i++;
      while(i>0 && frames[i][0]>ms) i--;          // rewind (restarts)
      const a=frames[i], b=frames[Math.min(i+1, frames.length-1)];
      const span=Math.max(1, b[0]-a[0]);
      const u=Math.min(1, Math.max(0, (ms-a[0])/span));
      /* both runs launch from the same grid slot — ease a sideways offset
         to zero over the first 1.5s so the ghost starts BESIDE you and
         merges onto its real line */
      const part=Math.max(0, 1-ms/1500)*2.4;
      r.x=a[1]+(b[1]-a[1])*u + Math.cos(a[3])*part;
      r.z=a[2]+(b[2]-a[2])*u - Math.sin(a[3])*part;
      let dh=b[3]-a[3];
      while(dh> Math.PI) dh-=2*Math.PI;
      while(dh<-Math.PI) dh+=2*Math.PI;
      r.heading=a[3]+dh*u;
      r.dist=a[4]+(b[4]-a[4])*u;
      /* real speed from the frame pair — effects gate on it (sparks etc.) */
      r.speed=(b[4]-a[4])/Math.max(0.001,(b[0]-a[0])/1000);
      /* replay the run's body language: lean, sparks, sprint streaks.
         (old PBs without flags just ride clean) */
      const f=a[5]||0;
      r.drifting=!!(f&1);
      r.driftDir=(f&2)?1:-1;
      r.sprinting=!!(f&4);
      r.boostT=(f&8)?0.5:0;
      if(r.drifting) charge+=Math.max(0,(ms-lastMs))/1000; else charge=0;
      lastMs=ms;
      r.driftCharge=charge;          // tier sparks + bike lights light up
    },
    done(ms){ return ms >= frames[frames.length-1][0]; },
    /* the ghost's elapsed ms when it reached distance d — the live delta:
       (your elapsed) - msAtDist(your dist): negative = you're ahead */
    msAtDist(d){
      while(j<frames.length-1 && frames[j+1][4]<d) j++;
      const a=frames[j], b=frames[Math.min(j+1, frames.length-1)];
      const span=Math.max(0.001, b[4]-a[4]);
      const u=Math.min(1, Math.max(0, (d-a[4])/span));
      return a[0]+(b[0]-a[0])*u;
    }
  };
}

/* medal targets derived from course distance (avg-speed tiers) — tuned
   constants; a track can override with data.medals = {author,gold,...} */
export function medalTimes(track){
  if(track.data.medals) return track.data.medals;
  const d = track.length * (track.data.format==='stage'
    ? (track.data.finishT ?? 1) : (track.data.laps || 1));
  return {
    author: Math.round(d/22.0*1000),
    gold:   Math.round(d/20.5*1000),
    silver: Math.round(d/19.0*1000),
    bronze: Math.round(d/17.5*1000)
  };
}
export function medalFor(ms, m){
  return ms<=m.author ? '👑 MILE HIGH'
       : ms<=m.gold   ? '🥇 GOLD'
       : ms<=m.silver ? '🥈 SILVER'
       : ms<=m.bronze ? '🥉 BRONZE' : null;
}
