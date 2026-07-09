/* Prop library: builders for everything a track can place in the world.
   Track data files reference these by `type`. Each builder receives:
     ctx — { scene, rng, solid(x,z,r), exclude(x,z,r), clearOfRoad(p,margin),
             clearOfExclusions(p,margin), dynamic } // dynamic: animated things (boats…)
     def — the prop entry from the track file.
   Placement randomness uses ctx.rng (seeded) so colliders match across clients. */
import * as THREE from 'three';
import { lambert, pixTex, blobShadow, bannerTex, waterTex, sandTex, asphaltTex } from './gfx.js';

const B = {};

B.water = (ctx, def) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(def.r, def.seg || 16),
    new THREE.MeshLambertMaterial({map: waterTex}));
  m.rotation.x = -Math.PI/2;
  if(def.scale) m.scale.set(def.scale[0], def.scale[1], 1);
  const g = new THREE.Group();
  g.add(m);
  g.position.set(def.x, 0.02, def.z);
  if(def.rot) g.rotation.y = def.rot;    // tilt the ellipse in the ground plane
  ctx.scene.add(g);
  if(def.exclude) ctx.exclude(def.x, def.z, def.exclude);
};

/* a raised tree-covered island (Grasmere's iconic one) — a low grassy
   mound with a sand ring, trees clustered at the crown so canopies stay
   over land rather than poking out of the water */
B.island = (ctx, def) => {
  const r = def.r || 5;
  const g = new THREE.Group();
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(r+1.4, r+2, 0.4, 16),
    new THREE.MeshLambertMaterial({map:sandTex}));
  beach.position.y=0.2; g.add(beach);
  const land = new THREE.Mesh(new THREE.CylinderGeometry(r*0.85, r+0.4, 0.7, 16),
    lambert(0x6a9c55));
  land.position.y=0.55; g.add(land);
  const crownY = 0.9;
  for(let i=0;i<(def.trees||3);i++){
    const t = ctx.rng()<0.5 ? pineTree(ctx.rng) : roundTree(ctx.rng, 0x4c7a3d);
    t.scale.setScalar(0.55);
    const a=ctx.rng()*6.28, rr=ctx.rng()*r*0.4;   // clustered near the crown
    t.position.set(Math.cos(a)*rr, crownY, Math.sin(a)*rr);
    g.add(t);
  }
  for(let i=0;i<4;i++){
    const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,0), BUSH_M);
    const a=ctx.rng()*6.28, rr=r*0.55+ctx.rng()*r*0.25;
    bush.position.set(Math.cos(a)*rr, crownY, Math.sin(a)*rr); g.add(bush);
  }
  g.position.set(def.x,0,def.z); ctx.scene.add(g);
};

/* scattered mixed-species trees in a region (tree density where the park
   is actually wooded) */
B.grove = (ctx, def) => {
  const greens=[0x4c7a3d,0x5d8f4a,0x6ba05a,0x87a94a];
  let placed=0, guard=0;
  while(placed<def.count && guard++<def.count*10){
    const p = new THREE.Vector3(def.x+(ctx.rng()-0.5)*def.spreadX, 0,
                                def.z+(ctx.rng()-0.5)*def.spreadZ);
    if(!ctx.clearOfRoad(p, def.margin||7) || !ctx.clearOfExclusions(p, 2)) continue;
    const roll=ctx.rng();
    const t = roll<0.42 ? pineTree(ctx.rng)
            : roll<0.58 ? aspenClump(ctx.rng)
            : roll<0.74 ? cottonwood(ctx.rng, greens[placed%4])
            : roundTree(ctx.rng, greens[placed%4]);
    t.position.copy(p); t.rotation.y=ctx.rng()*6; ctx.scene.add(t);
    ctx.solid(p.x, p.z, 1.0);
    placed++;
  }
};

B.lilypads = (ctx, def) => {
  for(let i=0;i<def.count;i++){
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.7,6), lambert(0x4c8c3f));
    pad.rotation.x = -Math.PI/2;
    pad.position.set(def.x+(ctx.rng()-0.5)*def.spread, 0.04, def.z+(ctx.rng()-0.5)*def.spread);
    ctx.scene.add(pad);
  }
  if(def.exclude) ctx.exclude(def.x, def.z, def.exclude);
};

/* Smith Lake boathouse — long two-story colonnade pavilion at the water's
   edge: glassed-in lower level, open veranda above, decorative frieze,
   wide low hip roof. Front (local +z) faces the lake. */
B.boathouse = (ctx, def) => {
  const g = new THREE.Group();
  const cream = lambert(0xf0e8d8);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(30,0.6,9), lambert(0xcbb894));
  deck.position.y=0.3; g.add(deck);
  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(26,1.3,6.8), lambert(0x9a6b4f));
  wainscot.position.y=1.25; g.add(wainscot);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(26,1.9,6.6), lambert(0xa8ccd4));
  windows.position.y=2.85; g.add(windows);
  const floor2 = new THREE.Mesh(new THREE.BoxGeometry(27.5,0.5,7.6), cream);
  floor2.position.y=4.05; g.add(floor2);
  for(let i=-3.5;i<=3.5;i++){                       // 8 square pillars, both faces
    [3.2,-3.2].forEach(zz=>{
      const col=new THREE.Mesh(new THREE.BoxGeometry(0.65,3.2,0.65), cream);
      col.position.set(i*3.6,5.8,zz); g.add(col);
    });
  }
  [3.2,-3.2].forEach(zz=>{                          // veranda railings
    const rail=new THREE.Mesh(new THREE.BoxGeometry(26,0.5,0.14), lambert(0xd8d2c5));
    rail.position.set(0,4.9,zz); g.add(rail);
  });
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(27.8,0.55,7.9), lambert(0xc75146));
  frieze.position.y=7.55; g.add(frieze);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(19.5,2.6,4), lambert(0x8a8275));
  roof.position.y=9.1; roof.rotation.y=Math.PI/4; roof.scale.z=0.42; g.add(roof);

  /* race-day crowd: fans on the upper veranda (both faces) + the lower deck.
     Each is pushed to dynamic.fans so world.js can bob/sway them. */
  const fanShirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9,0xf5e9d0,0xff9a5c,0x9b59b6];
  const addFan=(x,y,z,faceOut,cheer)=>{
    const p=makePerson(ctx.rng, fanShirts[Math.floor(ctx.rng()*fanShirts.length)],
      cheer?'cheer':'stand');
    p.position.set(x,y,z); p.rotation.y = faceOut;
    g.add(p);
    ctx.dynamic.fans.push({m:p, baseY:y, baseRot:faceOut, phase:ctx.rng()*6.28,
      amp: cheer?0.35:0.12});
  };
  for(let x=-11.5;x<=11.5;x+=2.6) addFan(x, 4.35,  2.9, 0,        ctx.rng()<0.55);  // veranda front
  for(let x=-10;  x<=10;  x+=3.4) addFan(x, 4.35, -2.9, Math.PI,  ctx.rng()<0.4);   // veranda back
  for(let x=-12;  x<=12;  x+=3.0) addFan(x, 0.62,  4.4, 0,        ctx.rng()<0.5);    // deck at the rail

  // MILE HIGH CRIT banner strung across the veranda front
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(23,1.9),
    new THREE.MeshLambertMaterial({map:bannerTex('MILE HIGH CRIT'), side:THREE.DoubleSide,
      emissive:0x3a1410}));
  banner.position.set(0,6.4,3.35); g.add(banner);

  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,16); ctx.solid(def.x,def.z,9);
};

/* Dos Chappell Bathhouse — Craftsman pavilion: stone base, cream body with a
   banded window row, deep-eaved low hipped roof, and a columned front porch */
B.bathhouse = (ctx, def) => {
  const g = new THREE.Group();
  const stone=lambert(0x9a8f80), cream=lambert(0xe8dcc0), roofC=lambert(0x6e4b2a), trim=lambert(0x8a6a48);
  const base=new THREE.Mesh(new THREE.BoxGeometry(13,1.3,8), stone); base.position.y=0.65; g.add(base);
  const body=new THREE.Mesh(new THREE.BoxGeometry(11.6,3.2,7), cream); body.position.y=3.0; g.add(body);
  const winband=new THREE.Mesh(new THREE.BoxGeometry(11.7,1.3,7.05), lambert(0xa8ccd4)); winband.position.y=3.3; g.add(winband);
  for(let i=-2;i<=2;i++){ const pier=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.5,7.1), cream); pier.position.set(i*2.7,3.3,0); g.add(pier); }
  const eave=new THREE.Mesh(new THREE.BoxGeometry(13.4,0.4,8.6), trim); eave.position.y=4.75; g.add(eave);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(10,2.4,4), roofC);
  roof.rotation.y=Math.PI/4; roof.scale.z=0.6; roof.position.y=6.0; g.add(roof);
  [-4,-1.3,1.3,4].forEach(x=>{ const col=new THREE.Mesh(new THREE.BoxGeometry(0.6,3.0,0.6), stone); col.position.set(x,1.9,3.7); g.add(col); });
  const porchRoof=new THREE.Mesh(new THREE.BoxGeometry(10,0.35,2.2), roofC); porchRoof.position.set(0,3.55,4.0); g.add(porchRoof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.2,0.15), lambert(0x3a2a20)); door.position.set(0,1.75,3.55); g.add(door);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,9); ctx.solid(def.x,def.z,6);
};

/* Martha Washington garden — a formal Mt-Vernon-style parterre: four
   symmetric hedge-outlined beds, a central axial path, white picket border
   and an arbor arch at the entrance (distinct from a plain flower bed) */
