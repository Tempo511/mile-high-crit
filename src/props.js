/* Prop library: builders for everything a track can place in the world.
   Track data files reference these by `type`. Each builder receives:
     ctx — { scene, rng, solid(x,z,r), exclude(x,z,r), clearOfRoad(p,margin),
             clearOfExclusions(p,margin), dynamic } // dynamic: animated things (boats…)
     def — the prop entry from the track file.
   Placement randomness uses ctx.rng (seeded) so colliders match across clients. */
import * as THREE from 'three';
import { lambert, pixTex, blobShadow, bannerTex, waterTex, sandTex, asphaltTex, grassTex } from './gfx.js';

const B = {};

B.water = (ctx, def) => {
  let m;
  if(def.points){
    /* true shoreline polygon: [east, north] pairs in game units around center */
    const sh=new THREE.Shape();
    def.points.forEach(([px,py],i)=> i? sh.lineTo(px,py) : sh.moveTo(px,py));
    const geo=new THREE.ShapeGeometry(sh);
    geo.computeBoundingBox();
    const bb=geo.boundingBox, sx=bb.max.x-bb.min.x, sy=bb.max.y-bb.min.y;
    const uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)
      uv.setXY(i,(uv.getX(i)-bb.min.x)/sx,(uv.getY(i)-bb.min.y)/sy);
    m=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({map:waterTex}));
    m.rotation.x = -Math.PI/2;
  } else {
    m = new THREE.Mesh(new THREE.CircleGeometry(def.r, def.seg || 16),
      new THREE.MeshLambertMaterial({map: waterTex}));
    m.rotation.x = -Math.PI/2;
    if(def.scale) m.scale.set(def.scale[0], def.scale[1], 1);
  }
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
    if(!ctx.clearOfRoad(p, def.margin||7) || !ctx.clearOfExclusions(p, 2)
       || !ctx.clearOfStreets(p, 1.5)) continue;
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
  /* a real hip roof: rectangular eave, ridge line along the length */
  const roofGeo=new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -15,0,-5.6,   15,0,-5.6,   15,0,5.6,   -15,0,5.6,   // eave corners
     -9,3.2,0,     9,3.2,0                              // ridge ends
  ],3));
  roofGeo.setIndex([0,1,5, 0,5,4,  2,3,4, 2,4,5,  3,0,4,  1,2,5]);
  roofGeo.computeVertexNormals();
  const roof=new THREE.Mesh(roofGeo, lambert(0x8a8275,{side:THREE.DoubleSide}));
  roof.position.y=8.1; g.add(roof);

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

  // MILE HIGH CRIT championship banner strung across the veranda front
  // (the in-world event branding — the game itself is DENVER DASH)
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

/* shared flower planting: stem + leaf clump + blossom per spot.
   spots: [{x, z, hex, tulip?, y?}] in the parent group's local space */
function plantFlowers(ctx, g, spots){
  const n=spots.length; if(!n) return;
  const stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03,0.05,1,4),
    new THREE.MeshLambertMaterial({color:0x3f7a33}), n);
  const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15,0),
    new THREE.MeshLambertMaterial({color:0x2e5f28}), n);
  const puffs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.24,0),
    new THREE.MeshLambertMaterial({color:0xffffff}), n);
  const tulips=new THREE.InstancedMesh(new THREE.ConeGeometry(0.16,0.34,6),
    new THREE.MeshLambertMaterial({color:0xffffff}), n);
  const dummy=new THREE.Object3D(); const col=new THREE.Color();
  let pi=0, ti=0;
  spots.forEach((sp,i)=>{
    const y0=sp.y||0, h=0.38+ctx.rng()*0.3;
    dummy.rotation.set(0,0,0);
    dummy.position.set(sp.x,y0+h/2,sp.z); dummy.scale.set(1,h,1);
    dummy.updateMatrix(); stems.setMatrixAt(i,dummy.matrix);
    dummy.position.set(sp.x+(ctx.rng()-0.5)*0.12, y0+0.1, sp.z+(ctx.rng()-0.5)*0.12);
    dummy.scale.setScalar(0.8+ctx.rng()*0.5);
    dummy.updateMatrix(); leaves.setMatrixAt(i,dummy.matrix);
    col.setHex(sp.hex);
    if(sp.tulip){
      dummy.position.set(sp.x,y0+h+0.12,sp.z); dummy.scale.setScalar(0.9+ctx.rng()*0.3);
      dummy.updateMatrix(); tulips.setMatrixAt(ti,dummy.matrix);
      tulips.setColorAt(ti,col); ti++;
    } else {
      const bs=0.85+ctx.rng()*0.4;
      dummy.position.set(sp.x,y0+h+0.08,sp.z); dummy.scale.set(bs,bs*0.75,bs);
      dummy.updateMatrix(); puffs.setMatrixAt(pi,dummy.matrix);
      puffs.setColorAt(pi,col); pi++;
    }
  });
  puffs.count=pi; tulips.count=ti;
  [stems,leaves,puffs,tulips].forEach(m=>{ m.frustumCulled=false; g.add(m); });
}

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
  const spots=[];
  const bw=def.w/2-2, bd=def.d/2-2;
  for(let sx=-1;sx<=1;sx+=2)for(let sz=-1;sz<=1;sz+=2){
    const cx=sx*(def.w/4), cz=sz*(def.d/4);
    [[bw,0,bd/2],[bw,0,-bd/2]].forEach(([w,ox,oz])=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(w,0.5,0.4), hedgeM); h.position.set(cx+ox,0.28,cz+oz); g.add(h); });
    [[bd,bw/2,0],[bd,-bw/2,0]].forEach(([d,ox,oz])=>{
      const h=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,d), hedgeM); h.position.set(cx+ox,0.28,cz+oz); g.add(h); });
    for(let i=0;i<Math.floor(bw*bd/2.5);i++)
      spots.push({ x:cx+(ctx.rng()-0.5)*(bw-1), z:cz+(ctx.rng()-0.5)*(bd-1),
                   hex:cols[(sx+sz+i+2)%4], tulip:sx*sz>0 });
  }
  plantFlowers(ctx, g, spots);
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
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(def.w,def.d), lambert(0x4e3b28));
  soil.rotation.x=-Math.PI/2; soil.position.y=0.03; g.add(soil);
  const edgeM=lambert(0x8d8578);                    // low stone edging
  [[def.w+0.3,0.3,0,-def.d/2],[def.w+0.3,0.3,0,def.d/2],
   [0.3,def.d+0.3,-def.w/2,0],[0.3,def.d+0.3,def.w/2,0]].forEach(([bw,bd,ex,ez])=>{
    const e=new THREE.Mesh(new THREE.BoxGeometry(bw,0.22,bd), edgeM);
    e.position.set(ex,0.11,ez); g.add(e);
  });
  /* real plants: stem + leaf clump + blossom, planted in color drifts */
  const cols=[0xe84855,0xffd166,0xf25caf,0xf5e9d0,0xff9a5c];
  const spots=[];
  for(let i=0;i<Math.floor(def.w*def.d/1.4);i++){
    const fx=(ctx.rng()-0.5)*def.w*0.86, fz=(ctx.rng()-0.5)*def.d*0.86;
    const band=Math.min(4,Math.max(0,Math.floor(((fx/def.w)+0.5)*5)));
    spots.push({ x:fx, z:fz, hex:cols[band], tulip:band%2===1 });
  }
  plantFlowers(ctx, g, spots);
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
  /* net across the center line */
  const net=new THREE.Mesh(new THREE.PlaneGeometry(9,0.75),
    new THREE.MeshLambertMaterial({color:0x1e2b26, transparent:true, opacity:0.75,
      side:THREE.DoubleSide}));
  net.rotation.y=Math.PI/2; net.position.set(0,0.42,0); g.add(net);
  const tape=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.08,9), lambert(0xf5f0e6));
  tape.position.set(0,0.82,0); g.add(tape);
  [-4.7,4.7].forEach(pz=>{
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,1.0,5), lambert(0x2b2b33));
    p.position.set(0,0.5,pz); g.add(p);
  });
  /* a rally on most courts */
  if(def.players!==false && ctx.rng()<0.75){
    const shirts=[0xf5e9d0,0x2e86ab,0xe84855,0xffd166];
    [[-5.5,(ctx.rng()-0.5)*5, Math.PI/2],[5.5,(ctx.rng()-0.5)*5,-Math.PI/2]].forEach(([px,pz,ry])=>{
      const p=makePerson(ctx.rng, shirts[Math.floor(ctx.rng()*4)], 'stand');
      p.position.set(px,0,pz); p.rotation.y=ry; g.add(p);
      const rq=new THREE.Group();                    // racquet, ready position
      const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.45,5),
        lambert(0x4a3226));
      grip.position.y=0.22; rq.add(grip);
      const head=new THREE.Mesh(new THREE.TorusGeometry(0.19,0.035,6,12),
        lambert(0x2b2b33));
      head.position.y=0.62; rq.add(head);
      const strings=new THREE.Mesh(new THREE.CircleGeometry(0.17,10),
        new THREE.MeshLambertMaterial({color:0xe8e4d0, transparent:true,
          opacity:0.85, side:THREE.DoubleSide}));
      strings.position.y=0.62; rq.add(strings);
      rq.position.set(0.42,0.78,0.08); rq.rotation.z=-0.85; rq.rotation.y=0.3;
      p.add(rq);
      ctx.dynamic.fans.push({m:p, baseY:0, baseRot:ry, amp:0.12, phase:ctx.rng()*6});
    });
    const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(0.14,0),
      lambert(0xd7f25c, {emissive:0x3a4a10}));
    g.add(ball);
    ctx.dynamic.tballs.push({m:ball, phase:ctx.rng()*6});
  }
  g.position.set(def.x, 0, def.z); g.rotation.y=def.ry||0;
  ctx.scene.add(g); ctx.exclude(def.x,def.z,11);
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
  const spots=[];
  const hedgeM = lambert(0x3e6b35);
  // symmetric parterre: a grid of hedge-ringed beds with bloom rows inside
  const bw=(def.w-6)/2, bd=(def.d-9)/3;
  for(let bx=0;bx<2;bx++)for(let bz=0;bz<3;bz++){
    const cx=(bx-0.5)*(bw+2), cz=(bz-1)*(bd+2.4);
    const hedge = new THREE.Mesh(new THREE.BoxGeometry(bw,0.5,bd), hedgeM);
    hedge.position.set(cx,0.25,cz); g.add(hedge);
    for(let i=0;i<Math.floor(bw*bd/2);i++)
      spots.push({ x:cx+(ctx.rng()-0.5)*(bw-1), z:cz+(ctx.rng()-0.5)*(bd-1),
                   y:0.5, hex:cols[(bx+bz+i)%5], tulip:(bx+bz)%2===0 });
  }
  plantFlowers(ctx, g, spots);
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
    const p=ctx.pushOffStreets({x,z}, 7.5);   // whole lot clears cross streets
    g.position.set(p.x,0,p.z); g.rotation.y=ry; ctx.scene.add(g);
    ctx.solid(p.x,p.z,5.5);
  };
  /* decorative landscaping between the lots (no collision — off the course) */
  const greens=[0x4c7a3d,0x5d8f4a,0x6ba05a];
  const plantTree=(x,z,sc)=>{
    const roll=ctx.rng();
    const t = roll<0.25 ? pineTree(ctx.rng)
            : roll<0.42 ? aspenClump(ctx.rng)
            : roundTree(ctx.rng, greens[Math.floor(ctx.rng()*3)]);
    const p=ctx.pushOffStreets({x,z}, 1.6);   // yard trees stay in the grass
    t.position.set(p.x,0,p.z); t.rotation.y=ctx.rng()*6;
    if(sc) t.scale.setScalar(sc);
    ctx.scene.add(t);
  };
  const plantHedge=(x,z,n)=>{               // short run of bushes along z
    for(let i=0;i<n;i++){
      const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5+ctx.rng()*0.25,0), BUSH_M);
      bush.position.set(x+(ctx.rng()-0.5)*0.5, 0.45, z+(i-(n-1)/2)*1.15);
      if(ctx.clearOfStreets({x:bush.position.x, z:bush.position.z}, 0.6))
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
    const p=ctx.pushOffStreets({x,z}, 0.8);   // curbside, not mid-asphalt
    g.position.set(p.x,0,p.z); ctx.scene.add(g);
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

/* the Park Lane Towers — three identical 20-story condo towers (1971) in a
   staggered north-south line along Marion Parkway at the park's NW corner.
   Pale concrete, wraparound balconies on every floor = horizontal ribbing. */
B.parkLane = (ctx, def) => {
  const H=42, W=13, FLOORS=20, fh=H/FLOORS;
  const glassTex = pixTex(32,(g,px)=>{
    g.fillStyle='#3a4450'; g.fillRect(0,0,px,px);      // recessed glass + shadow
    for(let wx=1; wx<px-1; wx+=4){
      g.fillStyle = Math.random()<0.12 ? '#ffd166' : '#55636f';
      g.fillRect(wx,1,2,px-2);
    }
  }, 2, 2);
  const glass = new THREE.MeshLambertMaterial({map:glassTex});
  const slabM = lambert(0xe6ddc8);                     // pale balcony concrete
  const railM = lambert(0xcfc5ae);
  const tower = (x,z)=>{
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(W,H,W), glass);
    core.position.y=H/2; g.add(core);
    for(let i=1;i<=FLOORS;i++){                        // balcony slab each floor
      const slab = new THREE.Mesh(new THREE.BoxGeometry(W+2.2,0.32,W+2.2), slabM);
      slab.position.y=i*fh; g.add(slab);
      if(i<FLOORS){                                    // low balcony rail band
        const rail = new THREE.Mesh(new THREE.BoxGeometry(W+2.2,0.5,W+2.2), railM);
        rail.position.y=i*fh - fh + 0.6;
        rail.scale.set(0.999,1,0.999); g.add(rail);
      }
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(W+2.6,0.9,W+2.6), slabM);
    cap.position.y=H+0.45; g.add(cap);
    const ph = new THREE.Mesh(new THREE.BoxGeometry(W*0.42,1.8,W*0.34), lambert(0xb8ae98));
    ph.position.set(W*0.12,H+1.7,0); g.add(ph);
    const lobby = new THREE.Mesh(new THREE.BoxGeometry(W+4,3.2,W+4), lambert(0xd8cfba));
    lobby.position.y=1.6; g.add(lobby);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6,0.3,4), slabM);
    canopy.position.set(0,3.0,W/2+3.6); g.add(canopy);
    g.position.set(x,0,z); g.rotation.y=-Math.PI/2;   // entries face Marion Pkwy
    ctx.scene.add(g);
    ctx.solid(x,z,W/2+3.5);
    ctx.exclude(x,z,W/2+7);                            // keep sprawl + trees off
  };
  for(let i=0;i<3;i++)
    tower(def.x + i*(def.stagger||-8), def.z - i*(def.step||28));
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
  /* asphalt ribbons register their path so tree placers keep off them
     (covers authored streets AND the sprawl's grid) */
  if(tex===asphaltTex && ctx.street){
    const n=Math.max(2, Math.round(len/4));
    for(let i=0;i<=n;i++){
      const p=curve.getPointAt(i/n);
      ctx.street(p.x, p.z, def.width/2);
    }
  }
  return { curve, len };
}

/* gravel path; the main jogging loop (jog:true) is exposed for the joggers */
B.path = (ctx, def) => {
  const ribbon = buildRibbon(ctx, def, sandTex, 0.013);
  ribbon.jog = !!def.jog;
  ctx.dynamic.paths.push(ribbon);
};

/* streets (asphalt, no gameplay effect). Optional city life: cars:N puts
   two-way traffic on the ribbon, peds:N strolls the sidewalks. Both ride
   the jogger updater (curve + t + speed), so no new update code. */
B.street = (ctx, def) => {
  const ribbon = buildRibbon(ctx, def, asphaltTex, def.y||0.011);
  for(let k=0;k<(def.cars||0);k++){
    const wrap = new THREE.Group();
    const car = makeCar(ctx.rng);
    car.rotation.y = -Math.PI/2;                 // face +z, the traffic convention
    car.position.x = -(def.width||5)*0.26;       // keep to your lane
    wrap.add(car); ctx.scene.add(wrap);
    const t0 = ctx.rng();
    wrap.position.copy(ribbon.curve.getPointAt(t0));   // place NOW — the updater
    ctx.dynamic.strollers.push({ m:wrap, kind:'surrey', // only runs mid-race
      curve:ribbon.curve, len:ribbon.len, t:t0,
      speed:(8+ctx.rng()*6)*(k%2?1:-1), phase:0 });
  }
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9,0x4a5a6a];
  for(let k=0;k<(def.peds||0);k++){
    const wrap = new THREE.Group();
    const p = makePerson(ctx.rng, shirts[Math.floor(ctx.rng()*6)], 'stand');
    p.position.x = ((def.width||5)/2+1.4)*(k%2?1:-1);   // sidewalks both sides
    wrap.add(p); wrap.userData.legs = p.userData.legs;  // walk cycle
    ctx.scene.add(wrap);
    const pt0 = ctx.rng();
    wrap.position.copy(ribbon.curve.getPointAt(pt0));
    ctx.dynamic.strollers.push({ m:wrap, kind:'walker',
      curve:ribbon.curve, len:ribbon.len, t:pt0,
      speed:(1.2+ctx.rng()*0.8)*(k%2?1:-1), phase:ctx.rng()*6 });
  }
};

/* a loose sidewalk crowd that bobs like race fans (transit plazas, gates) */
B.crowd = (ctx, def) => {
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9,0x9b59b6];
  for(let i=0;i<def.count;i++){
    const p=makePerson(ctx.rng, shirts[i%6], ctx.rng()<0.4?'cheer':'stand');
    p.position.set(def.x+(ctx.rng()-0.5)*def.spread, 0, def.z+(ctx.rng()-0.5)*def.spread);
    p.rotation.y=ctx.rng()*6.28; ctx.scene.add(p);
    ctx.dynamic.fans.push({m:p, baseY:0, baseRot:p.rotation.y, phase:ctx.rng()*6.28, amp:0.12});
  }
};

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
      ctx.dynamic.fans.push({m:p, baseY:0, baseRot:p.rotation.y,
        phase:ctx.rng()*6.28, amp:0.05});
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
    ctx.dynamic.fans.push({m:p, baseY:0, baseRot:p.rotation.y,
      phase:i*1.7, amp:0.3});                        // ready-hops
  });
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), lambert(0xf5e9d0));
  ball.position.set(0.4,2.6,0.3); g.add(ball);
  ctx.dynamic.vballs.push({m:ball, phase:ctx.rng()*6.28});
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
    /* faceT aims the board up-track so riders read it on approach instead
       of catching it edge-on as they pass */
    const fp = def.faceT!==undefined ? ctx.trackPoint(def.faceT) : p;
    g.lookAt(fp.x,0,fp.z);
  } else {
    g.position.set(def.x,0,def.z);
    if(def.faceT!==undefined){ const p=ctx.trackPoint(def.faceT); g.lookAt(p.x,0,p.z); }
    else g.rotation.y = def.ry||0;
  }
  ctx.scene.add(g);
};

/* a green street-name blade on a pole for the park's edges (S DOWNING ST…) */
/* street name painted flat on the asphalt, like map lettering */
B.streetName = (ctx, def) => {
  const c=document.createElement('canvas'); c.width=256; c.height=64;
  const g=c.getContext('2d');
  g.font='bold 44px monospace'; g.textAlign='center'; g.textBaseline='middle';
  g.fillStyle='#ece7d2';                     // worn road-paint cream
  g.fillText(def.text, 128, 34, 248);
  const tex=new THREE.CanvasTexture(c);
  tex.magFilter=THREE.NearestFilter; tex.minFilter=THREE.LinearFilter;
  const w=def.len||16;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w, w/4),
    new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false}));
  m.rotation.set(-Math.PI/2, 0, def.ry||0);
  m.position.set(def.x, 0.03, def.z);
  ctx.scene.add(m);
};

