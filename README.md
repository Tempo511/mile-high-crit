# DENVER DASH — bike racing in the Mile High City

A retro-styled kart-style bike racer set in real Denver locations, starting
with Washington Park. Race a roster of Denver characters (Blucifer, the Yeti,
Strava Dad, Honker the goose…) over 3 laps around Smith Lake and Grasmere —
sprint, draft, drift, throw green chiles, and dodge the geese. Up to 6 friends
can race on the same wifi.

"MILE HIGH CRIT" survives in-world as the championship branding on the
trackside banners. Started as a Claude web-app artifact prototype
(`archive/mile-high-crit-washpark-gp.html`, kept for reference), now a Vite
project with an ES-module architecture.

## Run it

```sh
npm install
npm run dev
```

Then open the printed localhost URL.

## Multiplayer

- **Same wifi** (zero setup): `npm run dev -- --host`, click *RACE A
  FRIEND*, share the network URL. Rides a WebSocket relay inside the dev
  server; falls back to BroadcastChannel for two tabs in one browser.
- **Over the internet**: copy `.env.example` to `.env.local` with your
  Supabase project's URL + anon key. Hosting a race generates a 5-letter
  room code and a shareable `#join-CODE` link; the transport switches to a
  Supabase Realtime broadcast channel (the channel IS the relay — no game
  server). Deployed builds use it automatically; test it from localhost
  with `?net=sb`.

## Controls

- ← / → (or A / D) — steer
- SPACE (or ↑ / W) — sprint: burns the LEGS meter; drafting refills it.
  Hold on the countdown's "1" for a launch boost
- SHIFT (or ↓ / S) — drift (hold while turning) / brake
- E or ENTER — use item
- Touch: hold screen sides to steer; mirrored DRIFT + SPRINT buttons in both
  bottom corners (use your free thumb), item button centered

## Project layout

```
index.html            HTML shell + HUD DOM; loads src/main.js as a module.
src/
  main.js               Bootstrap + game loop + race phases.
  constants.js          Physics tuning, items, pure data.
  rng.js                Seedable PRNG (deterministic scenery colliders).
  gfx.js                Pixel-art canvas textures + material helpers.
  tracks/washpark.js    WASH PARK GP as pure data — spline, props, callouts.
                        New Denver tracks = new files here.
  track.js              Builds a raceable world from a track file; spatial queries.
  props.js              Prop library (boathouse, skyline, trees…) tracks reference by type.
  racers.js             Uniform, serializable racer state (the multiplayer wire format).
  drivers.js            What advances a racer: player physics / AI brain (/ network, later).
  items.js              Espresso, sopapillas, attack geese, spin-outs.
  world.js              Ambient life: resident geese, feathers, boats, item boxes.
  sim.js                step(game, inputs, dt) — DOM-free orchestration.
  input.js              Devices → neutral {steer, drift, useItem} inputs.
  hud.js                DOM overlays + minimap (reads state, consumes events).
  render.js             Three.js scene/camera + drawing state (read-only).
archive/              The original single-file web-app prototype.
```

### Multiplayer-ready seams

Racer state is plain serializable data; player/AI differ only by *driver*.
A future remote player is a racer whose state arrives over the network —
see the module notes in `src/racers.js` and `src/input.js`.

## Tech notes

- Three.js pinned at **0.128.0** to match the prototype's CDN build.
  Upgrading past r152/r155 changes color management and light-intensity
  defaults, which will visibly shift the game's look — do that as a
  deliberate step with before/after comparison, not in passing.
- Renders at a fixed 240px internal height, upscaled with
  `image-rendering: pixelated` for the retro look.
