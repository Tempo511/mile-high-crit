/* Renderer: scene/camera setup + drawing racer state each frame.
   Strictly read-only over game state — all mutation lives in the sim. */
import * as THREE from 'three';
import { INTERNAL_H, BOOST_SPEED, MINI, SUPER } from './constants.js';
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

  return { renderer, scene, camera };
}

/* one mesh per racer, keyed by racer id */
export function createRacerMeshes(scene, racers){
  const meshes = new Map();
  for(const r of racers){
    const m = makeRider({torso:r.colors.torso, helmet:r.colors.helmet, ...(r.look||{})});
    scene.add(m);
    meshes.set(r.id, m);
  }
  return meshes;
}

export function draw(game, view, dt, now){
  const { renderer, scene, camera, meshes } = view;
  const player = game.racers.find(r=>r.driver==='player');

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

      const tier = r.driftCharge>=SUPER?2 : r.driftCharge>=MINI?1 : 0;
      m.userData.sparks.forEach(s=>{
        s.visible = r.drifting && tier>0 && (Math.floor(now/60)%2===0);
        s.material.color.setHex(tier===2?0xff9a5c:0x5db3c9);
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
  const targetFov = boosting? 84 : 70;
  camera.fov += (targetFov-camera.fov)*Math.min(1,dt*6);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}