/* a fisherman: bucket hat, rod angled over the water, line + bobber */
B.fisherman = (ctx, def) => {
  const g=new THREE.Group();
  const p=makePerson(ctx.rng, [0x5d7052,0x8a6a4a,0x4a5a6a][Math.floor(ctx.rng()*3)], 'stand');
  g.add(p);
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.4,0.18,8), lambert(0x7a6a4a));
  hat.position.y=1.56; g.add(hat);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.035,2.4,4), lambert(0x4a3226));
  rod.position.set(0.28,1.6,1.26); rod.rotation.x=1.0; g.add(rod);
  const line=new THREE.Mesh(new THREE.BoxGeometry(0.015,2.2,0.015), lambert(0xd8d8d8));
  line.position.set(0.28,1.14,2.27); g.add(line);
  const bobber=new THREE.Mesh(new THREE.IcosahedronGeometry(0.09,0), lambert(0xe84855));
  bobber.position.set(0.28,0.05,2.27); g.add(bobber);
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.16,0.32,8), lambert(0x8a8d92));
  bucket.position.set(-0.55,0.16,0.15); g.add(bucket);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,1.5);
};

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
  const N=Math.floor((def.w+def.d)*2);
  const spots=[];
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2;
    spots.push({ x:Math.cos(a)*(def.w/2+1.4)+(ctx.rng()-0.5)*0.8,
                 z:Math.sin(a)*(def.d/2+1.4)+(ctx.rng()-0.5)*0.8,
                 hex:cols[Math.floor(i/4)%6], tulip:Math.floor(i/8)%2===1 });
  }
  plantFlowers(ctx, g, spots);
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
    if(!ctx.clearOfRoad(p,6) || !ctx.clearOfExclusions(p,1.5)
       || !ctx.clearOfStreets(p,1.5)) continue;
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
  ctx.dynamic.slackers.push({m:p, phase:ctx.rng()*6.28});
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
  /* built nose-along +x, then turned so +z is forward like makePerson —
     the jogger updater copies the owner's rotation.y directly */
  const b=new THREE.Group(); b.rotation.y=-Math.PI/2; g.add(b);
  const c=[0x8a6a48,0x1a1423,0xd9d2c5][Math.floor(rng()*3)];
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.32,0.28), lambert(c)); body.position.y=0.42; b.add(body);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.26,0.24), lambert(c)); head.position.set(0.45,0.62,0); b.add(head);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.08,0.08), lambert(c));
  tail.position.set(-0.42,0.55,0); tail.rotation.z=0.5; b.add(tail);
  [[0.25,0.1],[0.25,-0.1],[-0.25,0.1],[-0.25,-0.1]].forEach(([x,z])=>{
    const leg=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.28,0.09), lambert(c));
    leg.position.set(x,0.14,z); b.add(leg); });
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
    new THREE.MeshLambertMaterial({}), MAXH);
  const roofs=new THREE.InstancedMesh(new THREE.ConeGeometry(0.74,1,4),
    new THREE.MeshLambertMaterial({}), MAXH);
  const canopy=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
    new THREE.MeshLambertMaterial({}), MAXT);

  let hi=0, ti=0;
  for(let gx=def.xMin; gx<=def.xMax; gx+=def.gridX){
    for(let gz=def.zMin; gz<=def.zMax; gz+=def.gridZ){
      const x=gx+(ctx.rng()-0.5)*6, z=gz+(ctx.rng()-0.5)*7;
      if(inClearing(x,z) || nearStreet(x,z)) continue;
      if(!ctx.clearOfRoad(new THREE.Vector3(x,0,z), 9)) continue;
      if(!ctx.clearOfExclusions(new THREE.Vector3(x,0,z), 2)) continue;
      if(!ctx.clearOfStreets(new THREE.Vector3(x,0,z), 4)) continue;
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

  /* far ridge — hazy, LOW AND WIDE: the range reads as a wall, not spikes
     (peaks 2.5-3x wider than tall, heavy overlap into a continuous ridge) */
  for(let i=0;i<9;i++){
    const h=55+ctx.rng()*35, w=170+ctx.rng()*70;
    const m=peak(def.x-70-ctx.rng()*40, def.z-40+i*86+ctx.rng()*24, w, h, 0x9188b8, 4);
    if(h>72) snowcap(m, w, h, false);
  }
  /* main range — the classic purple wall with a snowline */
  for(let i=0;i<11;i++){
    const h=45+ctx.rng()*45, w=140+ctx.rng()*70;
    const m=peak(def.x-ctx.rng()*50, def.z-20+i*68+ctx.rng()*20, w, h,
      i%3 ? 0x6f5b8f : 0x655082, 4+(i%2));
    if(h>62) snowcap(m, w, h, false);
    if(ctx.rng()<0.25){                        // occasional shoulder fused to the ridge
      peak(m.position.x+(ctx.rng()-0.5)*24, m.position.z+34+ctx.rng()*12, w*0.8, h*0.6,
        0x6f5b8f, 4);
    }
  }
  /* Mount Blue Sky — the giant snowy massif Denver actually sees WSW:
     a broad hump that rises above the wall, not a spire */
  const big = peak(def.x-60, def.z+330, 280, 110, 0x60508a, 5);
  snowcap(big, 280, 110, true);
  const shoulder = peak(def.x-30, def.z+390, 190, 75, 0x6f5b8f, 4);
  snowcap(shoulder, 190, 75, false);
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
    if(!ctx.clearOfRoad(p, 7.5) || !ctx.clearOfExclusions(p, 2)
       || !ctx.clearOfStreets(p, 1.5)) continue;
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

/* =====================================================================
   DOWNTOWN — the Union Station GP prop vocabulary
   ===================================================================== */

/* a green park patch on the urban concrete ground (Commons, Confluence) */
B.lawn = (ctx, def) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(def.r, def.seg||18),
    new THREE.MeshLambertMaterial({map:grassTex.clone()}));
  m.material.map.repeat.set(def.r/3, def.r/3); m.material.map.needsUpdate=true;
  m.rotation.x = -Math.PI/2;
  if(def.scale) m.scale.set(def.scale[0], def.scale[1], 1);
  m.position.set(def.x, 0.012, def.z);
  if(def.rot) m.rotation.z = def.rot;
  ctx.scene.add(m);
};

/* a river as a flat ribbon (the South Platte, Cherry Creek).
   kayaks:N floats paddlers downstream along the curve — they ride the
   stroller/jogger updater, and their paddle blades hitch a ride on the
   legs animation hook (alternating dips) */
B.river = (ctx, def) => {
  const ribbon = buildRibbon(ctx, {...def, closed:false}, waterTex, 0.018);
  for(const p of def.points) ctx.exclude(p[0], p[2], def.width*0.8);
  for(let k=0;k<(def.kayaks||0);k++){
    const wrap=new THREE.Group();
    const hullC=[0xe84855,0xffd166,0x2e86ab,0xff9a5c][k%4];
    const hull=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.32,2.8), lambert(hullC));
    hull.position.y=0.18; wrap.add(hull);
    [1.55,-1.55].forEach(zz=>{
      const tip=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.22,0.5), lambert(hullC));
      tip.position.set(0,0.16,zz); wrap.add(tip);
    });
    const p=makePerson(ctx.rng, [0xf5e9d0,0x5db3c9,0x9b59b6][k%3], 'sit');
    p.scale.setScalar(0.8); p.position.y=0.3; wrap.add(p);
    const shaft=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.07,0.07), lambert(0xd8d2c5));
    shaft.position.y=0.85; wrap.add(shaft);
    const blades=[];
    [-1.05,1.05].forEach(xx=>{
      const b=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.3,0.12), lambert(0xd8d2c5));
      b.position.set(xx,0.45,0.1); wrap.add(b); blades.push(b);
    });
    wrap.userData.legs = blades;               // alternating paddle dips
    const t0=ctx.rng();
    wrap.position.copy(ribbon.curve.getPointAt(t0));
    ctx.scene.add(wrap);
    ctx.dynamic.strollers.push({ m:wrap, kind:'surrey',   // no body-bob
      curve:ribbon.curve, len:ribbon.len, t:t0,
      speed:4.5+ctx.rng()*2, phase:ctx.rng()*6 });        // downstream only
  }
};

/* window-grid texture for downtown buildings */
function windowTex(base, win, lit, w, h){
  return pixTex(32,(g,px)=>{
    g.fillStyle=base; g.fillRect(0,0,px,px);
    for(let wy=3; wy<px-2; wy+=6)
      for(let wx=2; wx<px-2; wx+=5){
        g.fillStyle = Math.random()<0.10 ? lit : win;
        g.fillRect(wx,wy,3,3);
      }
  }, Math.max(1,Math.round(w/9)), Math.max(2,Math.round(h/9)));
}

/* a downtown tower: glass/tan/blue window-grid box, optional crest.
   crest:'register' = the Cash Register Building's stepped curved top. */
B.tower = (ctx, def) => {
  const styles = {
    glass:['#3a4f66','#9fc4d8','#ffd166'],
    tan:  ['#c9b8a8','#4a5a6a','#ffd166'],
    blue: ['#2e4a6b','#8fb8d8','#ffd166'],
    haze: ['#8c7fb5','#7d70a6','#a99cd1'],       // muted backdrop towers
  };
  const s = styles[def.style||'glass'];
  const w=def.w||14, d=def.d||14, h=def.h||30;
  const mat = new THREE.MeshLambertMaterial({map:windowTex(s[0],s[1],s[2],w,h)});
  const t = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  t.position.set(def.x,h/2,def.z); t.rotation.y=def.ry||0; ctx.scene.add(t);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w+0.5,0.8,d+0.5), lambert(0x6a6560));
  cap.position.set(def.x,h+0.4,def.z); cap.rotation.y=def.ry||0; ctx.scene.add(cap);
  if(def.crest==='register'){                    // stepped cash-register profile
    const c1=new THREE.Mesh(new THREE.BoxGeometry(w,h*0.12,d*0.7), lambert(0xd98c5f));
    c1.position.set(def.x,h+h*0.06,def.z-d*0.12); c1.rotation.y=def.ry||0; ctx.scene.add(c1);
    const c2=new THREE.Mesh(new THREE.BoxGeometry(w,h*0.09,d*0.4), lambert(0xd98c5f));
    c2.position.set(def.x,h+h*0.16,def.z-d*0.26); c2.rotation.y=def.ry||0; ctx.scene.add(c2);
  } else {
    const ph=new THREE.Mesh(new THREE.BoxGeometry(w*0.3,1.8,d*0.35), lambert(0x8a8275));
    ph.position.set(def.x+w*0.12,h+1.2,def.z); ctx.scene.add(ph);
  }
  ctx.solid(def.x,def.z,Math.max(w,d)/2+1.5);
  ctx.exclude(def.x,def.z,Math.max(w,d)/2+3);
};

/* Denver's icons, modeled to be named on sight. kind:
   'cashRegister' — Wells Fargo Center: dark red-brown slab, white banding,
                    the mailbox-curve crown (a real half-cylinder, not steps)
   'republic'     — Republic Plaza: the tallest, sheer pale granite
   'california'   — 1801 California: dark slab, stepped shoulders, big antenna
   'capitol'      — the State Capitol gold dome (distant vista)
   'riverNorth'   — One River North: glass box with the green canyon cut */
B.landmarkTower = (ctx, def) => {
  const g = new THREE.Group();
  const kind = def.kind;
  if(kind==='cashRegister'){
    const w=def.w||20, d=def.d||9, h=def.h||52;
    /* dark bronze-brown granite in a dense punched-window grid, a few lit */
    const tex = pixTex(32,(gg,px)=>{
      gg.fillStyle='#4a322c'; gg.fillRect(0,0,px,px);
      for(let y=1;y<px-1;y+=4)
        for(let x=1;x<px-1;x+=4){
          gg.fillStyle = Math.random()<0.12 ? '#ffd166' : '#241d20';
          gg.fillRect(x,y,2,2);
        }
    }, 2, Math.max(3,Math.round(h/12)));
    const m = new THREE.MeshLambertMaterial({map:tex});
    const crownM = lambert(0x3f2d28);
    /* the roof: TWO staggered quarter-round crowns, front taller than back,
       both rolling down toward the back — the real cash-register profile */
    const quarterCrown = (ds, boxH, zc, flip) => {
      const r = ds;
      const box=new THREE.Mesh(new THREE.BoxGeometry(w,boxH,ds), m);
      box.position.set(0,boxH/2,zc); g.add(box);
      const shape=new THREE.Shape();
      shape.moveTo(-ds/2,0);
      shape.lineTo(-ds/2,r);
      shape.absarc(-ds/2,0,r,Math.PI/2,0,true);
      shape.lineTo(-ds/2,0);
      const crown=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:w,bevelEnabled:false}), crownM);
      /* flip mirrors the profile so the curve falls the other way */
      crown.rotation.y = flip ? -Math.PI/2 : Math.PI/2;
      crown.position.set(flip ? w/2 : -w/2, boxH, zc); g.add(crown);
    };
    /* the two crowns mirror each other: rounded edges rolling apart */
    const d1=d*0.56, d2=d*0.44;
    quarterCrown(d1, h-d1,         (d-d1)/2, true);   // tall section, curve flipped
    quarterCrown(d2, h-d1*0.9-d2, -(d-d2)/2, false);  // staggered lower section
  }
  else if(kind==='republic'){
    const w=def.w||17, d=def.d||15, h=def.h||62;
    /* the signature: white granite covered edge-to-edge in a dense grid of
       tiny square punched windows, with a thin mechanical band break */
    const tex = pixTex(32,(gg,px)=>{
      gg.fillStyle='#e8e4d8'; gg.fillRect(0,0,px,px);
      gg.fillStyle='#3e4650';
      for(let y=1;y<px-1;y+=4)
        for(let x=1;x<px-1;x+=4)
          gg.fillRect(x,y,2,2);
      gg.fillStyle='#b8b4a8'; gg.fillRect(0,0,px,1);   // band every tile repeat
    }, 2, Math.max(3,Math.round(h/12)));
    const m = new THREE.MeshLambertMaterial({map:tex});
    const t=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); t.position.y=h/2; g.add(t);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(w+0.4,1,d+0.4), lambert(0xd8d4c8));
    cap.position.y=h+0.5; g.add(cap);
  }
  else if(kind==='california'){
    /* 1801 California (the Qwest building): warm oxide-red granite, dense
       punched square windows, chamfered corners, stepped tiers descending
       on one flank, flat top with thin broadcast masts (per photo ref) */
    const w=def.w||16, d=def.d||12, h=def.h||56, c=2.2;
    const tex = pixTex(32,(gg,px)=>{
      gg.fillStyle='#6e4038'; gg.fillRect(0,0,px,px);
      for(let y=1;y<px-1;y+=4)
        for(let x=1;x<px-1;x+=4){
          gg.fillStyle = Math.random()<0.10 ? '#ffd166' : '#241d20';
          gg.fillRect(x,y,2,2);
        }
    }, 2, Math.max(3,Math.round(h/11)));
    const m = new THREE.MeshLambertMaterial({map:tex});
    /* chamfered plan via crossed boxes — corners read as angled facets */
    const tA=new THREE.Mesh(new THREE.BoxGeometry(w,h,d-c*2), m);
    tA.position.y=h/2; g.add(tA);
    const tB=new THREE.Mesh(new THREE.BoxGeometry(w-c*2,h,d), m);
    tB.position.y=h/2; g.add(tB);
    /* the stepped annex tiers hugging the +x flank */
    [[0.66,3.2],[0.5,3.0],[0.36,2.8]].forEach(([f,tw],i)=>{
      const tier=new THREE.Mesh(new THREE.BoxGeometry(tw,h*f,d*0.86), m);
      tier.position.set(w/2 + tw/2 + i*tw, h*f/2, 0); g.add(tier);
    });
    const cap=new THREE.Mesh(new THREE.BoxGeometry(w-c,0.7,d-c), lambert(0x51322c));
    cap.position.y=h+0.35; g.add(cap);
    /* two thin broadcast masts */
    [[-w*0.24,h*0.24],[w*0.18,h*0.19]].forEach(([mx,mh])=>{
      const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.14,mh,5),
        lambert(0xc9c4b8));
      mast.position.set(mx,h+mh/2,0); g.add(mast);
    });
  }
  else if(kind==='capitol'){
    const s=def.s||1.6;   // distant, so oversized to survive the haze
    const base=new THREE.Mesh(new THREE.BoxGeometry(24*s,10*s,16*s), lambert(0xcfc8b4));
    base.position.y=5*s; g.add(base);
    const mid=new THREE.Mesh(new THREE.BoxGeometry(12*s,6*s,12*s), lambert(0xcfc8b4));
    mid.position.y=13*s; g.add(mid);
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(4.4*s,4.8*s,6*s,10), lambert(0xd8d2c5));
    drum.position.y=19*s; g.add(drum);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(4.6*s,10,8), lambert(0xf0b429));
    dome.scale.y=1.25; dome.position.y=24*s; g.add(dome);
    const fin=new THREE.Mesh(new THREE.SphereGeometry(0.9*s,6,5), lambert(0xffd166));
    fin.position.y=30.5*s; g.add(fin);
  }
  else if(kind==='riverNorth'){
    /* MAD's One River North: a mirror-glass box cracked open by a warm
       sand-colored canyon that winds down from the roof, then shears
       horizontally across the full width, splitting the building into
       two stacked glass volumes. Crack walls are stacked terrace cells. */
    const w=def.w||19, d=def.d||13, h=def.h||28;
    const glassTex = pixTex(32,(gg,px)=>{
      gg.fillStyle='#b8cfe0'; gg.fillRect(0,0,px,px);
      gg.fillStyle='#8aa8bc';                       // fine vertical mullions
      for(let x=0;x<px;x+=2) gg.fillRect(x,0,1,px);
      for(let y=1;y<px;y+=5)                        // floor lines + random cells
        for(let x=0;x<px;x+=4){
          const r=Math.random();
          gg.fillStyle = r<0.08 ? '#ffe9b0' : r<0.3 ? '#5a7286' : '#a9c4d6';
          gg.fillRect(x,y,3,3);
        }
    }, Math.max(2,Math.round(w/6)), Math.max(3,Math.round(h/8)));
    const glass = new THREE.MeshLambertMaterial({map:glassTex});
    /* canyon-wall texture: cave-like terrace cells in warm sand */
    const sandTexORN = pixTex(32,(gg,px)=>{
      gg.fillStyle='#d9a86a'; gg.fillRect(0,0,px,px);
      for(let y=2;y<px-3;y+=7)
        for(let x=2;x<px-4;x+=8){
          gg.fillStyle='#6a4a30';
          gg.beginPath();
          gg.ellipse(x+3,y+2.5,3,2.4,0,0,Math.PI*2); gg.fill();
          if(Math.random()<0.4){ gg.fillStyle='#5d8f4a'; gg.fillRect(x+1,y+4,2,1.6); }
        }
    }, 2, 1);
    const sand = new THREE.MeshLambertMaterial({map:sandTexORN});
    const sandPlain = lambert(0xd9a86a);
    /* two stacked glass volumes with the shear between */
    const lowH=h*0.30, upY=h*0.365;
    const lower=new THREE.Mesh(new THREE.BoxGeometry(w,lowH,d), glass);
    lower.position.set(-0.5,lowH/2,0.2); g.add(lower);
    const upper=new THREE.Mesh(new THREE.BoxGeometry(w,h-upY,d), glass);
    upper.position.set(0.5,upY+(h-upY)/2,-0.2); g.add(upper);
    /* the horizontal canyon shelf, full width */
    const shelf=new THREE.Mesh(new THREE.BoxGeometry(w+0.7,h*0.065,d+0.7), sand);
    shelf.position.y=h*0.33; g.add(shelf);
    /* the winding vertical crack up the front of the upper volume */
    const segs=[
      [-2.2, 0.93, 3.2,  0.14],
      [ 0.8, 0.78, 3.6, -0.18],
      [-1.2, 0.62, 4.2,  0.16],
      [ 1.6, 0.46, 5.0, -0.12],
    ];
    for(const [sx,sy,sw,rot] of segs){
      const seg=new THREE.Mesh(new THREE.BoxGeometry(sw,h*0.17,1.1), sand);
      seg.position.set(sx, h*sy, d/2-0.15); seg.rotation.z=rot; g.add(seg);
    }
    /* the crack notches through the roofline */
    const notch=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.6,2), sandPlain);
    notch.position.set(-2.2,h+0.4,d/2-0.8); g.add(notch);
    /* greenery tufts in the canyon + rooftop garden */
    const tufts=[[-2.2,0.9],[0.8,0.74],[-1.2,0.58],[1.6,0.42],[3.5,0.335],[-4,0.335]];
    for(const [tx,ty] of tufts){
      const tuft=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55,0), lambert(0x5d8f4a));
      tuft.position.set(tx, h*ty+1.2, d/2+0.35); g.add(tuft);
    }
    for(let i=0;i<4;i++){
      const rt=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,0), lambert(0x6ba05a));
      rt.position.set(-w/2+3+i*4, h+0.7, -d*0.2); g.add(rt);
    }
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  const r=(Math.max(def.w||20,def.d||16)/2)+2;
  ctx.solid(def.x,def.z,r); ctx.exclude(def.x,def.z,r+3);
};

/* Sakura Square: Denver's Japanese block — torii gate, Buddhist temple
   with tiered hip roofs, stone lanterns, cherry blossoms, and the Tamai
   Tower concrete grid behind. Front (gate) faces local +z. */
