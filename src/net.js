/* Transport layer for multiplayer.
   Rung 2: a WebSocket room-relay riding the dev server (vite.config.js),
   so any device on the LAN — your phone — can race.
   Rung 3: Supabase Realtime broadcast channels, so a shared link works
   across the internet — no game server, the channel IS the relay.
   Falls back to BroadcastChannel (same-browser tabs) when neither is up.
   The send/onMessage surface is identical across all three, so nothing
   above this file knows the difference. */
import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* does this build know how to race over the internet? (menus use this) */
export const hasInternet = !!(SB_URL && SB_KEY);

/* pick the wire:
   - ?net=sb forces Supabase (for testing it from localhost)
   - the dev server (localhost / LAN IP) uses its own WS relay
   - a deployed build (real hostname) uses Supabase when configured */
function preferSupabase(){
  if(new URLSearchParams(location.search).get('net')==='sb') return !!(SB_URL && SB_KEY);
  const lan = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  return !!(SB_URL && SB_KEY && !lan);
}

function supabaseTransport(room, emit, queue){
  const sb = createClient(SB_URL, SB_KEY, {
    realtime: { params: { eventsPerSecond: 40 } }   // 6 riders × 15Hz headroom
  });
  const ch = sb.channel('dash-' + room, { config: { broadcast: { self:false } } });
  let open = false;
  ch.on('broadcast', { event:'m' }, ({ payload }) => emit(payload));
  ch.subscribe(status => {
    if(status === 'SUBSCRIBED'){
      open = true;
      queue.splice(0).forEach(m => ch.send({ type:'broadcast', event:'m', payload:m }));
    }
  });
  return {
    send: m => open
      ? ch.send({ type:'broadcast', event:'m', payload:m })
      : queue.push(m),
    close: () => sb.removeChannel(ch)
  };
}

export function createTransport(room){
  const handlers = [];
  const emit = m => handlers.forEach(h => h(m));
  const queue = [];
  let kind = 'ws-relay', ws = null, bc = null, sb = null, sendImpl = m => queue.push(m);

  const useBroadcast = () => {
    if(bc) return;
    kind = 'local-tabs';
    bc = new BroadcastChannel('mhc-' + room);
    bc.onmessage = e => emit(e.data);
    sendImpl = m => bc.postMessage(m);
    queue.splice(0).forEach(m => bc.postMessage(m));   // flush anything queued
  };

  const useSupabase = () => {
    if(sb) return;
    kind = 'supabase';
    sb = supabaseTransport(room, emit, queue);
    sendImpl = m => sb.send(m);
  };

  if(preferSupabase()){
    useSupabase();
  } else {
    try {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/mp?room=${room}`);
      ws.onopen = () => {
        sendImpl = m => ws.send(JSON.stringify(m));
        queue.splice(0).forEach(m => ws.send(JSON.stringify(m)));
      };
      ws.onmessage = e => emit(JSON.parse(e.data));
      // no dev relay (static build?) → internet channel if we have one, else tabs
      ws.onerror = () => (SB_URL && SB_KEY) ? useSupabase() : useBroadcast();
    } catch (e) {
      (SB_URL && SB_KEY) ? useSupabase() : useBroadcast();
    }
  }

  return {
    get kind(){ return kind; },
    send: m => sendImpl(m),
    onMessage: h => handlers.push(h),
    close: () => { ws && ws.close(); bc && bc.close(); sb && sb.close(); }
  };
}

/* Message protocol (all plain JSON):
   hello  {type, uid, char}          joiner announces itself + its character
   lobby  {type, players}            host rebroadcasts the roster
   start  {type, players}            host starts the race with the final roster
   state  {type, id, x,z,h,s,dr,dd,sp,b,sh,d,lap}   15Hz racer snapshot
   item   {type, id, kind, target}   somebody used an item
   box    {type, id, i}              somebody grabbed item box #i
   finish {type, id, total}          a racer crossed the line
*/