B.marthaGarden = (ctx, def) => {
  const g=new THREE.Group();
  const gravel=new THREE.Mesh(new THREE.PlaneGeometry(def.w,def.d), new THREE.MeshLambertMaterial({map:sandTex}));
  gravel.rotation.x=-Math.PI/2; gravel.position.y=0.03; g.add(gravel);
  const path=new THREE.Mesh(new THREE.PlaneGeometry(1.6,def.d), lambert(0xe8dcc0));
  path.rotation.x=-Math.PI/2; path.position.y=0.04; g.add(path);
  const hedgeM=lambert(0x2f5a2a), fenceM=lambert(0xf5f0e6);
  const cols=[0xe84855,0xffd166,0xf25caf,0xf5e9d0];
  const bloomG=new THREE.BoxGeometry(0.45,0.45,0.45);
  const bw=def.w/2-2, bd=def.d/2-2;
  for(let sx=-1;sx<=1;sx+=2)for(let sz=-1;sz<=1;sz+=2){
    const cx=sx*(def.w/4), cz=sz*(def.d/4);
    [[bw,0,bd/2],[bw,0,-bd/2]].forEach(([w,ox,oz])=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(w,0.5,0.4), hedgeM); h.position.set(cx+ox,0.28,cz+oz); g.add(h); });
    [[bd,bw/2,0],[bd,-bw/2,0]].forEach(([d,ox,oz])=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,d), hedgeM); h.position.set(cx+ox,0.28,cz+oz); g.add(h); });
    for(let i=0;i<Math.floor(bw*bd/5);i++){
      const f=new THREE.Mesh(bloomG, lambert(cols[(sx+sz+i+2)%4]));
      f.position.set(cx+(ctx.rng()-0.5)*(bw-1),0.55,cz+(ctx.rng()-0.5)*(bd-1)); g.add(f); }
  }
  for(let x=-def.w/2;x<=def.w/2;x+=1.4){ [def.d/2,-def.d/2].forEach(z=>{
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.8,0.12),fenceM); p.position.set(x,0.4,z); g.add(p); }); }
  for(let z=-def.d/2;z<=def.d/2;z+=1.4){ [def.w/2,-def.w/2].forEach(x=>{
    const p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.8,0.12),fenceM); p.position.set(x,0.4,z); g.add(p); }); }
  [-0.9,0.9].forEach(x=>{ const post=new THREE.Mesh(new THREE.BoxGeometry(0.18,2.6,0.18),fenceM); post.position.set(x,1.3,def.d/2); g.add(post); });
  const arch=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.2,0.2),fenceM); arch.position.set(0,2.5,def.d/2); g.add(arch);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,Math.max(def.w,def.d)/2+2);
};

/* South High School — the 1926 landmark across Louisiana from the park's
   south end: long tan-brick body, arched entry, and the iconic central
   clock/bell tower. Backdrop building (beyond player bounds, no collision). */
B.southHigh = (ctx, def) => {
  const g = new THREE.Group();
  const brick = lambert(0xd9b48f), roofC = lambert(0x8a9a6a), stone = lambert(0xe8dcc0);
  const body = new THREE.Mesh(new THREE.BoxGeometry(34,8,10), brick); body.position.y=4; g.add(body);
  [-21,21].forEach(x=>{
    const wing=new THREE.Mesh(new THREE.BoxGeometry(8,6.5,9), brick); wing.position.set(x,3.25,0); g.add(wing);
    const wr=new THREE.Mesh(new THREE.BoxGeometry(8.6,0.5,9.6), roofC); wr.position.set(x,6.75,0); g.add(wr);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(34.6,0.6,10.6), roofC); roof.position.y=8.3; g.add(roof);
  for(let i=-3;i<=3;i++){                       // window rows
    if(i===0) continue;
    [2.6,5.6].forEach(y=>{
      const win=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.7,0.12), lambert(0x6a8a9a));
      win.position.set(i*4.4,y,5.05); g.add(win);
    });
  }
  const arch = new THREE.Mesh(new THREE.BoxGeometry(4.6,4.4,0.5), stone);
  arch.position.set(0,2.2,5.1); g.add(arch);
  const doorway = new THREE.Mesh(new THREE.BoxGeometry(2.6,3.2,0.4), lambert(0x3a2a20));
  doorway.position.set(0,1.6,5.25); g.add(doorway);
  /* the clock tower */
  const tower = new THREE.Mesh(new THREE.BoxGeometry(5,17,5), brick); tower.position.y=8.5; g.add(tower);
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(5.6,2.6,5.6), stone); belfry.position.y=17.5; g.add(belfry);
  [-1.4,1.4].forEach(x=>{
    const slot=new THREE.Mesh(new THREE.BoxGeometry(1,2,5.7), lambert(0x2a1f2e));
    slot.position.set(x,17.5,0); g.add(slot);
  });
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.3,12), lambert(0xf5f0e6));
  clock.rotation.x=Math.PI/2; clock.position.set(0,14.2,2.6); g.add(clock);
  [[0,0.55,0.12,1.0],[0.4,0.28,0.12,0.7]].forEach(([hx,hy,w,l])=>{
    const hand=new THREE.Mesh(new THREE.BoxGeometry(w,l,0.08), lambert(0x1a1423));
    hand.position.set(hx?0.2:0, 14.2+hy, 2.78); g.add(hand);
  });
  const cap = new THREE.Mesh(new THREE.ConeGeometry(4.2,2.6,4), roofC);
  cap.position.y=20.1; cap.rotation.y=Math.PI/4; g.add(cap);
  const name = new THREE.Mesh(new THREE.PlaneGeometry(9,1.3),
    new THREE.MeshLambertMaterial({map:bannerTex('SOUTH HIGH SCHOOL','#d9b48f','#5a4030'),
      side:THREE.DoubleSide}));
  name.position.set(0,6.9,5.15); g.add(name);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,24);
};

/* Fire Station 21 — the red-brick NE-corner landmark with bay doors + tower */
B.fireStation = (ctx, def) => {
  const g=new THREE.Group();
  const brick=lambert(0xb04a3a);
  const body=new THREE.Mesh(new THREE.BoxGeometry(12,6,9), brick); body.position.y=3; g.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(12.6,0.6,9.6), lambert(0x4a3c38)); roof.position.y=6.3; g.add(roof);
  [-3,3].forEach(x=>{ const door=new THREE.Mesh(new THREE.BoxGeometry(3.4,3.6,0.2), lambert(0xc0392b)); door.position.set(x,1.9,4.55); g.add(door); });
  const tower=new THREE.Mesh(new THREE.BoxGeometry(2.6,9,2.6), brick); tower.position.set(-6.6,4.5,-2); g.add(tower);
  const towerRoof=new THREE.Mesh(new THREE.ConeGeometry(2.2,1.6,4), lambert(0x4a3c38));
  towerRoof.position.set(-6.6,9.8,-2); towerRoof.rotation.y=Math.PI/4; g.add(towerRoof);
  const band=new THREE.Mesh(new THREE.PlaneGeometry(5,1.3),
    new THREE.MeshLambertMaterial({map:bannerTex('STATION 21','#7a2a20','#f5e9d0'), side:THREE.DoubleSide}));
  band.position.set(0,5.2,4.62); g.add(band);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,12); ctx.solid(def.x,def.z,8);
};

B.boats = (ctx, def) => {
  for(let i=0;i<def.count;i++){
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.7,1.4), lambert([0xf5e9d0,0x2e86ab,0xffd166][i%3])); hull.position.y=0.35; b.add(hull);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.16,1.3), lambert(0xd94f30)); canopy.position.y=1.7; b.add(canopy);
    [[-0.8,0.5],[0.8,0.5],[-0.8,-0.5],[0.8,-0.5]].forEach(([x,z])=>{
      const p2=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.1,4), lambert(0x1a1423));
      p2.position.set(x,1.1,z); b.add(p2); });
    b.position.set(def.x+i*9, 0, def.z+i*6); b.rotation.y=ctx.rng()*6;
    b.userData.phase = i*2;
    ctx.scene.add(b); ctx.dynamic.boats.push(b);
  }
};

B.flowerBed = (ctx, def) => {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(def.w,def.d), lambert(0x5b4632));
  soil.rotation.x=-Math.PI/2; soil.position.y=0.03; g.add(soil);
  const cols=[0xe84855,0xffd166,0xf25caf,0xf5e9d0,0xff9a5c];
  const bloomG = new THREE.BoxGeometry(0.55,0.55,0.55);
  for(let i=0;i<Math.floor(def.w*def.d/3);i++){
    const f = new THREE.Mesh(bloomG, lambert(cols[i%5]));
    f.position.set((ctx.rng()-0.5)*def.w*0.9, 0.5+ctx.rng()*0.2, (ctx.rng()-0.5)*def.d*0.9);
    g.add(f);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,Math.max(def.w,def.d)/2+1);
};

B.blankets = (ctx, def) => {
  for(let i=0;i<def.count;i++){
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(2.6,2), lambert([0xe84855,0x2e86ab,0xffd166,0xf5e9d0][i%4]));
    bl.rotation.x=-Math.PI/2; bl.rotation.z=ctx.rng()*3;
    bl.position.set(def.x+(ctx.rng()-0.5)*def.spreadX, 0.03, def.z+(ctx.rng()-0.5)*def.spreadZ);
    ctx.scene.add(bl);
  }
};

B.volleyball = (ctx, def) => {
  const g = new THREE.Group();
  const court = new THREE.Mesh(new THREE.PlaneGeometry(9,5), new THREE.MeshLambertMaterial({map:sandTex}));
  court.rotation.x=-Math.PI/2; court.position.y=0.03; g.add(court);
  [-1,1].forEach(s=>{ const post=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,2.6,4), lambert(0x1a1423));
    post.position.set(0,1.3,s*2.5); g.add(post); });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(5,0.9),
    new THREE.MeshLambertMaterial({color:0xf5e9d0, side:THREE.DoubleSide, transparent:true, opacity:0.85}));
  net.rotation.y=Math.PI/2; net.position.y=2; g.add(net);
  g.position.set(def.x,0,def.z); ctx.scene.add(g); ctx.exclude(def.x,def.z,7);
};

B.tennis = (ctx, def) => {
  const g = new THREE.Group();
  const court = new THREE.Mesh(new THREE.PlaneGeometry(18,9), lambert(0x3e7a4e));
  court.rotation.x=-Math.PI/2; court.position.y=0.03; g.add(court);
  const lineM = lambert(0xf5e9d0);
  [[18,0.24,0,-4.4],[18,0.24,0,4.4],[0.24,9,-8.9,0],[0.24,9,8.9,0],[0.24,9,0,0]].forEach(([w2,d,x,z])=>{
    const l=new THREE.Mesh(new THREE.PlaneGeometry(w2,d), lineM);
    l.rotation.x=-Math.PI/2; l.position.set(x,0.04,z); g.add(l); });
  g.position.set(def.x, 0, def.z); ctx.scene.add(g); ctx.exclude(def.x,def.z,11);
};

