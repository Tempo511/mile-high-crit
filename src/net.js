/* Transport layer for multiplayer.
   Rung 1: BroadcastChannel — two tabs on the same machine, zero backend.
   Rung 2 swaps createTransport's internals for WebRTC data channels;
   the send/onMessage surface stays identical, so nothing above changes. */

export function createTransport(room){
  const ch = new BroadcastChannel('mhc-' + room);
  const handlers = [];
  ch.onmessage = e => handlers.forEach(h => h(e.data));
  return {
    kind: 'local-tabs',
    send: m => ch.postMessage(m),
    onMessage: h => handlers.push(h),
    close: () => ch.close()
  };
}

/* Message protocol (all plain JSON):
   hello  {type, id, char}          joiner announces itself + its character
   start  {type, char}              host starts the race, shares its character
   state  {type, id, x,z,h,s,dr,dd,sp,b,d,lap}   15Hz racer snapshot
   finish {type, id, total}         a racer crossed the line
*/
