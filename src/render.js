/* Renderer: scene/camera setup + drawing racer state each frame.
   Strictly read-only over game state — all mutation lives in the sim. */
import * as THREE from 'three';
import { INTERNAL_H, RIDER_SCALE, BOOST_SPEED, MINI, SUPER, ULTRA } from './constants.js';
import { makeRider } from './riders.js';

export function createRenderer(trackData){
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false});
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(trackData.sky);
  scene.fog = new THREE.Fog(trackData.sky, trackData.fog[0], trackData.fog[1]);

  const camera = new THREE.PerspectiveCamera(70, 16/9, 0.1, 800);

  function resize(){
    const w = window.innerWidth, h = window.innerHeight;
    const ih = INTERNAL_H, iw = Math.round(ih * w/h);
    renderer.setSize(iw, ih, false);
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  const amb = trackData.ambient || [0xffe6c7, 0.55];
  scene.add(new THREE.AmbientLight(amb[0], amb[1]));
  const sunDef = trackData.sun || [0xfff1d0, 0.95];
  const sun = new THREE.DirectionalLight(sunDef[0], sunDef[1]);
  sun.position.set(-140, 150, 40);
  scene.add(sun);
  /* cool fill from the opposite side — the Rider Lab trick that gives
     characters edge definition instead of flat single-source shading */
  const fill = new THREE.DirectionalLight(0x9b8ec4, 0.3);
  fill.position.set(120, 60, -80);
  scene.add(fill);

  return { renderer, scene, camera };
}

/* one mesh per racer, keyed by racer id */
export function createRacerMeshes(scene, racers){
  const meshes = new Map();
  for(const r of racers){
    const m = makeRider({torso:r.colors.torso, helmet:r.colors.helmet, ...(r.look||{})});
    m.scale.setScalar(RIDER_SCALE);   // visual only — collision radii unchanged
    scene.add(m);
    meshes.set(r.id, m);
  }
  return meshes;
}

/* speed-lines while sprinting; rising energy motes while drafting */
function ensureFx(view){
  if(view.streaks) return;
  view.streaks=[];
  const sg=new THREE.BoxGeometry(0.07,0.07,2.4);
  for(let i=0;i<7;i++){
    const m=new THREE.Mesh(sg, new THREE.MeshBasicMaterial(
      {color:0xfff1c9, transparent:true, opacity:0.6}));
    m.visible=false; view.scene.add(m);
    view.streaks.push({m, ahead:4+i*1.7, lat:(i%2?1:-1)*(1+(i%3)*0.7), y:0.6+(i%4)*0.4});
  }
  view.motes=[];
  const mg=new THREE.BoxGeometry(0.1,0.1,0.1);
  for(let i=0;i<6;i++){
    const m=new THREE.Mesh(mg, new THREE.MeshBasicMaterial(
      {color:0x5db3c9, transparent:true, opacity:0.9}));
    m.visible=false; view.scene.add(m);
    view.motes.push({m, lx:(i%2?1:-1)*(0.3+(i%3)*0.3), lf:-0.5+(i%4)*0.4, y:0.3+i*0.35});
  }
  view.dust=[];
  const dg=new THREE.BoxGeometry(0.2,0.2,0.2);
  for(let i=0;i<8;i++){
    const m=new THREE.Mesh(dg, new THREE.MeshBasicMaterial(
      {color:0xb8ab98, transparent:true, opacity:0.6}));
    m.visible=false; view.scene.add(m);
    view.dust.push({m, life:0, x:0, y:0, z:0});
  }
}

