/* Prop library: builders for everything a track can place in the world.
   Track data files reference these by `type`. Each builder receives:
     ctx — { scene, rng, solid(x,z,r), exclude(x,z,r), clearOfRoad(p,margin),
             clearOfExclusions(p,margin), dynamic } // dynamic: animated things (boats…)
     def — the prop entry from the track file.
   Placement randomness uses ctx.rng (seeded) so colliders match across clients. */
import * as THREE from 'three';
import { lambert, pixTex, waterTex, sandTex, asphaltTex } from './gfx.js';

const B = {};

B.water = (ctx, def) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(def.r, def.seg || 16),
    new THREE.MeshLambertMaterial({map: waterTex}));
  m.rotation.x = -Math.PI/2;
  if(def.scale) m.scale.set(def.scale[0], def.scale[1], 1);
  m.position.set(def.x, 0.02, def.z);
  ctx.scene.add(m);
  if(def.exclude) ctx.exclude(def.x, def.z, def.exclude);
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
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,16); ctx.solid(def.x,def.z,9);
};

B.bathhouse = (ctx, def) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(10,4,6), lambert(0xb85c48)); body.position.y=2; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.4,3,4), lambert(0x5a4a3a));
  roof.position.y=5.4; roof.rotation.y=Math.PI/4; roof.scale.z=0.7; g.add(roof);
  g.position.set(def.x,0,def.z); g.rotation.y=def.ry||0; ctx.scene.add(g);
  ctx.exclude(def.x,def.z,7); ctx.solid(def.x,def.z,4);
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
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6,3,4.5), lambert(0xf5e9d0)); body.position.y=1.5; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6,2.4,4), lambert(0x6e4b2a));
  roof.position.y=4.1; roof.rotation.y=Math.PI/4; roof.scale.z=0.8; g.add(roof);
  g.position.set(def.x,0,def.z); ctx.scene.add(g);
  ctx.exclude(def.x,def.z,6); ctx.solid(def.x,def.z,4);
  // the Wynken, Blynken & Nod shoe fountain beside the cottage
  const fx=def.x+7, fz=def.z-6;
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,0.6,10), lambert(0xd8d2c5));
  basin.position.set(fx,0.3,fz); ctx.scene.add(basin);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.2,10), new THREE.MeshLambertMaterial({map:waterTex}));
  water.rotation.x=-Math.PI/2; water.position.set(fx,0.62,fz); ctx.scene.add(water);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.7,0.8), lambert(0x8a8275));
  shoe.position.set(fx,1,fz); ctx.scene.add(shoe);
  ctx.exclude(fx,fz,4); ctx.solid(fx,fz,3);
};