B.sakuraSquare = (ctx, def) => {
  const g = new THREE.Group();
  /* paver plaza */
  const plaza=new THREE.Mesh(new THREE.PlaneGeometry(17,15), lambert(0x9a5245));
  plaza.rotation.x=-Math.PI/2; plaza.position.y=0.015; g.add(plaza);
  /* fallen blossom drifts on the red pavers */
  [[2,3.5],[-1,0.5],[5,-2]].forEach(([px,pz])=>{
    const pet=new THREE.Mesh(new THREE.CircleGeometry(1.1,8), lambert(0xf2c4d4));
    pet.rotation.x=-Math.PI/2; pet.position.set(px,0.03,pz); g.add(pet);
  });
  /* torii gate + SAKURA SQUARE board */
  const red=lambert(0xa83232);
  [-3.4,3.4].forEach(px=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.36,5.4,6), red);
    post.position.set(px,2.7,6.6); g.add(post);
  });
  const beam=new THREE.Mesh(new THREE.BoxGeometry(9.4,0.55,0.8), red);
  beam.position.set(0,5.6,6.6); g.add(beam);
  const beam2=new THREE.Mesh(new THREE.BoxGeometry(7.6,0.4,0.6), red);
  beam2.position.set(0,4.6,6.6); g.add(beam2);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(6.4,1),
    new THREE.MeshLambertMaterial({map:bannerTex('SAKURA SQUARE','#a83232','#f5e9d0'),
      side:THREE.DoubleSide}));
  board.position.set(0,5.15,6.7); g.add(board);
  /* the temple: cream hall, two tiers of dark hip roof with deep eaves */
  const cream=lambert(0xe8e0cc), roofC=lambert(0x4a3c33);
  const hall=new THREE.Mesh(new THREE.BoxGeometry(8,3.6,6.4), cream);
  hall.position.set(-4.5,1.8,-3); g.add(hall);
  const roof1=new THREE.Mesh(new THREE.ConeGeometry(6.6,2.2,4), roofC);
  roof1.rotation.y=Math.PI/4; roof1.scale.z=0.8;
  roof1.position.set(-4.5,4.6,-3); g.add(roof1);
  const upper=new THREE.Mesh(new THREE.BoxGeometry(4.6,1.8,3.8), cream);
  upper.position.set(-4.5,6.2,-3); g.add(upper);
  const roof2=new THREE.Mesh(new THREE.ConeGeometry(4.2,1.8,4), roofC);
  roof2.rotation.y=Math.PI/4; roof2.scale.z=0.8;
  roof2.position.set(-4.5,7.9,-3); g.add(roof2);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.4,2,0.12), lambert(0x3a2a20));
  door.position.set(-4.5,1.1,0.28); g.add(door);
  /* cherry blossoms + stone lanterns */
  [[1.5,1.5],[4.8,-1],[1,-5.5],[6,3.8]].forEach(([tx,tz],i)=>{
    const t=roundTree(ctx.rng, i%2 ? 0xf2a5c0 : 0xe8b8cc);
    t.position.set(tx,0,tz); g.add(t);
  });
  [[-1.8,4.2],[2.2,4.2],[-4.5,2.2]].forEach(([lx,lz])=>{
    const lp=new THREE.Mesh(new THREE.BoxGeometry(0.3,1.3,0.3), lambert(0x8a8275));
    lp.position.set(lx,0.65,lz); g.add(lp);
    const lb=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.55,0.6),
      lambert(0xffe9b0,{emissive:0x776622}));
    lb.position.set(lx,1.55,lz); g.add(lb);
    const lc=new THREE.Mesh(new THREE.ConeGeometry(0.55,0.4,4), lambert(0x6e6a60));
    lc.rotation.y=Math.PI/4; lc.position.set(lx,2.0,lz); g.add(lc);
  });
  /* the red five-petal sakura medallion, big on Tamai's face */
  const logoC=document.createElement('canvas'); logoC.width=logoC.height=256;
  const lg=logoC.getContext('2d');
  for(let i=0;i<5;i++){
    const a2=i/5*Math.PI*2 - Math.PI/2;
    lg.fillStyle='#c73232';
    lg.beginPath();
    lg.ellipse(128+Math.cos(a2)*52, 128+Math.sin(a2)*52, 46, 46, 0, 0, Math.PI*2);
    lg.fill();
  }
  lg.fillStyle='#f5e9d0';
  for(let i=0;i<5;i++){
    const a2=i/5*Math.PI*2 - Math.PI/2;
    lg.beginPath();
    lg.arc(128+Math.cos(a2)*30, 128+Math.sin(a2)*30, 7, 0, Math.PI*2); lg.fill();
  }
  const logoT=new THREE.CanvasTexture(logoC);
  logoT.magFilter=THREE.LinearFilter; logoT.minFilter=THREE.LinearMipmapLinearFilter;
  const logo=new THREE.Mesh(new THREE.PlaneGeometry(4.6,4.6),
    new THREE.MeshBasicMaterial({map:logoT, transparent:true, side:THREE.DoubleSide}));
  logo.position.set(5.5,9,0.62); g.add(logo);
  /* the memorial: bronze figure on stone, gravel bed, clipped bushes */
  const stone=lambert(0xd8d2c5), bronze=lambert(0x5a4130);
  const bed=new THREE.Mesh(new THREE.CircleGeometry(2.6,10), new THREE.MeshLambertMaterial({map:sandTex}));
  bed.rotation.x=-Math.PI/2; bed.position.set(-1.2,0.025,-1.5); g.add(bed);
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.7,2.4,0.35), stone);
  back.position.set(-1.8,1.2,-2.1); g.add(back);
  const ped=new THREE.Mesh(new THREE.BoxGeometry(1,0.5,1), stone);
  ped.position.set(-1,0.25,-1.2); g.add(ped);
  const fig=new THREE.Mesh(new THREE.BoxGeometry(0.55,1.3,0.4), bronze);
  fig.position.set(-1,1.15,-1.2); g.add(fig);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,5), bronze);
  head.position.set(-1,1.95,-1.2); g.add(head);
  [[0.6,-2.6],[-3.2,0.2]].forEach(([bx,bz])=>{
    const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(0.85,0), lambert(0x4c7a3d));
    bush.scale.y=0.7; bush.position.set(bx,0.5,bz); g.add(bush);
  });

  /* Tamai Tower: the concrete balcony grid behind the square */
  const tamai=new THREE.Mesh(new THREE.BoxGeometry(10,20,10),
    new THREE.MeshLambertMaterial({map:windowTex('#b8b2a6','#4a4a52','#ffd166',10,20)}));
  tamai.position.set(5.5,10,-4.5); g.add(tamai);
  const tcap=new THREE.Mesh(new THREE.BoxGeometry(10.5,0.7,10.5), lambert(0x8a8275));
  tcap.position.set(5.5,20.3,-4.5); g.add(tcap);
  /* plaza visitors */
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf];
  for(let i=0;i<4;i++){
    const p=makePerson(ctx.rng, shirts[i%4], 'stand');
    p.position.set(-2+i*2.2,0,2+(ctx.rng()-0.5)*3);
    p.rotation.y=ctx.rng()*6.28; g.add(p);
    ctx.dynamic.fans.push({m:p, baseY:0, baseRot:p.rotation.y, phase:ctx.rng()*6.28, amp:0.1});
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,12);
  const f={x:Math.sin(def.ry||0), z:Math.cos(def.ry||0)};
  ctx.solid(def.x-f.x*3, def.z-f.z*3.5, 7);   // the temple + Tamai mass at the back
};

/* =====================================================================
   COLFAX — the point-to-point stage's prop vocabulary
   ===================================================================== */

/* stacked-letter texture for theater blade signs */
function bladeTex(text, bg, fg){
  const c=document.createElement('canvas'); c.width=192; c.height=1024;
  const g=c.getContext('2d');
  g.fillStyle=bg; g.fillRect(0,0,192,1024);
  g.strokeStyle=fg; g.lineWidth=10; g.strokeRect(10,10,172,1004);
  g.fillStyle=fg; g.textAlign='center'; g.textBaseline='middle';
  const step=Math.min(130, 960/text.length);
  g.font=`bold ${Math.min(110,step*0.92)}px Arial, sans-serif`;
  const y0=512-(text.length-1)*step/2;
  for(let i=0;i<text.length;i++) g.fillText(text[i], 96, y0+i*step);
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.anisotropy=8;
  return t;
}

/* a Colfax music venue: brick hall, wraparound marquee canopy with the
   name, and the tall neon blade sign. Front faces local +z. */
B.marquee = (ctx, def) => {
  const g=new THREE.Group();
  const w=def.w||16, h=def.h||9, d=def.d||12;
  const bc=def.brick||'#7a4034';
  const tex=pixTex(32,(gg,px)=>{
    gg.fillStyle=bc; gg.fillRect(0,0,px,px);
    gg.fillStyle='rgba(0,0,0,0.15)';
    for(let y=0;y<px;y+=3) gg.fillRect(0,y,px,1);
    for(let wx=3;wx<px-4;wx+=8){
      gg.fillStyle='#33262b'; gg.fillRect(wx,px*0.2,5,px*0.28);
    }
  }, Math.max(1,Math.round(w/8)), Math.max(1,Math.round(h/7)));
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshLambertMaterial({map:tex}));
  body.position.y=h/2; g.add(body);
  const cornice=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.6,d+0.6), lambert(0xd8d2c5));
  cornice.position.y=h+0.3; g.add(cornice);
  /* marquee canopy with the name on the fascia, bulbs along the lip */
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(w*0.8,0.5,3), lambert(0x241d1a));
  canopy.position.set(0,4.4,d/2+1.5); g.add(canopy);
  const fascia=new THREE.Mesh(new THREE.PlaneGeometry(w*0.76,1.2),
    new THREE.MeshBasicMaterial({map:bannerTex(def.text, '#241d1a', def.neon||'#ffd166'),
      side:THREE.DoubleSide}));
  fascia.position.set(0,4.4,d/2+3.02); g.add(fascia);
  for(let bx=-w*0.36; bx<=w*0.36; bx+=1.4){
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.09,4,3),
      lambert(0xffe9b0,{emissive:0xbb8822}));
    bulb.position.set(bx,4.05,d/2+3.0); g.add(bulb);
  }
  /* the blade: tall stacked letters glowing off the facade */
  const bh=def.bladeH||11;
  const blade=new THREE.Mesh(new THREE.PlaneGeometry(2.1*(bh/11),bh),
    new THREE.MeshBasicMaterial({map:bladeTex(def.text, def.bladeBg||'#241d1a', def.neon||'#ff5c5c'),
      side:THREE.DoubleSide}));
  blade.position.set(def.bladeX!==undefined?def.bladeX:0, h+bh*0.38, d/2+0.6); g.add(blade);
  const bladeFrame=new THREE.Mesh(new THREE.BoxGeometry(0.25,bh+0.4,0.25), lambert(0x3a3230));
  bladeFrame.position.set(blade.position.x-1.2, blade.position.y, d/2+0.35); g.add(bladeFrame);
  /* concert posters pasted along the front */
  const posterC=['#e84855','#ffd166','#2e86ab','#f25caf','#5d8f4a'];
  for(let i=0;i<(def.posters||0);i++){
    const po=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.6),
      lambert(parseInt(posterC[i%5].slice(1),16)));
    po.position.set(-w*0.34+i*(w*0.68/Math.max(1,def.posters-1)), 2, d/2+0.07);
    g.add(po);
  }
  /* bird: the little bluebird perched on the blade */
  if(def.bird){
    const bird=new THREE.Group();
    const bodyB=new THREE.Mesh(new THREE.SphereGeometry(0.55,7,6), lambert(0x4a9fd8));
    bodyB.scale.set(1,0.9,1.3); bird.add(bodyB);
    const headB=new THREE.Mesh(new THREE.SphereGeometry(0.32,6,5), lambert(0x4a9fd8));
    headB.position.set(0,0.45,0.45); bird.add(headB);
    const beak=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.35,5), lambert(0xffb82e));
    beak.rotation.x=Math.PI/2; beak.position.set(0,0.45,0.85); bird.add(beak);
    const tail=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.1,0.7), lambert(0x2e5a8f));
    tail.rotation.x=-0.5; tail.position.set(0,0.1,-0.75); bird.add(tail);
    bird.position.set(blade.position.x, blade.position.y+bh/2+0.6, d/2+0.6);
    g.add(bird);
  }
  /* arch style: the tall arched theater parapet with finials (the Ogden) */
  if(def.style==='arch'){
    const archShape=new THREE.Shape();
    archShape.moveTo(-w*0.28,0); archShape.lineTo(w*0.28,0);
    archShape.lineTo(w*0.28,2.2); archShape.absarc(0,2.2,w*0.28,0,Math.PI,false);
    archShape.lineTo(-w*0.28,0);
    const crest=new THREE.Mesh(new THREE.ExtrudeGeometry(archShape,{depth:0.8,bevelEnabled:false}),
      lambert(0xd8cdb8));
    crest.position.set(0,h,d/2-0.8); g.add(crest);
    const crestWin=new THREE.Mesh(new THREE.CircleGeometry(w*0.13,12), lambert(0x3a3a44));
    crestWin.position.set(0,h+2.2,d/2+0.06); g.add(crestWin);
    [-w*0.28,w*0.28].forEach(fx=>{
      const finial=new THREE.Mesh(new THREE.ConeGeometry(0.35,1.2,6), lambert(0xd8cdb8));
      finial.position.set(fx,h+2.8+w*0.0,d/2-0.4); g.add(finial);
    });
  }
  /* barrel style: the old skating-rink vault over the hall */
  if(def.style==='barrel'){
    const shape=new THREE.Shape();
    shape.moveTo(-w/2*0.92,0); shape.lineTo(w/2*0.92,0);
    shape.absarc(0,0,w/2*0.92,0,Math.PI,false);
    const vault=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:d*0.9,bevelEnabled:false}),
      lambert(0x8a8e90));
    vault.scale.y=0.45;
    vault.position.set(0,h+0.4,-d*0.45); g.add(vault);
    for(let bx=-w*0.4; bx<=w*0.4; bx+=1.6){
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.11,4,3),
        lambert(0xffe9b0,{emissive:0xbb8822}));
      bulb.position.set(bx, h+0.4+Math.sqrt(Math.max(0,(w/2*0.92)**2-bx*bx))*0.45+0.3, d/2-0.4);
      g.add(bulb);
    }
  }
  const doors=new THREE.Mesh(new THREE.BoxGeometry(w*0.4,2.4,0.14), lambert(0x3a2a20));
  doors.position.set(0,1.3,d/2+0.06); g.add(doors);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,Math.max(w,d)/2+1.5);
  ctx.exclude(def.x,def.z,Math.max(w,d)/2+4);
};

/* a googie diner: low chrome-banded box, tilted roof, glowing pole sign
   (Tom's Diner, Pete's Kitchen). Front faces local +z. */
B.diner = (ctx, def) => {
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(13,3.6,8), lambert(0xe8e0d0));
  body.position.y=1.8; g.add(body);
  const winBand=new THREE.Mesh(new THREE.BoxGeometry(13.1,1.6,8.1), lambert(0x3a4650));
  winBand.position.y=2.1; g.add(winBand);
  const chrome=new THREE.Mesh(new THREE.BoxGeometry(13.2,0.4,8.2), lambert(0xb8b4aa));
  chrome.position.y=3.4; g.add(chrome);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(14.5,0.35,9), lambert(def.accentC||0xc75146));
  roof.rotation.z=def.googie?0.22:0.09; roof.position.y=def.googie?4.7:4.1; g.add(roof);
  if(def.googie){
    /* the upswept wing tip + full glass corner + chrome legs + apron */
    const wing=new THREE.Mesh(new THREE.BoxGeometry(5,0.3,9.4), lambert(def.accentC||0xc75146));
    wing.rotation.z=0.55; wing.position.set(7.8,6.1,0); g.add(wing);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(13.15,2.4,8.15), lambert(0x9fc4d8));
    glass.position.y=2.1; g.add(glass);
    [[-6,3.6],[6,3.6],[-6,-3.6],[6,-3.6]].forEach(([lx,lz])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,3.4,5), lambert(0xd8d2c5));
      leg.position.set(lx,1.7,lz); g.add(leg);
    });
    const apron=new THREE.Mesh(new THREE.PlaneGeometry(16,9), lambert(0x7c7c7a));
    apron.rotation.x=-Math.PI/2; apron.position.set(-2,0.014,10); g.add(apron);
    [[-6.5,9.5],[2.5,10.5]].forEach(([cx,cz])=>{
      const c=makeCar(ctx.rng); c.position.set(cx,0,cz);
      c.rotation.y=0.15+ctx.rng()*0.2; g.add(c);
    });
  }
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.2,0.12), lambert(0x3a2a20));
  door.position.set(-3,1.2,4.06); g.add(door);
  /* the pole sign: big neon name + OPEN 24 HRS */
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,9.5,6), lambert(0x8a8275));
  pole.position.set(6.5,4.75,4.5); g.add(pole);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(7.5,2),
    new THREE.MeshBasicMaterial({map:bannerTex(def.sign, def.signBg||'#a83232', '#ffe9b0'),
      side:THREE.DoubleSide}));
  sign.position.set(6.5,9.2,4.5); g.add(sign);
  const sub=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1),
    new THREE.MeshBasicMaterial({map:bannerTex(def.sub||'OPEN 24 HRS','#241d1a','#5db3c9'),
      side:THREE.DoubleSide}));
  sub.position.set(6.5,7.6,4.5); g.add(sub);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,8); ctx.exclude(def.x,def.z,11);
};

/* the Cathedral Basilica of the Immaculate Conception: twin stone spires,
   rose window, gabled nave. Front (spires) faces local +z. */
B.cathedral = (ctx, def) => {
  const g=new THREE.Group();
  const stone=lambert(0xc9c4b8), dark=lambert(0x8a867c);
  const nave=new THREE.Mesh(new THREE.BoxGeometry(14,11,24), stone);
  nave.position.set(0,5.5,-6); g.add(nave);
  [-1,1].forEach(sx=>{
    const slab=new THREE.Mesh(new THREE.BoxGeometry(8.2,0.4,24.5), dark);
    slab.rotation.z=sx*0.5; slab.position.set(sx*3.4,12.6,-6); g.add(slab);
  });
  /* twin towers + octagonal spires + crosses */
  [-1,1].forEach(s=>{
    const tower=new THREE.Mesh(new THREE.BoxGeometry(4.6,17,4.6), stone);
    tower.position.set(s*5.2,8.5,6.5); g.add(tower);
    const belfry=new THREE.Mesh(new THREE.BoxGeometry(3.9,3,3.9), dark);
    belfry.position.set(s*5.2,17.6,6.5); g.add(belfry);
    const spire=new THREE.Mesh(new THREE.ConeGeometry(2.6,9,8), stone);
    spire.position.set(s*5.2,23.6,6.5); g.add(spire);
    const cv=new THREE.Mesh(new THREE.BoxGeometry(0.16,1.6,0.16), lambert(0xffd166));
    cv.position.set(s*5.2,28.9,6.5); g.add(cv);
    const ch=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.16,0.16), lambert(0xffd166));
    ch.position.set(s*5.2,28.7,6.5); g.add(ch);
  });
  /* rose window + portal between the towers */
  const rose=new THREE.Mesh(new THREE.CircleGeometry(1.7,16), lambert(0x4b2d5e));
  rose.position.set(0,10.5,8.86); g.add(rose);
  const roseRing=new THREE.Mesh(new THREE.RingGeometry(1.7,2.05,16), stone);
  roseRing.position.set(0,10.5,8.87); g.add(roseRing);
  const gable=new THREE.Mesh(new THREE.BoxGeometry(9,13.5,1), stone);
  gable.position.set(0,6.75,8.3); g.add(gable);
  const portal=new THREE.Mesh(new THREE.BoxGeometry(2.6,3.6,0.2), lambert(0x3a2a20));
  portal.position.set(0,1.9,8.85); g.add(portal);
  const steps=new THREE.Mesh(new THREE.BoxGeometry(11,0.7,3), dark);
  steps.position.set(0,0.35,10); g.add(steps);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,11); ctx.exclude(def.x,def.z,16);
};

/* parked cars hugging the curb between t0 and t1 — the door-zone gauntlet */
B.parkedCars = (ctx, def) => {
  const n=def.count||6;
  for(let i=0;i<n;i++){
    if(ctx.rng()<(def.gaps||0.25)) continue;         // empty spots break it up
    const t=def.t0+(def.t1-def.t0)*(i+0.5)/n;
    const p=ctx.trackPoint(t), tan=ctx.trackTangent(t);
    const nv=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
    const side=def.side||1;
    const car=makeCar(ctx.rng);
    car.position.set(p.x+nv.x*(ctx.roadHalf+1.1)*side, 0, p.z+nv.z*(ctx.roadHalf+1.1)*side);
    car.rotation.y=Math.atan2(tan.x,tan.z)+Math.PI/2 + (ctx.rng()-0.5)*0.06;
    ctx.scene.add(car);
    ctx.solid(car.position.x, car.position.z, 1.2);
  }
};