B.recCenter = (ctx, def) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(16,6,10), lambert(0xc9a06a)); body.position.y=3; g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(17,0.8,11), lambert(0x5a4a3a)); roof.position.y=6.4; g.add(roof);
  if(def.parking){
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(16,9), lambert(0x71716f));
    lot.rotation.x=-Math.PI/2; lot.position.set(0,0.012,10.5); g.add(lot);
    const carCols=[0xe84855,0xf5e9d0,0x2e86ab,0x8a8275];
    for(let i=0;i<4;i++){
      const car = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.8,1), lambert(carCols[i]));
      car.position.set(-5.4+i*3.6, 0.45, 12.4); g.add(car);
    }
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,13); ctx.solid(def.x,def.z,8);
};

/* the formal flower gardens on the east side — parterre beds + gravel walks */
B.formalGarden = (ctx, def) => {
  const g = new THREE.Group();
  const gravel = new THREE.Mesh(new THREE.PlaneGeometry(def.w,def.d), new THREE.MeshLambertMaterial({map:sandTex}));
  gravel.rotation.x=-Math.PI/2; gravel.position.y=0.03; g.add(gravel);
  const cols=[0xe84855,0xffd166,0xf25caf,0xff9a5c,0xf5e9d0];
  const bloomG = new THREE.BoxGeometry(0.5,0.5,0.5);
  const hedgeM = lambert(0x3e6b35);
  // symmetric parterre: a grid of hedge-ringed beds with bloom rows inside
  const bw=(def.w-6)/2, bd=(def.d-9)/3;
  for(let bx=0;bx<2;bx++)for(let bz=0;bz<3;bz++){
    const cx=(bx-0.5)*(bw+2), cz=(bz-1)*(bd+2.4);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(bw,0.5,bd), hedgeM);
    hedge.position.set(cx,0.25,cz); g.add(hedge);
    for(let i=0;i<Math.floor(bw*bd/4);i++){
      const f = new THREE.Mesh(bloomG, lambert(cols[(bx+bz+i)%5]));
      f.position.set(cx+(ctx.rng()-0.5)*(bw-1), 0.65, cz+(ctx.rng()-0.5)*(bd-1));
      g.add(f);
    }
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,Math.max(def.w,def.d)/2+2);
};

B.cottage = (ctx, def) => {
  /* Eugene Field House: 1875 clapboard cottage — front-gabled with a full
     porch and a landmark plaque, so it reads as *the* house, not a shed */
  const g = new THREE.Group();
  const clap = lambert(0xf5e9d0), trim = lambert(0x8a6a48);
  const body = new THREE.Mesh(new THREE.BoxGeometry(6,3.2,4.5), clap); body.position.y=1.6; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6,2.4,4), lambert(0x6e4b2a));
  roof.position.y=4.3; roof.rotation.y=Math.PI/4; roof.scale.z=0.8; g.add(roof);
  const gable = new THREE.Mesh(new THREE.ConeGeometry(1.7,1.5,4), lambert(0x6e4b2a));
  gable.position.set(0,4.0,1.9); gable.rotation.y=Math.PI/4; gable.scale.x=0.9; g.add(gable);
  const gwin = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.9,0.1), lambert(0xa8ccd4));
  gwin.position.set(0,3.5,2.28); g.add(gwin);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(5.6,0.4,1.8), trim);
  slab.position.set(0,0.2,3.1); g.add(slab);
  [-2.3,-0.8,0.8,2.3].forEach(x=>{
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,2.2,5), clap);
    col.position.set(x,1.5,3.7); g.add(col);
  });
  const pRoof = new THREE.Mesh(new THREE.BoxGeometry(6,0.25,2.1), lambert(0x6e4b2a));
  pRoof.position.set(0,2.72,3.15); g.add(pRoof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9,1.8,0.1), lambert(0x3a2a20));
  door.position.set(-0.9,1.1,2.28); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.1,0.1), lambert(0xa8ccd4));
  win.position.set(1.2,1.5,2.28); g.add(win);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.7),
    new THREE.MeshLambertMaterial({map:bannerTex('EST. 1875','#5a4030','#f5e9d0'), side:THREE.DoubleSide}));
  plaque.position.set(0,2.2,2.35); g.add(plaque);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,6); ctx.solid(def.x,def.z,4);
  // the Wynken, Blynken & Nod fountain beside the cottage — the bronze kids
  // in a sailing shoe, on a larger basin so it reads as a real landmark.
  // Offset is data-driven (fdx/fdz) so it lands park-side wherever the
  // cottage sits (east edge now — a +x offset would put it on Franklin St).
  const fx=def.x+(def.fdx??8), fz=def.z+(def.fdz??-7), bronze=lambert(0x8a6a4a);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(4,4,0.7,14), lambert(0xd8d2c5));
  basin.position.set(fx,0.35,fz); ctx.scene.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.5,14), new THREE.MeshLambertMaterial({map:waterTex}));
  water.rotation.x=-Math.PI/2; water.position.set(fx,0.72,fz); ctx.scene.add(water);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(2.6,0.9,1.1), bronze);
  shoe.position.set(fx,1.15,fz); ctx.scene.add(shoe);
  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.4,1.0), bronze);
  toe.position.set(fx+1.3,1.5,fz); ctx.scene.add(toe);
  for(let i=0;i<3;i++){                              // three little sleepy kids
    const kid=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.6,0.32), bronze);
    kid.position.set(fx-0.6+i*0.6,1.9,fz); ctx.scene.add(kid);
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.3,0.32), bronze);
    h.position.set(fx-0.6+i*0.6,2.3,fz); ctx.scene.add(h);
  }
  ctx.exclude(fx,fz,6); ctx.solid(fx,fz,4);
};

/* shared materials for architectural details (keeps material count down) */
const GLASS = lambert(0xa8ccd4);
const DOOR_M = lambert(0x3a2a20);
const FOUNDATION_M = lambert(0x8a8275);
const BUSH_M = lambert(0x4c7a3d);

/* modest brick bungalows, front doors toward ry */
function buildHouse(ctx, x, z, ry){
  const bricks=[0xb85c48,0xd98c5f,0xe0b487,0xa66a4f,0xc9a06a,0x9b6b53];
  const g = new THREE.Group();
  const w2=6+ctx.rng()*3, h=4+ctx.rng()*3, d=6+ctx.rng()*2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w2,h,d), lambert(bricks[Math.floor(ctx.rng()*6)]));
  body.position.y=h/2; g.add(body);
  const found = new THREE.Mesh(new THREE.BoxGeometry(w2+0.25,0.5,d+0.25), FOUNDATION_M);
  found.position.y=0.25; g.add(found);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w2,d)*0.74, 2.4, 4), lambert(0x5a4a3a));
  roof.position.y=h+1.2; roof.rotation.y=Math.PI/4; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9,1.7,0.1), DOOR_M);
  door.position.set(0,0.95,d/2+0.03); g.add(door);
  [-w2*0.28, w2*0.28].forEach(wx=>{
    const win = new THREE.Mesh(new THREE.BoxGeometry(1,1,0.08), GLASS);
    win.position.set(wx,h*0.55,d/2+0.03); g.add(win);
  });
  if(ctx.rng()<0.5){
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.7,1.8,0.7), FOUNDATION_M);
    chim.position.set(w2*0.3,h+0.9,-d*0.2); g.add(chim);
  }
  g.position.set(x,0,z); g.rotation.y=ry; ctx.scene.add(g); ctx.solid(x,z,5);
}

B.houseRow = (ctx, def) => {
  for(let x=-def.xSpan; x<=def.xSpan; x+=def.step) buildHouse(ctx, x, def.z, def.ry||0);
};

/* Wash Park mansions — two-story Denver Squares with hip roofs, front
   porches, and chimneys, facing the park from Downing & Franklin */