export function draw(game, view, dt, now){
  const { renderer, scene, camera, meshes } = view;
  const player = game.racers.find(r=>r.driver==='player');
  ensureFx(view);

  const pfx=Math.sin(player.heading), pfz=Math.cos(player.heading);
  /* gas: streaks whipping past */
  for(const s of view.streaks){
    if(!player.sprinting){ s.m.visible=false; continue; }
    s.ahead -= (player.speed+16)*dt;
    if(s.ahead<-5){
      s.ahead=6+Math.random()*7;
      s.lat=(Math.random()<0.5?-1:1)*(1+Math.random()*2);
      s.y=0.5+Math.random()*1.6;
    }
    s.m.visible=true;
    s.m.position.set(player.x+pfx*s.ahead - pfz*s.lat, s.y,
                     player.z+pfz*s.ahead + pfx*s.lat);
    s.m.rotation.y=player.heading;
  }
  /* drift: dust kicked off the rear wheel */
  for(const d of view.dust){
    d.life-=dt;
    if(d.life<=0){
      if(player.drifting && Math.abs(player.speed)>10){
        d.life=0.3+Math.random()*0.2;
        d.x=player.x - pfx*1.1 - pfz*(player.driftDir*0.5+(Math.random()-0.5)*0.5);
        d.z=player.z - pfz*1.1 + pfx*(player.driftDir*0.5+(Math.random()-0.5)*0.5);
        d.y=0.15;
        d.m.scale.setScalar(0.8+Math.random()*0.5);
      } else { d.m.visible=false; continue; }
    }
    d.y+=1.4*dt; d.m.scale.multiplyScalar(1+2.4*dt);
    d.m.visible=true;
    d.m.material.opacity=Math.max(0, d.life*1.8);
    d.m.position.set(d.x, d.y, d.z);
  }

  /* draft: cyan motes gathering up the rider */
  for(const mo of view.motes){
    if(!player.drafting){ mo.m.visible=false; continue; }
    mo.y += 1.5*dt;
    if(mo.y>2.3){
      mo.y=0.2;
      mo.lx=(Math.random()<0.5?-1:1)*(0.25+Math.random()*0.7);
      mo.lf=-0.6+Math.random()*1.4;
    }
    mo.m.visible=true;
    mo.m.material.opacity=Math.max(0.15, 1-mo.y*0.4);
    mo.m.position.set(player.x+pfx*mo.lf - pfz*mo.lx, mo.y,
                      player.z+pfz*mo.lf + pfx*mo.lx);
    mo.m.rotation.y=now/300+mo.lx;
  }

  for(const r of game.racers){
    const m = meshes.get(r.id);
    m.position.set(r.x, r.driver==='player' ? r.hopY : 0, r.z);
    if(r.driver!=='player' && r.spin>0)
      m.rotation.set(0, r.heading-Math.PI/2 + r.spin*12, 0);
    else
      m.rotation.set(0, r.heading-Math.PI/2, 0);

    const spin = r.driver==='player' ? Math.abs(r.speed) : r.speed;
    for(const w of m.userData.wheels) w.rotation.z -= spin*dt/0.42;

    const [l, rr]=m.userData.legs;
    const ph = r.driver==='player'
      ? now/1000*(2+Math.abs(r.speed)*0.5)
      : now/1000*(2+r.speed*0.5)+r.ph;
    l.position.y=0.95+Math.sin(ph)*0.14;
    rr.position.y=0.95+Math.sin(ph+Math.PI)*0.14;

    const bike=m.userData.bike;
    if(r.driver==='player'){
      const targetRoll = r.drifting ? r.driftDir*0.55 : r.steer*0.3;
      bike.rotation.x += (targetRoll - bike.rotation.x)*Math.min(1,dt*10);
      const targetYaw = r.drifting ? r.driftDir*0.45 : 0;
      bike.rotation.y += (targetYaw - bike.rotation.y)*Math.min(1,dt*8);

      const tier = r.driftCharge>=ULTRA?3 : r.driftCharge>=SUPER?2 : r.driftCharge>=MINI?1 : 0;
      m.userData.sparks.forEach(s=>{
        s.visible = r.drifting && tier>0 && (Math.floor(now/60)%2===0);
        s.material.color.setHex(tier===3?0xf25caf : tier===2?0xff9a5c : 0x5db3c9);
      });
    } else {
      bike.rotation.x = -Math.sin(r.dist*0.02+r.ph)*0.15;
    }
  }

  /* chase camera on the player */
  const boosting=player.boostT>0;
  const camDist = 7.5, camH = 4.1 - Math.min(1,Math.abs(player.speed)/BOOST_SPEED)*0.7;
  const cx = player.x - Math.sin(player.heading)*camDist;
  const cz = player.z - Math.cos(player.heading)*camDist;
  camera.position.lerp(new THREE.Vector3(cx, camH, cz), Math.min(1,dt*6));
  if(player.shake>0){
    camera.position.x+=(Math.random()-0.5)*player.shake;
    camera.position.y+=(Math.random()-0.5)*player.shake*0.5;
  }
  camera.lookAt(player.x+Math.sin(player.heading)*9, 1.4,
                player.z+Math.cos(player.heading)*9);
  camera.rotateZ(player.steer*0.045 + (player.drifting ? player.driftDir*0.05 : 0));
  const targetFov = boosting? 84 : player.sprinting? 77 : 70;
  camera.fov += (targetFov-camera.fov)*Math.min(1,dt*6);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}
