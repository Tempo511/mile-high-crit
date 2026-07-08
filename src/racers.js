/* Racer state: one uniform, PLAIN-DATA shape for every competitor.
   No meshes, no DOM, no methods — fully JSON-serializable, so a future
   remote player is just a racer whose state arrives over the network.
   What differs between competitors is the DRIVER (src/drivers.js):
     'player' — advanced by local input physics
     'ai'     — advanced by the on-rails AI brain
     'remote' — (future) advanced by network packets */

export function createRacer(opts){
  return {
    id: opts.id,
    name: opts.name,
    driver: opts.driver,                    // 'player' | 'ai' | 'remote'
    colors: { torso: opts.torso, helmet: opts.helmet },

    // core kinematics — the wire format for multiplayer
    x:0, z:0, heading:0, speed:0,
    dist:0,                                 // progress along spline, in world units
    lap:1, finished:false,

    // shared race state
    item:null, boostT:0, spin:0,

    // player-driver fields
    steer:0, drifting:false, driftDir:0, driftCharge:0,
    hopY:0, hopV:0,
    lastIdx:0, prog:0, passedHalf:false,
    wrongT:0, lastWrongToast:0, stuckT:0, shake:0,

    // ai-driver fields
    base: opts.base||0, amp: opts.amp||0, ph: opts.ph||0,
    itemCd: opts.itemCd||0,
    // ai personality (see src/characters.js); null/defaults = classic behavior
    corner: opts.corner||null,
    boostThreshold: opts.boostThreshold ?? 40,
    // mesh accessories, interpreted by makeRider — plain data, still serializable
    look: opts.look||null,
  };
}

/* total course progress in world units — comparable across all racers */
export function progressOf(track, r){
  if(r.driver==='ai') return r.dist;
  return (r.lap-1)*track.length + r.prog*track.length;
}
