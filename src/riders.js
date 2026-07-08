/* Visual mesh factories for racers and geese. Pure Three.js — no game state.
   Callers add the returned group to the scene.
   makeRider(spec) — spec: {torso, helmet, frame?, skinTone?, sleeveless?,
   headgear?, bigAeroTail?, discWheel?, bag?, beard?, mixedLegs?}.
   userData API: {legs, bike, sparks, wheels} — legs are groups whose
   position.y is animated by the render layer; wheels spin with speed. */
import * as THREE from 'three';
import { lambert, blobShadow } from './gfx.js';

function wheel(x, disc){
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42,0.09,6,10), lambert(0x1a1423));
  g.add(tire);
  if(disc){
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.38,12),
      new THREE.MeshLambertMaterial({color:0x2b2b33, side:THREE.DoubleSide, flatShading:true}));
    g.add(d);
  } else {
    for(let i=0;i<3;i++){
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.74,0.045,0.045), lambert(0x8a8275));
      spoke.rotation.z = i*Math.PI/3;
      g.add(spoke);
    }
  }
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12), lambert(0xd8d2c5));
  g.add(hub);
  g.position.set(x,0.42,0);
  return g;
}

export function makeRider(spec){
  const { torso:torsoC, helmet:helmetC } = spec;
  const root = new THREE.Group();
  const bike = new THREE.Group();
  const skin = lambert(spec.skinTone ?? 0xd9a066);

  const wF = wheel(0.62, false), wB = wheel(-0.62, !!spec.discWheel);
  bike.add(wF); bike.add(wB);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25,0.13,0.13), lambert(spec.frame ?? 0xd94f30));
  frame.position.y=0.75; frame.rotation.z=0.18; bike.add(frame);
  const seatpost = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.4,0.08), lambert(0x1a1423));
  seatpost.position.set(-0.38,0.95,0); bike.add(seatpost);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.08,0.14), lambert(0x1a1423));
  saddle.position.set(-0.38,1.17,0); bike.add(saddle);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.24,5), lambert(0xffd166));
  bottle.position.set(0.05,0.74,0); bottle.rotation.z=0.15; bike.add(bottle);

  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.62), lambert(0x1a1423));
  bars.position.set(0.62,1.05,0); bike.add(bars);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.26,0.24), lambert(0xf5e9d0));
  plate.position.set(0.72,0.82,0); bike.add(plate);

  /* jersey: kit color + contrast chest stripe */
  const torsoGrp = new THREE.Group();
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.72,0.42), lambert(torsoC));
  torsoGrp.add(torsoMesh);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.18,0.44), lambert(helmetC));
  stripe.position.y=0.1; torsoGrp.add(stripe);
  if(spec.bag==='messenger'){
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.52,0.44), lambert(0x4a5a3f));
    bag.position.set(-0.34,0.02,0); torsoGrp.add(bag);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.1,0.43), lambert(0xf5e9d0));
    strap.position.set(0.03,0.22,0); strap.rotation.x=0.5; torsoGrp.add(strap);
  }
  torsoGrp.position.set(-0.02,1.35,0); torsoGrp.rotation.z=0.5; bike.add(torsoGrp);

  /* arms reaching to the bars, hands on the ends */
  [-0.18,0.18].forEach(z=>{
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.09,0.09),
      spec.sleeveless ? skin : lambert(torsoC));
    arm.position.set(0.34,1.3,z); arm.rotation.z=-0.72; bike.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.1,0.1), skin);
    hand.position.set(0.62,1.06,z*1.4); bike.add(hand);
  });

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.32,0.34), skin);
  head.position.set(0.32,1.72,0); bike.add(head);
  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.09,0.3), lambert(0x1a1423));
  shades.position.set(0.49,1.75,0); bike.add(shades);
  if(spec.beard){
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.16,0.3), lambert(0x6e4b2a));
    beard.position.set(0.47,1.6,0); bike.add(beard);
  }

  if(spec.headgear==='beanie'){
    const beanie = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.16,0.36), lambert(helmetC));
    beanie.position.set(0.32,1.9,0); bike.add(beanie);
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.08,0.38), lambert(helmetC));
    fold.position.set(0.32,1.83,0); bike.add(fold);
  } else {
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.16,0.38), lambert(helmetC));
    helmet.position.set(0.32,1.9,0); bike.add(helmet);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(spec.bigAeroTail ? 0.4 : 0.26, 0.12, 0.28), lambert(helmetC));
    tail.position.set(spec.bigAeroTail ? 0.04 : 0.12, 1.86, 0);
    tail.rotation.z=0.25; bike.add(tail);
  }

  if(spec.bag==='bikepacking'){
    const frameBag = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.22,0.1), lambert(0x3f4a55));
    frameBag.position.set(0.05,0.6,0); bike.add(frameBag);
    const seatBag = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.16,0.15), lambert(0xe8912d));
    seatBag.position.set(-0.66,1.12,0); bike.add(seatBag);
    const barRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.5,6), lambert(0xe8912d));
    barRoll.rotation.x=Math.PI/2; barRoll.position.set(0.66,1.16,0); bike.add(barRoll);
  }

  /* legs: bib-short thigh + white shoe, animated via group y */
  const legColors = spec.mixedLegs ? [0x3b5a78,0x1a1423] : [0x1a1423,0x1a1423];
  const legs = [-0.16,0.16].map((z,i)=>{
    const leg = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.5,0.16), lambert(legColors[i]));
    leg.add(thigh);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.09,0.13), lambert(0xf5e9d0));
    shoe.position.set(0.04,-0.3,0); leg.add(shoe);
    leg.position.set(-0.15,0.95,z); bike.add(leg);
    return leg;
  });

  const sparkG = new THREE.BoxGeometry(0.22,0.22,0.22);
  const s1 = new THREE.Mesh(sparkG, lambert(0x5db3c9)); s1.position.set(-1,0.2,0.3); s1.visible=false;
  const s2 = new THREE.Mesh(sparkG, lambert(0x5db3c9)); s2.position.set(-1,0.2,-0.3); s2.visible=false;
  bike.add(s1); bike.add(s2);

  root.userData={legs, bike, sparks:[s1,s2], wheels:[wF,wB]};
  root.add(bike);
  root.add(blobShadow(0.95, 0.28));
  return root;
}

export function gooseMesh(scale=1){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.7,0.6), lambert(0xd9d2c5)); body.position.y=0.65; g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.8,0.22), lambert(0x2b2b33)); neck.position.set(0.5,1.2,0); g.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.3,0.28), lambert(0x2b2b33)); head.position.set(0.62,1.65,0); g.add(head);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.12,0.16), lambert(0xe8912d)); beak.position.set(0.9,1.62,0); g.add(beak);
  [-0.36,0.36].forEach(z=>{
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.4,0.1), lambert(0xc9c0b0));
    wing.position.set(-0.06,0.72,z); wing.rotation.x = z>0?0.12:-0.12; g.add(wing);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.16,0.3), lambert(0xc9c0b0));
  tail.position.set(-0.62,0.78,0); tail.rotation.z=0.35; g.add(tail);
  g.add(blobShadow(0.55, 0.22));
  g.scale.setScalar(scale);
  return g;
}
