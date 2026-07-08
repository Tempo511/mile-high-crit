/* Character select — renders each selectable rider to a thumbnail once
   (a shared offscreen renderer), builds a card grid, and calls onPick
   with the chosen character. Reuses the game's makeRider so the portraits
   match exactly what you race. */
import * as THREE from 'three';
import { makeRider } from './riders.js';
import { RIDER_SCALE } from './constants.js';
import { ROSTER, PLAYER_CHARACTER } from './characters.js';

export const SELECTABLE = [PLAYER_CHARACTER, ...ROSTER];

function makeThumbnails(size){
  const r = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
  r.setPixelRatio(1); r.setSize(size, size);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffe6c7, 0.8));
  const sun = new THREE.DirectionalLight(0xfff1d0, 0.95); sun.position.set(-4,6,5); scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9b8ec4, 0.45); fill.position.set(5,2,-4); scene.add(fill);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.set(4.4, 1.95, 2.7); cam.lookAt(0.25, 1.2, 0);

  const urls = {};
  for(const c of SELECTABLE){
    const m = makeRider({torso:c.torso, helmet:c.helmet, ...(c.look||{})});
    m.scale.setScalar(RIDER_SCALE);
    scene.add(m);
    r.render(scene, cam);
    urls[c.id] = r.domElement.toDataURL();
    scene.remove(m);
    m.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
  }
  r.dispose();
  return urls;
}

export function createCharacterSelect(onPick){
  const screen = document.getElementById('select');
  const grid = document.getElementById('selGrid');
  const goBtn = document.getElementById('selGo');
  let built = false, chosen = SELECTABLE[0];

  function build(){
    const urls = makeThumbnails(240);
    SELECTABLE.forEach(c=>{
      const card = document.createElement('button');
      card.className = 'selCard' + (c===chosen ? ' on' : '');
      card.innerHTML = `<img src="${urls[c.id]}" alt="${c.name}"><span>${c.name}</span>`;
      card.addEventListener('click', ()=>{
        chosen = c;
        grid.querySelectorAll('.selCard').forEach(el=>el.classList.remove('on'));
        card.classList.add('on');
      });
      grid.appendChild(card);
    });
    built = true;
  }

  goBtn.addEventListener('click', ()=>{
    screen.style.display = 'none';
    onPick(chosen);
  });

  return {
    open(){
      if(!built) build();       // render thumbnails lazily, on first open
      screen.style.display = 'flex';
    }
  };
}
