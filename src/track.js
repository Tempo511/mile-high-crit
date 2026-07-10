/* Track: builds a raceable world from a track data file (src/tracks/*).
   Owns the spline, road mesh, pickups, colliders, and spatial queries.
   No game state, no DOM, no per-frame logic. */
import * as THREE from 'three';
import { lambert, pixTex, blobShadow, grassTex, roadTex } from './gfx.js';
import { PROP_BUILDERS } from './props.js';
import { makeRng } from './rng.js';

const NS = 600;   // spline samples for nearest-point queries & minimap

/* one boost chevron whose apex points +Z (built to face travel direction);
   both arms share a material so it can be pulsed via userData.mat */
function makeChevron(){
  const mat = new THREE.MeshLambertMaterial({color:0xffd166, emissive:0xffd166,
    emissiveIntensity:0.5, flatShading:true});
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.7,0.14,0.55);
  const l = new THREE.Mesh(geo, mat); l.position.set(-0.55,0,0.15); l.rotation.y = 3*Math.PI/4; g.add(l);
  const r = new THREE.Mesh(geo, mat); r.position.set( 0.55,0,0.15); r.rotation.y =   Math.PI/4; g.add(r);
  g.userData.mat = mat;
  return g;
}

/* a fun item crate: glowing translucent shell + bright edges + a floating
   gem inside (the gem is returned as userData.gem for counter-spin) */
function makeItemBox(){
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),
    new THREE.MeshLambertMaterial({color:0xffd166, transparent:true, opacity:0.4,
      flatShading:true, emissive:0x7a4f00, depthWrite:false}));
  g.add(shell);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.42,1.42,1.42)),
    new THREE.LineBasicMaterial({color:0xfff6d8}));
  g.add(edges);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42,0),
    new THREE.MeshBasicMaterial({color:0xff9a5c}));
  g.add(gem);
  g.userData.gem = gem;
  return g;
}

export class Track {
  constructor(scene, data){
    this.data = data;
    this.roadHalf = data.roadWidth/2;

    this.curve = new THREE.CatmullRomCurve3(
      data.spline.map(p => new THREE.Vector3(...p)),
      data.format !== 'stage', 'catmullrom', 0.5);
    this.length = this.curve.getLength();

    this.NS = NS;
    this.samples = [];
    for(let i=0;i<NS;i++) this.samples.push(this.curve.getPointAt(i/NS));

    this.solids = [];      // {x,z,r} — bump collisions
    this.exclusions = [];  // {x,z,r} — keep-out zones for tree placement
    this.waters = data.waters || [];
    this.pads = [];        // boost pads {x,z,r}
    this.boxes = [];       // item boxes {m,x,z,cd}
    this.dynamic = { boats: [], clouds: [], paths: [], pads: [], cars: [], fans: [] };

    const rng = makeRng(data.seed || 1);
    const ctx = {
      scene, rng,
      solid: (x,z,r)=>this.solids.push({x,z,r}),
      exclude: (x,z,r)=>this.exclusions.push({x,z,r}),
      clearOfRoad: (p,margin)=>
        this.samples.every(s => (s.x-p.x)**2 + (s.z-p.z)**2 > (this.roadHalf+margin)**2),
      clearOfExclusions: (p,margin)=>
        this.exclusions.every(e => (e.x-p.x)**2 + (e.z-p.z)**2 > (e.r+margin)**2),
      trackPoint: t=>this.curve.getPointAt(t),
      trackTangent: t=>this.curve.getTangentAt(t),
      roadHalf: this.roadHalf,
      dynamic: this.dynamic
    };

    this.#buildGround(scene, data);
    this.#buildRoad(scene);
    this.#buildBanner(scene);
    this.#buildPads(scene, data);
    this.#buildBoxes(scene, data);
    for(const def of data.props || []) PROP_BUILDERS[def.type](ctx, def);

    this.#fitMinimap();
  }

  pointAt(t){ return this.curve.getPointAt(t); }
  tangentAt(t){ return this.curve.getTangentAt(t); }

  /* nearest sample index to (x,z), searching around `from` first */
  nearestIdx(x, z, from){
    let best=1e18, bi=from;
    for(let d=-50; d<=50; d++){
      const i=(from+d+NS)%NS, s=this.samples[i];
      const dd=(s.x-x)**2+(s.z-z)**2;
      if(dd<best){ best=dd; bi=i; }
    }
    if(best>1600){
      for(let i=0;i<NS;i++){ const s=this.samples[i];
        const dd=(s.x-x)**2+(s.z-z)**2;
        if(dd<best){ best=dd; bi=i; } }
    }
    return [bi, Math.sqrt(best)];
  }

  /* radians of bend in the next 14 units past `dist` — used by AI cornering */
  curvatureAt(dist){
    const t1=((dist%this.length)+this.length)%this.length/this.length;
    const t2=((dist+14)%this.length)/this.length;
    const a=this.curve.getTangentAt(t1), b=this.curve.getTangentAt(t2);
    return Math.acos(Math.max(-1,Math.min(1,a.dot(b))));
  }

