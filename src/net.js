/* Transport layer for multiplayer.
   Rung 2: a WebSocket room-relay riding the dev server (vite.config.js),
   so any device on the LAN — your phone — can race. Falls back to
   BroadcastChannel (same-browser tabs) if the relay isn't reachable.
   Rung 3 swaps these internals for a hosted channel / WebRTC; the
   send/onMessage surface stays identical, so nothing above changes. */

export function createTransport(room){
  const handlers = [];
  const emit = m => handlers.forEach(h => h(m));
  const queue = [];
  let kind = 'ws-relay', ws = null, bc = null, sendImpl = m => queue.push(m);

  const useBroadcast = () => {
    if(bc) return;
    kind = 'local-tabs';
    bc = new BroadcastChannel('mhc-' + room);
    bc.onmessage = e => emit(e.data);
    sendImpl = m => bc.postMessage(m);
    queue.splice(0).forEach(m => bc.postMessage(m));   // flush anything queued
  };

  try {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/mp?room=${room}`);
    ws.onopen = () => {
      sendImpl = m => ws.send(JSON.stringify(m));
      queue.splice(0).forEach(m => ws.send(JSON.stringify(m)));
    };
    ws.onmessage = e => emit(JSON.parse(e.data));
    ws.onerror = () => useBroadcast();   // no relay (static build?) → tabs mode
  } catch (e) {
    useBroadcast();
  }

  return {
    get kind(){ return kind; },
    send: m => sendImpl(m),
    onMessage: h => handlers.push(h),
    close: () => { ws && ws.close(); bc && bc.close(); }
  };
}

/* Message protocol (all plain JSON):
   hello  {type, id, char}          joiner announces itself + its character
   start  {type, char}              host starts the race, shares its character
   state  {type, id, x,z,h,s,dr,dd,sp,b,d,lap}   15Hz racer snapshot
   finish {type, id, total}         a racer crossed the line
*/
