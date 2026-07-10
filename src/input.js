/* Devices → neutral inputs. The sim only ever sees
   { steer:-1..1, drift:bool, sprint:bool, useItem:bool } — a future netcode
   layer ships exactly this object to represent a remote player's intent.

   Touch note: steering holds a screen half with one thumb, so the *other*
   thumb must be able to drift — hence a drift button on BOTH sides (you use
   whichever is opposite your steering thumb). */

export function createInput(){
  const keys={};
  let keyDrift=false, keySprint=false, useItemPressed=false, touchSteer=0;
  let btnDriftL=false, btnDriftR=false, btnSprintL=false, btnSprintR=false;

  addEventListener('keydown', e=>{
    keys[e.key]=true;
    if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){ keySprint=true; e.preventDefault(); }
    if(e.key==='Shift'||e.key==='ArrowDown'||e.key==='s'||e.key==='S'){ keyDrift=true; e.preventDefault(); }
    if(e.key==='e'||e.key==='E'||e.key==='Enter') useItemPressed=true;
  });
  addEventListener('keyup', e=>{
    keys[e.key]=false;
    if(e.key===' '||e.key==='ArrowUp'||e.key==='w'||e.key==='W') keySprint=false;
    if(e.key==='Shift'||e.key==='ArrowDown'||e.key==='s'||e.key==='S') keyDrift=false;
  });

  /* pointer capture keeps the release event coming to the element even if
     the thumb slides off before lifting — otherwise inputs latch on */
  function bindPad(id,dir){
    const el=document.getElementById(id);
    el.addEventListener('pointerdown', e=>{
      el.setPointerCapture(e.pointerId);
      touchSteer=dir; e.preventDefault();
    });
    el.addEventListener('pointerup',   ()=>{ if(touchSteer===dir) touchSteer=0; });
    el.addEventListener('pointercancel',()=>{ if(touchSteer===dir) touchSteer=0; });
  }
  bindPad('padL',-1); bindPad('padR',1);

  function bindHold(id, set){
    const el=document.getElementById(id);
    el.addEventListener('pointerdown', e=>{
      el.setPointerCapture(e.pointerId);
      set(true); e.preventDefault();
    });
    el.addEventListener('pointerup',   ()=> set(false));
    el.addEventListener('pointercancel',()=> set(false));
    return el;
  }
  const driftBtnR = bindHold('btnDrift',   v=>btnDriftR=v);
  const driftBtnL = bindHold('btnDriftL',  v=>btnDriftL=v);
  const sprintBtnR= bindHold('btnSprint',  v=>btnSprintR=v);
  const sprintBtnL= bindHold('btnSprintL', v=>btnSprintL=v);
  const itemBtn = document.getElementById('btnItem');
  itemBtn.addEventListener('pointerdown', e=>{ useItemPressed=true; e.preventDefault(); });

  if(matchMedia('(pointer:coarse)').matches){
    [driftBtnR, driftBtnL, sprintBtnR, sprintBtnL, itemBtn].forEach(b=>b.style.display='block');
  }

  return {
    get(){
      const steer = Math.max(-1,Math.min(1,
        (keys['ArrowLeft']||keys['a']?-1:0)+(keys['ArrowRight']||keys['d']?1:0)+touchSteer));
      const out = {
        steer,
        drift:   keyDrift || btnDriftL || btnDriftR,
        sprint:  keySprint || btnSprintL || btnSprintR,
        useItem: useItemPressed
      };
      useItemPressed=false;   // edge-triggered
      return out;
    }
  };
}
