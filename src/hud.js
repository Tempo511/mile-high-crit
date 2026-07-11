/* HUD: DOM overlays + minimap. Reads game state, consumes sim events.
   The only module (besides input) that touches the DOM. */
import { ITEMS, PLACES } from './constants.js';
import { progressOf } from './racers.js';

const $=id=>document.getElementById(id);

/* full-screen pulse (lap = white, boost = gold, finish = big white) */
function flash(color, intensity){
  const el=$('flash');
  el.style.transition='none';
  el.style.background=color;
  el.style.opacity=intensity;
  el.offsetHeight;                       // force reflow so the fade restarts
  el.style.transition='opacity .5s';
  el.style.opacity=0;
}

export function toast(msg, ms=1400){
  const t=$('toast'); t.textContent=msg; t.style.opacity=1;
  clearTimeout(t._h); t._h=setTimeout(()=>t.style.opacity=0,ms);
}

export function fmt(ms){ const s=ms/1000,m=Math.floor(s/60);
  return m+':'+(s-m*60).toFixed(1).padStart(4,'0'); }
export function fmtS(ms){ return (ms/1000).toFixed(1); }

export function createHud(track, mpHooks){
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
      if(e.type==='toast'){
        toast(e.msg, e.ms);
        if(e.msg==='BOOST!'||e.msg==='SUPER BOOST!'||e.msg==='ULTRA BOOST!')
          flash('#ffd166', 0.18);
      }
      else if(e.type==='lap'){
        toast((e.final?'FINAL LAP · ':'LAP '+e.lap+' · ')+fmtS(e.lapTime)+'s');
        flash('#fff', 0.3);
      }
      else if(e.type==='finish'){
        toast('FINISH! '+PLACES[e.place-1], 2500);
        flash('#fff', 0.5);
        setTimeout(()=>showResults(game, e), 1500);
      }
    }

    if(race.phase==='race'){
      checkCallouts(player.prog);
      $('pos').textContent = PLACES[race.playerPlace-1] || '';
      $('speedo').innerHTML=Math.round(Math.abs(player.speed)*2.05)+'<small> MPH</small>';
      $('energyFill').style.width=(player.energy*100)+'%';
      $('energyWrap').className = player.bonkT>0 ? 'hud bonk'
        : player.drafting ? 'hud draft' : 'hud';
      $('energyLabel').textContent = player.bonkT>0 ? 'BONK!'
        : player.drafting ? 'DRAFT ≋' : 'LEGS';
      $('laps').innerHTML=(track.data.format==='stage'
          ? 'STAGE '+Math.min(100,Math.round(player.prog/(track.data.finishT||1)*100))+'%'
          : 'LAP '+player.lap+'/'+race.laps)
        +'<br><span id="timer">'+fmt(now-race.t0)+'</span>'
        +'<br><span id="best">'+(race.best<Infinity?('BEST '+fmtS(race.best)+'s'):'')+'</span>';
      $('itemSlot').textContent = player.item ? ITEMS[player.item] : '';
      const ib = $('btnItem');                    // touch button shows the held item
      ib.textContent = player.item ? ITEMS[player.item] : '🎁';
      ib.style.opacity = player.item ? '1' : '0.5';
    }
    drawMini(game);
  }

  function showResults(game, e){
    const { race, racers } = game;
    const done = race.finishOrder.map(id=>racers.find(r=>r.id===id));
    const rest = racers.filter(r=>!race.finishOrder.includes(r.id))
      .sort((a,b)=>progressOf(track,b)-progressOf(track,a));
    const rows = [...done, ...rest].map((r,i)=>{
      const you = r.driver==='player';
      const time = you ? ' · '+fmt(e.total) : '';
      return `<div class="${you?'you':''}">${PLACES[i]}&nbsp;&nbsp;${r.name}${time}</div>`;
    }).join('');
    $('resTitle').textContent = e.place===1 ? 'YOU WON! 🏆'
      : 'FINISH! '+PLACES[e.place-1];
    $('resList').innerHTML = rows +
      (race.best<Infinity ? `<div>&nbsp;</div><div>BEST LAP · ${fmtS(race.best)}s</div>` : '');
    /* online rooms: the host rematches (same track or a new one) and the
       whole room follows — no new link needed */
    if(mpHooks){
      const btn = $('againBtn');
      if(mpHooks.isHost){
        btn.style.display='none';
        const row=document.createElement('div');
        row.id='resTracks';
        row.innerHTML='<div class="resLabel">REMATCH — PICK THE TRACK</div>';
        for(const id of mpHooks.tracks){
          const b2=document.createElement('button');
          b2.textContent=mpHooks.names[id]||id.toUpperCase();
          if(id===mpHooks.current) b2.classList.add('on');
          b2.addEventListener('click', ()=>mpHooks.rematch(id));
          row.appendChild(b2);
        }
        $('results').insertBefore(row, btn);
      } else {
        btn.disabled=true;
        btn.textContent='WAITING FOR HOST — rematch loads automatically';
      }
    }
    $('results').style.display='flex';
  }
  $('againBtn').addEventListener('click', ()=>location.reload());

  return { update, toast };
}