/* an RTD bus body, front along +z (shared by parked chicanes + BRT) */
export function makeBusMesh(school, route){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(2.6,3,11), lambert(school?0xe8b52e:0xf2f0ea));
  body.position.y=1.7; g.add(body);
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.65,0.6,11.05), lambert(school?0x1a1423:0xc75146));
  stripe.position.y=1.1; g.add(stripe);
  const stripe2=new THREE.Mesh(new THREE.BoxGeometry(2.65,0.3,11.05), lambert(school?0x1a1423:0x2e5a8f));
  stripe2.position.y=1.5; g.add(stripe2);
  const winB=new THREE.Mesh(new THREE.BoxGeometry(2.66,0.9,10.2), lambert(0x3a4650));
  winB.position.y=2.5; g.add(winB);
  const routeSign=new THREE.Mesh(new THREE.PlaneGeometry(school?2.4:1.6,0.6),
    new THREE.MeshBasicMaterial({map:bannerTex(route||(school?'SCHOOL':'15'),'#241d1a','#ffb82e'),
      side:THREE.DoubleSide}));
  routeSign.position.set(0,3,5.56); g.add(routeSign);
  [[-3.6],[0],[3.6]].forEach(([wz])=>{
    [-1.35,1.35].forEach(wx=>{
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.3,8), lambert(0x1a1423));
      wheel.rotation.z=Math.PI/2; wheel.position.set(wx,0.55,wz); g.add(wheel);
    });
  });
  return g;
}

/* an RTD bus pulled into a stop, nose poking into the lane — a chicane */
B.parkedBus = (ctx, def) => {
  const g=makeBusMesh(!!def.school, def.route);
  const p=ctx.trackPoint(def.t), tan=ctx.trackTangent(def.t);
  const nv=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
  const side=def.side||1;
  /* nose angled INTO the lane: rear at the curb, front crowding the road */
  g.position.set(p.x+nv.x*(ctx.roadHalf+0.4)*side, 0, p.z+nv.z*(ctx.roadHalf+0.4)*side);
  g.rotation.y=Math.atan2(tan.x,tan.z) + side*0.12;
  ctx.scene.add(g);
  const f={x:Math.sin(g.rotation.y), z:Math.cos(g.rotation.y)};
  ctx.solid(g.position.x+f.x*3.4, g.position.z+f.z*3.4, 1.6);
  ctx.solid(g.position.x-f.x*3.4, g.position.z-f.z*3.4, 1.6);
};

/* a block of low Colfax storefronts: painted parapets, colored awnings,
   little signs. Runs along local x, faces +z. */
B.storefrontRow = (ctx, def) => {
  const g=new THREE.Group();
  const len=def.len||30;
  const paints=['#c9a06a','#8a4a3a','#5a7a68','#7a6a8a','#b0402f','#4a5a6a'];
  const awnings=[0xe84855,0x2e86ab,0xffd166,0x5d8f4a,0xf25caf];
  let x=-len/2, i=0;
  while(x<len/2-4){
    const w=5+ctx.rng()*4, h=4+ctx.rng()*2.5, d=7+ctx.rng()*2;
    const shop=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
      lambert(parseInt(paints[i%6].slice(1),16)));
    shop.position.set(x+w/2,h/2,0); g.add(shop);
    const parapet=new THREE.Mesh(new THREE.BoxGeometry(w+0.2,0.4,d+0.2), lambert(0xd8d2c5));
    parapet.position.set(x+w/2,h+0.2,0); g.add(parapet);
    const awn=new THREE.Mesh(new THREE.BoxGeometry(w*0.85,0.18,1.4), lambert(awnings[i%5]));
    awn.rotation.x=0.35; awn.position.set(x+w/2,2.6,d/2+0.6); g.add(awn);
    const win=new THREE.Mesh(new THREE.BoxGeometry(w*0.7,1.5,0.1), lambert(0x2e3440));
    win.position.set(x+w/2,1.4,d/2+0.06); g.add(win);
    if(def.signs && def.signs[i]){
      const sp=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-0.6,5.5),1),
        new THREE.MeshLambertMaterial({map:bannerTex(def.signs[i],'#241d1a','#f5e9d0'),
          side:THREE.DoubleSide}));
      sp.position.set(x+w/2,3.4,d/2+0.08); g.add(sp);
    }
    x+=w+0.4; i++;
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  const f={x:Math.cos(def.ry||0), z:-Math.sin(def.ry||0)};
  for(let k=-2;k<=2;k++)
    ctx.solid(def.x+f.x*k*len/5, def.z+f.z*k*len/5, 5.2);
  ctx.exclude(def.x,def.z,len/2+3);
};

/* East High School as itself: long mottled red-brick body with light
   terra-cotta trim bands, arched entry, and the seven-story clock tower
   with its green copper cap. Front faces local +z. */
B.eastHigh = (ctx, def) => {
  const g=new THREE.Group();
  const trim=lambert(0xe0d4b8);
  const brickTex=pixTex(32,(gg,px)=>{
    gg.fillStyle='#8a4a3a'; gg.fillRect(0,0,px,px);
    for(let i=0;i<50;i++){                        // the mottle
      gg.fillStyle=['#9a5a44','#7a4034','#a3664e'][i%3];
      gg.fillRect(Math.random()*px|0, Math.random()*px|0, 2, 2);
    }
    gg.fillStyle='rgba(0,0,0,0.12)';
    for(let y=0;y<px;y+=3) gg.fillRect(0,y,px,1);
    for(let wy=5; wy<px-4; wy+=9)
      for(let wx=2; wx<px-3; wx+=6){
        gg.fillStyle='#3a3a44'; gg.fillRect(wx,wy,3,5);
      }
  }, 4, 1);
  const brickM=new THREE.MeshLambertMaterial({map:brickTex});
  const body=new THREE.Mesh(new THREE.BoxGeometry(36,10,13), brickM);
  body.position.y=5; g.add(body);
  [3.4,6.6,10.2].forEach(y=>{                     // terra-cotta stringcourses
    const band=new THREE.Mesh(new THREE.BoxGeometry(36.3,0.4,13.3), trim);
    band.position.y=y; g.add(band);
  });
  [-1,1].forEach(s=>{                             // end pavilions
    const pav=new THREE.Mesh(new THREE.BoxGeometry(7,11.5,14), brickM);
    pav.position.set(s*15.5,5.75,0); g.add(pav);
    const pcap=new THREE.Mesh(new THREE.BoxGeometry(7.6,0.7,14.6), trim);
    pcap.position.set(s*15.5,11.8,0); g.add(pcap);
  });
  /* the seven-story clock tower */
  const tower=new THREE.Mesh(new THREE.BoxGeometry(6.5,24,6.5), brickM);
  tower.position.set(0,12,1); g.add(tower);
  [14,18,22].forEach(y=>{
    const tb=new THREE.Mesh(new THREE.BoxGeometry(6.8,0.4,6.8), trim);
    tb.position.set(0,y,1); g.add(tb);
  });
  const clockBox=new THREE.Mesh(new THREE.BoxGeometry(7.2,3.6,7.2), trim);
  clockBox.position.set(0,25.4,1); g.add(clockBox);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const face=new THREE.Mesh(new THREE.CircleGeometry(1.35,14), lambert(0xf7f3e8));
    face.position.set(Math.sin(a)*3.65,25.4,1+Math.cos(a)*3.65);
    face.rotation.y=a; g.add(face);
    const hand=new THREE.Mesh(new THREE.PlaneGeometry(0.16,1.7), lambert(0x1a1423));
    hand.rotation.z=0.8; hand.position.set(Math.sin(a)*3.7,25.4,1+Math.cos(a)*3.7);
    hand.rotation.y=a; g.add(hand);
  }
  const cap=new THREE.Mesh(new THREE.ConeGeometry(4.9,4,4), lambert(0x4e7a68));
  cap.rotation.y=Math.PI/4; cap.position.set(0,29.2,1); g.add(cap);   // copper
  const fin=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,2,4), trim);
  fin.position.set(0,32,1); g.add(fin);
  /* arched entry below the tower */
  const arch=new THREE.Mesh(new THREE.BoxGeometry(4.6,4.6,0.5), trim);
  arch.position.set(0,2.3,7); g.add(arch);
  const door=new THREE.Mesh(new THREE.BoxGeometry(3,3.4,0.3), lambert(0x3a2a20));
  door.position.set(0,1.7,7.2); g.add(door);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,14); ctx.exclude(def.x,def.z,22);
};

/* Carla Madison Rec Center: dark brick volume with the circular dot
   medallion, a glass atrium under the red-framed rooftop canopy, and the
   floating louvered tan box on thin red columns. Front faces local +z. */
B.carlaMadison = (ctx, def) => {
  const g=new THREE.Group();
  /* dark volume + medallion + name */
  const dark=new THREE.Mesh(new THREE.BoxGeometry(10,9.5,9), lambert(0x4a3a32));
  dark.position.set(-7,4.75,0); g.add(dark);
  const medC=document.createElement('canvas'); medC.width=medC.height=128;
  const mg=medC.getContext('2d');
  mg.fillStyle='#c9c4b8';
  for(let y=12;y<116;y+=10)
    for(let x=12;x<116;x+=10){
      const dx=x-64, dy=y-64;
      if(dx*dx+dy*dy<52*52) mg.fillRect(x,y,5,3);
    }
  const medTex=new THREE.CanvasTexture(medC);
  medTex.magFilter=THREE.LinearFilter; medTex.minFilter=THREE.LinearMipmapLinearFilter;
  const medallion=new THREE.Mesh(new THREE.CircleGeometry(3.2,20),
    new THREE.MeshBasicMaterial({map:medTex, transparent:true}));
  medallion.position.set(-7,5.6,4.56); g.add(medallion);
  const name=new THREE.Mesh(new THREE.PlaneGeometry(6.5,0.9),
    new THREE.MeshLambertMaterial({map:bannerTex('CARLA MADISON REC','#4a3a32','#f5f0e6'),
      side:THREE.DoubleSide}));
  name.position.set(-7,1.6,4.56); g.add(name);
  /* glass atrium + red-framed canopy */
  const atrium=new THREE.Mesh(new THREE.BoxGeometry(4.2,11,8.4), lambert(0x9fc4d8));
  atrium.position.set(0.5,5.5,0); g.add(atrium);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(7.5,0.5,7), lambert(0x2b2624));
  canopy.position.set(0.5,11.7,0.6); g.add(canopy);
  const canopyRed=new THREE.Mesh(new THREE.BoxGeometry(7.7,0.16,7.2), lambert(0xc73232));
  canopyRed.position.set(0.5,11.38,0.6); g.add(canopyRed);
  /* the floating louvered box on red stilts */
  const louverTex=pixTex(32,(gg,px)=>{
    gg.fillStyle='#7a94a8'; gg.fillRect(0,0,px,px);
    gg.fillStyle='#e8e4da';
    for(let y=1;y<px;y+=4)
      for(let x=1;x<px-2;x+=5) gg.fillRect(x,y,4,1.5);
  }, 3, 1);
  const tanM=lambert(0xc9b8a0);
  const tan=new THREE.Mesh(new THREE.BoxGeometry(13,6,9),
    [tanM,tanM,tanM,tanM,new THREE.MeshLambertMaterial({map:louverTex}),tanM]);
  tan.position.set(9,8,0); g.add(tan);
  const glassBase=new THREE.Mesh(new THREE.BoxGeometry(12.4,4.4,8.2), lambert(0x3a4650));
  glassBase.position.set(9,2.6,0); g.add(glassBase);
  for(let i=0;i<6;i++){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,4.8,5), lambert(0xc73232));
    col.position.set(3.6+i*2.1,2.4,4.35); g.add(col);
  }
  /* corner steps + planters */
  const steps=new THREE.Mesh(new THREE.BoxGeometry(8,0.7,2.4), lambert(0xc9c4b8));
  steps.position.set(-7,0.35,5.6); g.add(steps);
  [[-13,5.4],[1.5,5.8]].forEach(([px2,pz2])=>{
    const planter=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8,0), lambert(0x4c7a3d));
    planter.scale.y=0.6; planter.position.set(px2,0.5,pz2); g.add(planter);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x-6,def.z,7); ctx.solid(def.x+8,def.z,7.5);
  ctx.exclude(def.x,def.z,15);
};

/* the Sullivan Gateway: twin classical terra-cotta pylons flanking the
   Esplanade's mouth at Colfax, with low colonnade walls. Opens along +z. */
B.sullivanGateway = (ctx, def) => {
  const g=new THREE.Group();
  const terra=lambert(0xe0d4b8), bronze=lambert(0x5a4130);
  [-1,1].forEach(s=>{
    const base=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.6,3.4), terra);
    base.position.set(s*9,0.8,0); g.add(base);
    const shaft=new THREE.Mesh(new THREE.BoxGeometry(2.4,7.5,2.4), terra);
    shaft.position.set(s*9,5.3,0); g.add(shaft);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(3,0.9,3), terra);
    cap.position.set(s*9,9.5,0); g.add(cap);
    const statue=new THREE.Mesh(new THREE.BoxGeometry(0.9,2.2,0.7), bronze);
    statue.position.set(s*9,11.1,0); g.add(statue);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.32,6,5), bronze);
    head.position.set(s*9,12.5,0); g.add(head);
    const wall=new THREE.Mesh(new THREE.BoxGeometry(7,1.6,0.8), terra);
    wall.position.set(s*14.5,0.8,0); g.add(wall);
    ctx.solid(def.x+s*9, def.z, 2.2);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,10);
};

/* the Esplanade's Dolphin Fountain: round basin, center bowl, arcing jets */
B.dolphinFountain = (ctx, def) => {
  const g=new THREE.Group();
  const stone=lambert(0xc9c4b8);
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.5,1,14), stone);
  basin.position.y=0.5; g.add(basin);
  const water=new THREE.Mesh(new THREE.CircleGeometry(3.9,14),
    new THREE.MeshLambertMaterial({map:waterTex}));
  water.rotation.x=-Math.PI/2; water.position.y=1.02; g.add(water);
  const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.8,1.8,8), stone);
  ped.position.y=1.9; g.add(ped);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(1.5,0.9,0.6,10), stone);
  bowl.position.y=3.1; g.add(bowl);
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    const jet=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.1,2.2,4),
      lambert(0xd8ecf2,{transparent:true, opacity:0.8}));
    jet.position.set(Math.cos(a)*1.7,2.6,Math.sin(a)*1.7);
    jet.rotation.z=Math.cos(a)*0.5; jet.rotation.x=-Math.sin(a)*0.5;
    g.add(jet);
  }
  g.position.set(def.x,0,def.z); ctx.scene.add(g);
  ctx.solid(def.x,def.z,4.8); ctx.exclude(def.x,def.z,7);
};

/* a zebra crosswalk painted across the road at t */
B.crosswalk = (ctx, def) => {
  const p=ctx.trackPoint(def.t), tan=ctx.trackTangent(def.t);
  const g=new THREE.Group();
  g.position.set(p.x,0,p.z);
  g.rotation.y=Math.atan2(tan.x,tan.z);
  for(let i=0;i<6;i++){
    const stripe=new THREE.Mesh(new THREE.PlaneGeometry(ctx.roadHalf*2-1,0.55),
      new THREE.MeshLambertMaterial({color:0xe8e4da}));
    stripe.rotation.x=-Math.PI/2;
    stripe.position.set(0,0.032,-1.65+i*0.66);
    g.add(stripe);
  }
  ctx.scene.add(g);
};

/* a signalized intersection: pole + mast arm reaching over the road with
   a three-light head (plus one on the pole for the cross street) */
B.trafficSignal = (ctx, def) => {
  const p=ctx.trackPoint(def.t), tan=ctx.trackTangent(def.t);
  const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
  const side=def.side||1;
  const g=new THREE.Group();
  g.position.set(p.x+n.x*(ctx.roadHalf+1.3)*side, 0, p.z+n.z*(ctx.roadHalf+1.3)*side);
  const heading=Math.atan2(tan.x,tan.z);
  g.rotation.y=heading + (side>0 ? Math.PI/2 : -Math.PI/2);  // arm reaches over road
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,6.4,6), lambert(0x3a3a3a));
  pole.position.y=3.2; g.add(pole);
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,6,5), lambert(0x3a3a3a));
  arm.rotation.x=Math.PI/2; arm.position.set(0,6,3); g.add(arm);
  const headBox=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.5,0.5), lambert(0x2a2a2a));
  headBox.position.set(0,5.4,5.6); g.add(headBox);
  [[0.45,0xe84855],[0,0xd9a520],[-0.45,0x4c9a3d]].forEach(([dy,cc],i)=>{
    const light=new THREE.Mesh(new THREE.CircleGeometry(0.16,8),
      new THREE.MeshBasicMaterial({color: i===2?cc:0x241d1a}));  // stuck on green
    light.position.set(0,5.4+dy,5.87); g.add(light);
    const light2=light.clone(); light2.rotation.y=Math.PI;
    light2.position.z=5.33; g.add(light2);
  });
  ctx.scene.add(g);
  ctx.solid(g.position.x, g.position.z, 0.5);
};

/* the Denver City & County Building: broad curved neoclassical courthouse
   facing the Capitol across Civic Center — center portico + clock tower
   with the gold eagle, long colonnaded wings sweeping forward.
   Front faces local +z. */
B.cityCountyBuilding = (ctx, def) => {
  const g=new THREE.Group();
  const stone=lambert(0xd0cabc), stoneD=lambert(0xc0baa8);
  /* center block + portico */
  const center=new THREE.Mesh(new THREE.BoxGeometry(16,11,10), stone);
  center.position.y=5.5; g.add(center);
  for(let i=-3;i<=3;i++){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.45,7,8), stone);
    col.position.set(i*1.9,4.5,5.8); g.add(col);
  }
  const entab=new THREE.Mesh(new THREE.BoxGeometry(15,1.2,3), stone);
  entab.position.set(0,8.6,5.4); g.add(entab);
  /* the stepped clock tower + gold eagle */
  const tower=new THREE.Mesh(new THREE.BoxGeometry(6,5,6), stone);
  tower.position.y=13.5; g.add(tower);
  const tier=new THREE.Mesh(new THREE.BoxGeometry(4,2.6,4), stoneD);
  tier.position.y=17.3; g.add(tier);
  const clock=new THREE.Mesh(new THREE.CircleGeometry(0.9,12), lambert(0xf7f3e8));
  clock.position.set(0,13.8,3.06); g.add(clock);
  const eagle=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,5), lambert(0xffd166,{emissive:0x775500}));
  eagle.scale.set(1.4,0.8,0.6); eagle.position.y=19.1; g.add(eagle);
  /* curved wings: three angled segments each side, colonnade texture */
  const wingTex=pixTex(32,(gg,px)=>{
    gg.fillStyle='#d0cabc'; gg.fillRect(0,0,px,px);
    gg.fillStyle='#a8a294';
    for(let x=2;x<px;x+=5) gg.fillRect(x,px*0.25,2,px*0.6);
  }, 3, 1);
  const wingM=new THREE.MeshLambertMaterial({map:wingTex});
  [-1,1].forEach(s=>{
    let wx=8, wz=0, ang=0;
    for(let seg=0;seg<3;seg++){
      ang += 0.3;
      const w=new THREE.Mesh(new THREE.BoxGeometry(12,8,7), wingM);
      wx += s*5.4*Math.cos(ang); wz += 5.4*Math.sin(ang)*0.9;
      w.position.set(s*(wx), 4, wz+1);
      w.rotation.y = -s*ang;
      g.add(w);
    }
    const pav=new THREE.Mesh(new THREE.BoxGeometry(7,9,8), stone);
    pav.position.set(s*(wx+4), 4.5, wz+3.4);
    pav.rotation.y=-s*ang; g.add(pav);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,14); ctx.exclude(def.x,def.z,26);
};

/* the Greek Amphitheater at Civic Center: a semicircular colonnade with
   entablature over a stage floor and low seat tiers. Opens along +z. */
B.greekAmphitheater = (ctx, def) => {
  const g=new THREE.Group();
  const stone=lambert(0xd0cabc);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(7.5,16), lambert(0xc0baa8));
  floor.rotation.x=-Math.PI/2; floor.position.y=0.03; g.add(floor);
  for(let i=0;i<=10;i++){
    const a=Math.PI + (i/10)*Math.PI;              // the back half-circle
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.34,4.6,7), stone);
    col.position.set(Math.cos(a)*6.6,2.3,-Math.sin(a)*6.6); g.add(col);
  }
  const ring=new THREE.Mesh(new THREE.TorusGeometry(6.6,0.5,5,20,Math.PI), stone);
  ring.rotation.x=Math.PI/2; ring.rotation.z=Math.PI;
  ring.position.y=4.9; g.add(ring);
  [-1,1].forEach(s=>{
    const pylon=new THREE.Mesh(new THREE.BoxGeometry(1.6,5.8,1.6), stone);
    pylon.position.set(s*6.9,2.9,0.3); g.add(pylon);
  });
  /* two shallow seating tiers facing the stage */
  [[9.5,0.5],[11,0.9]].forEach(([r,h])=>{
    const tier=new THREE.Mesh(new THREE.TorusGeometry(r,0.55,4,18,Math.PI), lambert(0xc9c4b8));
    tier.rotation.x=Math.PI/2;
    tier.position.y=h; g.add(tier);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,8); ctx.exclude(def.x,def.z,13);
};

/* the Voorhies Memorial: a gentle colonnade arc with a central arch and
   the seal pool out front. Opens along +z. */