B.mansionRow = (ctx, def) => {
  const bricks=[0x9e4a3a,0xb85c48,0xc9a06a,0xa66a4f,0x8f5a44,0xd9b48f];
  const roofs=[0x5a4a3a,0x4a3c38,0x3f4a55,0x6e4b2a];
  const trim=lambert(0xf5e9d0);
  const mansion = (x, z, ry) => {
    const g = new THREE.Group();
    const w2=8+ctx.rng()*3, h=6.5+ctx.rng()*2, d=8+ctx.rng()*2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w2,h,d),
      lambert(bricks[Math.floor(ctx.rng()*bricks.length)]));
    body.position.y=h/2; g.add(body);
    const roofC = roofs[Math.floor(ctx.rng()*roofs.length)];
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w2,d)*0.72, 3, 4), lambert(roofC));
    roof.position.y=h+1.5; roof.rotation.y=Math.PI/4; g.add(roof);
    if(ctx.rng()<0.5){  // dormer
      const dm = new THREE.Mesh(new THREE.BoxGeometry(2,1.6,1.6), trim);
      dm.position.set((ctx.rng()-0.5)*w2*0.4, h+1.3, d*0.22); g.add(dm);
    }
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8,2.4,0.8),
      lambert(0x8f5a44));
    chim.position.set(w2*0.28, h+1.4, -d*0.2); g.add(chim);
    // front porch (local +z faces the park after rotation)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w2*0.9,0.5,2.2), trim);
    slab.position.set(0,0.25,d/2+1.1); g.add(slab);
    for(const px of [-w2*0.38, -w2*0.13, w2*0.13, w2*0.38]){
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,2.4,5), trim);
      col.position.set(px,1.7,d/2+2); g.add(col);
    }
    const pRoof = new THREE.Mesh(new THREE.BoxGeometry(w2*0.95,0.3,2.5), lambert(roofC));
    pRoof.position.set(0,3.0,d/2+1.15); g.add(pRoof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95,1.9,0.15), DOOR_M);
    door.position.set(0,1.2,d/2+0.05); g.add(door);
    /* windows up & down, eave trim, foundation, bushes, front walk */
    [[-w2*0.28,2.1],[w2*0.28,2.1],[-w2*0.28,h-1.6],[w2*0.28,h-1.6]].forEach(([wx,wy])=>{
      const win = new THREE.Mesh(new THREE.BoxGeometry(1,1.25,0.1), GLASS);
      win.position.set(wx,wy,d/2+0.04); g.add(win);
    });
    const trimB = new THREE.Mesh(new THREE.BoxGeometry(w2+0.4,0.28,d+0.4), trim);
    trimB.position.y=h+0.05; g.add(trimB);
    const found = new THREE.Mesh(new THREE.BoxGeometry(w2+0.3,0.55,d+0.3), FOUNDATION_M);
    found.position.y=0.27; g.add(found);
    [-w2*0.4, w2*0.4].forEach(bx=>{
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6,0), BUSH_M);
      bush.position.set(bx,0.45,d/2+0.8); g.add(bush);
    });
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(1.2,3.2), FOUNDATION_M);
    walk.rotation.x=-Math.PI/2; walk.position.set(0,0.028,d/2+3.6); g.add(walk);
    g.position.set(x,0,z); g.rotation.y=ry; ctx.scene.add(g);
    ctx.solid(x,z,5.5);
  };
  /* decorative landscaping between the lots (no collision — off the course) */
  const greens=[0x4c7a3d,0x5d8f4a,0x6ba05a];
  const plantTree=(x,z,sc)=>{
    const roll=ctx.rng();
    const t = roll<0.25 ? pineTree(ctx.rng)
            : roll<0.42 ? aspenClump(ctx.rng)
            : roundTree(ctx.rng, greens[Math.floor(ctx.rng()*3)]);
    t.position.set(x,0,z); t.rotation.y=ctx.rng()*6;
    if(sc) t.scale.setScalar(sc);
    ctx.scene.add(t);
  };
  const plantHedge=(x,z,n)=>{               // short run of bushes along z
    for(let i=0;i<n;i++){
      const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5+ctx.rng()*0.25,0), BUSH_M);
      bush.position.set(x+(ctx.rng()-0.5)*0.5, 0.45, z+(i-(n-1)/2)*1.15);
      ctx.scene.add(bush);
    }
  };
  const lamppost=(x,z)=>{
    const g=new THREE.Group();
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,3.4,6), lambert(0x2b2b33));
    pole.position.y=1.7; g.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.1,0.1), lambert(0x2b2b33));
    arm.position.set(0.2,3.4,0); g.add(arm);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.4,0.36),
      lambert(0xffe6a0, {emissive:0x8a6a20}));
    lamp.position.set(0.42,3.35,0); g.add(lamp);
    g.position.set(x,0,z); ctx.scene.add(g);
  };

  for(let z=-def.zSpan; z<=def.zSpan; z+=def.step){
    mansion(-def.xEdge, z+(ctx.rng()-0.5)*4,  Math.PI/2);   // west side faces east
    mansion( def.xEdge, z+(ctx.rng()-0.5)*4, -Math.PI/2);   // east side faces west
    const gapZ = z + def.step/2;
    // parkway trees out front (toward the park) + a side-yard tree
    plantTree(-def.xEdge+9 + (ctx.rng()-0.5)*3, z + (ctx.rng()-0.5)*4);
    plantTree(-def.xEdge-2 + (ctx.rng()-0.5)*2, gapZ + (ctx.rng()-0.5)*3, 0.8);
    plantTree( def.xEdge-9 + (ctx.rng()-0.5)*3, z + (ctx.rng()-0.5)*4);
    plantTree( def.xEdge+2 + (ctx.rng()-0.5)*2, gapZ + (ctx.rng()-0.5)*3, 0.8);
    // hedges along the property lines between houses
    plantHedge(-def.xEdge+4, gapZ, 4);
    plantHedge( def.xEdge-4, gapZ, 4);
    // the occasional street lamp
    if(ctx.rng()<0.35) lamppost(-def.xEdge+11, gapZ);
    if(ctx.rng()<0.35) lamppost( def.xEdge-11, gapZ);
  }
};

/* the high-rise apartment towers on the north (Virginia Ave) edge */
/* the Virginia Ave towers — dark red-brown brick slabs with horizontal
   balcony bands (per the reference photo), plus a couple lighter ones */
B.apartments = (ctx, def) => {
  for(let i=0;i<def.count;i++){
    const brick = i%2===0;   // alternate: dark brick slab / lighter tower
    const w2=brick? 16+ctx.rng()*6 : 12+ctx.rng()*5;
    const h = brick? 30+ctx.rng()*10 : 20+ctx.rng()*8;
    const d = 11+ctx.rng()*4;
    const x = -def.xSpan + (i+0.5)*(2*def.xSpan/def.count) + (ctx.rng()-0.5)*6;
    const z = def.z - ctx.rng()*14;
    let tex;
    if(brick){
      tex = pixTex(32,(g,px)=>{
        g.fillStyle='#6b4237'; g.fillRect(0,0,px,px);
        for(let wy=2; wy<px; wy+=6){            // balcony bands
          g.fillStyle='#3f2822'; g.fillRect(0,wy,px,2);
          g.fillStyle='#8a5a4a'; g.fillRect(0,wy+2,px,1);
        }
        for(let wy=4; wy<px-1; wy+=6)           // recessed windows between bands
          for(let wx=1; wx<px-2; wx+=4){
            g.fillStyle = Math.random()<0.1 ? '#ffd166' : '#2e2a33';
            g.fillRect(wx,wy,2,2);
          }
      }, Math.max(1,Math.round(w2/10)), Math.max(2,Math.round(h/8)));
    } else {
      const base=['#e8e0d0','#d9cfc0','#c9b8a8'][Math.floor(ctx.rng()*3)];
      tex = pixTex(32,(g,px)=>{
        g.fillStyle=base; g.fillRect(0,0,px,px);
        for(let wy=3; wy<px-2; wy+=6)
          for(let wx=3; wx<px-3; wx+=5){
            g.fillStyle = Math.random()<0.12 ? '#ffd166' : '#4a5a6a';
            g.fillRect(wx,wy,3,3);
          }
      }, Math.max(1,Math.round(w2/9)), Math.max(2,Math.round(h/9)));
    }
    const mat = new THREE.MeshLambertMaterial({map:tex});
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w2,h,d), mat);
    tower.position.set(x,h/2,z); ctx.scene.add(tower);
    if(brick){                                   // stepped slab profile
      const step = new THREE.Mesh(new THREE.BoxGeometry(w2*0.6,h*0.86,d), mat);
      step.position.set(x+w2*0.55, h*0.43, z-3); ctx.scene.add(step);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w2+0.6,0.8,d+0.6), lambert(0x8a8275));
    cap.position.set(x,h+0.4,z); ctx.scene.add(cap);
    const ph = new THREE.Mesh(new THREE.BoxGeometry(w2*0.3,1.6,d*0.4), lambert(0x9a9285));
    ph.position.set(x+w2*0.15,h+1.6,z); ctx.scene.add(ph);
    ctx.solid(x,z,Math.max(w2,d)/2+2);
  }
};

/* flat ribbon along a spline — shared by the jogging path and streets */
function buildRibbon(ctx, def, tex, y){
  const closed = def.closed !== false;
  const curve = new THREE.CatmullRomCurve3(
    def.points.map(p=>new THREE.Vector3(...p)), closed, 'catmullrom', 0.5);
  const len = curve.getLength();
  const SEG = Math.max(8, Math.round(len/2)), pos=[], uv=[], idx=[];
  const up = new THREE.Vector3(0,1,0);
  for(let i=0;i<=SEG;i++){
    const t=i/SEG, p=curve.getPointAt(t), tan=curve.getTangentAt(t);
    const n = new THREE.Vector3().crossVectors(up,tan).normalize();
    const l = p.clone().addScaledVector(n, def.width/2);
    const r = p.clone().addScaledVector(n,-def.width/2);
    pos.push(l.x,y,l.z, r.x,y,r.z);
    uv.push(0, t*len/4, 1, t*len/4);
    if(i<SEG){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals();
  ctx.scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({map:tex})));
  return { curve, len };
}

/* gravel path; the main jogging loop (jog:true) is exposed for the joggers */
B.path = (ctx, def) => {
  const ribbon = buildRibbon(ctx, def, sandTex, 0.013);
  ribbon.jog = !!def.jog;
  ctx.dynamic.paths.push(ribbon);
};

/* neighborhood streets (asphalt, no gameplay effect) */
B.street = (ctx, def) => { buildRibbon(ctx, def, asphaltTex, 0.011); };

/* tree keep-out zone — how track data carves open meadows */
B.keepClear = (ctx, def) => { ctx.exclude(def.x, def.z, def.r); };

/* eyes (and usually a mouth) on the +z face of a head at height y */
const EYE_M = lambert(0x1a1423);
function addFace(g, rng, y, zFront){
  [-0.08,0.08].forEach(x=>{
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.055,0.07,0.02), EYE_M);
    eye.position.set(x, y+0.03, zFront+0.01); g.add(eye);
  });
  if(rng()<0.6){
    const mouth=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.03,0.02), EYE_M);
    mouth.position.set(0, y-0.09, zFront+0.01); g.add(mouth);
  }
}