/* modest brick bungalows, front doors toward ry */
function buildHouse(ctx, x, z, ry){
  const bricks=[0xb85c48,0xd98c5f,0xe0b487,0xa66a4f,0xc9a06a,0x9b6b53];
  const g = new THREE.Group();
  const w2=6+ctx.rng()*3, h=4+ctx.rng()*3, d=6+ctx.rng()*2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w2,h,d), lambert(bricks[Math.floor(ctx.rng()*6)]));
  body.position.y=h/2; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w2,d)*0.74, 2.4, 4), lambert(0x5a4a3a));
  roof.position.y=h+1.2; roof.rotation.y=Math.PI/4; g.add(roof);
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
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.95,1.9,0.15), lambert(0x3a2a20));
    door.position.set(0,1.2,d/2+0.05); g.add(door);
    g.position.set(x,0,z); g.rotation.y=ry; ctx.scene.add(g);
    ctx.solid(x,z,5.5);
  };
  for(let z=-def.zSpan; z<=def.zSpan; z+=def.step){
    mansion(-def.xEdge, z+(ctx.rng()-0.5)*4,  Math.PI/2);   // west side faces east
    mansion( def.xEdge, z+(ctx.rng()-0.5)*4, -Math.PI/2);   // east side faces west
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

/* the gravel jogging loop — its spline is exposed for the joggers */
B.path = (ctx, def) => {
  const ribbon = buildRibbon(ctx, def, sandTex, 0.013);
  ctx.dynamic.paths.push(ribbon);
};

/* neighborhood streets (asphalt, no gameplay effect) */
B.street = (ctx, def) => { buildRibbon(ctx, def, asphaltTex, 0.011); };

/* tree keep-out zone — how track data carves open meadows */
B.keepClear = (ctx, def) => { ctx.exclude(def.x, def.z, def.r); };

/* low-poly park-goer. pose: 'stand' | 'sit'. Front faces local +z. */
export function makePerson(rng, shirt, pose='stand', skinC){
  const g = new THREE.Group();
  const skins=[0xd9a066,0xa06a42,0x8a5533,0xe8b88a];
  const skin = skinC ?? skins[Math.floor(rng()*skins.length)];
  const pants = rng()<0.5 ? 0x1a1423 : 0x4a5a6a;
  if(pose==='sit'){
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.18,0.55), lambert(pants));
    legs.position.set(0,0.09,0.28); g.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.55,0.3), lambert(shirt));
    torso.position.y=0.48; g.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), lambert(skin));
    head.position.y=0.92; g.add(head);
  } else {
    const legG = new THREE.BoxGeometry(0.16,0.6,0.16);
    const legL = new THREE.Mesh(legG, lambert(pants)); legL.position.set(-0.11,0.3,0);
    const legR = new THREE.Mesh(legG, lambert(pants)); legR.position.set( 0.11,0.3,0);
    g.add(legL); g.add(legR);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44,0.6,0.28), lambert(shirt));
    torso.position.y=0.9; g.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), lambert(skin));
    head.position.y=1.36; g.add(head);
    g.userData.legs=[legL,legR];
  }
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
    if(!ctx.clearOfRoad(q,3)) continue;
    const t = new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.45,2,5), lambert(0x7a6a52));
    trunk.position.y=1; t.add(trunk);
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8+ctx.rng()*1.2,0), lambert(0x9aa96a));
    puff.position.y=2.6; t.add(puff);
    t.position.copy(q); ctx.scene.add(t); placed++;
  }
};

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
  const gravel=new THREE.Mesh(new THREE.PlaneGeometry(def.w+6,def.d+6),
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
function pineTree(rng){
  const t=new THREE.Group();
  const tones=[0x2e5a3a,0x3a6b45,0x35604a];
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.55,2.4,5), lambert(0x5a4030));
  trunk.position.y=1.2; t.add(trunk);
  const h=5+rng()*4, tone=tones[Math.floor(rng()*3)];
  for(let j=0;j<3;j++){
    const cone=new THREE.Mesh(new THREE.ConeGeometry((2.6-j*0.7)*(1+h/14), h/2.6, 6), lambert(tone));
    cone.position.y=2.2+j*(h/3.2); t.add(cone);
  }
  return t;
}
function roundTree(rng, tint){
  const t=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.8,3.6,5), lambert(0x6e4b2a));
  trunk.position.y=1.8; t.add(trunk);
  const s=2.6+rng()*3;
  const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0), lambert(tint));
  puff.position.y=3.6+s*0.7; t.add(puff);
  return t;
}
function cottonwood(rng, tint){
  const t=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.95,5.4,5), lambert(0x5f4632));
  trunk.position.y=2.7; t.add(trunk);
  const s=3.2+rng()*1.8;
  const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(s,0), lambert(tint));
  puff.position.y=6+s*0.5; t.add(puff);
  const puff2=new THREE.Mesh(new THREE.IcosahedronGeometry(s*0.6,0), lambert(tint));
  puff2.position.set(1.4,7.4+s*0.5,0.6); t.add(puff2);
  return t;
}
function aspenClump(rng){
  const t=new THREE.Group();
  const n=2+Math.floor(rng()*2);
  for(let i=0;i<n;i++){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.2,4.4,5), lambert(0xd8d2c5));
    trunk.position.set((rng()-0.5)*1.6, 2.2, (rng()-0.5)*1.6);
    trunk.rotation.z=(rng()-0.5)*0.16;
    t.add(trunk);
    const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(1.3+rng()*0.7,0), lambert(0x9fca6a));
    puff.position.set(trunk.position.x, 4.6+rng()*0.8, trunk.position.z);
    t.add(puff);
  }
  return t;
}

/* the Olmsted evergreen grove — clustered conifers */
B.pines = (ctx, def) => {
  let placed=0, guard=0;
  while(placed<def.count && guard++<300){
    const p = new THREE.Vector3(def.x+(ctx.rng()-0.5)*def.spreadX, 0,
                                def.z+(ctx.rng()-0.5)*def.spreadZ);
    if(!ctx.clearOfRoad(p,4) || !ctx.clearOfExclusions(p,1.5)) continue;
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
    const h=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.52,0.2), lambert(0x6e4b2a));
    h.position.set(0,1.26,-0.16); g.add(h);
  }
  if(type.headband){
    const hb=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.07,0.34), lambert(0xe84855));
    hb.position.set(0,1.47,0); g.add(hb);
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

B.mountains = (ctx, def) => {
  for(let i=0;i<12;i++){
    const h=55+ctx.rng()*70, w2=60+ctx.rng()*75;
    const m=new THREE.Mesh(new THREE.ConeGeometry(w2,h,4), lambert(0x6f5b8f));
    m.position.set(def.x-ctx.rng()*100, h/2-6, def.z+i*60+ctx.rng()*22);
    m.rotation.y=ctx.rng(); ctx.scene.add(m);
    if(h>92){ const cap=new THREE.Mesh(new THREE.ConeGeometry(w2*0.34,h*0.3,4), lambert(0xf5e9d0));
      cap.position.copy(m.position); cap.position.y=h*0.86-6; cap.rotation.y=m.rotation.y; ctx.scene.add(cap);}
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
    if(!ctx.clearOfRoad(p, 5.5) || !ctx.clearOfExclusions(p, 2)) continue;
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
