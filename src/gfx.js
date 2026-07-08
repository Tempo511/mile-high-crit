/* Shared graphics helpers: pixel-art canvas textures + flat-shaded materials. */
import * as THREE from 'three';

export function pixTex(px, draw, repX=1, repY=1){
  const c = document.createElement('canvas'); c.width = c.height = px;
  draw(c.getContext('2d'), px);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY);
  return t;
}

export function lambert(color, extra={}){
  return new THREE.MeshLambertMaterial(Object.assign({color, flatShading:true}, extra));
}

/* Texture speckle noise is per-client visual fluff — plain Math.random is fine. */
export const grassTex = pixTex(32,(g,px)=>{
  g.fillStyle='#7fb069'; g.fillRect(0,0,px,px);
  const s=['#6a9c55','#8fbe78','#75a860','#98c983'];
  for(let i=0;i<140;i++){ g.fillStyle=s[i%4];
    g.fillRect(Math.random()*px|0, Math.random()*px|0, 2, 2);}
}, 80, 80);

export const roadTex = pixTex(32,(g,px)=>{
  g.fillStyle='#7d7568'; g.fillRect(0,0,px,px);
  for(let i=0;i<80;i++){ g.fillStyle=i%2?'#8a8275':'#6f6759';
    g.fillRect(Math.random()*px|0, Math.random()*px|0, 2, 1);}
  g.fillStyle='#e8d98a'; g.fillRect(px/2-1, 2, 2, 12);
});

export const waterTex = pixTex(32,(g,px)=>{
  g.fillStyle='#3d8ea8'; g.fillRect(0,0,px,px);
  g.fillStyle='#5db3c9';
  for(let i=0;i<26;i++) g.fillRect(Math.random()*px|0, Math.random()*px|0, 4, 1);
}, 10, 10);

export const asphaltTex = pixTex(16,(g,px)=>{
  g.fillStyle='#71716f'; g.fillRect(0,0,px,px);
  for(let i=0;i<14;i++){ g.fillStyle=i%2?'#7c7c7a':'#646462';
    g.fillRect(Math.random()*px|0, Math.random()*px|0, 2, 1);}
});

export const sandTex = pixTex(16,(g,px)=>{
  g.fillStyle='#d9bf8f'; g.fillRect(0,0,px,px);
  g.fillStyle='#c9ae7d';
  for(let i=0;i<20;i++) g.fillRect(Math.random()*px|0, Math.random()*px|0, 1, 1);
});