  /* minimap projection fitted to this track's bounds */
  miniXY(x, z){
    return [this.miniOX + x*this.miniS, this.miniOY + z*this.miniS];
  }

  #fitMinimap(){
    let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;
    for(const s of this.samples){
      minX=Math.min(minX,s.x); maxX=Math.max(maxX,s.x);
      minZ=Math.min(minZ,s.z); maxZ=Math.max(maxZ,s.z);
    }
    const W=96, H=128, pad=10;
    this.miniS = Math.min((W-pad*2)/(maxX-minX), (H-pad*2)/(maxZ-minZ));
    this.miniOX = W/2 - (minX+maxX)/2*this.miniS;
    this.miniOY = H/2 - (minZ+maxZ)/2*this.miniS;
  }

  #buildGround(scene, data){
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),
      new THREE.MeshLambertMaterial({map:grassTex}));
    ground.rotation.x = -Math.PI/2; ground.position.y = -0.05;
    scene.add(ground);
  }

  #buildRoad(scene){
    const SEG = 460, pos=[], uv=[], idx=[];
    const up = new THREE.Vector3(0,1,0);
    for(let i=0;i<=SEG;i++){
      const t=i/SEG, p=this.curve.getPointAt(t), tan=this.curve.getTangentAt(t);
      const n = new THREE.Vector3().crossVectors(up,tan).normalize();
      const l = p.clone().addScaledVector(n, this.roadHalf);
      const r = p.clone().addScaledVector(n,-this.roadHalf);
      pos.push(l.x,0.02,l.z, r.x,0.02,r.z);
      uv.push(0, t*this.length/6, 1, t*this.length/6);
      if(i<SEG){ const a=i*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    g.setIndex(idx); g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({map:roadTex})));
  }

  #buildBanner(scene){
    const p = this.curve.getPointAt(0), tan = this.curve.getTangentAt(0);
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
    const postG = new THREE.CylinderGeometry(0.22,0.22,7.6,5);
    [-1,1].forEach(s=>{ const m=new THREE.Mesh(postG, lambert(0xd94f30));
      m.position.copy(p).addScaledVector(n, s*(this.roadHalf+0.8)); m.position.y=3.8; scene.add(m); });
    /* full checkerboard filling the whole texture (2 rows × 8 cols) */
    const bTex = pixTex(64,(g,px)=>{
      for(let x=0;x<8;x++)for(let y=0;y<2;y++){
        g.fillStyle=(x+y)%2?'#f5e9d0':'#1a1423';
        g.fillRect(x*8, y*32, 8, 32);
      } }, 2, 1);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(this.data.roadWidth+3, 2.0),
      new THREE.MeshLambertMaterial({map:bTex, side:THREE.DoubleSide}));
    b.position.copy(p); b.position.y = 6.4;   // high overhead — clear of the pack
    /* aim at a point at the banner's own height, else lookAt pitches the
       plane down toward the ground and it hangs at a weird angle */
    const aim = p.clone().add(tan); aim.y = b.position.y;
    b.lookAt(aim); scene.add(b);
  }

  #buildPads(scene, data){
    for(const t of data.boostPads || []){
      const p = this.curve.getPointAt(t), tan = this.curve.getTangentAt(t);
      const g = new THREE.Group();
      g.position.set(p.x, 0.05, p.z);
      g.rotation.y = Math.atan2(tan.x, tan.z);   // local +Z = travel direction
      // glowing base strip
      const base = new THREE.Mesh(new THREE.PlaneGeometry(4.4,6.4),
        new THREE.MeshLambertMaterial({color:0xc2621a, emissive:0x8a3d0a,
          transparent:true, opacity:0.9}));
      base.rotation.x = -Math.PI/2; g.add(base);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(4.7,6.7),
        new THREE.MeshLambertMaterial({color:0xffd166, emissive:0x8a5a00,
          transparent:true, opacity:0.5}));
      edge.rotation.x = -Math.PI/2; edge.position.y=-0.01; g.add(edge);
      // three flowing chevrons pointing forward
      const chevs = [];
      for(let i=0;i<3;i++){
        const c = makeChevron();
        c.position.set(0, 0.04, -1.9 + i*1.7);
        g.add(c); chevs.push(c);
      }
      scene.add(g);
      this.pads.push({x:p.x, z:p.z, r:3});
      this.dynamic.pads.push({ chevs });
    }
  }

  #buildBoxes(scene, data){
    if(!data.itemBoxes) return;
    for(const t of data.itemBoxes.at){
      const p = this.curve.getPointAt(t), tan = this.curve.getTangentAt(t);
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tan).normalize();
      for(const off of data.itemBoxes.offsets){
        const m = makeItemBox();
        m.position.copy(p).addScaledVector(n, off); m.position.y=1.1;
        scene.add(m);
        const shadow = blobShadow(0.75, 0.2);
        shadow.position.set(m.position.x, 0.03, m.position.z);
        scene.add(shadow);
        this.boxes.push({m, gem:m.userData.gem, shadow, x:m.position.x, z:m.position.z, cd:0});
      }
    }
  }
}
