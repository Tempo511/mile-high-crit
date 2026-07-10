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
  // (MeshLambertMaterial ignores flatShading — passing it just warns)
  return new THREE.MeshLambertMaterial(Object.assign({color}, extra));
}

/* a wide banner/sign texture with centered, readable text. High-res + smooth
   (linear + mipmaps + anisotropy) so it stays legible through the retro render;
   font auto-shrinks to fit long labels. POT dimensions so mipmaps work. */
export function bannerTex(text, bg='#c75146', fg='#ffd166'){
  const w=1024, h=256;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d');
  g.fillStyle=bg; g.fillRect(0,0,w,h);
  g.strokeStyle=fg; g.lineWidth=16; g.strokeRect(16,16,w-32,h-32);
  g.fillStyle=fg; g.textAlign='center'; g.textBaseline='middle';
  let size=150;
  g.font=`bold ${size}px Arial, "Helvetica Neue", sans-serif`;
  while(g.measureText(text).width > w-100 && size>40){
    size-=8; g.font=`bold ${size}px Arial, "Helvetica Neue", sans-serif`;
  }
  g.fillText(text, w/2, h/2+8);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.anisotropy=8; t.needsUpdate=true;
  return t;
}

/* soft dark ellipse that visually glues an object to the ground */
const shadowGeo = new THREE.CircleGeometry(1, 12);
export function blobShadow(r, opacity=0.25, y=0.03){
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial(
    {color:0x1a1423, transparent:true, opacity, depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.scale.set(r,r,1); m.position.y=y;
  return m;
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

/* four-lane arterial: double-yellow centerline, dashed white lane lines */
export const arterialTex = pixTex(32,(g,px)=>{
  g.fillStyle='#6e6e6c'; g.fillRect(0,0,px,px);
  for(let i=0;i<60;i++){ g.fillStyle=i%2?'#79797a':'#636361';
    g.fillRect(Math.random()*px|0, Math.random()*px|0, 2, 1);}
  g.fillStyle='#d9b23a';
  g.fillRect(px/2-2,0,1,px); g.fillRect(px/2+1,0,1,px);
  g.fillStyle='#e8e4da';
  for(let y=0;y<px;y+=8){ g.fillRect(px/4,y,1,4); g.fillRect(3*px/4,y,1,4); }
});

/* BRT arterial: red center bus lanes, white edge lines, outer car lanes */
export const brtTex = pixTex(32,(g,px)=>{
  g.fillStyle='#6e6e6c'; g.fillRect(0,0,px,px);
  g.fillStyle='#7e4038'; g.fillRect(px*0.3,0,px*0.4,px);       // red BUS ONLY zone
  for(let i=0;i<50;i++){ g.fillStyle=i%2?'#79797a':'#8a4a42';
    const x=Math.random()*px|0;
    if(x>px*0.3&&x<px*0.7) g.fillStyle=i%2?'#8a4a42':'#74352e';
    g.fillRect(x, Math.random()*px|0, 2, 1);}
  g.fillStyle='#d9b23a';
  g.fillRect(px/2-1,0,2,px);                                    // center double yellow
  g.fillStyle='#e8e4da';
  g.fillRect(px*0.3-1,0,1,px); g.fillRect(px*0.7,0,1,px);       // solid bus-lane edges
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

/* downtown ground: pale concrete sidewalk grid with expansion seams */
export const concreteTex = pixTex(32,(g,px)=>{
  g.fillStyle='#a8a49a'; g.fillRect(0,0,px,px);
  for(let i=0;i<60;i++){ g.fillStyle=i%2?'#b2aea4':'#9c988e';
    g.fillRect(Math.random()*px|0, Math.random()*px|0, 2, 1);}
  g.fillStyle='#8e8a80';
  g.fillRect(0,0,px,1); g.fillRect(0,0,1,px);
  g.fillRect(0,px/2,px,1); g.fillRect(px/2,0,1,px);
}, 160, 160);

export const sandTex = pixTex(16,(g,px)=>{
  g.fillStyle='#d9bf8f'; g.fillRect(0,0,px,px);
  g.fillStyle='#c9ae7d';
  for(let i=0;i<20;i++) g.fillRect(Math.random()*px|0, Math.random()*px|0, 1, 1);
});
