/* COLFAX — the point-to-point stage. Pure data, no code.
   One westbound run down the longest, weirdest street in America:
   launch at the Bluebird Theater, past East High and the City Park
   Esplanade, Pete's Kitchen, the Ogden, the Fillmore, Tom's Diner,
   the Cathedral Basilica — finishing at the State Capitol in Civic
   Center. Identity: an urban gauntlet — parked cars, buses nosing
   into the lane, pedestrians, cross traffic. */

export default {
  id: 'colfax',
  name: 'COLFAX AVE',
  format: 'stage',              // point-to-point: one run, no laps
  laps: 1,
  seed: 1858,                   // the year Denver was founded on the creek

  /* late golden hour — neon country */
  sky: 0x86a8d8,
  fog: [80, 560],
  ambient: [0xffe8cc, 0.58],
  sun: [0xffedc8, 0.88],
  bounds: { x: 540, z: 180 },   // the Capitol wrap reaches x -500
  ground: 'urban',

  roadWidth: 14,                // four lanes: BRT center, traffic outside
  roadStyle: 'brt',             // red BUS ONLY center lanes
  /* the BRT fleet: buses run the red lanes both directions, stopping
     nowhere, forgiving nothing. They end at Broadway like the real line. */
  brt: { count: 6, speed: 8.5, lat: 2.0, tMax: 0.78, route: '15' },
  /* start in the westbound traffic lanes, not the busway */
  gridLats: [-4.9, 4.9],
  spline: [
    [ 460,0,  0],[ 400,0, -2],[ 340,0,  2],[ 285,0, -2],
    [ 230,0,  3],[ 175,0, -3],[ 120,0,  2],[  65,0, -2],
    [  10,0,  3],[ -45,0, -3],[ -95,0,  2],[-145,0, -2],
    [-195,0,  3],[-245,0, -3],[-295,0,  2],[-345,0, -2],
    [-390,0,  6],
    /* the finale: left at Broadway, wrap the Capitol grounds — east side,
       south side, then north up the west front to the line at the steps */
    [-414,0, 22],[-424,0, 46],[-428,0, 76],[-442,0, 98],
    [-468,0,106],[-490,0, 92],[-499,0, 64],[-500,0, 38],
    [-496,0, 12],[-488,0,-12]        // runout toward Civic Center for the coast
  ],
  finishT: 0.9542,                   // the checkered line at the west steps


  boostPads: [0.14, 0.44, 0.76],
  itemBoxes: { at: [0.09, 0.25, 0.41, 0.57, 0.73], offsets: [-2.6, 0, 2.6] },

  callouts: [
    { t:0.02,  label:'THE BLUEBIRD' },
    { t:0.219, label:'CITY PARK ESPLANADE' },
    { t:0.302, label:"PETE'S KITCHEN" },
    { t:0.40,  label:'THE OGDEN' },
    { t:0.449, label:'THE FILLMORE' },
    { t:0.538, label:"TOM'S DINER" },
    { t:0.672, label:'CATHEDRAL BASILICA' },
    { t:0.783, label:'BROADWAY' },
    { t:0.833, label:'CAPITOL GROUNDS' },
    { t:0.93,  label:'THE WEST STEPS' }
  ],

  waters: [],

  props: [
    /* ---------- the venues ---------- */
    /* the Bluebird owns the first two seconds: huge blue blade, posters,
       and a concert queue on the ADAMS/COOK corner */
    { type:'marquee', x:440, z:-18, text:'BLUEBIRD', brick:'#2e5a8f', neon:'#5db3c9', w:14, bladeH:15, posters:4, bird:true },
    { type:'crowd', x:448, z:-13, spread:6, count:6 },
    { type:'marquee', x:10,  z:-17, text:'OGDEN', brick:'#8a5a44', neon:'#ffd166', w:17, h:10, posters:3, style:'arch' },
    { type:'crowd', x:19, z:-14, spread:6, count:5 },
    /* the Fillmore keeps its skating-rink barrel vault */
    { type:'marquee', x:-45, z:18, ry:Math.PI, text:'FILLMORE', brick:'#7a4034', neon:'#ff8c3a', w:19, h:9, style:'barrel', posters:3 },
    { type:'crowd', x:-37, z:14, spread:6, count:5 },
    { type:'diner', x:120,  z:-14.5, ry:0.3, sign:"PETE'S KITCHEN", sub:'BREAKFAST BURRITOS', accentC:0x2e86ab },
    { type:'crowd', x:128, z:-12, spread:5, count:3 },
    /* Tom's goes full Googie: swept wing, glass corner, parking apron */
    { type:'diner', x:-145, z:16, ry:Math.PI-0.28, sign:"TOM'S DINER", signBg:'#3e5a34', googie:true },
    { type:'brickBlock', x:-95, z:23, ry:Math.PI, w:20, d:10, h:6, sign:'ARGONAUT WINE - LIQUOR', signBg:'#a83232' },
    { type:'cathedral', x:-295, z:-22 },

    /* ---------- East High + the City Park Esplanade ---------- */
    { type:'eastHigh', x:215, z:-70 },
    /* Carla Madison Rec Center at Josephine, next door to the Esplanade */
    { type:'carlaMadison', x:180, z:-19 },
    { type:'parkSign', t:0.252, side:-1, faceT:0.225, text:'CARLA MADISON REC', w:6.6, bg:'#4a3a32' },
    { type:'parkSign', t:0.222, side:-1, text:'EAST HIGH SCHOOL', w:7 },
    /* the formal esplanade: Sullivan Gateway at the mouth, Dolphin
       Fountain on the axis, allees of pines either side */
    { type:'sullivanGateway', x:215, z:-16 },
    { type:'dolphinFountain', x:215, z:-36 },
    { type:'lawn', x:215, z:-42, r:22, scale:[1.5,0.55] },
    { type:'pines', x:196, z:-42, spreadX:10, spreadZ:26, count:5 },
    { type:'pines', x:234, z:-42, spreadX:10, spreadZ:26, count:5 },
    { type:'crowd', x:226, z:-28, spread:8, count:6 },
    { type:'parkedBus', t:0.229, side:-1, school:true },

    /* ---------- the Capitol grounds finale ---------- */
    /* the building itself, west front facing the finish straight */
    { type:'stateCapitol', x:-462, z:70, ry:-Math.PI/2 },
    /* the grounds inside the wrap: lawn, diagonal walkways, trees, beds */
    { type:'lawn', x:-462, z:72, r:36 },
    { type:'path', width:2, closed:false, points:[[-432,0,50],[-462,0,72],[-490,0,92]] },
    { type:'path', width:2, closed:false, points:[[-436,0,94],[-462,0,72],[-492,0,50]] },
    { type:'grove', x:-462, z:72, spreadX:58, spreadZ:48, count:8, margin:8 },
    { type:'flowerBed', x:-478, z:52, w:9, d:4, ry:0.4 },
    { type:'flowerBed', x:-446, z:92, w:9, d:4, ry:-0.3 },
    /* ONE MILE ABOVE SEA LEVEL — the famous step marker, facing the line */
    { type:'parkSign', x:-486, z:44, ry:-Math.PI/2+0.3, text:'ONE MILE HIGH', w:5.6, bg:'#3e5a34' },
    /* keep the sprawl out of the finish-line wedge + the Broadway elbow */
    { type:'keepClear', x:-484, z:30, r:18 },
    { type:'keepClear', x:-448, z:14, r:18 },
    { type:'keepClear', x:-508, z:20, r:14 },

    /* ---------- Civic Center Park across Lincoln ---------- */
    /* the formal park: great lawn on the Capitol axis, promenade paths,
       the Greek Amphitheater south, Voorhies Memorial north, and the
       City & County Building closing the vista — courthouse v. capitol */
    { type:'lawn', x:-546, z:60, r:34, scale:[1,1.25] },
    { type:'path', width:2.2, closed:false, points:[[-508,0,70],[-575,0,70]] },
    { type:'path', width:1.8, closed:false, points:[[-540,0,18],[-546,0,70],[-542,0,104]] },
    { type:'greekAmphitheater', x:-548, z:106, ry:Math.PI },
    { type:'voorhiesMemorial', x:-542, z:14 },
    { type:'cityCountyBuilding', x:-590, z:70, ry:Math.PI/2 },
    { type:'flowerBed', x:-524, z:56, w:9, d:4, ry:0.2 },
    { type:'flowerBed', x:-526, z:84, w:9, d:4, ry:-0.3 },
    { type:'grove', x:-546, z:60, spreadX:52, spreadZ:70, count:9, margin:7 },
    { type:'crowd', x:-508, z:44, spread:9, count:8 },
    { type:'crowd', x:-507, z:66, spread:8, count:6 },
    { type:'crowd', x:-540, z:96, spread:8, count:5 },
    { type:'devLabel', x:-546, z:60, y:26, text:'CIVIC CENTER PARK', w:26 },
    { type:'devLabel', x:-590, z:70, y:26, text:'CITY & COUNTY BLDG', w:26 },
    { type:'devLabel', x:-548, z:106, y:14, text:'GREEK AMPHITHEATER', w:24 },

    /* ---------- signalized intersections ---------- */
    { type:'trafficSignal', t:0.106, side:1 },
    { type:'crosswalk', t:0.106 },
    { type:'trafficSignal', t:0.39, side:-1 },
    { type:'crosswalk', t:0.39 },
    { type:'trafficSignal', t:0.534, side:1 },
    { type:'crosswalk', t:0.534 },
    { type:'trafficSignal', t:0.676, side:-1 },
    { type:'crosswalk', t:0.676 },
    { type:'trafficSignal', t:0.783, side:1 },
    { type:'crosswalk', t:0.783 },

    /* ---------- BRT: median stations + the famous construction ---------- */
    { type:'brtStation', t:0.135 },
    { type:'brtStation', t:0.36 },
    { type:'brtStation', t:0.60 },
    { type:'constructionZone', t0:0.155, t1:0.195, side:1 },
    { type:'constructionZone', t0:0.475, t1:0.515, side:-1 },
    { type:'constructionZone', t0:0.655, t1:0.695, side:1 },
    { type:'parkSign', t:0.135, side:1,  text:'ROAD WORK AHEAD', w:5.4, bg:'#e8622d', fg:'#1a1423' },
    { type:'parkSign', t:0.455, side:-1, text:'ROAD WORK AHEAD', w:5.4, bg:'#e8622d', fg:'#1a1423' },
    { type:'parkSign', t:0.635, side:1,  text:'ROAD WORK AHEAD', w:5.4, bg:'#e8622d', fg:'#1a1423' },

    /* ---------- the gauntlet: parked cars + buses in the lane ---------- */
    { type:'parkedCars', t0:0.04, t1:0.09, side:-1, count:5 },
    { type:'parkedCars', t0:0.15, t1:0.20, side:-1, count:5 },
    { type:'parkedCars', t0:0.31, t1:0.37, side:-1, count:6 },
    { type:'parkedCars', t0:0.46, t1:0.52, side:1,  count:4 },
    { type:'parkedCars', t0:0.56, t1:0.62, side:-1, count:6 },
    { type:'parkedCars', t0:0.70, t1:0.75, side:1,  count:4 },
    { type:'parkedBus', t:0.185, side:1 },
    { type:'parkedBus', t:0.43,  side:-1, route:'15L' },
    { type:'parkedBus', t:0.64,  side:1 },

    /* ---------- storefront fabric hugging both curbs ---------- */
    { type:'storefrontRow', x:395, z:-19, len:44, signs:['SIE FILMCENTER','LIONS LAIR','PHO 555','NAILS'] },
    { type:'storefrontRow', x:350, z:17, ry:Math.PI, len:40, signs:['TATTOO','RECORDS','GREEN CROSS','BAIL BONDS'] },
    { type:'storefrontRow', x:285, z:-22, len:38, signs:['LIQUOR','COIN-OP LAUNDRY','TAQUERIA'] },
    { type:'storefrontRow', x:170, z:16, ry:Math.PI, len:44, signs:['PAWN','CHECKS CASHED','DONUTS','VINYL'] },
    { type:'storefrontRow', x:65, z:16, ry:Math.PI, len:40, signs:['DIVE BAR','SMOKES','THRIFT'] },
    { type:'storefrontRow', x:-30, z:-16, len:36, signs:['RAMEN','BOOKS','BODEGA'] },
    { type:'storefrontRow', x:-145, z:-20, len:40, signs:['MUTINY COMICS','COFFEE','GYROS'] },
    { type:'storefrontRow', x:-210, z:16, ry:Math.PI, len:42, signs:['DISPENSARY','WINGS','KARAOKE'] },
    { type:'storefrontRow', x:-245, z:-26, len:36, signs:['SUB SHOP','BARBER','GUITARS'] },
    { type:'storefrontRow', x:-345, z:15, ry:Math.PI, len:40, signs:['DINER','FLOWERS','LAW OFFICE'] },
    { type:'brickBlock', x:-350, z:-16, w:18, d:11, h:9, color:'#9a5a44' },
    { type:'brickBlock', x:-390, z:-14, w:15, d:10, h:11 },
    { type:'tower', x:-415, z:-24, w:13, h:16, style:'tan' },
    /* sightline corridors: no filler shops in front of the civic set
       pieces or on the approach views to the diners */
    { type:'keepClear', x:215,  z:-14, r:19 },   // Sullivan Gateway + East High
    { type:'keepClear', x:248,  z:-13, r:14 },   // ...and its eastern approach
    { type:'keepClear', x:180,  z:-12, r:15 },   // Carla Madison
    { type:'keepClear', x:102,  z:-11, r:10 },   // Pete's approach
    { type:'keepClear', x:-130, z:12,  r:12 },   // Tom's approach
    /* the unbroken street wall — placed after every curb landmark so their
       exclusions carve out the right gaps. Stops at Broadway. */
    { type:'colfaxWall', t0:0.005, t1:0.775 },

    /* ---------- downtown rising ahead-right on the run west ---------- */
    { type:'landmarkTower', kind:'cashRegister', x:-490, z:-72, h:52, ry:0.8 },
    { type:'landmarkTower', kind:'republic', x:-525, z:-42, h:62 },
    { type:'landmarkTower', kind:'california', x:-472, z:-112, h:58 },
    { type:'dfTower', x:-442, z:-52 },
    { type:'tower', x:-520, z:-95, w:16, h:38, style:'haze' },
    { type:'tower', x:-555, z:-70, w:15, h:44, style:'haze' },
    { type:'tower', x:-500, z:-10, w:14, h:30, style:'haze' },

    /* ---------- cross-street blades (real order, heading west) ---------- */
    { type:'streetSign', x:452, z:12,  text:'COOK ST',       ry:Math.PI/2 },
    { type:'streetSign', x:420, z:14,  text:'ADAMS ST',      ry:Math.PI/2 },
    { type:'streetSign', x:340, z:-9,  text:'YORK ST',       ry:Math.PI/2 },
    { type:'streetSign', x:260, z:14,  text:'JOSEPHINE ST',  ry:Math.PI/2 },
    { type:'streetSign', x:180, z:-14, text:'RACE ST',       ry:Math.PI/2 },
    { type:'streetSign', x:100, z:14,  text:'FRANKLIN ST',   ry:Math.PI/2 },
    { type:'streetSign', x:20,  z:-14, text:'DOWNING ST',    ry:Math.PI/2 },
    { type:'streetSign', x:-60, z:14,  text:'CLARKSON ST',   ry:Math.PI/2 },
    { type:'streetSign', x:-140,z:-13, text:'PEARL ST',      ry:Math.PI/2 },
    { type:'streetSign', x:-220,z:14,  text:'WASHINGTON ST', ry:Math.PI/2 },
    { type:'streetSign', x:-300,z:-13, text:'LOGAN ST',      ry:Math.PI/2 },
    { type:'streetSign', x:-380,z:14,  text:'GRANT ST',      ry:Math.PI/2 },
    { type:'streetSign', x:-425,z:2,   text:'BROADWAY',      ry:Math.PI/2 },

    /* ---------- event dressing ---------- */
    { type:'banners', at:[
      { t:0.01, text:'MILE HIGH CRIT', bg:'#4b2d5e', fg:'#ffd166', side:1 },
      { t:0.273,  text:'GO GO GO!',      bg:'#c75146', fg:'#f5e9d0', side:-1 },
      { t:0.55,  text:'COLFAX OR BUST', bg:'#2e5a8f', fg:'#ffd166', side:1 },
      { t:0.68,  text:'SHOPS OPEN DURING CONSTRUCTION', bg:'#e8622d', fg:'#1a1423', side:-1 },
      { t:0.80,  text:'THE CAPITOL AWAITS', bg:'#3e5a34', fg:'#ffd166', side:-1 }
    ]},
    { type:'parkSign', t:0.178, side:1,  text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    { type:'parkSign', t:0.395, side:-1, text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    { type:'parkSign', t:0.645, side:1,  text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },

    /* DEV: landmark labels — strip before finalizing */
    { type:'devLabel', x:440,  z:-17, y:20, text:'BLUEBIRD THEATER', w:24 },
    { type:'devLabel', x:215,  z:-70, y:36, text:'EAST HIGH', w:20 },
    { type:'devLabel', x:180,  z:-19, y:18, text:'CARLA MADISON REC', w:24 },
    { type:'devLabel', x:215,  z:-16, y:16, text:'SULLIVAN GATEWAY', w:22 },
    { type:'devLabel', x:120,  z:-16, y:16, text:"PETE'S KITCHEN", w:22 },
    { type:'devLabel', x:10,   z:-17, y:22, text:'OGDEN THEATRE', w:22 },
    { type:'devLabel', x:-45,  z:18,  y:22, text:'FILLMORE', w:18 },
    { type:'devLabel', x:-145, z:19,  y:16, text:"TOM'S DINER", w:20 },
    { type:'devLabel', x:-295, z:-22, y:34, text:'CATHEDRAL BASILICA', w:26 },
    { type:'devLabel', x:-462, z:70,  y:64, text:'STATE CAPITOL', w:24 },

    /* ---------- the city fading out on both sides ---------- */
    { type:'sprawl',
      xMin:-500, xMax:520, zMin:-260, zMax:260,
      clearX:470, clearZ:38,
      streetsX:[-380,-300,-220,-140,-60,20,100,180,260,340,420],
      streetsZ:[-60,60,-140,140],
      crossZ:[],
      gridX:16, gridZ:15, carsPerStreet:2 },
    { type:'clouds', count:12, spreadX:900, spreadZ:400, yMin:60, yMax:100 },
    { type:'mountains', x:-750, z:-150 },
    { type:'trees', count:80, parkX:700, parkZ:110, outerX:960, outerZ:340 }
  ],

  joggers: 0,

  /* Colfax pedestrians. obviously. */
  pedestrians: { zones: [
    { t:0.235, span:0.03, count:4 },
    { t:0.45,  span:0.03, count:4 },
    { t:0.70,  span:0.03, count:3 }
  ]},

  /* geese hold the Esplanade */
  gaggles: [
    { t:0.215, count:4, spread:8 },
    { x:-430, z:58, count:4, spread:9 }
  ]
};
