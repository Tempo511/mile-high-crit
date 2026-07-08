/* Seedable deterministic PRNG (mulberry32).
   Scenery that creates colliders (trees, houses) must use this, not
   Math.random, so every client in a future online race sees the same
   obstacles in the same places. */

export function makeRng(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