/* low-poly park-goer. pose: 'stand' | 'sit'. Front faces local +z. */
const HAIR_COLORS=[0x4a3320,0x1a1423,0xd9b458,0x8a8275,0x6e4b2a];
export function makePerson(rng, shirt, pose='stand', skinC){
  const g = new THREE.Group();
  const skins=[0xd9a066,0xa06a42,0x8a5533,0xe8b88a];
  const skin = skinC ?? skins[Math.floor(rng()*skins.length)];
  const skinM = lambert(skin);
  const pants = rng()<0.5 ? 0x1a1423 : 0x4a5a6a;
  const hairC = HAIR_COLORS[Math.floor(rng()*HAIR_COLORS.length)];
  if(pose==='sit'){
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.18,0.55), lambert(pants));
    legs.position.set(0,0.09,0.28); g.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.55,0.3), lambert(shirt));
    torso.position.y=0.48; g.add(torso);
    [-0.26,0.26].forEach(x=>{                       // arms resting forward
      const arm=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.42,0.1), lambert(shirt));
      arm.position.set(x,0.55,0.14); arm.rotation.x=-0.9; g.add(arm);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.34,0.36), skinM);
    head.position.y=0.94; g.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.12,0.38), lambert(hairC));
    hair.position.y=1.16; g.add(hair);
    addFace(g, rng, 0.94, 0.19);
  } else {
    const legG = new THREE.BoxGeometry(0.16,0.6,0.16);
    const legL = new THREE.Mesh(legG, lambert(pants)); legL.position.set(-0.11,0.3,0);
    const legR = new THREE.Mesh(legG, lambert(pants)); legR.position.set( 0.11,0.3,0);
    g.add(legL); g.add(legR);
    [-0.11,0.11].forEach(x=>{                       // shoes
      const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.08,0.26), lambert(0x2b2b33));
      shoe.position.set(x,0.04,0.05); g.add(shoe);
    });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.6,0.28), lambert(shirt));
    torso.position.y=0.9; g.add(torso);
    const cheer = pose==='cheer';
    [-0.28,0.28].forEach(x=>{                       // arms (raised when cheering)
      const arm=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.52,0.11), lambert(shirt));
      const hand=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), skinM);
      if(cheer){
        arm.position.set(x*0.7,1.32,0); arm.rotation.z = x>0?-0.3:0.3;
        hand.position.set(x*0.8,1.66,0);
      } else {
        arm.position.set(x,0.92,0);
        hand.position.set(x,0.6,0);
      }
      g.add(arm); g.add(hand);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.36,0.38), skinM);
    head.position.y=1.4; g.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.12,0.4), lambert(hairC));
    hair.position.y=1.63; g.add(hair);
    addFace(g, rng, 1.42, 0.2);
    g.userData.legs=[legL,legR];
  }
  g.add(blobShadow(0.42, 0.22));
  return g;
}

/* picnickers on blankets in the meadow */
B.picnickers = (ctx, def) => {
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0xf5e9d0,0x5db3c9];
  for(let i=0;i<def.count;i++){
    const x=def.x+(ctx.rng()-0.5)*def.spread, z=def.z+(ctx.rng()-0.5)*def.spread;
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.8),
      lambert([0xe84855,0x2e86ab,0xffd166,0xf5e9d0][i%4]));
    bl.rotation.x=-Math.PI/2; bl.rotation.z=ctx.rng()*3;
    bl.position.set(x,0.03,z); ctx.scene.add(bl);
    const n = 1+Math.floor(ctx.rng()*2);
    for(let j=0;j<n;j++){
      const p = makePerson(ctx.rng, shirts[Math.floor(ctx.rng()*shirts.length)], 'sit');
      p.position.set(x+(ctx.rng()-0.5)*1.4, 0, z+(ctx.rng()-0.5)*1.2);
      p.rotation.y=ctx.rng()*6.28;
      ctx.scene.add(p);
    }
  }
};

/* summer-classic grass volleyball: net + four players mid-rally */
B.grassVolleyball = (ctx, def) => {
  const g = new THREE.Group();
  [-1,1].forEach(s=>{ const post=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,2.5,4), lambert(0x1a1423));
    post.position.set(0,1.25,s*2.2); g.add(post); });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(4.4,0.8),
    new THREE.MeshLambertMaterial({color:0xf5e9d0, side:THREE.DoubleSide, transparent:true, opacity:0.85}));
  net.rotation.y=Math.PI/2; net.position.y=1.9; g.add(net);
  const shirts=[0xe84855,0x2e86ab,0xffd166,0x5db3c9];
  [[-2.4,1.1],[-1.6,-1.2],[2.2,0.8],[1.5,-1.4]].forEach(([px,pz],i)=>{
    const p = makePerson(ctx.rng, shirts[i], 'stand');
    p.position.set(px,0,pz);
    p.rotation.y = px<0 ? Math.PI/2 : -Math.PI/2;   // face the net
    g.add(p);
  });
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), lambert(0xf5e9d0));
  ball.position.set(0.4,2.6,0.3); g.add(ball);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,6);
};

/* a hammock slung between two trees with someone napping (very Wash Park) */
B.hammock = (ctx, def) => {
  const g = new THREE.Group();
  const trunkG = new THREE.CylinderGeometry(0.35,0.5,3.2,5);
  [-2.7,2.7].forEach(x=>{
    const trunk=new THREE.Mesh(trunkG, lambert(0x6e4b2a)); trunk.position.set(x,1.6,0); g.add(trunk);
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(2.0,0), lambert(0x5d8f4a));
    puff.position.set(x,3.9,0); g.add(puff);
  });
  const cloth=new THREE.Mesh(new THREE.BoxGeometry(4.0,0.14,1.0),
    lambert([0xe84855,0x2e86ab,0xffd166,0xf25caf][Math.floor(ctx.rng()*4)]));
  cloth.position.y=1.05; cloth.rotation.z=0.03; g.add(cloth);
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.4,0.7), lambert(0x4a5a6a));
  body.position.set(0,1.28,0); body.rotation.z=0.05; g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.42), lambert(0xd9a066));
  head.position.set(1.35,1.5,0); g.add(head);
  g.add(blobShadow(3.4,0.14));
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,5);
};

/* a fitness bootcamp: a trainer facing a row of people on mats mid-workout */
B.bootcamp = (ctx, def) => {
  const g = new THREE.Group();
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9];
  const matC=[0x9b59b6,0x2e86ab,0xe84855,0x3e6b35];
  for(let i=0;i<5;i++){
    const mat=new THREE.Mesh(new THREE.PlaneGeometry(1.2,2.2), lambert(matC[i%4]));
    mat.rotation.x=-Math.PI/2; mat.position.set(-4+i*2, 0.03, 0.3); g.add(mat);
    const p=makePerson(ctx.rng, shirts[i], 'stand');
    p.position.set(-4+i*2, 0, 0.3); p.rotation.y=Math.PI;
    if(i%2) p.scale.y=0.6;                          // some crouched mid-rep
    g.add(p);
  }
  const trainer=makePerson(ctx.rng, 0x1a1423, 'stand');
  trainer.position.set(0,0,-2.6); g.add(trainer);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,7);
};

/* City Ditch (1867) — Denver's oldest waterway, winding through the park
   to feed the lakes, lined with Russian olives. Cosmetic (no splash). */
B.cityDitch = (ctx, def) => {
  buildRibbon(ctx, {points:def.points, width:def.width||2.5, closed:false}, waterTex, 0.008);
  const curve = new THREE.CatmullRomCurve3(
    def.points.map(p=>new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const len = curve.getLength(), n = Math.ceil(len/12);
  for(let i=0;i<=n;i++){ const p=curve.getPointAt(i/n); ctx.exclude(p.x,p.z,4); }
  let placed=0, guard=0;
  while(placed<(def.olives||8) && guard++<200){
    const p = curve.getPointAt(ctx.rng());
    const side = ctx.rng()<0.5 ? -1 : 1;
    const q = new THREE.Vector3(p.x+side*(3+ctx.rng()*3), 0, p.z+(ctx.rng()-0.5)*4);
    if(!ctx.clearOfRoad(q,5) || !ctx.clearOfExclusions(q,2)) continue;   // never in a lake
    const t = new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.45,2,5), lambert(0x7a6a52));
    trunk.position.y=1; t.add(trunk);
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8+ctx.rng()*1.2,0), lambert(0x9aa96a));
    puff.position.y=2.6; t.add(puff);
    t.position.copy(q); ctx.scene.add(t); placed++;
  }
};

/* trackside signage: banner panels on posts, set just off the road */
B.banners = (ctx, def) => {
  const up = new THREE.Vector3(0,1,0);
  for(const b of def.at){
    const p = ctx.trackPoint(b.t), tan = ctx.trackTangent(b.t);
    const n = new THREE.Vector3().crossVectors(up,tan).normalize();
    const side = b.side || 1;
    const bx = p.x + n.x*(ctx.roadHalf+2.6)*side;
    const bz = p.z + n.z*(ctx.roadHalf+2.6)*side;
    const g = new THREE.Group();
    [-3,3].forEach(px=>{
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,3.2,5), lambert(0x6e4b2a));
      post.position.set(px,1.6,0); g.add(post);
    });
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(6.4,1.7),
      new THREE.MeshLambertMaterial({map:bannerTex(b.text, b.bg, b.fg),
        side:THREE.DoubleSide, emissive:0x2a1410}));
    panel.position.y=2.7; g.add(panel);
    g.position.set(bx,0,bz);
    g.lookAt(p.x, 0, p.z);            // face the racing line (y=0 keeps posts upright)
    ctx.scene.add(g);
  }
};

/* a park landmark placard — wooden board on a post, naming what you're
   passing (SMITH LAKE, BOATHOUSE…). faceT points it at a track position. */
B.parkSign = (ctx, def) => {
  const g = new THREE.Group();
  const w = def.w || 5.4;
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,3.4,6), lambert(0x5a4030));
  post.position.y=1.7; g.add(post);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(w+0.35,2.0,0.14), lambert(0x5a4030));
  frame.position.y=3.5; g.add(frame);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(w,1.7),
    new THREE.MeshLambertMaterial({map:bannerTex(def.text, def.bg||'#3e5a34', def.fg||'#f5e9d0'),
      side:THREE.DoubleSide}));
  board.position.set(0,3.5,0.08); g.add(board);
  if(def.t!==undefined){                 // auto-place beside the road, facing it
    const p=ctx.trackPoint(def.t), tan=ctx.trackTangent(def.t);
    const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
    const side=def.side||1;
    g.position.set(p.x+n.x*(ctx.roadHalf+2.6)*side, 0, p.z+n.z*(ctx.roadHalf+2.6)*side);
    g.lookAt(p.x,0,p.z);
  } else {
    g.position.set(def.x,0,def.z);
    if(def.faceT!==undefined){ const p=ctx.trackPoint(def.faceT); g.lookAt(p.x,0,p.z); }
    else g.rotation.y = def.ry||0;
  }
  ctx.scene.add(g);
};

