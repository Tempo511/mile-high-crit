/* HUD: DOM overlays + minimap. Reads game state, consumes sim events.
   The only module (besides input) that touches the DOM. */
import { ITEMS, PLACES } from './constants.js';
import { progressOf } from './racers.js';
import { hasBoard, playerName, saveName, submitTime, rankOf, renderBoard } from './board.js';

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

  /* first-run coaching: each tip fires once EVER (localStorage), triggered
     by play context so new riders learn the invisible mechanics mid-ride */
  const isTouch = 'ontouchstart' in window;
  const races = parseInt(localStorage.getItem('dash-races')||'0',10)+1;
  localStorage.setItem('dash-races', races);
  const tipSeen = k => localStorage.getItem('dash-tip-'+k);
  const tipMark = k => localStorage.setItem('dash-tip-'+k,'1');
  const tip = (k,msg)=>{ tipMark(k); toast(msg, 2800); };
  let raceT0=null;

  function coach(player, race, now){
    /* launch timing: teach on race two — race one they just play */
    if(race.phase==='count' && races>1 && !tipSeen('launch'))
      tip('launch','TIP: SPRINT RIGHT ON GO! FOR A LAUNCH BOOST');
    if(race.phase!=='race') return;
    if(raceT0===null) raceT0=now;
    if(player.drifting && !tipSeen('drift')) tipMark('drift');  // self-taught
    if(!tipSeen('drift') && now-raceT0>6000 && player.speed>13)
      tip('drift', isTouch ? 'TIP: HOLD DRIFT IN CORNERS - RELEASE FOR A BOOST'
                           : 'TIP: HOLD SHIFT IN CORNERS - RELEASE FOR A BOOST');
    if(!tipSeen('item') && player.item)
      tip('item', isTouch ? 'TAP THE GIFT BUTTON TO USE YOUR ITEM'
                          : 'PRESS E TO USE YOUR ITEM');
    if(!tipSeen('legs') && player.energy<=0.02)
      tip('legs','OUT OF LEGS - EASE OFF SPRINT AND THEY RECHARGE');
  }

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
    if(player) coach(player, race, now);

    for(const e of events){
      if(e.type==='toast'){
        toast(e.msg, e.ms);
        if(e.msg==='BOOST!'||e.msg==='SUPER BOOST!'||e.msg==='ULTRA BOOST!')
          flash('#ffd166', 0.18);
      }
      else if(e.type==='split'){
        const pbS = race.pb && race.pb.splits && race.pb.splits[e.i];
        toast('S'+(e.i+1)+' · '+fmtS(e.ms)+'s' + (pbS!=null
          ? '  ('+(e.ms<=pbS?'−':'+')+fmtS(Math.abs(e.ms-pbS))+')' : ''), 1600);
      }
      else if(e.type==='lap'){
        toast((e.final?'FINAL LAP · ':'LAP '+e.lap+' · ')+fmtS(e.lapTime)+'s');
        flash('#fff', 0.3);
      }
      else if(e.type==='finish'){
        if(e.tt){
          toast(e.newPB ? (race.pb ? 'YOU BEAT THE GHOST! 👻' : 'FINISHED!')
                        : 'THE GHOST WINS 👻', 2500);
        } else toast('FINISH! '+PLACES[e.place-1], 2500);
        flash('#fff', 0.5);
        setTimeout(()=>showResults(game, e), 1500);
      }
    }

    if(race.phase==='race'){
      checkCallouts(player.prog);
      $('pos').textContent = game.tt ? '' : (PLACES[race.playerPlace-1] || '');
      $('speedo').innerHTML=Math.round(Math.abs(player.speed)*2.05)+'<small> MPH</small>';
      $('energyFill').style.width=(player.energy*100)+'%';
      $('energyWrap').className = player.bonkT>0 ? 'hud bonk'
        : player.drafting ? 'hud draft' : 'hud';
      $('energyLabel').textContent = player.bonkT>0 ? 'BONK!'
        : player.drafting ? 'DRAFT ≋' : 'LEGS';
      const gd = race.ghostDelta;
      $('laps').innerHTML=(track.data.format==='stage'
          ? 'STAGE '+Math.min(100,Math.round(player.prog/(track.data.finishT||1)*100))+'%'
          : 'LAP '+player.lap+'/'+race.laps)
        +'<br><span id="timer">'+fmt(now-race.t0)+'</span>'
        +(gd!==undefined
          ? '<br><span style="color:'+(gd<=0?'#8fbe78':'#e84855')+'">'
            +(gd<=0?'−':'+')+Math.abs(gd/1000).toFixed(2)+' GHOST</span>'
          : '<br><span id="best">'+(race.best<Infinity?('BEST '+fmtS(race.best)+'s'):'')+'</span>');
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
    if(game.tt){
      const ms = e.total;
      $('resTitle').textContent = e.newPB ? 'NEW PERSONAL BEST!'
        : (race.pb ? 'THE GHOST WINS 👻' : 'TIME TRIAL');
      const splits=(race.splitTimes||[]).map((sms,i2)=>{
        const pbS=race.pb&&race.pb.splits&&race.pb.splits[i2];
        return `<div>S${i2+1} · ${fmt(sms)}${pbS!=null
          ? ' ('+(sms<=pbS?'−':'+')+fmtS(Math.abs(sms-pbS))+')' : ''}</div>`;
      }).join('');
      $('resList').innerHTML =
        `<div class="you" style="font-size:1.3em">⏱ ${fmt(ms)}</div>`
        + splits
        + (race.pb && !e.newPB ? `<div>PB · ${fmt(race.pb.ms)}</div>` : '')
        + (hasBoard ? '<div id="resSubmit"></div><div id="resBoard"></div>'
           : '<div>&nbsp;</div>');
      $('againBtn').textContent='RETRY';
      $('results').style.display='flex';
      if(hasBoard){
        const trackId = track.data.id;
        const showBoard = ()=> renderBoard($('resBoard'), trackId, fmt, playerName());
        /* arcade rules: every finish, type your name, post THIS run.
           The board keeps each name's best, so slow runs can't hurt you. */
        const runMs = Math.round(ms);
        const prefill = (playerName()||'').replace(/[^A-Za-z0-9 _.\-]/g,'');
        $('resSubmit').innerHTML =
          `<input id="nameIn" maxlength="12" placeholder="YOUR NAME" value="${prefill}">
           <button id="nameGo">POST SCORE</button>`;
        $('nameGo').addEventListener('click', async ()=>{
          const n=$('nameIn').value.trim().slice(0,12).replace(/[^A-Za-z0-9 _.\-]/g,'');
          if(!n) return;
          saveName(n);                       // remembered only as next prefill
          $('resSubmit').textContent='posting…';
          const okPost = await submitTime({ track:trackId, name:n,
            char:(game.racers[0]&&game.racers[0].id)||'you',
            ms:runMs, ghost:e.frames||null });
          if(!okPost){
            $('resSubmit').innerHTML='<span style="opacity:.7">couldn\'t reach the board — try again next run</span>';
            return;
          }
          const [dR, aR] = await Promise.all([
            rankOf(trackId, runMs, true), rankOf(trackId, runMs, false)]);
          $('resSubmit').innerHTML =
            `<span class="you">POSTED ${fmt(runMs)} · ${dR?('#'+dR+' TODAY'):''}${dR&&aR?' · ':''}${aR?('#'+aR+' ALL-TIME'):''}</span>`;
          showBoard();
        });
        showBoard();
      }
      return;
    }
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
  /* home: drop any mode hash (#tt / #host / #join) and land on the title */
  $('homeBtn').addEventListener('click', ()=>{
    location.href = location.pathname + location.search;
  });

  return { update, toast };
}
