/* HUD: DOM overlays + minimap. Reads game state, consumes sim events.
   The only module (besides input) that touches the DOM. */
import { ITEMS, PLACES } from './constants.js';

const $=id=>document.getElementById(id);

export function toast(msg, ms=1400){
  const t=$('toast'); t.textContent=msg; t.style.opacity=1;
  clearTimeout(t._h); t._h=setTimeout(()=>t.style.opacity=0,ms);
}

export function fmt(ms){ const s=ms/1000,m=Math.floor(s/60);
  return m+':'+(s-m*60).toFixed(1).padStart(4,'0'); }
export function fmtS(ms){ return (ms/1000).toFixed(1); }

export function createHud(track){
  const mini = $('mini');
  const mctx = mini.getContext('2d');
  const seen = new Set();

  function checkCallouts(prog){
    for(const c of track.data.callouts || []){
      if(!seen.has(c.label) && Math.abs(prog-c.t)<0.012){
        seen.add(c.label);
        const el=$('landmark'); el.textContent='· '+c.label+' ·'; el.style.opacity=1;
        clearTimeout(el._h); el._h=setTimeout(()=>el.style.opacity=0,1800);
      }
    }
  }

  function drawMini(game){
    mctx.clearRect(0,0,96,128);
    mctx.fillStyle='rgba(26,20,35,0.5)'; mctx.fillRect(0,0,96,128);
    for(const wt of track.data.waters || []){        // the lakes
      const [wx,wy]=track.miniXY(wt[0],wt[1]);
      mctx.fillStyle='#4f9ec4';
      mctx.beginPath();
      mctx.ellipse(wx,wy,wt[2]*track.miniS,wt[3]*track.miniS,0,0,Math.PI*2);
      mctx.fill();
    }
    mctx.strokeStyle='#f5e9d0'; mctx.lineWidth=2; mctx.beginPath();
    for(let i=0;i<=track.NS;i+=4){
      const s=track.samples[i%track.NS], [mx,my]=track.miniXY(s.x,s.z);
      i? mctx.lineTo(mx,my) : mctx.moveTo(mx,my);
    }
    if(track.data.format!=='stage') mctx.closePath();
    mctx.stroke();
    for(const r of game.racers){
      const [ax,ay]=track.miniXY(r.x,r.z);
      if(r.driver==='player'){
        mctx.fillStyle='#d94f30'; mctx.fillRect(ax-2,ay-2,5,5);
      } else {
        mctx.fillStyle='#'+r.colors.helmet.toString(16).padStart(6,'0');
        mctx.fillRect(ax-1.5,ay-1.5,4,4);
      }
    }
  }

  function update(game, now){
    const { race, events } = game;
    const player = game.racers.find(r=>r.driver==='player');

    for(const e of events){
      if(e.type==='toast') toast(e.msg, e.ms);
      else if(e.type==='lap')
        toast((e.final?'FINAL LAP · ':'LAP '+e.lap+' · ')+fmtS(e.lapTime)+'s');
      else if(e.type==='finish')
        toast('FINISH! '+PLACES[e.place-1]+' · '+fmt(e.total), 60000);
    }

    if(race.phase==='race'){
      checkCallouts(player.prog);
      $('pos').textContent = PLACES[race.playerPlace-1] || '';
      $('speedo').innerHTML=Math.round(Math.abs(player.speed)*2.05)+'<small> MPH</small>';
      $('laps').innerHTML='LAP '+player.lap+'/'+race.laps
        +'<br><span id="timer">'+fmt(now-race.t0)+'</span>'
        +'<br><span id="best">'+(race.best<Infinity?('BEST '+fmtS(race.best)+'s'):'')+'</span>';
      $('itemSlot').textContent = player.item ? ITEMS[player.item] : '';
    }
    drawMini(game);
  }

  return { update, toast };
}
