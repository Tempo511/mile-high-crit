/* UNION STATION GP — track definition. Pure data, no code.
   A downtown LoDo circuit: launch off the Wynkoop plaza in front of the
   terminal, right at 20th past Coors Field, down the tower canyon, under
   the Larimer Square lights, sweep Speer along Cherry Creek, through
   Confluence + Commons Park up the Platte, and hook under the Millennium
   Bridge back to the station. */

export default {
  id: 'unionstation',
  name: 'UNION STATION GP',
  format: 'circuit',
  laps: 3,
  seed: 1881,                    // the year the first Union Station opened

  /* golden-hour downtown: a touch warmer than the park */
  sky: 0x7ab3e8,
  fog: [70, 520],
  ambient: [0xffeed8, 0.6],
  sun: [0xfff2d5, 0.9],
  bounds: { x: 155, z: 155 },
  ground: 'urban',               // concrete base; parks are lawn props

  roadWidth: 8.8,
  spline: [
    [   0,0,   0],[  36,0,   2],[  66,0,   8],   // Wynkoop straight
    [  88,0,  22],[  96,0,  46],[  90,0,  74],   // 20th St, Coors gate
    [  70,0,  94],[  38,0, 106],[   0,0, 112],   // into the LoDo canyon
    [ -36,0, 108],[ -66,0,  94],                 // Larimer Square
    [ -90,0,  68],[-102,0,  34],[-104,0,  -4],   // Speer / Cherry Creek sweep
    [ -94,0, -40],[ -72,0, -62],                 // Confluence, up the Platte
    [ -44,0, -74],[ -16,0, -72],                 // Commons Park
    [ -30,0, -44],[ -34,0, -18],[ -20,0,   0]    // Millennium hook, 16th & Wynkoop
  ],

  boostPads: [0.24, 0.48, 0.90],
  itemBoxes: { at: [0.10, 0.40, 0.70], offsets: [-2.2, 0, 2.2] },

  callouts: [
    { t:0.05, label:'WYNKOOP STRAIGHT' },
    { t:0.16, label:'THE BLAKE BEND' },
    { t:0.30, label:'LODO CANYON' },
    { t:0.45, label:'LARIMER SQUARE' },
    { t:0.56, label:'SPEER SWEEP' },
    { t:0.69, label:'CONFLUENCE PARK' },
    { t:0.79, label:'COMMONS PARK' },
    { t:0.88, label:'MILLENNIUM HOOK' },
    { t:0.95, label:'THE TERMINAL' }
  ],

  /* splash hazards where the Platte hugs the racing line */
  waters: [
    [-126,  12, 11, 34],         // the Platte along the Speer sweep
    [-106, -62, 10, 12]          // the Platte at the Commons bend
  ],

  props: [
    /* ---------- the rivers & their parks ---------- */
    { type:'river', width:11, kayaks:5, points:[
      [-134,0,96],[-128,0,52],[-124,0,10],[-118,0,-32],[-104,0,-64],[-80,0,-90],
      [-52,0,-104],[-16,0,-130],[24,0,-148],[70,0,-158],[118,0,-164]
    ]},
    { type:'river', width:4.5, points:[
      [-46,0,120],[-72,0,88],[-96,0,50],[-110,0,14],[-118,0,-14]
    ]},
    { type:'lawn', x:-46, z:-50, r:26 },          // Commons Park
    { type:'lawn', x:-88, z:-34, r:15 },          // Confluence banks
    { type:'lawn', x:-92, z:56, r:12, scale:[0.7,1] },  // Speer greenbelt
    { type:'picnickers', x:-46, z:-48, spread:20, count:6 },
    { type:'grassVolleyball', x:-56, z:-38, ry:0.4 },
    { type:'grove', x:-48, z:-52, spreadX:36, spreadZ:28, count:8, margin:7 },
    { type:'grove', x:-90, z:-30, spreadX:20, spreadZ:24, count:5, margin:7 },
    { type:'grove', x:-98, z:60, spreadX:16, spreadZ:30, count:5, margin:7 },
    /* the Platte greenway jogging loop */
    { type:'path', width:2.5, jog:true, points:[
      [-124,0,84],[-119,0,34],[-113,0,-16],[-100,0,-52],[-78,0,-84],[-52,0,-98],
      [-44,0,-84],[-64,0,-64],[-84,0,-38],[-96,0,-2],[-108,0,44],[-112,0,80]
    ]},

    /* ---------- Union Station + rail yard ---------- */
    { type:'unionStation', x:24, z:-22 },
    { type:'trainYard', x:26, z:-50, len:48 },
    /* the consolidated mainline keeps running northeast */
    { type:'trainYard', x:84, z:-56, len:44, ry:0.12 },

    /* ---------- Union Station North: the apartment district that fills
       the Central Platte Valley behind the tracks ---------- */
    /* painted names: the real grid, oriented like the real map — Wewatta/
       Chestnut/Delgany behind the terminal, 17th-20th crossing toward Coors,
       Platte & Central over the river, Boulder & 15th up in LoHi */
    { type:'streetName', text:'WEWATTA ST',  x:32,   z:-71,  len:14 },
    { type:'streetName', text:'CHESTNUT PL', x:51,   z:-94,  len:14 },
    { type:'streetName', text:'DELGANY ST',  x:50,   z:-125, len:14 },
    { type:'streetName', text:'17TH ST',     x:4,    z:-98,  ry:Math.PI/2, len:10 },
    { type:'streetName', text:'18TH ST',     x:45,   z:-98,  ry:Math.PI/2, len:10 },
    { type:'streetName', text:'19TH ST',     x:89,   z:-98,  ry:Math.PI/2, len:10 },
    { type:'streetName', text:'20TH ST',     x:141,  z:-60,  ry:Math.PI/2, len:10 },
    { type:'streetName', text:'PLATTE ST',   x:-126, z:-90,  ry:Math.PI/2, len:12 },
    { type:'streetName', text:'CENTRAL ST',  x:-133, z:-62,  len:11 },
    { type:'streetName', text:'BOULDER ST',  x:-115, z:120,  len:12 },
    { type:'streetName', text:'15TH ST',     x:-106, z:138,  ry:Math.PI/2, len:10 },
    { type:'streetName', text:'LAWRENCE ST', x:18,   z:156,  len:14 },
    { type:'streetName', text:'CHAMPA ST',   x:117,  z:140,  len:12 },
    { type:'streetName', text:'ARAPAHOE ST', x:97,   z:111,  ry:Math.PI/2, len:13 },
    { type:'streetName', text:'CURTIS ST',   x:30,   z:194,  len:12 },
    /* Larimer painted on the racing line itself, through the lights */
    { type:'streetName', text:'LARIMER ST',  x:-40.5, z:106.7, ry:-1.88-Math.PI/2, len:14 },
    { type:'street', width:5, closed:false, cars:2, peds:2, points:[[-12,0,-70],[0,0,-70],[64,0,-72]] },
    { type:'street', width:5, closed:false, cars:2, peds:2, points:[[-2,0,-92],[104,0,-96]] },
    { type:'street', width:5, closed:false, cars:2, points:[[0,0,-124],[100,0,-126]] },
    { type:'street', width:5, y:0.008, closed:false, cars:2, points:[[6,0,-5],[6,0,-66],[2,0,-130]] },
    { type:'street', width:5, y:0.008, closed:false, cars:2, points:[[45,0,-2],[44,0,-66],[46,0,-130]] },
    { type:'street', width:5, y:0.008, closed:false, points:[[88,0,14],[88,0,-66],[90,0,-130]] },
    /* RiNo-side blocks east of the district: 21st continues past the rail
       yard tip, 23rd runs the east edge, cross streets tie the grid shut */
    { type:'street', width:5, closed:false, cars:2, points:[[106,0,-32],[112,0,-66]] },
    { type:'street', width:5, closed:false, cars:2, points:[[140,0,-6],[144,0,-128]] },
    { type:'street', width:5, closed:false, cars:2, points:[[106,0,-96],[148,0,-99]] },
    { type:'street', width:5, closed:false, points:[[102,0,-126],[146,0,-129]] },
    { type:'brickBlock', x:118, z:-76,  w:16, d:11, h:8, color:'#9a5a44' },
    { type:'brickBlock', x:120, z:-110, w:14, d:11, h:9, waterTower:true },
    { type:'brickBlock', x:132, z:-90,  w:11, d:9,  h:7 },
    { type:'tower',      x:134, z:-64,  w:12, h:12, style:'tan' },
    { type:'brickBlock', x:22, z:-82,  w:15, d:11, h:9 },
    { type:'tower',      x:58, z:-84,  w:13, h:14, style:'tan' },
    { type:'brickBlock', x:92, z:-80,  w:14, d:11, h:8, color:'#9a5a44' },
    { type:'tower',      x:24, z:-108, w:14, h:16, style:'glass' },
    { type:'brickBlock', x:60, z:-110, w:15, d:12, h:10, waterTower:true },
    { type:'tower',      x:94, z:-112, w:13, h:12, style:'tan' },
    { type:'brickBlock', x:12, z:-114, w:14, d:11, h:8 },
    { type:'tower',      x:52, z:-142, w:14, h:14, style:'blue' },
    { type:'brickBlock', x:88, z:-140, w:14, d:11, h:9, color:'#7a4034' },
    /* the Highland Bridge arches over the Platte to the neighborhood */
    { type:'archBridge', x:30, z:-150, span:26 },
    /* Highland: painted Victorians on the rise across the river */
    { type:'highlands', x:10, z:-242, w:300, d:124 },
    /* DEV: geography labels — remove with the landmark labels */
    { type:'devLabel', x:10,  z:-230, y:30, text:'HIGHLAND', w:26 },
    { type:'devLabel', x:24,  z:-186, y:22, text:'LOHI', w:14 },
    { type:'devLabel', x:60,  z:-158, y:14, text:'SOUTH PLATTE', w:20 },
    /* ---------- LoHi / Jefferson Park: the west bank of the Platte ---------- */
    /* Zuni St runs the length of the bank; cross streets reach the sprawl */
    { type:'street', width:5, closed:false, cars:2, points:[[-128,0,-40],[-124,0,-140]] },
    { type:'street', width:5, closed:false, cars:2, points:[[-150,0,-60],[-116,0,-63]] },
    { type:'street', width:5, closed:false, cars:2, points:[[-150,0,-100],[-100,0,-104]] },
    { type:'street', width:5, closed:false, points:[[-150,0,-36],[-128,0,-38]] },
    { type:'brickBlock', x:-136, z:-52,  w:13, d:10, h:8 },
    { type:'tower',      x:-138, z:-76,  w:12, h:12, style:'tan' },
    { type:'brickBlock', x:-134, z:-90,  w:12, d:10, h:7, waterTower:true },
    { type:'brickBlock', x:-136, z:-116, w:14, d:11, h:8, color:'#9a5a44' },
    { type:'brickBlock', x:-114, z:-122, w:11, d:9,  h:6 },
    { type:'brickBlock', x:-120, z:-84,  w:12, d:9,  h:7, color:'#7a4034' },
    /* riverfront tree strip on the west bank */
    { type:'grove', x:-118, z:-64, spreadX:12, spreadZ:34, count:5, margin:7 },
    { type:'devLabel', x:-130, z:-84, y:22, text:'JEFFERSON PARK', w:22 },

    /* riverfront lofts between the district and the Platte */
    { type:'brickBlock', x:-18, z:-112, w:15, d:11, h:9, ry:0.3 },
    { type:'brickBlock', x:-32, z:-96,  w:12, d:10, h:7, ry:0.15 },
    { type:'parkSign', t:0.985, side:1, text:'UNION STATION', w:6.8, bg:'#241d1a', fg:'#ff8c3a' },
    /* deck runs perpendicular ACROSS the road at the hook; the leaning
       mast stands on the river side */
    { type:'millenniumBridge', x:-28, z:-46, ry:-0.32, span:32 },
    { type:'parkSign', t:0.878, side:1, text:'MILLENNIUM BRIDGE', w:7.2 },

    /* ---------- Coors Field at 20th & Blake ---------- */
    { type:'coorsField', x:124, z:52, ry:-Math.PI/2 },
    { type:'parkSign', t:0.182, side:1, text:'COORS FIELD', w:6, bg:'#1f3d2b', fg:'#f5f0e6' },

    /* ---------- infill: the city runs right up to the racing line ---------- */
    /* inside the loop, west blocks (Wynkoop→Wazee→Blake bands) */
    { type:'brickBlock', x:-91, z:30, w:9,  d:9, h:7, color:'#9a5a44' },
    { type:'brickBlock', x:-88, z:4,  w:10, d:8, h:6 },
    { type:'brickBlock', x:-80, z:20, w:9,  d:8, h:7, color:'#7a4034' },
    { type:'grove', x:-97, z:20, spreadX:8, spreadZ:20, count:3, margin:7 },
    { type:'brickBlock', x:-36, z:28, w:13, d:10, h:8 },
    { type:'brickBlock', x:-64, z:30, w:12, d:10, h:7, color:'#9a5a44' },
    { type:'brickBlock', x:-68, z:56, w:11, d:9,  h:6 },
    /* the 16th & Wynkoop corner cafe inside the hook elbow */
    { type:'brickBlock', x:-8,  z:-12, w:9,  d:7,  h:6, color:'#a3664e' },
    /* west of the hook, along the rail approach */
    { type:'brickBlock', x:-54, z:-10, w:12, d:9,  h:7 },
    { type:'brickBlock', x:-72, z:-22, w:10, d:8,  h:6, color:'#7a4034' },
    /* McGregor Square against Coors' southwest corner */
    { type:'brickBlock', x:110, z:34, w:12, d:10, h:8, sign:'MCGREGOR SQ', signBg:'#3e3a36' },
    /* canyon frontage infill between the towers */
    { type:'brickBlock', x:-64, z:120, w:10, d:9, h:9, color:'#9a5a44' },
    { type:'brickBlock', x:-16, z:120, w:8,  d:7, h:7 },
    { type:'brickBlock', x:62,  z:84,  w:10, d:9, h:7, color:'#a3664e' },

    /* ---------- Wynkoop warehouses (terminal side is the terminal) ---------- */
    { type:'brickBlock', x:2,  z:22, w:20, d:13, h:10, sign:'WYNKOOP BREWING', waterTower:true },
    { type:'brickBlock', x:30, z:24, w:18, d:12, h:9,  color:'#9a5a44' },
    { type:'brickBlock', x:58, z:28, w:18, d:13, h:11, sign:'DAIRY BLOCK', signBg:'#3e3a36', waterTower:true },
    { type:'brickBlock', x:86, z:-6, w:16, d:12, h:9 },
    { type:'brickBlock', x:62, z:-16, w:18, d:12, h:8, color:'#7a4034' },

    /* ---------- the LoDo canyon: towers outside, brick inside ---------- */
    { type:'tower', x: 66, z:128, w:15, h:34, style:'glass' },
    { type:'landmarkTower', kind:'cashRegister', x:38, z:136, h:52, ry:0.55 },
    { type:'landmarkTower', kind:'california', x:10, z:144, h:58 },
    /* the Big Blue Bear, peering into the convention hall glass — back to
       the road, exactly the view everyone knows */
    { type:'blueBear', x:22, z:118.5 },
    /* Wynkoop Plaza fills the strip between the start straight and the
       terminal — fountain, umbrellas, bosque, flags, travelers */
    { type:'wynkoopPlaza', x:24, z:-10 },
    /* T-intersections where the LoDo grid meets the racing line */
    { type:'crosswalk', t:0.009 },
    { type:'crosswalk', t:0.068 },
    { type:'crosswalk', t:0.138 },
    { type:'crosswalk', t:0.228 },
    { type:'landmarkTower', kind:'republic', x:-20, z:138, h:62 },   // Republic Plaza (the tallest)
    { type:'tower', x:-58, z:132, w:14, h:30, style:'glass' },
    { type:'tower', x:26, z:171, w:17, h:46, style:'blue' },
    { type:'dfTower', x:2, z:126 },
    { type:'parkSign', t:0.375, side:1, text:'D&F TOWER', w:5 },
    { type:'brickBlock', x:44, z:84,  w:16, d:11, h:8 },
    { type:'brickBlock', x:12, z:92,  w:18, d:12, h:9, sign:'ROCKMOUNT', signBg:'#5a3428' },
    { type:'brickBlock', x:-20, z:88, w:16, d:11, h:8, color:'#a3664e' },

    /* ---------- creek-side blocks northwest of Larimer Square ---------- */
    { type:'street', width:5, closed:false, cars:2, points:[[-130,0,118],[-88,0,122]] },
    { type:'street', width:5, closed:false, cars:2, points:[[-108,0,92],[-104,0,150]] },
    { type:'brickBlock', x:-96,  z:110, w:11, d:9,  h:7 },
    { type:'brickBlock', x:-120, z:104, w:12, d:10, h:8, color:'#9a5a44' },
    { type:'brickBlock', x:-122, z:132, w:13, d:10, h:7, waterTower:true },
    { type:'brickBlock', x:-94,  z:136, w:10, d:8,  h:6, color:'#a3664e' },
    { type:'tower',      x:-118, z:148, w:12, h:12, style:'tan' },

    /* ---------- Larimer Square ---------- */
    /* the flag canopy: five cable spans, Colorado flags hanging in rows,
       twin globe lamps on the poles — straight from the real block */
    { type:'stringLights', at:[0.425, 0.44, 0.455, 0.47, 0.485], flags:true, globes:true },
    { type:'patio', x:-42, z:115, ry:0.5, count:3 },
    { type:'patio', x:-70, z:100.5, ry:0.5, count:2 },
    { type:'flowerBed', x:-38, z:100, w:7, d:3, ry:0.45 },
    { type:'flowerBed', x:-33, z:96, w:7, d:3, ry:0.2 },
    { type:'parkSign', t:0.43, side:-1, text:'LARIMER SQUARE', w:6.6, bg:'#4b2d5e' },
    { type:'brickBlock', x:-44, z:127, w:15, d:11, h:7, sign:'LARIMER SQ', signBg:'#4b2d5e' },
    { type:'brickBlock', x:-76, z:110, w:14, d:11, h:6, color:'#9a5a44' },
    { type:'brickBlock', x:-44, z:86,  w:14, d:10, h:6 },

    /* ---------- REI + Confluence Park ---------- */
    /* the Tramway Powerhouse on the west bank, gable facing the water */
    { type:'reiPowerhouse', x:-102, z:-94, ry:0.35 },
    /* amphitheater steps on the race side, opening onto the kayak chutes */
    { type:'confluenceSteps', x:-110, z:-30, ry:-Math.PI/2 },
    /* the aqua arches carrying the greenway over the Platte */
    { type:'archBridge', x:-110, z:-52, ry:1.16, span:22, color:0x4c9a8a },
    { type:'parkSign', t:0.705, side:1, faceT:0.665, text:'CONFLUENCE PARK', w:7 },
    { type:'parkSign', t:0.55, side:-1, text:'CHERRY CREEK', w:5.8 },
    { type:'parkSign', t:0.78, side:1, text:'COMMONS PARK', w:6.2 },

    /* ---------- signage & event dressing ---------- */
    { type:'banners', at:[
      { t:0.015, text:'MILE HIGH CRIT', bg:'#4b2d5e', fg:'#ffd166', side:1 },
      { t:0.30,  text:'LODO CANYON',    bg:'#2e5a8f', fg:'#ffd166', side:-1 },
      { t:0.58,  text:'GO GO GO!',      bg:'#c75146', fg:'#f5e9d0', side:1 },
      { t:0.90,  text:'MILE HIGH CRIT', bg:'#4b2d5e', fg:'#ffd166', side:-1 }
    ]},
    { type:'streetSign', x:-12, z:12,  text:'WYNKOOP ST',  ry:0 },
    { type:'streetSign', x:78,  z:34,  text:'20TH ST',     ry:-Math.PI/2 },
    { type:'streetSign', x:56,  z:96,  text:'BLAKE ST',    ry:0 },
    { type:'streetSign', x:-30, z:98,  text:'LARIMER ST',  ry:0 },
    { type:'streetSign', x:-92, z:44,  text:'SPEER BLVD',  ry:Math.PI/2 },
    { type:'streetSign', x:-42, z:-24, text:'16TH ST',     ry:Math.PI/2 },
    /* crossing warnings ahead of each ped zone */
    { type:'parkSign', t:0.895, side:1,  text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    { type:'parkSign', t:0.38, side:-1, text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    { type:'parkSign', t:0.725, side:-1, text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },

    /* ---------- background city ---------- */
    /* hazy second-row skyline behind the canyon */
    { type:'tower', x: 96, z:172, w:16, h:38, style:'haze' },
    { type:'tower', x: 70, z:178, w:18, h:44, style:'haze' },
    { type:'tower', x:-6, z:182, w:15, h:40, style:'glass' },
    { type:'tower', x:-44, z:172, w:15, h:36, style:'haze' },
    { type:'tower', x:-80, z:168, w:14, h:30, style:'haze' },
    { type:'tower', x:126, z:120, w:15, h:28, style:'haze' },
    /* the uptown grid: streets threading the tower district so the
       skyscrapers sit on city blocks instead of bare concrete */
    { type:'street', width:5, closed:false, cars:3, peds:3, points:[[-108,0,150],[144,0,162]] }, // Lawrence
    /* Champa + Arapahoe close the blocks northeast of the canyon exit */
    { type:'street', width:5, closed:false, cars:2, points:[[84,0,138],[150,0,142]] },          // Champa
    { type:'street', width:5, y:0.008, closed:false, cars:2, peds:2, points:[[92,0,79],[96,0,84],[98,0,138]] },    // Arapahoe
    { type:'tower',      x:108, z:100, w:12, h:18, style:'glass' },
    { type:'sakuraSquare', x:83, z:111, ry:Math.PI },
    { type:'brickBlock', x:122, z:100, w:11, d:9, h:7 },
    { type:'street', width:5, closed:false, cars:2, points:[[-70,0,192],[130,0,196]] },         // Curtis
    { type:'street', width:5, closed:false, cars:2, points:[[52,0,107],[52,0,116],[56,0,190]] },           // 19th uptown
    { type:'street', width:5, closed:false, cars:1, points:[[-33,0,113],[-33,0,116],[-31,0,190]] },         // 16th uptown
    /* retail pads between the tower bases */
    { type:'brickBlock', x:8,   z:166, w:9,  d:7, h:6 },
    { type:'brickBlock', x:-58, z:186, w:10, d:8, h:7, color:'#9a5a44' },
    { type:'brickBlock', x:34,  z:184, w:10, d:8, h:8 },
    { type:'brickBlock', x:120, z:180, w:11, d:9, h:7, color:'#a3664e' },
    { type:'brickBlock', x:112, z:148, w:10, d:8, h:7 },
    /* the gold dome down the Speer vista, and RiNo's canyon building
       out past the ballpark */
    { type:'landmarkTower', kind:'capitol', x:-88, z:226 },
    { type:'landmarkTower', kind:'riverNorth', x:148, z:-74, ry:-0.4 },
    /* DEV: temporary landmark labels — remove before finalizing */
    { type:'devLabel', x:38,   z:136, y:70,  text:'WELLS FARGO (CASH REGISTER)', w:30 },
    { type:'devLabel', x:-20,  z:138, y:74,  text:'REPUBLIC PLAZA', w:24 },
    { type:'devLabel', x:10,   z:144, y:82,  text:'1801 CALIFORNIA', w:24 },
    { type:'devLabel', x:83,   z:109, y:26,  text:'SAKURA SQUARE', w:22 },
    { type:'devLabel', x:-88,  z:226, y:62,  text:'STATE CAPITOL', w:24 },
    { type:'devLabel', x:148,  z:-74, y:34,  text:'ONE RIVER NORTH', w:24 },
    { type:'devLabel', x:2,    z:126, y:52,  text:'D&F CLOCKTOWER', w:22 },
    /* the LoDo block grid (Wazee/Blake + numbered cross streets) so the
       ground reads as city blocks, not one giant plaza */
    /* the LoDo grid, laid out like the real one. Parallels to Wynkoop
       going southeast: Wazee, Blake (Market + Larimer are the race road).
       Numbered streets cross them at even spacing; every segment ends at
       another street, the race road, or fades into the sprawl. */
    /* Wazee St — west of 20th, then resuming east of it */
    { type:'street', width:6, closed:false, cars:3, peds:4, points:[[-94,0,46],[-84,0,46],[84,0,52],[91,0,52]] },
    { type:'street', width:6, closed:false, cars:2, points:[[101,0,53],[108,0,54],[150,0,57]] },
    /* Blake St — likewise */
    { type:'street', width:6, closed:false, cars:3, peds:4, points:[[-83,0,70],[-80,0,70],[66,0,74],[84,0,74]] },
    { type:'street', width:6, closed:false, cars:2, points:[[95,0,76],[102,0,76],[150,0,79]] },
    /* numbered cross streets, Wynkoop up to Blake (16th is the race hook,
       20th is the race road at the Blake bend) */
    { type:'street', width:5, closed:false, cars:1, points:[[-83,0,12],[-79,0,72]] },          // 14th
    { type:'street', width:5, closed:false, cars:1, points:[[-100,0,11],[-94,0,12],[-56,0,16]] },          // Wewatta
    { type:'street', width:5, closed:false, cars:2, peds:3, points:[[-58,0,14],[-54,0,76],[-53,0,97]] },   // 15th
    { type:'street', width:5, closed:false, cars:2, peds:3, points:[[-16,0,5],[-16,0,14],[-14,0,76],[-13,0,107]] },   // 17th
    { type:'street', width:5, closed:false, cars:2, points:[[16,0,5],[18,0,36],[20,0,76],[21,0,104]] },             // 18th
    { type:'street', width:5, closed:false, cars:2, peds:2, points:[[41,0,7],[41,0,16],[41,0,76],[41,0,100]] },     // 19th
    { type:'street', width:5, closed:false, cars:2, peds:2, points:[[75,0,16],[75,0,78],[75,0,86]] },     // 19th½ frontage
    /* the ballpark district east of 20th */
    { type:'street', width:5, closed:false, cars:2, peds:2, points:[[104,0,-32],[106,0,30],[99,0,42]] },  // 21st
    { type:'street', width:5, closed:false, cars:2, points:[[128,0,-33],[130,0,16]] },
    { type:'street', width:5, closed:false, cars:2, points:[[104,0,-32],[148,0,-35]] },          // Walnut: ties 21st/22nd/23rd          // 22nd
    { type:'street', width:5, closed:false, cars:2, points:[[98,0,31],[104,0,32],[148,0,36]] },           // Larimer east
    { type:'street', width:5, closed:false, cars:2, points:[[106,0,-8],[150,0,-4]] },           // Market east
    /* Delgany service road along the rail yard */
    { type:'street', width:5, closed:false, cars:2, peds:2, points:[[-17,0,-57],[-8,0,-58],[58,0,-62]] },
    /* mid-block buildings so the grid reads as full city blocks */
    { type:'tower',      x:-44, z:60, w:13, h:18, style:'tan' },
    { type:'brickBlock', x:-26, z:58, w:14, d:11, h:8 },
    { type:'tower',      x:6,   z:60, w:14, h:22, style:'glass' },
    { type:'brickBlock', x:30,  z:60, w:13, d:10, h:9, color:'#9a5a44' },
    { type:'tower',      x:58,  z:58, w:13, h:16, style:'blue' },
    { type:'brickBlock', x:-4,  z:82, w:10, d:8,  h:7 },
    { type:'brickBlock', x:116, z:6,  w:16, d:12, h:8 },
    { type:'brickBlock', x:136, z:24, w:14, d:11, h:7 },
    { type:'brickBlock', x:118, z:-24, w:15, d:12, h:9 },
    { type:'brickBlock', x:-84, z:126, w:14, d:11, h:8, color:'#7a4034' },
    /* sidewalk crowds: Coors gates + Larimer Square */
    { type:'crowd', x:112, z:50, spread:9, count:6 },
    { type:'crowd', x:-64, z:118, spread:9, count:5 },
    /* RiNo + Highland rooftops beyond the rail yard and river */
    { type:'sprawl',
      xMin:-260, xMax:300, zMin:-150, zMax:340,
      clearX:150, clearZ:205,
      streetsX:[-260,-215,-175, 175,215,260],
      streetsZ:[210,255,300],
      crossZ:[100,180],
      gridX:15, gridZ:15, carsPerStreet:2 },
    { type:'clouds', count:10, spreadX:500, spreadZ:560, yMin:60, yMax:95 },
    { type:'mountains', x:-400, z:-260 },
    /* street trees threaded between the blocks (building exclusions keep
       them out of the architecture) */
    { type:'trees', count:60, parkX:120, parkZ:140, outerX:260, outerZ:320 }
  ],

  /* greenway traffic on the Platte trail */
  joggers: 7,

  /* crowds: the terminal plaza, Larimer Square, Commons Park */
  pedestrians: { zones: [
    { t:0.955, span:0.03, count:4 },
    { t:0.44, span:0.03,  count:4 },
    { t:0.785, span:0.03,  count:3 }
  ]},

  /* geese own Commons Park too */
  gaggles: [
    { x:-40, z:-58, count:6, spread:10 },
    { t:0.72, count:4, spread:7 }
  ]
};
