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

  /* iOS Safari zooms on double-tap and pinch even with user-scalable=no
     (ignored since iOS 10) — swallow the gestures at every layer:
     gesturestart (pinch), rapid touchend (double-tap), touchstart on game
     surfaces (kills the long-press loupe + any tap-zoom at the source
     while leaving menu buttons clickable), touchmove (rubber-band pans),
     and the long-press context menu. */
  document.addEventListener('gesturestart', e=>e.preventDefault());
  document.addEventListener('dblclick', e=>e.preventDefault());
  document.addEventListener('contextmenu', e=>e.preventDefault());
  let lastTouchEnd=0;
  document.addEventListener('touchend', e=>{
    const now=Date.now();
    if(now-lastTouchEnd<350) e.preventDefault();
    lastTouchEnd=now;
  }, {passive:false});
  document.addEventListener('touchstart', e=>{
    if(e.target.closest && e.target.closest('.pad,.btn,#game,#vignette,#flash'))
      e.preventDefault();
  }, {passive:false});
  document.addEventListener('touchmove', e=>{
    if(!(e.target.closest && e.target.closest('#selGrid'))) e.preventDefault();
  }, {passive:false});

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

  /* touch devices get the buttons — but CSS only shows them while
     body.racing is set, so menus and track previews stay clean */
  if(matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');

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