/* a green street-name blade on a pole for the park's edges (S DOWNING ST…) */
B.streetSign = (ctx, def) => {
  const g = new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,4.6,6), lambert(0x3a3a3a));
  pole.position.y=2.3; g.add(pole);
  const blade=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.12),
    new THREE.MeshLambertMaterial({map:bannerTex(def.text, '#2f6b3a', '#f7f7f2'),
      side:THREE.DoubleSide}));
  blade.position.y=4.3; g.add(blade);
  g.position.set(def.x,0,def.z); g.rotation.y = def.ry||0;
  ctx.scene.add(g);
};

/* a rented Wash Park surrey — canopy pedal-buggy with two riders.
   Built front-along-+z (the loop-traffic convention, same as makePerson),
   so it rolls forward rather than sliding broadside. */
export function makeSurrey(rng){
  const g = new THREE.Group();
  const c = [0xe84855,0xffd166,0x2e86ab,0xf25caf][Math.floor(rng()*4)];
  const deck=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.3,2.4), lambert(0x9b6b53)); deck.position.y=0.55; g.add(deck);
  const wgeo=new THREE.CylinderGeometry(0.3,0.3,0.16,6);
  [[0.6,0.9],[0.6,-0.9],[-0.6,0.9],[-0.6,-0.9]].forEach(([x,z])=>{
    const w=new THREE.Mesh(wgeo, lambert(0x1a1423));
    w.rotation.z=Math.PI/2;                        // axle along x → rolls along z
    w.position.set(x,0.3,z); g.add(w);
  });
  [[0.6,1.0],[0.6,-1.0],[-0.6,1.0],[-0.6,-1.0]].forEach(([x,z])=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.5,4), lambert(0x8a8275));
    post.position.set(x,1.35,z); g.add(post);
  });
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.16,2.7), lambert(c)); roof.position.y=2.15; g.add(roof);
  const fringe=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.22,0.05), lambert(c)); fringe.position.set(0,2.0,1.38); g.add(fringe);
  [0.35,-0.35].forEach(x=>{
    const p=makePerson(rng, [0xf5e9d0,0x5db3c9,0xffd166][Math.floor(rng()*3)], 'sit');
    p.position.set(x,0.72,0.1); p.scale.setScalar(0.82); g.add(p);   // facing +z = forward
  });
  g.add(blobShadow(1.7,0.2));
  return g;
}

/* stone rails where the race road crosses the ditch */
B.roadBridge = (ctx, def) => {
  const p=ctx.trackPoint(def.t), tan=ctx.trackTangent(def.t);
  const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
  [-1,1].forEach(s=>{
    const rail=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.9,6), lambert(0xd8d2c5));
    rail.position.copy(p).addScaledVector(n, s*(ctx.roadHalf+0.4)); rail.position.y=0.45;
    rail.lookAt(rail.position.clone().add(tan));
    ctx.scene.add(rail);
  });
};

/* little wooden footbridge over the ditch */
B.footbridge = (ctx, def) => {
  const g=new THREE.Group();
  const slab=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.3,2), lambert(0x8a6a48));
  slab.position.y=0.55; g.add(slab);
  [-1,1].forEach(s=>{ const rail=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.5,0.15), lambert(0x6e4b2a));
    rail.position.set(0,1.0,s*0.95); g.add(rail); });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
};

/* the Victorian Perennial Garden at Downing — elliptical lawn ringed by beds */
B.perennialGarden = (ctx, def) => {
  const g=new THREE.Group();
  const gravel=new THREE.Mesh(new THREE.PlaneGeometry(def.w+4,def.d+4),
    new THREE.MeshLambertMaterial({map:sandTex}));
  gravel.rotation.x=-Math.PI/2; gravel.position.y=0.025; g.add(gravel);
  const lawn=new THREE.Mesh(new THREE.CircleGeometry(1,24), lambert(0x6fae5c));
  lawn.scale.set(def.w/2,def.d/2,1); lawn.rotation.x=-Math.PI/2; lawn.position.y=0.035; g.add(lawn);
  const cols=[0xe84855,0xffd166,0xf25caf,0xff9a5c,0xf5e9d0,0x9b59b6];
  const bloomG=new THREE.BoxGeometry(0.5,0.5,0.5);
  const N=Math.floor((def.w+def.d)*1.2);
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2;
    const f=new THREE.Mesh(bloomG, lambert(cols[i%6]));
    f.position.set(Math.cos(a)*(def.w/2+1.4), 0.5, Math.sin(a)*(def.d/2+1.4));
    g.add(f);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,Math.max(def.w,def.d)/2+4);
};

/* ---- tree species ---- */
/* canopy puff with a slightly shaded twin for depth */
function canopy(rng, s, tint, detail=1){
  const grp=new THREE.Group();
  const main=new THREE.Mesh(new THREE.IcosahedronGeometry(s,detail), lambert(tint));
  grp.add(main);
  const dark=new THREE.Color(tint).multiplyScalar(0.85).getHex();
  const lobe=new THREE.Mesh(new THREE.IcosahedronGeometry(s*0.62,detail), lambert(dark));
  lobe.position.set(s*0.55,-s*0.15,(rng()-0.5)*s*0.7); grp.add(lobe);
  const light=new THREE.Color(tint).multiplyScalar(1.12).getHex();
  const lobe2=new THREE.Mesh(new THREE.IcosahedronGeometry(s*0.5,detail), lambert(light));
  lobe2.position.set(-s*0.5,s*0.25,(rng()-0.5)*s*0.6); grp.add(lobe2);
  return grp;
}

function pineTree(rng){
  const t=new THREE.Group();
  const tones=[0x2e5a3a,0x3a6b45,0x35604a];
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,2.4,7), lambert(0x5a4030));
  trunk.position.y=1.2; t.add(trunk);
  const h=5+rng()*4, tone=tones[Math.floor(rng()*3)];
  const dark=new THREE.Color(tone).multiplyScalar(0.85).getHex();
  for(let j=0;j<4;j++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry((2.7-j*0.55)*(1+h/14), h/3.2, 8),
      lambert(j%2 ? dark : tone));
    cone.position.y=2+j*(h/4.2); t.add(cone);
  }
  t.add(blobShadow(2.4, 0.16, 0.018));
  return t;
}
function roundTree(rng, tint){
  const t=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.85,3.6,7), lambert(0x6e4b2a));
  trunk.position.y=1.8; t.add(trunk);
  const branch=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.24,1.6,5), lambert(0x6e4b2a));
  branch.position.set(0.6,3.1,0.2); branch.rotation.z=-0.7; t.add(branch);
  const s=2.6+rng()*3;
  const c=canopy(rng, s, tint);
  c.position.y=3.6+s*0.7; t.add(c);
  t.add(blobShadow(s*0.8, 0.16, 0.018));
  return t;
}
function cottonwood(rng, tint){
  const t=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.55,1,5.4,7), lambert(0x5f4632));
  trunk.position.y=2.7; t.add(trunk);
  const s=3.2+rng()*1.8;
  const c=canopy(rng, s, tint);
  c.position.y=6+s*0.5; t.add(c);
  const c2=canopy(rng, s*0.55, tint);
  c2.position.set(1.6,7.6+s*0.5,0.7); t.add(c2);
  t.add(blobShadow(s*0.85, 0.16, 0.018));
  return t;
}
function aspenClump(rng){
  const t=new THREE.Group();
  const n=2+Math.floor(rng()*2);
  for(let i=0;i<n;i++){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.19,4.4,6), lambert(0xd8d2c5));
    trunk.position.set((rng()-0.5)*1.6, 2.2, (rng()-0.5)*1.6);
    trunk.rotation.z=(rng()-0.5)*0.16;
    t.add(trunk);
    const knot=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.1,0.05), lambert(0x4a4a44));
    knot.position.set(trunk.position.x+0.08, 1.4+rng()*1.6, trunk.position.z+0.09);
    t.add(knot);
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(1.3+rng()*0.7,1), lambert(0x9fca6a));
    puff.position.set(trunk.position.x, 4.6+rng()*0.8, trunk.position.z);
    t.add(puff);
  }
  t.add(blobShadow(1.9, 0.14, 0.018));
  return t;
}

/* the Olmsted evergreen grove — clustered conifers */
B.pines = (ctx, def) => {
  let placed=0, guard=0;
  while(placed<def.count && guard++<300){
    const p = new THREE.Vector3(def.x+(ctx.rng()-0.5)*def.spreadX, 0,
                                def.z+(ctx.rng()-0.5)*def.spreadZ);
    if(!ctx.clearOfRoad(p,6) || !ctx.clearOfExclusions(p,1.5)) continue;
    const t = pineTree(ctx.rng);
    t.position.copy(p); t.rotation.y=ctx.rng()*6; ctx.scene.add(t);
    ctx.solid(p.x,p.z,0.9); placed++;
  }
};

/* the lawn bowling / croquet green */
B.lawnBowling = (ctx, def) => {
  const g=new THREE.Group();
  const green=new THREE.Mesh(new THREE.PlaneGeometry(14,8), lambert(0x5da24e));
  green.rotation.x=-Math.PI/2; green.position.y=0.03; g.add(green);
  const line=lambert(0xf5e9d0);
  [-3.9,3.9].forEach(z=>{ const l=new THREE.Mesh(new THREE.PlaneGeometry(14,0.2), line);
    l.rotation.x=-Math.PI/2; l.position.set(0,0.04,z); g.add(l); });
  const jack=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,5), lambert(0xffd166));
  jack.position.set(4.2,0.16,0.4); g.add(jack);
  for(let i=0;i<6;i++){
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,5), lambert(i%2?0x1a1423:0x2b2b33));
    b.position.set(3+ctx.rng()*2,0.2,(ctx.rng()-0.5)*2.4); g.add(b);
  }
  [[-6,1.4,Math.PI/2],[-5.4,-1.6,Math.PI/2],[6.4,0,-Math.PI/2]].forEach(([px,pz,ry],i)=>{
    const p=makePerson(ctx.rng,[0xf5e9d0,0x2e86ab,0xe84855][i],'stand');
    p.position.set(px,0,pz); p.rotation.y=ry; g.add(p);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,10);
};