B.voorhiesMemorial = (ctx, def) => {
  const g=new THREE.Group();
  const stone=lambert(0xd0cabc);
  const arch=new THREE.Mesh(new THREE.BoxGeometry(5,6,1.6), stone);
  arch.position.y=3; g.add(arch);
  const opening=new THREE.Mesh(new THREE.BoxGeometry(2.4,3.6,1.8), lambert(0x8a8e90));
  opening.position.y=1.8; g.add(opening);
  [-1,1].forEach(s=>{
    for(let i=1;i<=4;i++){
      const col=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.3,3.8,7), stone);
      col.position.set(s*(3.4+i*1.7),1.9,-i*0.55); g.add(col);
    }
    const cap=new THREE.Mesh(new THREE.BoxGeometry(7.6,0.7,1.4), stone);
    cap.position.set(s*7.1,4.1,-1.4); cap.rotation.y=s*0.3; g.add(cap);
  });
  /* the seal pool */
  const pool=new THREE.Mesh(new THREE.CircleGeometry(3.4,14),
    new THREE.MeshLambertMaterial({map:waterTex}));
  pool.rotation.x=-Math.PI/2; pool.position.set(0,0.03,4.4); g.add(pool);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(3.5,0.25,5,16), stone);
  rim.rotation.x=Math.PI/2; rim.position.set(0,0.2,4.4); g.add(rim);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,6); ctx.exclude(def.x,def.z,11);
};

/* the Colorado State Capitol, modeled from the west front: gray granite
   cross plan — corner pavilions, recessed wings, center portico with
   columns + pediment and the grand staircase — then the two-tier
   blue-gray colonnaded drum, the gold dome, and the lantern.
   Front faces local +z. */
B.stateCapitol = (ctx, def) => {
  const g=new THREE.Group();
  const granite=lambert(0xb8b2a4), graniteD=lambert(0xa8a294);
  const winTex = pixTex(32,(gg,px)=>{
    gg.fillStyle='#b8b2a4'; gg.fillRect(0,0,px,px);
    for(let y=3;y<px-2;y+=7)
      for(let x=2;x<px-2;x+=5){
        gg.fillStyle='#3e4245'; gg.fillRect(x,y,3,4);
      }
  }, 3, 1);
  const winM=new THREE.MeshLambertMaterial({map:winTex});
  /* plinth + main mass */
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(36,2.6,24), graniteD);
  plinth.position.y=1.3; g.add(plinth);
  const main=new THREE.Mesh(new THREE.BoxGeometry(28,9,16), winM);
  main.position.y=7.1; g.add(main);
  /* projecting corner pavilions */
  [-1,1].forEach(s=>{
    const pav=new THREE.Mesh(new THREE.BoxGeometry(8,10,18), winM);
    pav.position.set(s*14,7.6,0); g.add(pav);
    const pavCap=new THREE.Mesh(new THREE.BoxGeometry(8.6,0.8,18.6), granite);
    pavCap.position.set(s*14,12.9,0); g.add(pavCap);
    const pavRoof=new THREE.Mesh(new THREE.ConeGeometry(5.6,1.8,4), lambert(0x8a8e90));
    pavRoof.rotation.y=Math.PI/4; pavRoof.scale.z=1.4;
    pavRoof.position.set(s*14,14.1,0); g.add(pavRoof);
  });
  const cornice=new THREE.Mesh(new THREE.BoxGeometry(29,0.8,17), granite);
  cornice.position.y=11.9; g.add(cornice);
  /* the west portico: platform, six columns, entablature, pediment */
  const porch=new THREE.Mesh(new THREE.BoxGeometry(13,1.2,4.5), graniteD);
  porch.position.set(0,4.4,9.6); g.add(porch);
  for(let i=-2.5;i<=2.5;i++){
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.48,6.4,8), granite);
    col.position.set(i*2.1,8.2,10.6); g.add(col);
  }
  const entab=new THREE.Mesh(new THREE.BoxGeometry(13.4,1.1,4.9), granite);
  entab.position.set(0,11.9,10.2); g.add(entab);
  const pedShape=new THREE.Shape();
  pedShape.moveTo(-6.7,0); pedShape.lineTo(6.7,0); pedShape.lineTo(0,3); pedShape.lineTo(-6.7,0);
  const pediment=new THREE.Mesh(new THREE.ExtrudeGeometry(pedShape,{depth:1.4,bevelEnabled:false}), granite);
  pediment.position.set(0,12.4,9.6); g.add(pediment);
  /* the grand staircase */
  [[17,7,0.9],[14,5.4,1.9],[11,3.8,2.9]].forEach(([sw,sd,sy])=>{
    const st=new THREE.Mesh(new THREE.BoxGeometry(sw,1,sd), graniteD);
    st.position.set(0,sy,12.5+sd*0.35); g.add(st);
  });
  /* two-tier blue-gray drum, then gold */
  const drum1=new THREE.Mesh(new THREE.CylinderGeometry(5.6,6,4.6,12), lambert(0x8fa3b0));
  drum1.position.y=15.3; g.add(drum1);
  const drum2=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.8,4.4,12), lambert(0x9fb3c0));
  drum2.position.y=19.8; g.add(drum2);
  for(let i=0;i<10;i++){                          // colonnade ring on tier two
    const a=i/10*Math.PI*2;
    const c=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,4,5), lambert(0xc8d4dc));
    c.position.set(Math.cos(a)*4.6,19.8,Math.sin(a)*4.6); g.add(c);
  }
  const dome=new THREE.Mesh(new THREE.SphereGeometry(4.9,12,10), lambert(0xf0b429,{emissive:0x664400}));
  dome.scale.y=1.2; dome.position.y=25.4; g.add(dome);
  const lantern=new THREE.Mesh(new THREE.CylinderGeometry(1,1.2,2.6,8), lambert(0xd8c890));
  lantern.position.y=31.6; g.add(lantern);
  const cap=new THREE.Mesh(new THREE.SphereGeometry(1,8,6), lambert(0xffd166,{emissive:0x775500}));
  cap.scale.y=1.3; cap.position.y=33.8; g.add(cap);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,15);
  const f={x:Math.sin(def.ry||0), z:Math.cos(def.ry||0)};
  ctx.solid(def.x+f.x*13, def.z+f.z*13, 6);       // the staircase mass
  ctx.exclude(def.x,def.z,24);
};

/* a BRT median station: low platform between the bus lanes with a
   shelter canopy, BRT sign, and waiting riders — a hard obstacle if you
   stray across the centerline */
B.brtStation = (ctx, def) => {
  const p=ctx.trackPoint(def.t), tan=ctx.trackTangent(def.t);
  const g=new THREE.Group();
  g.position.set(p.x,0,p.z);
  g.rotation.y=Math.atan2(tan.x,tan.z);
  const platform=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.5,13), lambert(0xc9c4b8));
  platform.position.y=0.25; g.add(platform);
  [-4.5,4.5].forEach(pz=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,3.2,5), lambert(0xb0402f));
    post.position.set(0,1.6,pz); g.add(post);
  });
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.2,11), lambert(0xb0402f));
  roof.position.y=3.3; g.add(roof);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.8),
    new THREE.MeshBasicMaterial({map:bannerTex('COLFAX BRT','#b0402f','#f5f0e6'),
      side:THREE.DoubleSide}));
  sign.rotation.y=Math.PI;               // face the oncoming racers
  sign.position.set(0,3.9,0); g.add(sign);
  const shirts=[0xe84855,0xffd166,0x2e86ab];
  for(let i=0;i<3;i++){
    const w=makePerson(ctx.rng, shirts[i], 'stand');
    w.scale.setScalar(0.9);
    w.position.set(0,0.5,-3.5+i*3.2); w.rotation.y=(i%2?1:-1)*Math.PI/2;
    g.add(w);
  }
  ctx.scene.add(g);
  const f={x:Math.sin(g.rotation.y), z:Math.cos(g.rotation.y)};
  [-4.5,0,4.5].forEach(k=> ctx.solid(p.x+f.x*k, p.z+f.z*k, 0.9));
};

/* BRT construction: a cone taper closing the outer lane, striped
   barricades (solid), dirt, and an excavator arm silhouette */
B.constructionZone = (ctx, def) => {
  const side=def.side||1;
  const steps=10;
  const coneM=lambert(0xe8622d), coneW=lambert(0xf5f0e6);
  for(let i=0;i<=steps;i++){
    const t=def.t0+(def.t1-def.t0)*i/steps;
    const p=ctx.trackPoint(t), tan=ctx.trackTangent(t);
    const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
    /* taper: from the curb line in toward the centerline, then hold */
    const lat=(ctx.roadHalf-0.6) - Math.min(1,i/4)*(ctx.roadHalf*0.55);
    const cone=new THREE.Group();
    const c1=new THREE.Mesh(new THREE.ConeGeometry(0.32,0.75,7), coneM);
    c1.position.y=0.38; cone.add(c1);
    const band=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.14,7), coneW);
    band.position.y=0.42; cone.add(band);
    cone.position.set(p.x+n.x*lat*side, 0, p.z+n.z*lat*side);
    ctx.scene.add(cone);
  }
  /* barricades + dirt + the digger in the closed lane */
  const midT=(def.t0+def.t1)/2;
  const p=ctx.trackPoint(midT), tan=ctx.trackTangent(midT);
  const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
  const lat=ctx.roadHalf*0.72;
  const bx=p.x+n.x*lat*side, bz=p.z+n.z*lat*side;
  const g=new THREE.Group();
  g.position.set(bx,0,bz);
  g.rotation.y=Math.atan2(tan.x,tan.z);
  const stripeTex=pixTex(16,(gg,px)=>{
    for(let i=0;i<px;i+=4){ gg.fillStyle=i%8?'#e8622d':'#f5f0e6'; gg.fillRect(i,0,4,px); }
  },2,1);
  [-5,5].forEach(pz=>{
    const bar=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.5,0.2),
      new THREE.MeshLambertMaterial({map:stripeTex}));
    bar.position.set(0,0.8,pz); g.add(bar);
    [[-0.8],[0.8]].forEach(([lx])=>{
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.8,0.12), lambert(0xe8622d));
      leg.position.set(lx,0.4,pz); g.add(leg);
    });
  });
  const dirt=new THREE.Mesh(new THREE.CircleGeometry(2.2,9), new THREE.MeshLambertMaterial({map:sandTex}));
  dirt.rotation.x=-Math.PI/2; dirt.position.set(0,0.03,-1); g.add(dirt);
  /* mini excavator */
  const cab=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.4,2), lambert(0xd9a520));
  cab.position.set(0,1,1.5); g.add(cab);
  const boom=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,2.4), lambert(0xd9a520));
  boom.rotation.x=-0.6; boom.position.set(0,1.9,3); g.add(boom);
  const bucket=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.6), lambert(0x8a8275));
  bucket.position.set(0,1.1,4.2); g.add(bucket);
  const tracks=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.6,2.4), lambert(0x3a3a3a));
  tracks.position.set(0,0.3,1.5); g.add(tracks);
  ctx.scene.add(g);
  [-5,0,5].forEach(k=>{
    const f={x:Math.sin(g.rotation.y), z:Math.cos(g.rotation.y)};
    ctx.solid(bx+f.x*k, bz+f.z*k, 1.3);
  });
};

/* the continuous Colfax street wall: walks the spline from t0 to t1 and
   seals BOTH curbs with filler storefronts, skipping anywhere an existing
   prop holds an exclusion (venues, gateway, diners keep their room) and
   leaving occasional parking-lot gaps. Place LAST among the curb props so
   every landmark's exclusion is already registered. */
/* Voodoo Doughnut — the pink one. Giant doughnut on a pole outside. */
B.voodoo = (ctx, def) => {
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(14,6.5,10), lambert(0xd94f8a));
  body.position.y=3.25; g.add(body);
  const band=new THREE.Mesh(new THREE.BoxGeometry(14.2,1.1,10.2), lambert(0x3a2340));
  band.position.y=6.0; g.add(band);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(11,1.6),
    new THREE.MeshBasicMaterial({map:bannerTex('VOODOO DOUGHNUT','#3a2340','#ff9ac4')}));
  sign.position.set(0,6.0,5.15); g.add(sign);
  const sub=new THREE.Mesh(new THREE.PlaneGeometry(8.5,0.9),
    new THREE.MeshBasicMaterial({map:bannerTex('GOOD THINGS COME IN PINK','#d94f8a','#f5f0e6')}));
  sub.position.set(0,4.6,5.05); g.add(sub);
  /* the pole doughnut: tan cake, pink frosting, sprinkles */
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.18,7,6), lambert(0x2b2b33));
  pole.position.set(8.4,3.5,3.5); g.add(pole);
  const donut=new THREE.Group();
  const cake=new THREE.Mesh(new THREE.TorusGeometry(1.7,0.62,8,14), lambert(0xc9995c));
  donut.add(cake);
  const frost=new THREE.Mesh(new THREE.TorusGeometry(1.7,0.5,8,14), lambert(0xff6fa8));
  frost.position.z=0.22; donut.add(frost);
  const sprinkleC=[0xffd166,0x2e86ab,0x7fd18a,0xf5e9d0];
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2;
    const sp=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.34,0.1), lambert(sprinkleC[i%4]));
    sp.position.set(Math.cos(a)*1.7, Math.sin(a)*1.7, 0.74);
    sp.rotation.z=a+0.7; donut.add(sp);
  }
  donut.position.set(8.4,8.2,3.5); g.add(donut);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,8); ctx.exclude(def.x,def.z,10);
};

/* Argonaut Wine & Liquor — the long low landmark with the huge red letters */
B.argonaut = (ctx, def) => {
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(26,5.5,12), lambert(0xefe8da));
  body.position.y=2.75; g.add(body);
  const parapet=new THREE.Mesh(new THREE.BoxGeometry(26.4,0.7,12.4), lambert(0xdcd2c0));
  parapet.position.y=5.6; g.add(parapet);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(20,2.4),
    new THREE.MeshBasicMaterial({map:bannerTex('ARGONAUT','#f5f0e6','#c23b22')}));
  sign.position.set(0,7.0,0); g.add(sign);
  const back=sign.clone(); back.rotation.y=Math.PI; back.position.z=-0.05; g.add(back);
  const sub=new THREE.Mesh(new THREE.PlaneGeometry(12,1.0),
    new THREE.MeshBasicMaterial({map:bannerTex('WINE & LIQUOR','#c23b22','#f5f0e6')}));
  sub.position.set(0,4.4,6.05); g.add(sub);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(24,0.25,2.4), lambert(0xc23b22));
  canopy.position.set(0,3.6,7.0); g.add(canopy);
  /* the famous parking lot out front */
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(24,7), lambert(0x39393f));
  apron.rotation.x=-Math.PI/2; apron.position.set(0,0.012,10.2); g.add(apron);
  [-7,0,7].forEach((cx,i)=>{
    const car=makeCar(ctx.rng);
    car.position.set(cx,0,10.2); car.rotation.y=Math.PI/2+(ctx.rng()-0.5)*0.1;
    g.add(car);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,10); ctx.exclude(def.x,def.z,14);
};

/* vintage Colfax motor-court neon: vertical MOTEL blade + bulb arrow */
B.motelSign = (ctx, def) => {
  const g=new THREE.Group();
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,9,6), lambert(0x2b2b33));
  pole.position.y=4.5; g.add(pole);
  const c=document.createElement('canvas'); c.width=48; c.height=160;
  const cg=c.getContext('2d');
  cg.fillStyle='#1e2b4a'; cg.fillRect(0,0,48,160);
  cg.strokeStyle='#7fd7e8'; cg.lineWidth=2; cg.strokeRect(2,2,44,156);
  cg.fillStyle='#7fd7e8'; cg.font='bold 26px monospace';
  cg.textAlign='center';
  'MOTEL'.split('').forEach((ch,i)=> cg.fillText(ch,24,30+i*30));
  const tex=new THREE.CanvasTexture(c); tex.magFilter=THREE.NearestFilter;
  const blade=new THREE.Mesh(new THREE.PlaneGeometry(1.9,6.2),
    new THREE.MeshBasicMaterial({map:tex, side:THREE.DoubleSide}));
  blade.position.set(0,6.2,0); blade.rotation.y=Math.PI/2; g.add(blade);
  const vac=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.7),
    new THREE.MeshBasicMaterial({map:bannerTex(def.no?'NO VACANCY':'VACANCY','#1e2b4a','#e84855'),
      side:THREE.DoubleSide}));
  vac.position.set(0,2.6,0); vac.rotation.y=Math.PI/2; g.add(vac);
  /* bulb arrow pointing in at the office */
  for(let i=0;i<5;i++){
    const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.09,0),
      new THREE.MeshBasicMaterial({color:0xffd166}));
    b.position.set(0, 9.6-i*0.55, 0.6+i*0.32); g.add(b);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,0.6);
};

/* end-of-stage chute terminus: checkered barrier wall across the road,
   flag poles, and a MILE HIGH CRIT header — an intentional full stop */
B.endBarrier = (ctx, def) => {
  const g=new THREE.Group();
  const w=def.w||18, n=Math.round(w/1.2);
  for(let i=0;i<n;i++){
    const seg=new THREE.Mesh(new THREE.BoxGeometry(w/n-0.06,1.1,0.5),
      lambert(i%2?0x1a1423:0xf5f0e6));
    seg.position.set(-w/2+(i+0.5)*(w/n),0.55,0); g.add(seg);
  }
  const header=new THREE.Mesh(new THREE.PlaneGeometry(w*0.7,1.5),
    new THREE.MeshBasicMaterial({map:bannerTex(def.text||'MILE HIGH CRIT','#4b2d5e','#ffd166'),
      side:THREE.DoubleSide}));
  header.position.y=3.4; g.add(header);
  [-w/2,w/2].forEach(px=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,4.2,6), lambert(0x2b2b33));
    pole.position.set(px,2.1,0); g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.3,0.8),
      new THREE.MeshBasicMaterial({map:bannerTex('🏁','#f5f0e6','#1a1423'), side:THREE.DoubleSide}));
    flag.position.set(px+0.7,3.9,0); g.add(flag);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,2);
};

B.colfaxWall = (ctx, def) => {
  /* Colfax palette: more faded stucco and dingy brick than boutique */
  const paints=[0xc9a06a,0x8a4a3a,0xa39a88,0x8f8878,0xb0402f,0x6a6a62,0x9b6b53,0x7a6a5a,
                0xbcae94,0x5a5a52];
  const awnings=[0xe84855,0x2e86ab,0xffd166,0x5d8f4a,0xe8622d,0x8a8275];
  for(const side of [-1,1]){
    let t=def.t0, i=0;
    while(t<def.t1){
      const w=5+ctx.rng()*4;
      const p=ctx.trackPoint(t), tan=ctx.trackTangent(t);
      const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
      /* uneven setbacks: some lots pull back from the curb line */
      const setback=ctx.rng()<0.3 ? 1.5+ctx.rng()*2.5 : 0;
      const px=p.x+n.x*(ctx.roadHalf+5.2+setback)*side,
            pz=p.z+n.z*(ctx.roadHalf+5.2+setback)*side;
      const roll=ctx.rng();
      if(roll<(def.gaps||0.12)){
        /* a parking apron instead of a building: striped pad + a car */
        const ap=new THREE.Group();
        const pad=new THREE.Mesh(new THREE.PlaneGeometry(w+2,8), lambert(0x7c7c7a));
        pad.rotation.x=-Math.PI/2; pad.position.y=0.012; ap.add(pad);
        if(ctx.rng()<0.6){
          const c=makeCar(ctx.rng);
          c.position.set((ctx.rng()-0.5)*2,0,1);
          c.rotation.y=Math.PI/2+(ctx.rng()-0.5)*0.2; ap.add(c);
        }
        ap.position.set(px,0,pz);
        ap.rotation.y=Math.atan2(-n.x*side, -n.z*side);
        ctx.scene.add(ap);
      }
      else if(ctx.clearOfExclusions(new THREE.Vector3(px,0,pz), 3) &&
              ctx.clearOfRoad(new THREE.Vector3(px,0,pz), 4) &&
              ctx.clearOfStreets(new THREE.Vector3(px,0,pz), 5)){
        const g=new THREE.Group();
        const shallow=ctx.rng()<0.25;                 // squat one-story sheds
        const h=shallow ? 2.6+ctx.rng() : 3.5+ctx.rng()*3;
        const d=shallow ? 5 : 7;
        const bodyH=(!shallow && ctx.rng()<0.22) ? h+2.5 : h;
        const body=new THREE.Mesh(new THREE.BoxGeometry(w,bodyH,d),
          lambert(paints[(i*7+(side>0?3:0))%10]));
        body.position.y=bodyH/2; g.add(body);
        if(ctx.rng()<0.6){                            // some parapets, not all
          const parapet=new THREE.Mesh(new THREE.BoxGeometry(w+0.2,0.35,d+0.2),
            lambert(ctx.rng()<0.5?0xd8d2c5:0x8f8878));
          parapet.position.y=bodyH+0.17; g.add(parapet);
        }
        const win=new THREE.Mesh(new THREE.BoxGeometry(w*0.7,1.4,0.1), lambert(0x2e3440));
        win.position.set(0,1.35,d/2+0.06); g.add(win);
        if(ctx.rng()<0.35){
          const awn=new THREE.Mesh(new THREE.BoxGeometry(w*0.82,0.16,1.3), lambert(awnings[i%6]));
          awn.rotation.x=0.35; awn.position.set(0,2.5,d/2+0.55); g.add(awn);
        }
        if(ctx.rng()<0.25){
          const sign=new THREE.Mesh(new THREE.BoxGeometry(w*0.5,0.8,0.12), lambert(awnings[(i+2)%6]));
          sign.position.set(0,bodyH-0.7,d/2+0.08); g.add(sign);
        }
        g.position.set(px,0,pz);
        g.rotation.y=Math.atan2(-n.x*side, -n.z*side);   // face the road
        ctx.scene.add(g);
        ctx.solid(px,pz,w/2+0.8);
      }
      t += (w+0.6)/ctx.trackLength;
      i++;
    }
  }
};

