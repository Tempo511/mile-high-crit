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
      new THREE.MeshLambertMaterial({color:0x2b2b33, side:THREE.DoubleSide}));
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
  if(spec.oxygen){                  // canned oxygen for the altitude
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.34,6), lambert(0xd8d2c5));
    can.position.set(-0.15,0.8,0); can.rotation.z=0.2; bike.add(can);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.08,6), lambert(0x5db3c9));
    cap.position.set(-0.19,1,0); bike.add(cap);
  }

  const bars = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.62), lambert(0x1a1423));
  bars.position.set(0.62,1.05,0); bike.add(bars);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.26,0.24), lambert(0xf5e9d0));
  plate.position.set(0.72,0.82,0); bike.add(plate);

  /* jersey: kit color + contrast chest stripe.
     Torso dimensions are tunable (tw/th/td/lean/ty) for sizing experiments. */
  /* default proportions: the LOW PRO lab winner — crouched racer posture */
  const TW=spec.tw??0.46, TH=spec.th??0.5, TD=spec.td??0.38;
  const torsoGrp = new THREE.Group();
  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(TW,TH,TD), lambert(torsoC));
  torsoGrp.add(torsoMesh);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(TW+0.02,0.18,TD+0.02), lambert(helmetC));
  stripe.position.y=0.1; torsoGrp.add(stripe);
  if(spec.fur){                     // yeti shag: layered offset slabs
    [0.28,0.02,-0.24].forEach((y,i)=>{
      const shag=new THREE.Mesh(new THREE.BoxGeometry(0.58,0.18,0.48),
        lambert(i%2?0xe8e2d5:0xf5f0e6));
      shag.position.y=y; shag.rotation.y=i%2?0.14:-0.12; torsoGrp.add(shag);
    });
  }
  if(spec.hump){                    // hunched monster shoulders
    const hump=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.56), lambert(0xe8e2d5));
    hump.position.set(-0.18,0.4,0); torsoGrp.add(hump);
  }
  if(spec.pads){                    // football shoulder pads (navy over orange)
    const pads=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.22,0.64), lambert(helmetC));
    pads.position.y=0.3; torsoGrp.add(pads);
    const padTrim=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.07,0.66), lambert(0xf5e9d0));
    padTrim.position.y=0.18; torsoGrp.add(padTrim);
    const number=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.3,0.28), lambert(0xf5e9d0));
    number.position.set(-0.28,0,0); torsoGrp.add(number);   // jersey number on the back
  }
  if(spec.trunks){                  // swim trunks on a bare torso
    const trunks=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.22,0.44), lambert(helmetC));
    trunks.position.y=-0.28; torsoGrp.add(trunks);
  }
  if(spec.floral){                  // flowers on the dress
    [[-0.12,0.15],[0.1,0.02],[-0.02,-0.2]].forEach(([x,y],i)=>{
      const fl=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.05),
        lambert([0xffd166,0xf5e9d0,0xe84855][i]));
      fl.position.set(x,y,0.22); torsoGrp.add(fl);
    });
  }
  if(spec.tailFeathers){            // magpie tail fanned over the rear wheel
    [-0.14,0,0.14].forEach((z,i)=>{
      const f=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,0.1),
        lambert(i===1?0x1a1423:0x2b2b33));
      f.position.set(-0.32,0.18,z); f.rotation.z=0.5; f.rotation.y=z*0.6;
      torsoGrp.add(f);
    });
  }
  if(spec.bag==='messenger'){
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.52,0.44), lambert(0x4a5a3f));
    bag.position.set(-0.34,0.02,0); torsoGrp.add(bag);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.1,0.43), lambert(0xf5e9d0));
    strap.position.set(0.03,0.22,0); strap.rotation.x=0.5; torsoGrp.add(strap);
  }
  torsoGrp.position.set(-0.02, spec.ty??1.38, 0);
  torsoGrp.rotation.z = spec.lean??0.7;
  bike.add(torsoGrp);

  /* arms reaching to the bars, hands on the ends */
  [-0.18,0.18].forEach(z=>{
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.09,0.09),
      spec.sleeveless ? skin : lambert(torsoC));
    arm.position.set(0.34,1.3,z); arm.rotation.z=-0.72; bike.add(arm);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(spec.claws?0.15:0.12,
      spec.claws?0.13:0.1, spec.claws?0.13:0.1), skin);
    hand.position.set(0.62,1.06,z*1.4); bike.add(hand);
    if(spec.claws){
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.05,0.12), lambert(0x3f4a55));
      claw.position.set(0.7,1.02,z*1.4); bike.add(claw);
    }
  });

  if(spec.head==='horse'){
    /* BLUCIFER: blue mustang head, black mane, glowing red eyes */
    const hg = new THREE.Group();
    const blue = lambert(torsoC);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.36,0.3), blue); hg.add(skull);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.2,0.22), blue);
    muzzle.position.set(0.28,-0.06,0); hg.add(muzzle);
    [-0.09,0.09].forEach(z=>{
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.18,0.08), blue);
      ear.position.set(-0.06,0.26,z); hg.add(ear);
    });
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.5,0.26), lambert(0x1a1423));
    mane.position.set(-0.22,-0.02,0); mane.rotation.z=0.3; hg.add(mane);
    [-0.12,0.12].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,0.06),
        lambert(0xff3333, {emissive:0xcc0000}));
      eye.position.set(0.13,0.09,z); hg.add(eye);
    });
    hg.position.set(0.34,1.82,0); bike.add(hg);
  } else if(spec.head==='yeti'){
    /* THE YETI: proper monster — dark face, glowing ice eyes, fanged
       underbite, brow ridge, wild crown tuft */
    const fur = lambert(0xf5f0e6);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.44,0.46), fur);
    head.position.set(0.3,1.78,0); bike.add(head);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.28,0.32), lambert(0x5a6b7a));
    face.position.set(0.53,1.78,0); bike.add(face);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.12,0.44), fur);
    brow.position.set(0.53,1.95,0); bike.add(brow);
    [-0.09,0.09].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03,0.07,0.07),
        lambert(0x9fe8ff, {emissive:0x55bbee}));
      eye.position.set(0.58,1.85,z); bike.add(eye);
    });
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.14,0.4), fur);
    jaw.position.set(0.52,1.6,0); bike.add(jaw);
    [-0.11,0.11].forEach(z=>{
      const fang = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.12,0.05), lambert(0xf5e9d0));
      fang.position.set(0.58,1.7,z); bike.add(fang);
    });
    const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.16,0.26), fur);
    tuft.position.set(0.24,2.06,0); tuft.rotation.z=0.25; bike.add(tuft);
  } else if(spec.head==='diver'){
    /* CASA BONITA CLIFF DIVER: bare head, black hair, red headband, real eyes */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.34,0.36), skin);
    head.position.set(0.32,1.73,0); bike.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.12,0.38), lambert(0x1a1423));
    hair.position.set(0.3,1.94,0); bike.add(hair);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.39,0.08,0.39), lambert(helmetC));
    band.position.set(0.31,1.87,0); bike.add(band);
    [-0.08,0.08].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.07,0.055), lambert(0x1a1423));
      eye.position.set(0.51,1.77,z); bike.add(eye);
    });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.03,0.12), lambert(0x1a1423));
    mouth.position.set(0.51,1.63,0); bike.add(mouth);
  } else if(spec.head==='bronco'){
    /* BRONCO: navy helmet + orange stripe over an orange jersey, facemask,
       eye black under the visor line */
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.16,0.24), skin);
    chin.position.set(0.38,1.66,0); bike.add(chin);
    [-0.07,0.07].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.05,0.05), lambert(0x1a1423));
      eye.position.set(0.51,1.7,z); bike.add(eye);
    });
    const shell = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.38,0.46), lambert(helmetC));
    shell.position.set(0.3,1.88,0); bike.add(shell);
    const stripeTop = new THREE.Mesh(new THREE.BoxGeometry(0.48,0.08,0.13), lambert(torsoC));
    stripeTop.position.set(0.3,2.08,0); bike.add(stripeTop);
    [1.72,1.81].forEach(y=>{
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.045,0.4), lambert(0xd8d2c5));
      bar.position.set(0.55,y,0); bike.add(bar);
    });
  } else if(spec.head==='bird'){
    /* MAGPIE 2.0: black-and-white bird head with a real beak */
    const headM = lambert(0x1a1423);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.32,0.34), headM);
    head.position.set(0.32,1.76,0); bike.add(head);
    [-0.12,0.12].forEach(z=>{
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,0.06), lambert(0xf5e9d0));
      cheek.position.set(0.38,1.72,z); bike.add(cheek);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.06,0.02), lambert(0xffd166));
      eye.position.set(0.42,1.8,z*1.2); bike.add(eye);
    });
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.1,0.12), lambert(0x2b2b33));
    beak.position.set(0.56,1.72,0); bike.add(beak);
  } else if(spec.head==='pitviper'){
    /* PIT VIPER GUY: mullet + gigantic rainbow-chrome wraparounds */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.34,0.36), skin);
    head.position.set(0.32,1.73,0); bike.add(head);
    const mullet = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.44,0.34), lambert(0x6e4b2a));
    mullet.position.set(0.12,1.62,0); bike.add(mullet);
    [[0.02,0x5db3c9],[0.08,0xf25caf],[0.14,0xffd166]].forEach(([dy,c])=>{
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.06,0.46), lambert(c));
      strip.position.set(0.5,1.7+dy,0); bike.add(strip);
    });
  } else if(spec.head==='chile'){
    /* GREEN CHILE: the whole head is a roasted pepper */
    const gm = lambert(0x5d8f4a);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.34,0.3), gm);
    head.position.set(0.3,1.76,0); bike.add(head);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.26,0.22,0.24), gm);
    mid.position.set(0.5,1.68,0); mid.rotation.z=-0.4; bike.add(mid);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.18,0.14,0.16), lambert(0x3e6b35));
    tip.position.set(0.64,1.56,0); tip.rotation.z=-0.7; bike.add(tip);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.16,5), lambert(0x6e4b2a));
    stem.position.set(0.24,1.98,0); stem.rotation.z=0.3; bike.add(stem);
    [-0.09,0.09].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.06,0.05), lambert(0x1a1423));
      eye.position.set(0.47,1.8,z); bike.add(eye);
    });
  } else if(spec.head==='prospector'){
    /* PROSPECTOR: wild gray beard + battered hat */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.34,0.36), skin);
    head.position.set(0.32,1.73,0); bike.add(head);
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.34,0.38), lambert(0x8a8275));
    beard.position.set(0.44,1.56,0); bike.add(beard);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.54,0.05,0.54), lambert(0x6e4b2a));
    brim.position.set(0.3,1.92,0); bike.add(brim);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.2,0.3), lambert(0x5a4030));
    crown.position.set(0.3,2.04,0); bike.add(crown);
    [-0.08,0.08].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.06,0.05), lambert(0x1a1423));
      eye.position.set(0.51,1.78,z); bike.add(eye);
    });
  } else if(spec.head==='bighorn'){
    /* BIGHORN: curled horns, lowered ram energy */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.34,0.36), lambert(0xc9a06a));
    head.position.set(0.34,1.72,0); bike.add(head);
    const hornM = lambert(0xa8907a);
    [-0.22,0.22].forEach(z=>{
      const h1=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.2,0.1), hornM);
      h1.position.set(0.28,1.86,z); bike.add(h1);
      const h2=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.1), hornM);
      h2.position.set(0.2,1.72,z*1.15); bike.add(h2);
      const h3=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.08), hornM);
      h3.position.set(0.26,1.6,z*1.25); bike.add(h3);
    });
    [-0.1,0.1].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.06,0.06), lambert(0x1a1423));
      eye.position.set(0.54,1.76,z); bike.add(eye);
    });
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.16,0.2), lambert(0xb8a088));
    muzzle.position.set(0.52,1.64,0); bike.add(muzzle);
  } else if(spec.head==='wanda'){
    /* WASH PARK WANDA: giant sun hat, gray bun, been here since '74 */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.32,0.34), skin);
    head.position.set(0.32,1.72,0); bike.add(head);
    const bun = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.16,0.16), lambert(0xd8d2c5));
    bun.position.set(0.14,1.86,0); bike.add(bun);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44,0.44,0.05,10), lambert(0xf5e9d0));
    brim.position.set(0.3,1.9,0); bike.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.22,0.16,8), lambert(0xf5e9d0));
    crown.position.set(0.3,2.0,0); bike.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215,0.225,0.06,8), lambert(0xf25caf));
    band.position.set(0.3,1.95,0); bike.add(band);
    [-0.08,0.08].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.06,0.05), lambert(0x1a1423));
      eye.position.set(0.5,1.76,z); bike.add(eye);
    });
  } else if(spec.head==='goose'){
    /* HONKER: an actual Canada goose, on an actual bicycle */
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.55,0.16), lambert(0x2b2b33));
    neck.position.set(0.34,1.9,0); bike.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.22,0.22), lambert(0x2b2b33));
    head.position.set(0.42,2.22,0); bike.add(head);
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.12,0.24), lambert(0xf5e9d0));
    chin.position.set(0.38,2.14,0); bike.add(chin);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.08,0.12), lambert(0xe8912d));
    beak.position.set(0.6,2.2,0); bike.add(beak);
    [-0.1,0.1].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,0.02), lambert(0xffd166));
      eye.position.set(0.5,2.26,z*1.1); bike.add(eye);
    });
  } else if(spec.head==='transplant'){
    /* JUST MOVED HERE: sunburn, zinc nose, brand-new bucket hat */
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.34,0.36), skin);
    head.position.set(0.32,1.73,0); bike.add(head);
    const zinc = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.1,0.1), lambert(0xf5f0e6));
    zinc.position.set(0.51,1.71,0); bike.add(zinc);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.48,0.06,0.48), lambert(0xd9cfc0));
    brim.position.set(0.32,1.9,0); bike.add(brim);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.16,0.32), lambert(0xd9cfc0));
    crown.position.set(0.32,2.0,0); bike.add(crown);
    [-0.08,0.08].forEach(z=>{
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.07,0.05), lambert(0x1a1423));
      eye.position.set(0.51,1.78,z); bike.add(eye);
    });
  } else {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.34,0.36), skin);
    head.position.set(0.32,1.73,0); bike.add(head);
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.09,0.32), lambert(0x1a1423));
    shades.position.set(0.5,1.77,0); bike.add(shades);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.02,0.03,0.11), lambert(0x3a2a20));
    mouth.position.set(0.51,1.63,0); bike.add(mouth);
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