/* playground: tower + slide + swings + kids */
B.playground = (ctx, def) => {
  const g=new THREE.Group();
  const chips=new THREE.Mesh(new THREE.PlaneGeometry(14,10), lambert(0x8a6a48));
  chips.rotation.x=-Math.PI/2; chips.position.y=0.03; g.add(chips);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(3,0.3,3), lambert(0xe8912d));
  deck.position.set(-2,1.6,0); g.add(deck);
  [[-3.3,1.3],[-0.7,1.3],[-3.3,-1.3],[-0.7,-1.3]].forEach(([x,z])=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,1.7,4), lambert(0x2e86ab));
    post.position.set(x,0.85,z); g.add(post); });
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.4,1.4,4), lambert(0xe84855));
  roof.position.set(-2,2.9,0); roof.rotation.y=Math.PI/4; g.add(roof);
  const slide=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.2,1), lambert(0xffd166));
  slide.position.set(0.6,0.95,0.9); slide.rotation.z=-0.55; g.add(slide);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(4,0.16,0.16), lambert(0x2e86ab));
  bar.position.set(3.5,2.2,-2.6); g.add(bar);
  [2.4,4.6].forEach(x=>{
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,2.3,4), lambert(0x2e86ab));
    leg.position.set(x,1.15,-2.6); g.add(leg); });
  [2.9,4.1].forEach(x=>{
    const chain=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.4,0.06), lambert(0x1a1423));
    chain.position.set(x,1.5,-2.6); g.add(chain);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.1,0.3), lambert(0xe84855));
    seat.position.set(x,0.8,-2.6); g.add(seat);
  });
  for(let i=0;i<3;i++){
    const k=makePerson(ctx.rng,[0xffd166,0xe84855,0x5db3c9][i],'stand');
    k.scale.setScalar(0.65); k.position.set(-4+ctx.rng()*8,0,2+ctx.rng()*2);
    k.rotation.y=ctx.rng()*6; g.add(k);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,10);
};

/* kayakers — bob with the paddle boats */
B.kayaks = (ctx, def) => {
  for(let i=0;i<def.count;i++){
    const k=new THREE.Group();
    const hull=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.25,0.6),
      lambert([0xe8912d,0xe84855,0x5db3c9][i%3]));
    hull.position.y=0.15; k.add(hull);
    const p=makePerson(ctx.rng,0xf5e9d0,'sit'); p.scale.setScalar(0.8); p.position.y=0.2; k.add(p);
    const paddle=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,1.8), lambert(0xffd166));
    paddle.position.y=0.75; k.add(paddle);
    k.position.set(def.x+(ctx.rng()-0.5)*def.spread, 0, def.z+(ctx.rng()-0.5)*def.spread);
    k.rotation.y=ctx.rng()*6; k.userData.phase=ctx.rng()*6;
    ctx.scene.add(k); ctx.dynamic.boats.push(k);
  }
};

/* slackliner between two trees */
B.slackline = (ctx, def) => {
  const g=new THREE.Group();
  const trunkG=new THREE.CylinderGeometry(0.5,0.7,3.4,5);
  [-4,4].forEach(x=>{
    const t=new THREE.Group();
    const trunk=new THREE.Mesh(trunkG, lambert(0x6e4b2a)); trunk.position.y=1.7; t.add(trunk);
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(2.6,0), lambert(0x5d8f4a));
    puff.position.y=4.4; t.add(puff);
    t.position.x=x; g.add(t);
  });
  const line=new THREE.Mesh(new THREE.BoxGeometry(8,0.07,0.12), lambert(0xf5e9d0));
  line.position.y=1.15; g.add(line);
  const p=makePerson(ctx.rng,0xf25caf,'stand'); p.position.set(0.5,1.2,0); g.add(p);
  g.position.set(def.x,0,def.z); ctx.scene.add(g);
  ctx.solid(def.x-4,def.z,0.9); ctx.solid(def.x+4,def.z,0.9);
};

/* a pedestrian with archetype accessories — see PED_TYPES in world.js */
export function makePedestrian(rng, type){
  const g = makePerson(rng, type.shirt, 'stand', type.pale ? 0xe8e2da : undefined);
  if(type.tieDye){
    [0xff9a5c,0x5db3c9].forEach((c,i)=>{
      const s=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.14,0.3), lambert(c));
      s.position.set(0,0.76+i*0.19,0); g.add(s);
    });
  }
  if(type.hair){
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.55,0.2), lambert(0x6e4b2a));
    h.position.set(0,1.28,-0.2); g.add(h);
  }
  if(type.headband){
    const hb=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.07,0.4), lambert(0xe84855));
    hb.position.set(0,1.54,0); g.add(hb);
  }
  if(type.umbrella){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.7,4), lambert(0x1a1423));
    pole.position.set(0.32,1,0.1); g.add(pole);
    const top=new THREE.Mesh(new THREE.ConeGeometry(0.62,0.3,6), lambert(0x1a1423));
    top.position.set(0.32,1.95,0.1); g.add(top);
  }
  if(type.phone){
    const arm=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.42,0.09), lambert(type.shirt));
    arm.position.set(0.2,1.14,0.2); arm.rotation.x=-0.9; g.add(arm);
    const ph=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.17,0.03), lambert(0x1a1423));
    ph.position.set(0.2,1.32,0.42); g.add(ph);
  }
  return g;
}

/* low-poly dog for the walkers on the loop */
export function makeDog(rng){
  const g=new THREE.Group();
  const c=[0x8a6a48,0x1a1423,0xd9d2c5][Math.floor(rng()*3)];
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.32,0.28), lambert(c)); body.position.y=0.42; g.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.26,0.24), lambert(c)); head.position.set(0.45,0.62,0); g.add(head);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.08,0.08), lambert(c));
  tail.position.set(-0.42,0.55,0); tail.rotation.z=0.5; g.add(tail);
  [[0.25,0.1],[0.25,-0.1],[-0.25,0.1],[-0.25,-0.1]].forEach(([x,z])=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.28,0.09), lambert(c));
    leg.position.set(x,0.14,z); g.add(leg); });
  g.add(blobShadow(0.4, 0.2));
  return g;
}

/* drifting cumulus — clusters of flattened puffs, animated in world.js */
B.clouds = (ctx, def) => {
  for(let i=0;i<def.count;i++){
    const c = new THREE.Group();
    const puffs = 3+Math.floor(ctx.rng()*3);
    for(let j=0;j<puffs;j++){
      const s = 4+ctx.rng()*7;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(s,0), lambert(0xffffff));
      puff.scale.y=0.38;
      puff.position.set(j*s*1.1-(puffs*s*0.5), (ctx.rng()-0.5)*2, (ctx.rng()-0.5)*6);
      c.add(puff);
    }
    c.position.set((ctx.rng()-0.5)*def.spreadX,
      def.yMin+ctx.rng()*(def.yMax-def.yMin),
      (ctx.rng()-0.5)*def.spreadZ);
    ctx.scene.add(c); ctx.dynamic.clouds.push(c);
  }
};

/* Neighborhood sprawl: hundreds of simple houses + tree canopy + a street
   grid stretching to the fog line, so the horizon reads as "city" instead
   of empty lawn. Instanced (a few draw calls total), no colliders — it all
   lies beyond the playable bounds. */
/* a little low-poly car for neighborhood traffic (faces local +X) */
export function makeCar(rng){
  const colors=[0xe84855,0x2e86ab,0xf5e9d0,0xffd166,0x4a5a6a,0x9b6b53,0x1a1423,0xd98c5f];
  const c=colors[Math.floor(rng()*colors.length)];
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.9,0.5,0.9), lambert(c)); body.position.y=0.45; g.add(body);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.45,0.82), lambert(c)); cabin.position.set(-0.1,0.85,0); g.add(cabin);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.32,0.84), lambert(0x2a3a44)); glass.position.set(-0.1,0.87,0); g.add(glass);
  const wgeo=new THREE.CylinderGeometry(0.22,0.22,0.16,6);
  [[0.6,0.46],[0.6,-0.46],[-0.6,0.46],[-0.6,-0.46]].forEach(([x,z])=>{
    const w=new THREE.Mesh(wgeo, lambert(0x1a1423)); w.rotation.x=Math.PI/2; w.position.set(x,0.22,z); g.add(w);
  });
  g.add(blobShadow(0.95,0.22));
  return g;
}