/* DEV ONLY: a floating magenta label over a landmark (crossed planes so it
   reads from any angle). Strip these track entries before finalizing. */
B.devLabel = (ctx, def) => {
  /* only in flycam or with ?labels=1 — they overpower the real cues */
  if(!location.pathname.includes('flycam') &&
     new URLSearchParams(location.search).get('labels')!=='1') return;
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({map:bannerTex(def.text,'#d81b8c','#ffffff'),
    side:THREE.DoubleSide, transparent:true, opacity:0.92});
  const w = def.w||22;
  const a = new THREE.Mesh(new THREE.PlaneGeometry(w,w/4), mat); g.add(a);
  const b2 = new THREE.Mesh(new THREE.PlaneGeometry(w,w/4), mat);
  b2.rotation.y = Math.PI/2; g.add(b2);
  g.position.set(def.x, def.y||40, def.z);
  ctx.scene.add(g);
};

/* a LoDo brick warehouse block: arched windows, cornice, optional painted
   ghost sign and rooftop water tower (Dairy Block, Wynkoop, REI…) */
B.brickBlock = (ctx, def) => {
  const g = new THREE.Group();
  const w=def.w||18, d=def.d||13, h=def.h||10;
  const bricks=['#8a4a3a','#9a5a44','#7a4034','#a3664e'];
  const bc = def.color || bricks[Math.floor(ctx.rng()*4)];
  const tex = pixTex(32,(gg,px)=>{
    gg.fillStyle=bc; gg.fillRect(0,0,px,px);
    gg.fillStyle='rgba(0,0,0,0.15)';
    for(let y=0;y<px;y+=3) gg.fillRect(0,y,px,1);
    for(let wy=4; wy<px-3; wy+=9)          // arched window rows
      for(let wx=2; wx<px-4; wx+=6){
        gg.fillStyle = Math.random()<0.12 ? '#ffd166' : '#33262b';
        gg.fillRect(wx,wy+1,4,5);
        gg.beginPath(); gg.arc(wx+2,wy+1,2,Math.PI,0); gg.fill();
      }
  }, Math.max(1,Math.round(w/9)), Math.max(1,Math.round(h/7)));
  const body = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshLambertMaterial({map:tex}));
  body.position.y=h/2; g.add(body);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w+0.8,0.7,d+0.8), lambert(0xd8d2c5));
  cornice.position.y=h+0.35; g.add(cornice);
  if(def.sign){                              // painted wall sign facing +z
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-2,12),2.4),
      new THREE.MeshLambertMaterial({map:bannerTex(def.sign, def.signBg||'#5a3428', def.signFg||'#e8d9b0'),
        side:THREE.DoubleSide}));
    sp.position.set(0,h-2,d/2+0.09); g.add(sp);
  }
  if(def.waterTower){
    const wt = new THREE.Group();
    [[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]].forEach(([lx,lz])=>{
      const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.2,4), lambert(0x4a3a30));
      leg.position.set(lx,1.1,lz); wt.add(leg);
    });
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,2.4,8), lambert(0x6e4b2a));
    tank.position.y=3.2; wt.add(tank);
    const lid=new THREE.Mesh(new THREE.ConeGeometry(1.7,1.1,8), lambert(0x4a3a30));
    lid.position.y=4.9; wt.add(lid);
    wt.position.set(w*0.28,h,d*0.15); g.add(wt);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,Math.max(w,d)/2+1.5);
  ctx.exclude(def.x,def.z,Math.max(w,d)/2+3);
};

/* transparent-background text textures for the free-standing neon sign */
function neonTex(text, color, arcR){
  const c=document.createElement('canvas'); c.width=1024; c.height=512;
  const g=c.getContext('2d');
  g.font='bold 108px Arial, "Helvetica Neue", sans-serif';
  g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=color;
  if(arcR){                                  // letters marching along an arc
    const span=2.15, cx=512, cy=arcR+120;
    for(let i=0;i<text.length;i++){
      const a=-span/2 + span*(i/(text.length-1));
      g.save();
      g.translate(cx+Math.sin(a)*arcR, cy-Math.cos(a)*arcR);
      g.rotate(a);
      g.fillText(text[i],0,0);
      g.restore();
    }
  } else {
    g.fillText(text,512,256);
  }
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.anisotropy=8;
  return t;
}

/* Union Station: the Beaux-Arts terminal — pale stone center hall with
   THREE great arched windows, incised name in the frieze, dentiled cornice
   and balustrade, the black Crawford marquee, and the free-standing arched
   orange neon sign with the clock at its crown. Front is local +z. */
B.unionStation = (ctx, def) => {
  const g = new THREE.Group();
  const cream = lambert(0xddd8ca), stone = lambert(0xcfc9ba);
  /* center hall: three two-story arched windows between pilasters */
  const centerTex = pixTex(64,(gg,px)=>{
    gg.fillStyle='#ddd8ca'; gg.fillRect(0,0,px,px);
    [0.22,0.5,0.78].forEach(cx=>{
      const w=px*0.15;
      gg.fillStyle='#3a3a44';
      gg.fillRect(px*cx-w/2, px*0.32, w, px*0.5);
      gg.beginPath(); gg.arc(px*cx, px*0.34, w/2, Math.PI, 0); gg.fill();
      gg.strokeStyle='#ddd8ca'; gg.lineWidth=1;    // fan + muntins
      gg.beginPath(); gg.moveTo(px*cx, px*0.20); gg.lineTo(px*cx, px*0.82); gg.stroke();
      gg.beginPath(); gg.moveTo(px*cx-w/2, px*0.5); gg.lineTo(px*cx+w/2, px*0.5); gg.stroke();
    });
    gg.fillStyle='#c4beae';                        // pilaster shadows
    [0.085,0.36,0.64,0.915].forEach(cx=> gg.fillRect(px*cx-1, px*0.18, 2, px*0.68));
  });
  const center = new THREE.Mesh(new THREE.BoxGeometry(20,14,10),
    [stone,stone,stone,stone,new THREE.MeshLambertMaterial({map:centerTex}),stone]);
  center.position.y=7; g.add(center);
  /* incised UNION STATION in the frieze over the arches */
  const frieze = new THREE.Mesh(new THREE.PlaneGeometry(10,0.9),
    new THREE.MeshLambertMaterial({map:bannerTex('UNION STATION','#ddd8ca','#6a655a'),
      side:THREE.DoubleSide}));
  frieze.position.set(0,12.6,5.06); g.add(frieze);
  /* dentiled cornice + balustrade parapet */
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(21.4,0.7,10.8), cream);
  cornice.position.y=13.9; g.add(cornice);
  for(let bx=-9.5; bx<=9.5; bx+=1.9){
    const bal=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.7,0.28), cream);
    bal.position.set(bx,14.6,5.1); g.add(bal);
  }
  const balRail = new THREE.Mesh(new THREE.BoxGeometry(20.4,0.2,0.4), cream);
  balRail.position.set(0,15.0,5.1); g.add(balRail);
  /* wings with tall arched-window rows */
  const wingTex = pixTex(32,(gg,px)=>{
    gg.fillStyle='#efe6d4'; gg.fillRect(0,0,px,px);
    for(let wx=3; wx<px-4; wx+=8){
      gg.fillStyle='#3a3a44'; gg.fillRect(wx,px*0.3,5,px*0.5);
      gg.beginPath(); gg.arc(wx+2.5,px*0.3,2.5,Math.PI,0); gg.fill();
    }
  }, 2, 1);
  [-1,1].forEach(s=>{
    const wing = new THREE.Mesh(new THREE.BoxGeometry(17,9,9),
      new THREE.MeshLambertMaterial({map:wingTex}));
    wing.position.set(s*18,4.5,0.3); g.add(wing);
    const wcap = new THREE.Mesh(new THREE.BoxGeometry(17.8,0.9,9.8), cream);
    wcap.position.set(s*18,9.4,0.3); g.add(wcap);
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,3.4,4), lambert(0x8a8275));
    flag.position.set(s*18,11.5,0.3); g.add(flag);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.9),
      new THREE.MeshLambertMaterial({color:s<0?0xc75146:0x2e5a8f, side:THREE.DoubleSide}));
    cloth.position.set(s*18+0.85,12.6,0.3); g.add(cloth);
  });
  /* THE sign: free-standing orange letters marching over a steel arc,
     the clock at the crown, TRAVEL by TRAIN straight beneath */
  const sign = new THREE.Group();
  const steel = lambert(0x3a3230);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(6.4,0.09,5,28,Math.PI*0.86), steel);
  arc.rotation.z = Math.PI*0.07; sign.add(arc);
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(16.5,8.25),
    new THREE.MeshBasicMaterial({map:neonTex('UNION STATION','#ff8c3a',330),
      transparent:true, side:THREE.DoubleSide}));
  letters.position.y=3.1; sign.add(letters);
  const sub = new THREE.Mesh(new THREE.PlaneGeometry(11,5.5),
    new THREE.MeshBasicMaterial({map:neonTex('TRAVEL by TRAIN','#ffb066',0),
      transparent:true, side:THREE.DoubleSide}));
  sub.position.y=1.6; sign.add(sub);
  /* the clock at the crown of the arch */
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.05,1.3,18), steel);
  ring.position.set(0,4.9,0.02); sign.add(ring);
  const face=new THREE.Mesh(new THREE.CircleGeometry(1.05,18), lambert(0xf7f3e8));
  face.position.set(0,4.9,0.01); sign.add(face);
  [[0.55,0],[0.30,2.1]].forEach(([len,rot])=>{
    const hand=new THREE.Mesh(new THREE.PlaneGeometry(0.12,len*2), lambert(0x1a1423));
    hand.rotation.z=rot; hand.position.set(0,4.9,0.03); sign.add(hand);
  });
  /* lattice posts holding the arc off the parapet */
  [-5.6,-2,2,5.6].forEach(px=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.22,2.4,0.22), steel);
    post.position.set(px,0.6,0); sign.add(post);
  });
  /* quartered toward the start straight so the grid reads it head-on */
  sign.position.set(0,14.8,1.5); sign.rotation.y=-0.45; g.add(sign);
  /* the black Crawford marquee across the ground floor */
  const marquee=new THREE.Mesh(new THREE.BoxGeometry(18.5,0.55,2.2), lambert(0x211d1b));
  marquee.position.set(0,4.4,6.0); g.add(marquee);
  const marqueeSign=new THREE.Mesh(new THREE.PlaneGeometry(7,0.75),
    new THREE.MeshLambertMaterial({map:bannerTex('THE CRAWFORD','#211d1b','#e8e2d2'),
      side:THREE.DoubleSide}));
  marqueeSign.position.set(0,4.4,7.15); g.add(marqueeSign);
  /* flag pole on the plaza axis */
  const flagTex = pixTex(16,(gg,px)=>{
    gg.fillStyle='#f5f0e6'; gg.fillRect(0,0,px,px);
    gg.fillStyle='#c75146';
    for(let y=0;y<px;y+=4) gg.fillRect(0,y,px,2);
    gg.fillStyle='#2e5a8f'; gg.fillRect(0,0,px*0.45,px*0.5);
  });
  const fpole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,10,5), lambert(0x8a8275));
  fpole.position.set(0,5,10.5); g.add(fpole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.1),
    new THREE.MeshLambertMaterial({map:flagTex, side:THREE.DoubleSide}));
  flag.position.set(1.05,9.3,10.5); g.add(flag);
  /* plaza out front: pavers, café umbrellas, a little crowd */
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(46,9), lambert(0xbdb6a8));
  plaza.rotation.x=-Math.PI/2; plaza.position.set(0,0.014,9.5); g.add(plaza);
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9];
  for(let i=0;i<7;i++){
    const p=makePerson(ctx.rng, shirts[i%5], ctx.rng()<0.4?'cheer':'stand');
    p.position.set(-16+i*5.4+(ctx.rng()-0.5)*2, 0, 8+(ctx.rng()-0.5)*3);
    p.rotation.y=ctx.rng()*6.28; g.add(p);
    ctx.dynamic.fans.push({m:p, baseY:0, baseRot:p.rotation.y, phase:ctx.rng()*6.28, amp:0.14});
  }
  [-10,4,14].forEach(ux=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.4,4), lambert(0x8a8275));
    pole.position.set(ux,1.2,10.5); g.add(pole);
    const um=new THREE.Mesh(new THREE.ConeGeometry(1.5,0.8,6), lambert(0xc75146));
    um.position.set(ux,2.6,10.5); g.add(um);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,30);
  /* three small colliders hug the building line so the collision field
     never spills onto the Wynkoop straight out front */
  if(!def.noCollision){
    ctx.solid(def.x-22,def.z,12);
    ctx.solid(def.x,def.z,13);
    ctx.solid(def.x+22,def.z,12);
  }
};

/* Coors Field: a curved brick facade chunk with arched gates, the dark-green
   sign, and steel light towers peeking over the wall. Front faces local +z. */
B.coorsField = (ctx, def) => {
  const g = new THREE.Group();
  const brickTex = pixTex(32,(gg,px)=>{
    gg.fillStyle='#8a4434'; gg.fillRect(0,0,px,px);
    gg.fillStyle='rgba(0,0,0,0.16)';
    for(let y=0;y<px;y+=3) gg.fillRect(0,y,px,1);
    for(let wx=2; wx<px-5; wx+=8){               // grand arched gates
      gg.fillStyle='#2b2126'; gg.fillRect(wx,px*0.45,6,px*0.5);
      gg.beginPath(); gg.arc(wx+3,px*0.45,3,Math.PI,0); gg.fill();
    }
    gg.fillStyle='#d8d2c5'; gg.fillRect(0,px*0.18,px,2);   // stone stringcourse
  }, 6, 1);
  const wallM = new THREE.MeshLambertMaterial({map:brickTex, side:THREE.DoubleSide});
  /* shallow-arc facade out of three angled slabs */
  [[-24,3,-0.35],[0,0,0],[24,3,0.35]].forEach(([sx,sz,sry])=>{
    const slab = new THREE.Mesh(new THREE.BoxGeometry(25,15,2.2), wallM);
    slab.position.set(sx,7.5,-sz); slab.rotation.y=sry; g.add(slab);
  });
  /* upper deck hint behind the wall */
  const deck = new THREE.Mesh(new THREE.BoxGeometry(58,5,10), lambert(0x3f5a46));
  deck.position.set(0,17.5,-8); g.add(deck);
  /* the sign over the middle gates */
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(16,2.6),
    new THREE.MeshLambertMaterial({map:bannerTex('COORS FIELD','#1f3d2b','#f5f0e6'),
      side:THREE.DoubleSide}));
  sign.position.set(0,13.2,1.25); g.add(sign);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(1.3,16), lambert(0xf7f3e8));
  clock.position.set(0,16.2,1.2); g.add(clock);
  const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.18,1.7), lambert(0x1a1423));
  ch.rotation.z=2.2; ch.position.set(0,16.2,1.24); g.add(ch);
  /* steel light towers over the rim */
  [-30,-11,11,30].forEach(lx=>{
    const mast=new THREE.Mesh(new THREE.BoxGeometry(0.9,14,0.9), lambert(0x3a4a42));
    mast.position.set(lx,21,-6); g.add(mast);
    const bank=new THREE.Mesh(new THREE.BoxGeometry(5,2.6,0.7),
      lambert(0xf5f0e6, {emissive:0x555544}));
    bank.position.set(lx,29,-5.6); g.add(bank);
  });
  /* dark green steel canopy along the brick rim */
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(70,0.9,3), lambert(0x2c4a38));
  canopy.position.set(0,15.4,0.4); g.add(canopy);

  /* the 20th & Blake corner rotunda: round brick entry, clock, flags */
  const rot=new THREE.Mesh(new THREE.CylinderGeometry(6,6.4,17,10),
    new THREE.MeshLambertMaterial({map:brickTex}));
  rot.position.set(-32,8.5,2); g.add(rot);
  const rotCap=new THREE.Mesh(new THREE.CylinderGeometry(6.6,6.6,1,10), lambert(0x2c4a38));
  rotCap.position.set(-32,17.5,2); g.add(rotCap);
  const rotSign=new THREE.Mesh(new THREE.PlaneGeometry(9,1.6),
    new THREE.MeshBasicMaterial({map:bannerTex('GATE E','#2c4a38','#f5f0e6')}));
  rotSign.position.set(-32,14.6,8.6); g.add(rotSign);
  const rotClock=new THREE.Mesh(new THREE.CircleGeometry(1.5,16), lambert(0xf7f3e8));
  rotClock.position.set(-32,11.6,8.5); g.add(rotClock);
  const rch=new THREE.Mesh(new THREE.PlaneGeometry(0.2,1.9), lambert(0x1a1423));
  rch.rotation.z=1.1; rch.position.set(-32,11.6,8.55); g.add(rch);
  [-2.4,0,2.4].forEach((fx,i)=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,4,4), lambert(0xc9c4b8));
    pole.position.set(-32+fx,20,2); g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.4,0.9),
      new THREE.MeshLambertMaterial({map: i===1? coloradoFlagTex()
        : bannerTex('CR','#4b2d5e','#f5f0e6'), side:THREE.DoubleSide}));
    flag.position.set(-32+fx+0.75,21.3,2); g.add(flag);
  });

  /* the left-field scoreboard tower: purple ROCKIES board over the rim */
  const boardTex=(()=>{
    const c=document.createElement('canvas'); c.width=128; c.height=64;
    const gg=c.getContext('2d');
    gg.fillStyle='#4b2d5e'; gg.fillRect(0,0,128,64);
    gg.fillStyle='#f5f0e6';                       // snowy mountain silhouette
    gg.beginPath(); gg.moveTo(6,46); gg.lineTo(30,18); gg.lineTo(46,34);
    gg.lineTo(64,10); gg.lineTo(84,32); gg.lineTo(104,16); gg.lineTo(122,46);
    gg.closePath(); gg.fill();
    gg.fillStyle='#2c1a38'; gg.fillRect(0,46,128,18);
    gg.fillStyle='#f5f0e6'; gg.font='bold 15px monospace'; gg.textAlign='center';
    gg.fillText('ROCKIES',64,60);
    const tex=new THREE.CanvasTexture(c); tex.magFilter=THREE.NearestFilter; return tex;
  })();
  [-3.5,3.5].forEach(mx=>{
    const mast=new THREE.Mesh(new THREE.BoxGeometry(0.8,16,0.8), lambert(0x3a4a42));
    mast.position.set(22+mx,24,-14); g.add(mast);
  });
  const board=new THREE.Mesh(new THREE.PlaneGeometry(13,6.5),
    new THREE.MeshBasicMaterial({map:boardTex, side:THREE.DoubleSide}));
  board.position.set(22,30,-13.5); g.add(board);
  const boardTop=new THREE.Mesh(new THREE.BoxGeometry(14,0.6,1), lambert(0x3a4a42));
  boardTop.position.set(22,33.6,-14); g.add(boardTop);

  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,34); ctx.solid(def.x,def.z,22);
};

/* the Daniels & Fisher clocktower: slender tan shaft, four clock faces,
   arched belfry, pyramid cap */
