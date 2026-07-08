/* Synthesized chiptune SFX — no audio assets, everything is WebAudio
   oscillators + filtered noise. unlock() must be called from a user
   gesture (the ROLL OUT click). handle(event) maps sim events to sounds;
   ambient(dt) sprinkles birdsong. */

export function createAudio(){
  let ctx=null, master=null, birdTimer=2;

  function unlock(){
    if(ctx) return;
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value=0.4;
    master.connect(ctx.destination);
  }

  function osc(freq, dur, type='square', vol=1, slide=0){
    if(!ctx) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.value=freq;
    if(slide) o.frequency.exponentialRampToValueAtTime(
      Math.max(30,freq+slide), ctx.currentTime+dur);
    g.gain.setValueAtTime(vol*0.28, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime+dur);
  }

  function noise(dur, vol=0.3, cutoff=1000){
    if(!ctx) return;
    const n=ctx.createBufferSource();
    const buf=ctx.createBuffer(1, Math.ceil(ctx.sampleRate*dur), ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    n.buffer=buf;
    const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=cutoff;
    const g=ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start();
  }

  const SFX = {
    count:   ()=>osc(660,0.12,'square',0.8),
    go:      ()=>{ osc(523,0.3,'square',0.7); osc(659,0.3,'square',0.5); osc(784,0.35,'square',0.6); },
    pickup:  ()=>{ osc(660,0.07,'square',0.6); setTimeout(()=>osc(990,0.09,'square',0.6),60); },
    boost:   ()=>{ noise(0.35,0.22,2400); osc(220,0.3,'sawtooth',0.4,660); },
    espresso:()=>{ osc(880,0.06,'square',0.5); setTimeout(()=>osc(1175,0.08,'square',0.5),70); noise(0.2,0.1,3000); },
    honk:    ()=>{ osc(196,0.18,'sawtooth',0.9,40); setTimeout(()=>osc(175,0.22,'sawtooth',0.8,-30),140); },
    splash:  ()=>noise(0.5,0.35,600),
    thud:    ()=>osc(110,0.15,'square',0.7,-40),
    bonk:    ()=>osc(320,0.5,'sawtooth',0.6,-200),
    driftTick: t=>osc(440+t*220,0.06,'square',0.55),
    lap:     ()=>{ osc(587,0.12,'square',0.6); setTimeout(()=>osc(880,0.2,'square',0.6),110); },
    finish:  ()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>osc(f,0.25,'square',0.6),i*140)),
    wrong:   ()=>osc(150,0.3,'sawtooth',0.4),
    oops:    ()=>osc(500,0.1,'square',0.5,-150),
    chirp:   ()=>{ osc(2400,0.06,'sine',0.14,600); setTimeout(()=>osc(2800,0.05,'sine',0.12,-400),90); },
  };

  /* toast messages → sounds (first-pass mapping; unknown toasts get a blip) */
  const TOAST_SFX = {
    'BOOST!':'boost', 'SUPER BOOST!':'boost', 'ULTRA BOOST!':'boost',
    'PERFECT START!':'boost', 'ESPRESSO!':'espresso',
    'HONK!!':'honk', 'GOOSE DEPLOYED':'honk',
    'SPLASH! 🪿':'splash', 'OOF':'thud', 'RESET':'wrong', 'WRONG WAY!':'wrong',
    'BONKED! 🥴':'bonk', 'JUMPED THE GUN!':'bonk',
  };

  function handle(e){
    if(!ctx) return;
    if(e.type==='toast') SFX[TOAST_SFX[e.msg] || 'oops']();
    else if(e.type==='pickup') SFX.pickup();
    else if(e.type==='driftTier') SFX.driftTick(e.tier);
    else if(e.type==='lap') SFX.lap();
    else if(e.type==='finish') SFX.finish();
  }

  function ambient(dt){
    if(!ctx) return;
    birdTimer-=dt;
    if(birdTimer<=0){ birdTimer=3+Math.random()*7; SFX.chirp(); }
  }

  return { unlock, handle, ambient, play:n=>SFX[n]&&SFX[n]() };
}