B.sprawl = (ctx, def) => {
  const streetsX=def.streetsX||[], streetsZ=def.streetsZ||[], crossZ=def.crossZ||[];
  for(const sx of streetsX)
    buildRibbon(ctx, {points:[[sx,0,def.zMin],[sx,0,def.zMax]], width:5, closed:false}, asphaltTex, 0.010);
  for(const sz of streetsZ)
    buildRibbon(ctx, {points:[[def.xMin,0,sz],[def.xMax,0,sz]], width:5, closed:false}, asphaltTex, 0.010);
  for(const cz of crossZ){   // east/west cross streets that skip over the park
    buildRibbon(ctx, {points:[[def.xMin,0,cz],[-def.clearX,0,cz]], width:5, closed:false}, asphaltTex, 0.010);
    buildRibbon(ctx, {points:[[def.clearX,0,cz],[def.xMax,0,cz]], width:5, closed:false}, asphaltTex, 0.010);
  }

  const nearStreet = (x,z) =>
    streetsX.some(sx=>Math.abs(x-sx)<6) ||
    streetsZ.some(sz=>Math.abs(z-sz)<6) ||
    (Math.abs(x)>=def.clearX && crossZ.some(cz=>Math.abs(z-cz)<6));
  const inClearing = (x,z) => Math.abs(x)<def.clearX && Math.abs(z)<def.clearZ;

  const bricks=[0xb85c48,0xd98c5f,0xe0b487,0xa66a4f,0xc9a06a,0x9b6b53,0xd8d2c5];
  const roofsC=[0x5a4a3a,0x4a3c38,0x3f4a55];
  const greens=[0x4c7a3d,0x5d8f4a,0x6ba05a];
  const dummy=new THREE.Object3D(), col=new THREE.Color();
  const MAXH=2400, MAXT=900;

  const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshLambertMaterial({flatShading:true}), MAXH);
  const roofs=new THREE.InstancedMesh(new THREE.ConeGeometry(0.74,1,4),
    new THREE.MeshLambertMaterial({flatShading:true}), MAXH);
  const canopy=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
    new THREE.MeshLambertMaterial({flatShading:true}), MAXT);

  let hi=0, ti=0;
  for(let gx=def.xMin; gx<=def.xMax; gx+=def.gridX){
    for(let gz=def.zMin; gz<=def.zMax; gz+=def.gridZ){
      const x=gx+(ctx.rng()-0.5)*6, z=gz+(ctx.rng()-0.5)*7;
      if(inClearing(x,z) || nearStreet(x,z)) continue;
      const r=ctx.rng();
      if(r<0.10){                                   // occasional vacant lot → tree
        if(ti<MAXT){
          const s=2.2+ctx.rng()*1.6;
          dummy.position.set(x,3.2,z); dummy.scale.setScalar(s);
          dummy.rotation.set(0,ctx.rng()*6,0); dummy.updateMatrix();
          canopy.setMatrixAt(ti,dummy.matrix);
          canopy.setColorAt(ti,col.setHex(greens[ti%3])); ti++;
        }
        continue;
      }
      if(hi>=MAXH) continue;
      const midrise = r>0.95;
      const w=6.5+ctx.rng()*4, h=midrise?10+ctx.rng()*8:3.5+ctx.rng()*3, d=6.5+ctx.rng()*3;
      dummy.position.set(x,h/2,z); dummy.scale.set(w,h,d);
      dummy.rotation.set(0,0,0); dummy.updateMatrix();
      bodies.setMatrixAt(hi,dummy.matrix);
      bodies.setColorAt(hi,col.setHex(midrise?0xb8b0a4:bricks[hi%bricks.length]));
      if(!midrise){
        dummy.position.set(x,h+1.1,z); dummy.scale.set(Math.max(w,d),2.2,Math.max(w,d));
        dummy.rotation.set(0,Math.PI/4,0); dummy.updateMatrix();
        roofs.setMatrixAt(hi,dummy.matrix);
        roofs.setColorAt(hi,col.setHex(roofsC[hi%3]));
      } else {
        dummy.position.set(x,-5,z); dummy.scale.setScalar(0.001); dummy.updateMatrix();
        roofs.setMatrixAt(hi,dummy.matrix);   // hide roof slot under ground
      }
      hi++;
    }
  }
  bodies.count=hi; roofs.count=hi; canopy.count=ti;
  [bodies,roofs,canopy].forEach(m=>{ m.frustumCulled=false; ctx.scene.add(m); });

  /* traffic: two-way cars on the through-streets (drive on the right) */
  const carsPer = def.carsPerStreet||2;
  for(const sx of streetsX){
    for(let k=0;k<carsPer;k++){
      const dir = k%2 ? 1 : -1;
      const m = makeCar(ctx.rng); m.rotation.y = dir>0 ? -Math.PI/2 : Math.PI/2;
      ctx.scene.add(m);
      ctx.dynamic.cars.push({ m, axis:'z', fixed:sx+(dir>0?1.4:-1.4),
        pos:def.zMin+ctx.rng()*(def.zMax-def.zMin), dir, speed:9+ctx.rng()*8,
        min:def.zMin, max:def.zMax });
    }
  }
  for(const sz of streetsZ){
    for(let k=0;k<carsPer;k++){
      const dir = k%2 ? 1 : -1;
      const m = makeCar(ctx.rng); m.rotation.y = dir>0 ? 0 : Math.PI;
      ctx.scene.add(m);
      ctx.dynamic.cars.push({ m, axis:'x', fixed:sz+(dir>0?1.4:-1.4),
        pos:def.xMin+ctx.rng()*(def.xMax-def.xMin), dir, speed:9+ctx.rng()*8,
        min:def.xMin, max:def.xMax });
    }
  }
};

B.skylineDenver = (ctx, def) => {
  const z0 = def.z;
  const tones=[0x9b8ec4,0x8c7fb5,0xa99cd1,0x7d70a6];
  for(let i=0;i<16;i++){
    const w2=9+ctx.rng()*11, h=24+ctx.rng()*50, d=9+ctx.rng()*11;
    const b=new THREE.Mesh(new THREE.BoxGeometry(w2,h,d), lambert(tones[i%4]));
    b.position.set(-70+ctx.rng()*140, h/2, z0-ctx.rng()*70);
    ctx.scene.add(b);
  }
  // the Cash Register Building
  const cr = new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(18,58,11), lambert(0xd98c5f)); base.position.y=29; cr.add(base);
  const s1=new THREE.Mesh(new THREE.BoxGeometry(18,7,8), lambert(0xd98c5f)); s1.position.set(0,61.5,-1.5); cr.add(s1);
  const s2=new THREE.Mesh(new THREE.BoxGeometry(18,5.5,4.5), lambert(0xd98c5f)); s2.position.set(0,67.5,-3.2); cr.add(s2);
  cr.position.set(25,0,z0-20); ctx.scene.add(cr);
  // the Capitol dome
  const dome = new THREE.Group();
  const b2=new THREE.Mesh(new THREE.BoxGeometry(20,16,14), lambert(0xd8d2c5)); b2.position.y=8; dome.add(b2);
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(5,5,9,8), lambert(0xd8d2c5)); drum.position.y=20.5; dome.add(drum);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(5.4,8,6), lambert(0xffd166)); cap.position.y=27; cap.scale.y=1.15; dome.add(cap);
  dome.position.set(-55,0,z0+20); ctx.scene.add(dome);
};

/* The Front Range, in three depth layers with atmospheric color:
   sage foothills up close, the main purple range with a snowline, a hazy
   far ridge behind — and one giant snow-capped Mount Blue Sky massif. */
B.mountains = (ctx, def) => {
  const peak = (x, z, w, h, color, segs) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, segs||4), lambert(color));
    m.position.set(x, h/2-6, z);
    m.rotation.y = ctx.rng()*Math.PI;
    m.scale.z = 0.8 + ctx.rng()*0.35;          // varied but not chaotic silhouettes
    ctx.scene.add(m);
    return m;
  };
  const snowcap = (m, w, h, big) => {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(w*(big?0.45:0.32), h*(big?0.4:0.28),
      m.geometry.parameters.radialSegments), lambert(0xf5f0e6));
    cap.position.copy(m.position);
    cap.position.y = h*(big?0.78:0.85)-6;
    cap.rotation.y = m.rotation.y; cap.scale.z = m.scale.z;
    ctx.scene.add(cap);
  };

  /* far ridge — tall, hazy, near the fog line (atmospheric backdrop) */
  for(let i=0;i<9;i++){
    const h=90+ctx.rng()*60, w=85+ctx.rng()*60;
    const m=peak(def.x-70-ctx.rng()*40, def.z-40+i*86+ctx.rng()*24, w, h, 0x9188b8, 4);
    if(h>115) snowcap(m, w, h, false);
  }
  /* main range — the classic purple wall with a snowline */
  for(let i=0;i<11;i++){
    const h=62+ctx.rng()*68, w=60+ctx.rng()*55;
    const m=peak(def.x-ctx.rng()*50, def.z-20+i*68+ctx.rng()*20, w, h,
      i%3 ? 0x6f5b8f : 0x655082, 4+(i%2));
    if(h>85) snowcap(m, w, h, false);
    if(ctx.rng()<0.25){                        // occasional shoulder fused to the ridge
      peak(m.position.x+(ctx.rng()-0.5)*24, m.position.z+34+ctx.rng()*12, w*0.7, h*0.6,
        0x6f5b8f, 4);
    }
  }
  /* Mount Blue Sky — the giant snowy massif Denver actually sees WSW */
  const big = peak(def.x-60, def.z+330, 130, 165, 0x60508a, 5);
  snowcap(big, 130, 165, true);
  const shoulder = peak(def.x-30, def.z+390, 90, 110, 0x6f5b8f, 4);
  snowcap(shoulder, 90, 110, false);
  /* sage foothills rolling in front of it all — sized/placed so their
     bases stop where the neighborhood grid ends (no houses in the hills) */
  for(let i=0;i<15;i++){
    const h=18+ctx.rng()*24, w=42+ctx.rng()*18;
    const m=peak(def.x+55+ctx.rng()*25, def.z-30+i*52+ctx.rng()*26, w, h,
      i%2 ? 0x74705a : 0x6b6a4c, 5);
    m.scale.y = 0.85;                          // rounded, rolling
  }
};

B.trees = (ctx, def) => {
  const greens=[0x4c7a3d,0x5d8f4a,0x6ba05a,0x87a94a];
  let placed=0, guard=0;
  while(placed<def.count && guard++<1600){
    const inPark = ctx.rng()<0.72;
    const p = inPark
      ? new THREE.Vector3((ctx.rng()-0.5)*def.parkX, 0, (ctx.rng()-0.5)*def.parkZ)
      : new THREE.Vector3((ctx.rng()-0.5)*def.outerX, 0, (ctx.rng()-0.5)*def.outerZ);
    if(!ctx.clearOfRoad(p, 7.5) || !ctx.clearOfExclusions(p, 2)) continue;
    // keep trees off the street bands
    if((def.avoidX||[]).some(([a,b]) => Math.abs(p.x)>=a && Math.abs(p.x)<=b)) continue;
    if((def.avoidZ||[]).some(([a,b]) => p.z>=a && p.z<=b)) continue;
    // species mix: rounds, pines, cottonwoods, aspen clumps
    const roll = ctx.rng();
    const t = roll<0.20 ? pineTree(ctx.rng)
            : roll<0.35 ? cottonwood(ctx.rng, greens[placed%4])
            : roll<0.45 ? aspenClump(ctx.rng)
            : roundTree(ctx.rng, greens[placed%4]);
    t.position.copy(p); t.rotation.y=ctx.rng()*6; ctx.scene.add(t);
    ctx.solid(p.x, p.z, 1.0);
    placed++;
  }
};

export const PROP_BUILDERS = B;