B.dfTower = (ctx, def) => {
  /* Daniels & Fisher Tower — the Venetian campanile (photo ref):
     slender buff shaft with arched window strips, triple-arch loggia,
     clock section, steep pyramid roof, open lantern + gold ball + flag */
  const g = new THREE.Group();
  const tan = lambert(0xd8c8a8);
  const tanDk = lambert(0xc4b28e);

  /* shaft: slender, with two columns of arch-top windows per face */
  const shaftTex = pixTex(32,(gg,px)=>{
    gg.fillStyle='#d8c8a8'; gg.fillRect(0,0,px,px);
    for(let col=0; col<2; col++){
      const x = 7+col*14;
      for(let row=0; row<8; row++){
        const y = 2+row*4;
        gg.fillStyle='#3a3a44';
        gg.fillRect(x,y+1,4,2);
        gg.fillRect(x+1,y,2,1);       // arched head, one pixel proud
      }
    }
  }, 1, 3);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(5.4,27,5.4),
    new THREE.MeshLambertMaterial({map:shaftTex}));
  shaft.position.y=13.5+2; g.add(shaft);

  /* arched entrance base */
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.6,2.4,6.6), tan);
  base.position.y=1.2; g.add(base);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6,1.9,0.2), lambert(0x3a3a44));
  door.position.set(0,0.95,3.3); g.add(door);

  /* cornice, then the triple-arch loggia (the pink-lit arcade) */
  const cor1 = new THREE.Mesh(new THREE.BoxGeometry(6.4,0.7,6.4), tanDk);
  cor1.position.y=29.9; g.add(cor1);
  const loggiaCore = new THREE.Mesh(new THREE.BoxGeometry(4.6,3.6,4.6), lambert(0x2c2330));
  loggiaCore.position.y=32.1; g.add(loggiaCore);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2, ca=Math.cos(a), sa=Math.sin(a);
    for(const off of [-1.9,-0.63,0.63,1.9]){        // 4 columns = 3 bays
      const colM=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.16,3.4,5), tan);
      colM.position.set(sa*2.85+ca*off, 32.1, ca*2.85-sa*off);
      g.add(colM);
    }
  }
  const cor2 = new THREE.Mesh(new THREE.BoxGeometry(6.6,0.6,6.6), tanDk);
  cor2.position.y=34.2; g.add(cor2);

  /* clock section: framed faces with a little pediment on each side */
  const clockBox = new THREE.Mesh(new THREE.BoxGeometry(6.0,4.6,6.0), tan);
  clockBox.position.y=36.8; g.add(clockBox);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2, sa=Math.sin(a), ca=Math.cos(a);
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.0), tanDk.clone());
    panel.position.set(sa*3.02,36.8,ca*3.02); panel.rotation.y=a; g.add(panel);
    const face=new THREE.Mesh(new THREE.CircleGeometry(1.7,16), lambert(0xf7f3e8));
    face.position.set(sa*3.06,36.8,ca*3.06); face.rotation.y=a; g.add(face);
    const rim=new THREE.Mesh(new THREE.RingGeometry(1.55,1.8,16), lambert(0xb08d3e));
    rim.position.set(sa*3.07,36.8,ca*3.07); rim.rotation.y=a; g.add(rim);
    const hand=new THREE.Mesh(new THREE.PlaneGeometry(0.2,2.1), lambert(0x1a1423));
    hand.position.set(sa*3.1,36.9,ca*3.1); hand.rotation.y=a; hand.rotation.z=0.9;
    g.add(hand);
    const ped=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.5,0.3), tanDk);
    ped.position.set(sa*3.02+ca*0,39.3,ca*3.02); ped.rotation.y=a; g.add(ped);
  }
  const cor3 = new THREE.Mesh(new THREE.BoxGeometry(6.8,0.6,6.8), tanDk);
  cor3.position.y=39.4; g.add(cor3);

  /* steep pyramid roof with a tiny dormer on each face */
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6,7.4,4), tanDk);
  roof.rotation.y=Math.PI/4; roof.position.y=43.4; g.add(roof);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2, sa=Math.sin(a), ca=Math.cos(a);
    const dorm=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.9,0.2), tan);
    dorm.position.set(sa*2.2,42.0,ca*2.2); dorm.rotation.y=a; g.add(dorm);
  }

  /* open lantern, gold ball, and the flag */
  [[-0.9,-0.9],[0.9,-0.9],[-0.9,0.9],[0.9,0.9]].forEach(([lx,lz])=>{
    const c=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,1.5,5), tan);
    c.position.set(lx,47.7,lz); g.add(c);
  });
  const lanternCap=new THREE.Mesh(new THREE.ConeGeometry(1.5,0.9,4), tanDk);
  lanternCap.rotation.y=Math.PI/4; lanternCap.position.y=48.9; g.add(lanternCap);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.62,8,6),
    lambert(0xf0b429, {emissive:0x5a3d0e}));
  ball.position.y=49.9; g.add(ball);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2.4,4), lambert(0x8a8275));
  pole.position.y=51.4; g.add(pole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.0),
    new THREE.MeshLambertMaterial({map:coloradoFlagTex(), side:THREE.DoubleSide}));
  flag.position.set(0.8,52.1,0); g.add(flag);

  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,8); ctx.solid(def.x,def.z,5);
};


/* the Millennium Bridge: tilted white mast + cable stays over a deck that
   crosses above the road. Deck runs along local x. */
/* "I See What You Mean" — the Big Blue Bear, peering into the glass of
   the convention hall. Faceted low-poly parts = the sculpture's triangles. */
B.blueBear = (ctx, def) => {
  const g=new THREE.Group();
  /* the glass hall it peers into */
  const hallW=def.hallW||22, hallH=16, hallD=8;
  const glassTex=pixTex(32,(gg,px)=>{
    gg.fillStyle='#9cc4d8'; gg.fillRect(0,0,px,px);
    gg.strokeStyle='#5a7a8a'; gg.lineWidth=1;
    for(let x=0;x<=px;x+=4){ gg.beginPath(); gg.moveTo(x,0); gg.lineTo(x,px); gg.stroke(); }
    for(let y=0;y<=px;y+=6){ gg.beginPath(); gg.moveTo(0,y); gg.lineTo(px,y); gg.stroke(); }
  }, Math.max(1,Math.round(hallW/8)), 1);
  const hall=new THREE.Mesh(new THREE.BoxGeometry(hallW,hallH,hallD),
    new THREE.MeshLambertMaterial({map:glassTex}));
  hall.position.set(0,hallH/2,6.5); g.add(hall);
  const fascia=new THREE.Mesh(new THREE.BoxGeometry(hallW+0.6,1.0,hallD+0.6),
    lambert(0xf2f0ea));
  fascia.position.set(0,hallH+0.5,6.5); g.add(fascia);

  /* the bear (photo ref): steep lean into a MUCH taller glass hall.
     Glass plane sits at local z=2.5; paws and nose land exactly on it,
     paws at EYE level beside the head — peering in, not king-kong-ing. */
  const blue=lambert(0x5a6fd8);
  const bear=new THREE.Group();
  const L=0.28, bz=-2.3;                      // lean slope, stand-back
  const lz=(y,fw=0)=> y*L+fw+bz;
  const butt=new THREE.Mesh(new THREE.IcosahedronGeometry(2.2,0), blue);
  butt.scale.set(1.05,1.1,1); butt.position.set(0,4.2,lz(4.2,-0.4)); bear.add(butt);
  [[-1.05],[1.05]].forEach(([lx])=>{
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.0,3.6,5), blue);
    leg.position.set(lx,1.8,lz(1.8,-0.3)); leg.rotation.x=-0.2; bear.add(leg);
    const foot=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.7,2.1), blue);
    foot.position.set(lx,0.35,lz(0.35,0.6)); bear.add(foot);
  });
  const torso=new THREE.Mesh(new THREE.IcosahedronGeometry(2.6,0), blue);
  torso.scale.set(1.05,1.9,1.0);
  torso.position.set(0,7.4,lz(7.4)); torso.rotation.x=0.28; bear.add(torso);
  /* short arms: paws press the glass at eye level, beside the head */
  [[-1.7],[1.7]].forEach(([ax])=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.85,3.2,5), blue);
    arm.position.set(ax,9.5,lz(9.5,0.9)); arm.rotation.x=0.5; bear.add(arm);
    const paw=new THREE.Mesh(new THREE.IcosahedronGeometry(0.85,0), blue);
    paw.scale.set(1,1.2,0.5);
    paw.position.set(ax,10.9,lz(10.9,1.5)); bear.add(paw);
  });
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(1.5,0), blue);
  head.position.set(0,12.3,lz(12.3,0.7)); head.rotation.x=0.5; bear.add(head);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.7,1.3,5), blue);
  muzzle.position.set(0,11.6,lz(11.6,1.6)); muzzle.rotation.x=0.8; bear.add(muzzle);
  [[-0.7],[0.7]].forEach(([ex])=>{
    const ear=new THREE.Mesh(new THREE.IcosahedronGeometry(0.4,0), blue);
    ear.scale.set(1,1,0.6); ear.position.set(ex,13.5,lz(13.5,0.3)); bear.add(ear);
  });
  const tail=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,0), blue);
  tail.position.set(0,4.6,lz(4.6,-2.2)); bear.add(tail);
  g.add(bear);

  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.solid(def.x,def.z,2.4);
  ctx.exclude(def.x,def.z,Math.max(hallW,14)/2+3);
};

/* Wynkoop Plaza — the real scene in front of the terminal: splash
   fountain, Terminal Bar umbrellas, tree bosque in planters, flags,
   travelers with roller bags. Local +z faces the road. */
B.wynkoopPlaza = (ctx, def) => {
  const g=new THREE.Group();
  const paverTex=pixTex(32,(gg,px)=>{
    gg.fillStyle='#b8ad9c'; gg.fillRect(0,0,px,px);
    gg.strokeStyle='#a2977f'; gg.lineWidth=1;
    for(let x=0;x<=px;x+=4){ gg.beginPath(); gg.moveTo(x,0); gg.lineTo(x,px); gg.stroke(); }
    for(let y=0;y<=px;y+=4){ gg.beginPath(); gg.moveTo(0,y); gg.lineTo(px,y); gg.stroke(); }
  }, 6, 2);
  const pavers=new THREE.Mesh(new THREE.PlaneGeometry(44,11),
    new THREE.MeshLambertMaterial({map:paverTex}));
  pavers.rotation.x=-Math.PI/2; pavers.position.y=0.015; g.add(pavers);

  /* the splash fountain: wet circle + pop-up jets kids run through */
  const wet=new THREE.Mesh(new THREE.CircleGeometry(4.5,14), lambert(0x8fa8ae));
  wet.rotation.x=-Math.PI/2; wet.position.set(-11,0.03,1.2); g.add(wet);
  const jetM=new THREE.MeshLambertMaterial({color:0xdff2f6, transparent:true, opacity:0.7});
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2, r=i%2? 2.6 : 1.2;
    const h=0.8+ctx.rng()*1.6;
    const jet=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,h,5), jetM);
    jet.position.set(-11+Math.cos(a)*r, h/2, 1.2+Math.sin(a)*r); g.add(jet);
    const splash=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), jetM);
    splash.position.set(-11+Math.cos(a)*r, h+0.1, 1.2+Math.sin(a)*r); g.add(splash);
  }

  /* Terminal Bar patio: orange umbrellas, tables, stools */
  for(let i=0;i<3;i++){
    const ux=9+i*5, uz=-1.5+(i%2)*2;
    const table=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.08,8), lambert(0xf5f0e6));
    table.position.set(ux,0.9,uz); g.add(table);
    const tleg=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.9,5), lambert(0x2b2b33));
    tleg.position.set(ux,0.45,uz); g.add(tleg);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.6,5), lambert(0x8a8275));
    pole.position.set(ux,2.2,uz); g.add(pole);
    const um=new THREE.Mesh(new THREE.ConeGeometry(1.7,0.8,7), lambert(0xe8622d));
    um.position.set(ux,3.3,uz); g.add(um);
    [[-1.2,0.4],[1.1,-0.5]].forEach(([sx,sz])=>{
      const stool=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,0.55,6), lambert(0x4a5a6a));
      stool.position.set(ux+sx,0.28,uz+sz); g.add(stool);
    });
    ctx.solid(def.x+ux, def.z+uz, 1.2);
  }

  /* tree bosque in square planters, flanking the center walk */
  [[-20,-3],[-20,3],[20,-3],[20,3]].forEach(([tx,tz])=>{
    const planter=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.7,1.8), lambert(0x5a4030));
    planter.position.set(tx,0.35,tz); g.add(planter);
    const t=roundTree(ctx.rng, 0x4c7a3d);
    t.scale.setScalar(0.75); t.position.set(tx,0.5,tz); g.add(t);
    ctx.solid(def.x+tx, def.z+tz, 1.2);
  });

  /* twin flags: Colorado + the stars-and-stripes */
  const usTex=(()=>{
    const c=document.createElement('canvas'); c.width=24; c.height=16;
    const gg=c.getContext('2d');
    for(let i=0;i<8;i++){ gg.fillStyle=i%2?'#f5f0e6':'#c23b3b'; gg.fillRect(0,i*2,24,2); }
    gg.fillStyle='#2e4a8f'; gg.fillRect(0,0,10,8);
    gg.fillStyle='#f5f0e6';
    for(let y=1;y<8;y+=2) for(let x=1;x<10;x+=3) gg.fillRect(x,y,1,1);
    const tex=new THREE.CanvasTexture(c); tex.magFilter=THREE.NearestFilter; return tex;
  })();
  [[-16,3,'co'],[16,3,'us']].forEach(([fx,fz,kind])=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.11,9,5), lambert(0xc9c4b8));
    pole.position.set(fx,4.5,fz); g.add(pole);
    const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.6),
      new THREE.MeshLambertMaterial({map: kind==='co'? coloradoFlagTex() : usTex,
        side:THREE.DoubleSide}));
    flag.position.set(fx+1.3,8.0,fz); g.add(flag);
  });

  /* travelers rolling bags toward the doors */
  const shirts=[0xe84855,0x2e86ab,0xffd166];
  [[-4,-3,0.6],[1,-2,2.6],[5,1,-1.9]].forEach(([px,pz,ry],i)=>{
    const p=makePerson(ctx.rng, shirts[i], 'stand');
    p.position.set(px,0,pz); p.rotation.y=ry; g.add(p);
    const bag=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.75,0.35),
      lambert([0x4a5a6a,0x8a4a3a,0x2b2b33][i]));
    bag.position.set(px+Math.cos(ry)*0.7, 0.38, pz-Math.sin(ry)*0.7); g.add(bag);
    const handle=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.5,0.06), lambert(0x8a8275));
    handle.position.set(px+Math.cos(ry)*0.7, 0.95, pz-Math.sin(ry)*0.7); g.add(handle);
  });

  /* bike rack hoops by the east end */
  for(let i=0;i<3;i++){
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.06,5,10,Math.PI), lambert(0x2b2b33));
    hoop.position.set(19-i*1.2,0.55,-4.2); g.add(hoop);
  }

  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,16);
};

B.millenniumBridge = (ctx, def) => {
  const g = new THREE.Group();
  const white = lambert(0xf2f0ea);
  const span = def.span || 30;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(span,0.5,3.4), white);
  deck.position.y=6.2; g.add(deck);
  [-1,1].forEach(s=>{
    const rail=new THREE.Mesh(new THREE.BoxGeometry(span,0.7,0.12), lambert(0xd8d2c5));
    rail.position.set(0,6.9,s*1.6); g.add(rail);
  });
  /* stairs down at both ends */
  [-1,1].forEach(s=>{
    const stair=new THREE.Mesh(new THREE.BoxGeometry(6,0.4,3.2), white);
    stair.position.set(s*(span/2+2.6),3.4,0); stair.rotation.z=s*0.75; g.add(stair);
  });
  /* the leaning mast */
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.55,1.1,34,8), white);
  mast.position.set(-span/2+3,17,0); mast.rotation.z=0.30; g.add(mast);
  /* cable stays from high on the mast down along the deck */
  const anchor = new THREE.Vector3(-span/2+3-Math.sin(0.30)*30, 17+Math.cos(0.30)*13, 0);
  for(let i=1;i<=5;i++){
    const dx = -span/2+6+i*(span-8)/5;
    const from = anchor, to = new THREE.Vector3(dx,6.5,0);
    const mid = from.clone().lerp(to,0.5);
    const len = from.distanceTo(to);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,len,4), white);
    cable.position.copy(mid);
    cable.lookAt(to); cable.rotateX(Math.PI/2);
    g.add(cable);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  /* the mast base is a physical thing beside the road */
  const ry=def.ry||0, mx=def.x+Math.cos(ry)*(-span/2+3), mz=def.z-Math.sin(ry)*(-span/2+3);
  ctx.solid(mx,mz,1.6);
};

/* rail yard behind the terminal: dark ballast, rails, white platform
   canopies, and a parked A-Line train. Runs along local x. */
B.trainYard = (ctx, def) => {
  const g = new THREE.Group();
  const len = def.len || 46;
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(len,14), lambert(0x5a544c));
  bed.rotation.x=-Math.PI/2; bed.position.y=0.013; g.add(bed);
  for(let tr=0; tr<3; tr++){
    const z = -4.5+tr*4.5;
    [-0.8,0.8].forEach(rz=>{
      const rail=new THREE.Mesh(new THREE.BoxGeometry(len,0.12,0.16), lambert(0x8a8a92));
      rail.position.set(0,0.08,z+rz); g.add(rail);
    });
  }
  /* twin platform canopies on slim posts */
  [-2.2,6.8].forEach(cz=>{
    for(let x=-len/2+4; x<=len/2-4; x+=8){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,3.4,5), lambert(0xd8d2c5));
      post.position.set(x,1.7,cz); g.add(post);
    }
    const roof=new THREE.Mesh(new THREE.BoxGeometry(len-6,0.25,3.4), lambert(0xf2f0ea));
    roof.position.set(0,3.5,cz); g.add(roof);
  });
  /* the A-Line: white cars, blue band, red nose */
  const train = new THREE.Group();
  for(let c=0;c<3;c++){
    const car=new THREE.Mesh(new THREE.BoxGeometry(9.4,2.6,2.4), lambert(0xf2f0ea));
    car.position.set(-10.4+c*10.4,1.5,0); train.add(car);
    const band=new THREE.Mesh(new THREE.BoxGeometry(9.5,0.7,2.45), lambert(0x2e5a8f));
    band.position.set(-10.4+c*10.4,1.15,0); train.add(band);
    const roofline=new THREE.Mesh(new THREE.BoxGeometry(9.5,0.3,1.8), lambert(0x8a8275));
    roofline.position.set(-10.4+c*10.4,2.95,0); train.add(roofline);
  }
  const nose=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.2,2.2), lambert(0xc75146));
  nose.position.set(15.2,1.4,0); train.add(nose);
  train.position.set(0,0,0); g.add(train);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,Math.max(14,len/2)); ctx.solid(def.x,def.z,10);
};

/* a steel pedestrian arch bridge over the river (Highland Bridge white;
   pass color for the aqua Confluence arches) */
B.archBridge = (ctx, def) => {
  const g=new THREE.Group();
  const span=def.span||26;
  const white=lambert(def.color||0xf2f0ea);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.5,span), white);
  deck.position.y=3.4; g.add(deck);
  [-1,1].forEach(s=>{
    const rail=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.6,span), lambert(0xd8d2c5));
    rail.position.set(s*1.6,4.0,0); g.add(rail);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(span*0.42,0.35,6,16,Math.PI), white);
    arch.rotation.y=Math.PI/2;                       // stand the arc over the deck
    arch.position.set(s*1.9,3.4,0); g.add(arch);
  });
  [-1,1].forEach(s=>{
    const ramp=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.4,7.5), white);
    ramp.position.set(0,1.7,s*(span/2+3.2)); ramp.rotation.x=s*0.42; g.add(ramp);
  });
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
};

/* REI: the 1901 Denver Tramway Powerhouse — long red-brick hall with a
   curved stepped gable, giant round + arched windows, the white
   RECREATIONAL EQUIPMENT INC band, and a clerestory monitor roof.
   Front gable faces local +z (point it at the river). */
