/* Devices → neutral inputs. The sim only ever sees
   { steer:-1..1, drift:bool, sprint:bool, useItem:bool } — a future netcode
   layer ships exactly this object to represent a remote player's intent. */

export function createInput(){
  const keys={};
  let driftHeld=false, sprintHeld=false, useItemPressed=false, touchSteer=0;

  addEventListener('keydown', e=>{
    keys[e.key]=true;
    if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){ sprintHeld=true; e.preventDefault(); }
    if(e.key==='Shift'||e.key==='ArrowDown'||e.key==='s'||e.key==='S'){ driftHeld=true; e.preventDefault(); }
    if(e.key==='e'||e.key==='E'||e.key==='Enter') useItemPressed=true;
  });
  addEventListener('keyup', e=>{
    keys[e.key]=false;
    if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W') sprintHeld=false;
    if(e.key==='Shift'||e.key==='ArrowDown'||e.key==='s'||e.key==='S') driftHeld=false;
  });

  function bindPad(id,dir){
    const el=document.getElementById(id);
    el.addEventListener('pointerdown', e=>{ touchSteer=dir; e.preventDefault(); });
    el.addEventListener('pointerup',   ()=>{ if(touchSteer===dir) touchSteer=0; });
    el.addEventListener('pointercancel',()=>{ if(touchSteer===dir) touchSteer=0; });
  }
  bindPad('padL',-1); bindPad('padR',1);

  const driftBtn=document.getElementById('btnDrift');
  driftBtn.addEventListener('pointerdown', e=>{ driftHeld=true; e.preventDefault(); });
  driftBtn.addEventListener('pointerup',   ()=> driftHeld=false);
  driftBtn.addEventListener('pointercancel',()=> driftHeld=false);
  const itemBtn=document.getElementById('btnItem');
  itemBtn.addEventListener('pointerdown', e=>{ useItemPressed=true; e.preventDefault(); });
  const sprintBtn=document.getElementById('btnSprint');
  sprintBtn.addEventListener('pointerdown', e=>{ sprintHeld=true; e.preventDefault(); });
  sprintBtn.addEventListener('pointerup',   ()=> sprintHeld=false);
  sprintBtn.addEventListener('pointercancel',()=> sprintHeld=false);

  if(matchMedia('(pointer:coarse)').matches){
    driftBtn.style.display='block'; itemBtn.style.display='block';
    sprintBtn.style.display='block';
  }

  return {
    get(){
      const steer = Math.max(-1,Math.min(1,
        (keys['ArrowLeft']||keys['a']?-1:0)+(keys['ArrowRight']||keys['d']?1:0)+touchSteer));
      const out = { steer, drift:driftHeld, sprint:sprintHeld, useItem:useItemPressed };
      useItemPressed=false;   // edge-triggered
      return out;
    }
  };
}
