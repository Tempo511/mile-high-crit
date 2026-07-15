/* Vite config + the multiplayer LAN relay (rung 2).
   A tiny WebSocket room-relay rides the dev server's own port, so any
   device that can load the game (phone on the same wifi) can also race:
   ws://<host>/mp?room=X — messages are broadcast to the other peers in
   the room. Internet play (rung 3) replaces this with a hosted channel. */
import { defineConfig } from 'vite';
import { WebSocketServer } from 'ws';

function mpRelay(){
  return {
    name: 'mp-relay',
    configureServer(server){
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map();
      server.httpServer.on('upgrade', (req, socket, head) => {
        if(!req.url || !req.url.startsWith('/mp')) return;   // leave HMR alone
        wss.handleUpgrade(req, socket, head, ws => {
          const room = new URL(req.url, 'http://x').searchParams.get('room') || 'local';
          if(!rooms.has(room)) rooms.set(room, new Set());
          const peers = rooms.get(room);
          peers.add(ws);
          ws.on('message', data => {
            for(const p of peers) if(p!==ws && p.readyState===1) p.send(data.toString());
          });
          ws.on('close', () => {
            peers.delete(ws);
            if(peers.size===0) rooms.delete(room);
          });
        });
      });
    }
  };
}

export default defineConfig({
  base: '',            // relative asset paths: works at both the GitHub Pages
                       // subpath and a custom domain root
  plugins: [mpRelay()],
  build: {
    rollupOptions: {
      /* flycam ships too — cinematic map viewer for capturing footage */
      input: { main: 'index.html', flycam: 'flycam.html' }
    }
  }
});