B.reiPowerhouse = (ctx, def) => {
  const g=new THREE.Group();
  const brick = lambert(0x8a4434), darkWin = lambert(0x2b2126);
  const sideTex = pixTex(32,(gg,px)=>{
    gg.fillStyle='#8a4434'; gg.fillRect(0,0,px,px);
    gg.fillStyle='rgba(0,0,0,0.15)';
    for(let y=0;y<px;y+=3) gg.fillRect(0,y,px,1);
    for(let wx=2; wx<px-5; wx+=8){                 // tall arched hall windows
      gg.fillStyle='#33262b'; gg.fillRect(wx,px*0.35,5,px*0.5);
      gg.beginPath(); gg.arc(wx+2.5,px*0.35,2.5,Math.PI,0); gg.fill();
    }
  }, 4, 1);
  const body = new THREE.Mesh(new THREE.BoxGeometry(16,9,26),
    new THREE.MeshLambertMaterial({map:sideTex}));
  body.position.y=4.5; g.add(body);
  /* gable roof + clerestory monitor ridge */
  [-1,1].forEach(sx=>{
    const slab=new THREE.Mesh(new THREE.BoxGeometry(9,0.4,26.6), lambert(0x9a9a92));
    slab.rotation.z=sx*0.42; slab.position.set(sx*4,10.7,0); g.add(slab);
  });
  const mon=new THREE.Mesh(new THREE.BoxGeometry(3.6,1.3,23), lambert(0xa8ccd4));
  mon.position.y=12.4; g.add(mon);
  const monCap=new THREE.Mesh(new THREE.BoxGeometry(4.2,0.3,23.6), lambert(0x8a8a82));
  monCap.position.y=13.1; g.add(monCap);
  /* the curved stepped gable parapet: tall arched center, quarter-round
     shoulders falling outward — same extrude trick as the Cash Register */
  const gz=13.2;
  const centerShape=new THREE.Shape();
  centerShape.moveTo(-4.5,0); centerShape.lineTo(4.5,0);
  centerShape.lineTo(4.5,11); centerShape.absarc(0,11,4.5,0,Math.PI,false);
  centerShape.lineTo(-4.5,0);
  const parapet=new THREE.Mesh(new THREE.ExtrudeGeometry(centerShape,{depth:0.9,bevelEnabled:false}), brick);
  parapet.position.set(0,0,gz-0.9); g.add(parapet);
  [-1,1].forEach(s=>{
    const sh=new THREE.Shape();
    sh.moveTo(0,0); sh.lineTo(0,9.5);
    sh.absarc(0,6.7,2.8,Math.PI/2,0,true); sh.lineTo(2.8,0); sh.lineTo(0,0);
    const wing=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:0.9,bevelEnabled:false}), brick);
    wing.scale.x=s; wing.position.set(s*4.5,0,gz-0.9); g.add(wing);
  });
  /* gable glazing: the big round window + flanking arches + lower arches */
  const round=new THREE.Mesh(new THREE.CircleGeometry(2.1,18), darkWin);
  round.position.set(0,10.6,gz+0.06); g.add(round);
  [-1,1].forEach(s=>{
    const aw=new THREE.Mesh(new THREE.BoxGeometry(1.5,3,0.1), darkWin);
    aw.position.set(s*5.6,6.8,gz); g.add(aw);
    const at=new THREE.Mesh(new THREE.CircleGeometry(0.75,10), darkWin);
    at.position.set(s*5.6,8.3,gz+0.06); g.add(at);
  });
  [-3,0,3].forEach(px=>{
    const lw=new THREE.Mesh(new THREE.BoxGeometry(1.6,3.4,0.1), darkWin);
    lw.position.set(px,3.2,gz+0.06); g.add(lw);
  });
  /* the white sign band across the arch */
  const band=new THREE.Mesh(new THREE.PlaneGeometry(11.5,1.3),
    new THREE.MeshLambertMaterial({map:bannerTex('RECREATIONAL EQUIPMENT INC','#f0ece0','#3a2a20'),
      side:THREE.DoubleSide}));
  band.position.set(0,13.4,gz+0.08); g.add(band);
  const rei=new THREE.Mesh(new THREE.PlaneGeometry(3,1.3),
    new THREE.MeshLambertMaterial({map:bannerTex('REI','#3e5a34','#f5f0e6'), side:THREE.DoubleSide}));
  rei.position.set(0,5.6,gz+0.08); g.add(rei);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.8,2.4,0.14), lambert(0x3a2a20));
  door.position.set(0,1.3,gz+0.05); g.add(door);
  /* riverside cafe patio: green umbrellas + a few people */
  [-4,0.5,4.5].forEach(ux=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.2,4), lambert(0x8a8275));
    pole.position.set(ux,1.1,gz+3.2); g.add(pole);
    const um=new THREE.Mesh(new THREE.ConeGeometry(1.4,0.7,6), lambert(0x2e5a3a));
    um.position.set(ux,2.4,gz+3.2); g.add(um);
  });
  const shirts=[0xe84855,0xffd166,0x2e86ab,0x5db3c9];
  for(let i=0;i<4;i++){
    const p=makePerson(ctx.rng, shirts[i%4], 'stand');
    p.position.set(-5+i*3.4, 0, gz+2.2+(ctx.rng()-0.5)*1.6);
    p.rotation.y=ctx.rng()*6.28; g.add(p);
    ctx.dynamic.fans.push({m:p, baseY:0, baseRot:p.rotation.y, phase:ctx.rng()*6.28, amp:0.1});
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  const f={x:Math.sin(def.ry||0), z:Math.cos(def.ry||0)};
  ctx.solid(def.x+f.x*6,def.z+f.z*6,9); ctx.solid(def.x-f.x*6,def.z-f.z*6,9);
  ctx.exclude(def.x,def.z,20);
};

/* Confluence Park: curved amphitheater steps down to the water, sitters
   and standers, railing above, whitewater foam in the chutes below.
   Steps open toward local +z (point that at the river). */
B.confluenceSteps = (ctx, def) => {
  const g=new THREE.Group();
  const conc = lambert(0xc9c4b8);
  const rings=[[2.5,1.8],[4.2,1.35],[5.9,0.9],[7.6,0.45]];
  const shirts=[0xe84855,0xffd166,0x2e86ab,0xf25caf,0x5db3c9,0x9b59b6,0xf5e9d0];
  let pi=0;
  for(const [r,h] of rings){
    for(let a=-1.1; a<=1.1; a+=0.55){
      const seg=new THREE.Mesh(new THREE.BoxGeometry(r*0.62,h,1.6), conc);
      seg.position.set(Math.sin(a)*r, h/2, Math.cos(a)*r);
      seg.rotation.y=a; g.add(seg);
      if(ctx.rng()<0.75){                          // packed with sitters
        const p=makePerson(ctx.rng, shirts[pi++%7], 'sit');
        p.scale.setScalar(0.9);
        p.position.set(Math.sin(a+0.15)*r, h, Math.cos(a+0.15)*r);
        p.rotation.y=a;                            // facing the water
        g.add(p);
      }
    }
  }
  /* upper red-paver walk + railing + a standing crowd behind the top ring */
  const walk=new THREE.Mesh(new THREE.BoxGeometry(14,0.12,4), lambert(0x9a5a4a));
  walk.position.set(0,2.0,-1.4); g.add(walk);
  for(let px=-6; px<=6; px+=2){
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1,4), lambert(0x3e6b5a));
    post.position.set(px,2.55,-3.2); g.add(post);
  }
  for(let i=0;i<5;i++){
    const p=makePerson(ctx.rng, shirts[i%7], ctx.rng()<0.5?'cheer':'stand');
    const a=(ctx.rng()-0.5)*0.8;
    p.position.set((ctx.rng()-0.5)*11, 2.06, -1.4+(ctx.rng()-0.5)*2);
    p.rotation.y=a; g.add(p);
    ctx.dynamic.fans.push({m:p, baseY:2.06, baseRot:a, phase:ctx.rng()*6.28, amp:0.12});
  }
  /* whitewater foam out in the chutes */
  for(let i=0;i<6;i++){
    const foam=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55+ctx.rng()*0.4,0), lambert(0xf5f2ea));
    foam.scale.y=0.25;
    foam.position.set((ctx.rng()-0.5)*10, 0.08, 9+ctx.rng()*6);
    g.add(foam);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,11);
};

/* the Highland neighborhood: a terraced bluff across the Platte — stepped
   grass benches with dirt faces, a riverside embankment + retaining wall,
   streets along each bench, and detailed painted Victorians (porches,
   gables, bay windows) mixed with brick foursquares and LoHi modern infill */
B.highlands = (ctx, def) => {
  const g=new THREE.Group();
  const w=def.w||300, d=def.d||124;
  const rng=ctx.rng;

  /* --- the bluff: three stepped benches, grass tops over dirt faces --- */
  const dirt = lambert(0x8a6a48);
  const bench = (bw, bh, bd, y, zc) => {
    const tex = grassTex.clone(); tex.repeat.set(bw/6,bd/6); tex.needsUpdate=true;
    const grassM = new THREE.MeshLambertMaterial({map:tex});
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),
      [dirt,dirt,grassM,dirt,dirt,dirt]);          // grass on top, dirt sides
    b.position.set(0,y+bh/2,zc); g.add(b);
    return y+bh;                                    // the bench's walk level
  };
  const lvl0 = bench(w,    2.4, d,    0,   0);      // riverside bench
  const lvl1 = bench(w-12, 2.2, d-14, lvl0, -3);    // mid bench
  const lvl2 = bench(w-26, 2.0, d-30, lvl1, -7);    // crest
  /* grassy embankment sloping to the river + a stone retaining wall */
  const emb = new THREE.Mesh(new THREE.BoxGeometry(w,0.6,9), lambert(0x74915c));
  emb.rotation.x=-0.5; emb.position.set(0,1.15,d/2+3.4); g.add(emb);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w*0.92,1.1,0.8), lambert(0x9a8f80));
  wall.position.set(0,0.55,d/2+6.6); g.add(wall);
  /* stairs up from the bridge landing */
  const sx = def.stairX!==undefined ? def.stairX : 20;
  for(let i=0;i<5;i++){
    const st=new THREE.Mesh(new THREE.BoxGeometry(4,0.9,2.4), lambert(0xd8d2c5));
    st.position.set(sx, 0.45+i*0.9, d/2+5.5-i*2.2); g.add(st);
  }

  /* --- houses: Victorians + brick foursquares + modern LoHi infill --- */
  const paints=[0xf25caf,0x5db3c9,0xffd166,0x9b59b6,0xe84855,0x8fbe78,0xff9a5c,0xf5e9d0];
  const roofs=[0x4a3c38,0x5a4a3a,0x3f4a55];
  const winM=lambert(0x2e3440), doorM=lambert(0x3a2a20), trimW=lambert(0xf5f0e6);
  let hi=0;
  const house = (hx, hz, y) => {
    const hg = new THREE.Group();
    const kind = rng()<0.6 ? 'vic' : rng()<0.5 ? 'square' : 'modern';
    if(kind==='vic'){
      const hw=5+rng()*1.5, hh=5+rng()*2, hd=6+rng()*1.5;
      const body=new THREE.Mesh(new THREE.BoxGeometry(hw,hh,hd), lambert(paints[hi%8]));
      body.position.y=hh/2; hg.add(body);
      /* front-gable roof: a 45°-rotated box sunk halfway, ridge toward the street */
      const roof=new THREE.Mesh(new THREE.BoxGeometry(hw*0.74,hw*0.74,hd+0.7), lambert(roofs[hi%3]));
      roof.rotation.z=Math.PI/4; roof.position.y=hh+0.2; hg.add(roof);
      /* porch: floor, two posts, shed roof, door */
      const pf=new THREE.Mesh(new THREE.BoxGeometry(hw*0.9,0.35,1.9), trimW);
      pf.position.set(0,0.35,hd/2+0.95); hg.add(pf);
      [-hw*0.36,hw*0.36].forEach(px=>{
        const post=new THREE.Mesh(new THREE.BoxGeometry(0.28,2.2,0.28), trimW);
        post.position.set(px,1.6,hd/2+1.6); hg.add(post);
      });
      const pr=new THREE.Mesh(new THREE.BoxGeometry(hw*0.96,0.22,2.2), lambert(roofs[(hi+1)%3]));
      pr.position.set(0,2.8,hd/2+1.0); hg.add(pr);
      const door=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.8,0.12), doorM);
      door.position.set(-hw*0.2,1.25,hd/2+0.07); hg.add(door);
      /* upstairs windows + a bay window on some */
      [-hw*0.22,hw*0.22].forEach(px=>{
        const win=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.1,0.1), winM);
        win.position.set(px,hh-1.4,hd/2+0.06); hg.add(win);
      });
      if(rng()<0.5){
        const bay=new THREE.Mesh(new THREE.BoxGeometry(1.6,2.2,0.9), lambert(paints[hi%8]));
        bay.position.set(hw*0.22,1.5,hd/2+0.4); hg.add(bay);
        const bwin=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.2,0.1), winM);
        bwin.position.set(hw*0.22,1.7,hd/2+0.9); hg.add(bwin);
      }
      if(rng()<0.6){
        const chim=new THREE.Mesh(new THREE.BoxGeometry(0.6,2.2,0.6), lambert(0x8a4a3a));
        chim.position.set(-hw*0.3,hh+1.2,-hd*0.2); hg.add(chim);
      }
    } else if(kind==='square'){
      /* brick Denver foursquare: hipped roof, full-width porch, cornice */
      const hw=6+rng()*1.2, hh=5.5+rng()*1.5, hd=6.5+rng()*1.2;
      const body=new THREE.Mesh(new THREE.BoxGeometry(hw,hh,hd),
        lambert([0x9b6b53,0xa3664e,0x8a5a4a][hi%3]));
      body.position.y=hh/2; hg.add(body);
      const cor=new THREE.Mesh(new THREE.BoxGeometry(hw+0.4,0.4,hd+0.4), trimW);
      cor.position.y=hh-0.2; hg.add(cor);
      const roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(hw,hd)*0.72,2.2,4), lambert(roofs[hi%3]));
      roof.rotation.y=Math.PI/4; roof.position.y=hh+1.1; hg.add(roof);
      const pf=new THREE.Mesh(new THREE.BoxGeometry(hw,0.35,2), trimW);
      pf.position.set(0,0.4,hd/2+1); hg.add(pf);
      [-hw*0.42,0,hw*0.42].forEach(px=>{
        const post=new THREE.Mesh(new THREE.BoxGeometry(0.3,2.1,0.3), trimW);
        post.position.set(px,1.6,hd/2+1.7); hg.add(post);
      });
      const pr=new THREE.Mesh(new THREE.BoxGeometry(hw+0.2,0.22,2.3), lambert(roofs[hi%3]));
      pr.position.set(0,2.75,hd/2+1.05); hg.add(pr);
      const door=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.8,0.12), doorM);
      door.position.set(0,1.25,hd/2+0.07); hg.add(door);
      [-hw*0.26,hw*0.26].forEach(px=>{
        const win=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.1,0.1), winM);
        win.position.set(px,hh-1.5,hd/2+0.06); hg.add(win);
      });
    } else {
      /* LoHi modern infill: stacked offset boxes, window band, deck rail */
      const hw=5.5+rng()*1.2, hd=6+rng();
      const low=new THREE.Mesh(new THREE.BoxGeometry(hw,3,hd), lambert(0xd8d4cc));
      low.position.y=1.5; hg.add(low);
      const up=new THREE.Mesh(new THREE.BoxGeometry(hw*0.85,2.8,hd*0.8), lambert(0x4a4a52));
      up.position.set(hw*0.06,4.4,-hd*0.08); hg.add(up);
      const band=new THREE.Mesh(new THREE.BoxGeometry(hw*0.7,1.0,0.1), winM);
      band.position.set(0,1.8,hd/2+0.06); hg.add(band);
      const band2=new THREE.Mesh(new THREE.BoxGeometry(hw*0.6,1.0,0.1), lambert(0xa8ccd4));
      band2.position.set(hw*0.06,4.5,hd*0.32+0.06); hg.add(band2);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(hw*0.8,0.5,0.1), trimW);
      rail.position.set(0,3.3,hd/2-0.2); hg.add(rail);
      const door=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.9,0.12), lambert(0xe8912d));
      door.position.set(-hw*0.28,1.3,hd/2+0.07); hg.add(door);
    }
    hg.position.set(hx,y,hz); g.add(hg);
    hi++;
  };

  /* --- rows along the benches, each with its own street strip --- */
  const asphalt = lambert(0x6a6a68);
  const row = (y, zc, span) => {
    const st=new THREE.Mesh(new THREE.BoxGeometry(span,0.1,3), asphalt);
    st.position.set(0,y+0.06,zc+7.2); g.add(st);
    for(let rx=-span/2+8; rx<=span/2-8; rx+=17){
      if(rng()<0.16){
        const t=rng()<0.4 ? pineTree(rng) : roundTree(rng, 0x5d8f4a);
        t.position.set(rx+(rng()-0.5)*4, y, zc+(rng()-0.5)*3); g.add(t);
        continue;
      }
      house(rx+(rng()-0.5)*3, zc+(rng()-0.5)*3, y);
    }
  };
  row(lvl1, d/2-18, w-36);                          // riverside front row
  row(lvl2, d/2-36, w-52);
  row(lvl2, d/2-68, w-52);
  row(lvl2, d/2-100, w-52);
  /* the LoHi water tower on the crest */
  const wt=new THREE.Group();
  [[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]].forEach(([lx,lz])=>{
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,7,4), lambert(0x4a3a30));
    leg.position.set(lx,3.5,lz); wt.add(leg);
  });
  const tank=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.8,4.4,8), lambert(0x8a8275));
  tank.position.y=9.2; wt.add(tank);
  const lid=new THREE.Mesh(new THREE.ConeGeometry(3.1,2,8), lambert(0x6e6a60));
  lid.position.y=12.4; wt.add(lid);
  const tag=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.6),
    new THREE.MeshLambertMaterial({map:bannerTex('LoHi','#8a8275','#1a1423'), side:THREE.DoubleSide}));
  tag.position.set(0,9.2,2.95); wt.add(tag);
  wt.position.set(def.towerX||-30, lvl2, def.towerZ!==undefined?def.towerZ:d/2-24); g.add(wt);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
};

/* the Colorado flag, drawn once (blue-white-blue, red C, gold center) */
let _coFlagTex=null;
function coloradoFlagTex(){
  if(_coFlagTex) return _coFlagTex;
  /* portrait to match the hanging 1.15x1.7 plane, high-res + mipmapped */
  const W=256, H=384;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#33487a'; g.fillRect(0,0,W,H);
  g.fillStyle='#f5f0e6'; g.fillRect(0,H/3,W,H/3);
  const cx=W*0.42, cy=H/2, R=H*0.155;
  g.strokeStyle='#c73232'; g.lineWidth=R*0.85;
  g.beginPath(); g.arc(cx,cy,R,0.55,5.73); g.stroke();     // the C opens right
  g.fillStyle='#f0b429';
  g.beginPath(); g.arc(cx,cy,R*0.52,0,Math.PI*2); g.fill();
  _coFlagTex=new THREE.CanvasTexture(c);
  _coFlagTex.magFilter=THREE.LinearFilter;
  _coFlagTex.minFilter=THREE.LinearMipmapLinearFilter;
  _coFlagTex.anisotropy=8;
  return _coFlagTex;
}

/* Larimer Square canopy: festoon cables across the road; flags:true hangs
   the Colorado-flag rows (THE Larimer image), globes:true adds the twin
   glass globe lamps to each pole */
B.stringLights = (ctx, def) => {
  for(const t of def.at){
    const p=ctx.trackPoint(t), tan=ctx.trackTangent(t);
    const n=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
    const g = new THREE.Group();
    const half = ctx.roadHalf+1.6;
    [-1,1].forEach(s=>{
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,5.6,5), lambert(0x3a3a3a));
      pole.position.set(p.x+n.x*half*s, 2.8, p.z+n.z*half*s); g.add(pole);
      if(def.globes){
        [-0.45,0.45].forEach(o=>{
          const arm=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.08,0.08), lambert(0x3a3a3a));
          arm.position.set(p.x+n.x*half*s, 4.9, p.z+n.z*half*s);
          arm.rotation.y=Math.atan2(tan.x,tan.z); g.add(arm);
          const globe=new THREE.Mesh(new THREE.SphereGeometry(0.24,7,6),
            lambert(0xfff2d0,{emissive:0x998844}));
          globe.position.set(p.x+n.x*half*s+Math.sin(arm.rotation.y)*o,
            4.9, p.z+n.z*half*s+Math.cos(arm.rotation.y)*o);
          g.add(globe);
        });
      }
    });
    const N=11;
    for(let i=0;i<=N;i++){
      const u=i/N, sway=1-(2*u-1)**2;             // catenary sag
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.14,5,4),
        lambert(0xffd166,{emissive:0xbb8822}));
      bulb.position.set(p.x+n.x*half*(u*2-1), 5.5-sway*1.1, p.z+n.z*half*(u*2-1));
      g.add(bulb);
    }
    if(def.flags){
      const fm=new THREE.MeshLambertMaterial({map:coloradoFlagTex(), side:THREE.DoubleSide});
      for(let i=1;i<=4;i++){
        const u=i/5, sway=1-(2*u-1)**2;
        const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.7), fm);
        flag.position.set(p.x+n.x*half*(u*2-1),
          (5.5-sway*1.1)-1.05, p.z+n.z*half*(u*2-1));
        /* face AGAINST travel so riders see the front (the back of a
           DoubleSide plane mirrors the C) */
        flag.rotation.y=Math.atan2(tan.x,tan.z)+Math.PI+(ctx.rng()-0.5)*0.2;
        g.add(flag);
      }
    }
    ctx.scene.add(g);
  }
};

/* sidewalk patio: cafe umbrellas, little tables, planter barrels */
B.patio = (ctx, def) => {
  const g=new THREE.Group();
  for(let i=0;i<(def.count||3);i++){
    const ox=(i-(def.count-1)/2)*3.2;
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.3,4), lambert(0x8a8275));
    pole.position.set(ox,1.15,0); g.add(pole);
    const um=new THREE.Mesh(new THREE.ConeGeometry(1.5,0.75,6),
      lambert([0xc75146,0xe8912d,0x3e6b5a][i%3]));
    um.position.set(ox,2.45,0); g.add(um);
    const table=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.08,8), lambert(0xd8d2c5));
    table.position.set(ox,0.85,0); g.add(table);
    if(ctx.rng()<0.7){
      const sitter=makePerson(ctx.rng, [0xe84855,0x5db3c9,0xf25caf][i%3], 'sit');
      sitter.scale.setScalar(0.85);
      sitter.position.set(ox+0.8,0.35,0.3); sitter.rotation.y=-Math.PI/2; g.add(sitter);
    }
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.42,0.8,8), lambert(0x6e4b2a));
    barrel.position.set(ox+1.6,0.4,-0.6); g.add(barrel);
    const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(0.45,0), lambert(0x5d8f4a));
    plant.position.set(ox+1.6,0.95,-0.6); g.add(plant);
  }
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
};

export const PROP_BUILDERS = B;
