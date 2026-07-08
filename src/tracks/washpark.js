/* WASH PARK GP — track definition. Pure data, no code.
   A track is: a spline, road width, race format, pickups, callouts,
   water hazards, a prop list (built by src/props.js), and ambient life.
   New Denver tracks = new files like this one. */

export default {
  id: 'washpark',
  name: 'WASH PARK GP',
  format: 'circuit',            // 'circuit' (laps) | 'stage' (point-to-point, e.g. Colfax)
  laps: 3,
  seed: 1893,                   // deterministic scenery placement (multiplayer-safe)

  /* bluebird Colorado afternoon */
  sky: 0x6fb7ef,
  fog: [70, 420],
  ambient: [0xfff2e0, 0.6],
  sun: [0xfff7e0, 0.9],
  bounds: { x: 130, z: 225 },   // hard world clamp for the player

  roadWidth: 8,
  spline: [
    [-58,0,  15],[-60,0, -20],
    [-66,0, -52],[-50,0, -80],
    [-56,0,-108],
    [-38,0,-138],[ -4,0,-150],[ 28,0,-140],
    [ 44,0,-114],[ 36,0, -86],
    [ 18,0, -66],[  8,0, -46],
    [ 22,0, -26],[ 40,0,  -6],
    [ 54,0,  22],[ 56,0,  58],
    [ 48,0,  92],[ 40,0, 128],[ 12,0, 146],
    [-16,0, 132],[-22,0, 102],
    [-36,0,  76],[-20,0,  52],[-44,0,  34]
  ],

  boostPads: [0.03, 0.50, 0.74],          // t along spline
  itemBoxes: { at: [0.08, 0.44, 0.66], offsets: [-2.2, 0, 2.2] },

  callouts: [
    { t:0.11, label:'VOLLEYBALL CHICANE' },
    { t:0.17, label:'DOS CHAPPELL BATHHOUSE' },
    { t:0.26, label:'SMITH LAKE ESSES' },
    { t:0.36, label:'REC CENTER HAIRPIN' },
    { t:0.42, label:'THE BOATHOUSE' },
    { t:0.48, label:'LILY POND' },
    { t:0.56, label:'MOUNT VERNON GARDENS' },
    { t:0.68, label:'GRASMERE WRAP' },
    { t:0.88, label:'THE GREAT MEADOW' },
    { t:0.04, label:'PERENNIAL GARDEN' }
  ],

  /* water hazards: [cx, cz, radiusX, radiusZ] ellipse hitboxes → splash + respawn.
     Positions/shapes follow the real map: Smith Lake wide across the north,
     Grasmere west-of-center in the south. */
  /* NOTE: hazard hitboxes are tighter than the visual water so shoreline
     spill onto the road is a dodgeable puddle, not a mandatory splash */
  waters: [
    [-8, -102, 38, 26],         // Smith Lake
    [ 2,  114, 20, 16],         // Grasmere Lake (visual is 27x18)
    [36,  -30,  7,  7]          // lily pond
  ],

  props: [
    { type:'water',    x:-8,  z:-102, r:44, seg:16, scale:[0.86,0.60], exclude:40 },  // Smith Lake
    { type:'water',    x:2,   z:114,  r:30, seg:16, scale:[0.90,0.60], exclude:30 },  // Grasmere
    { type:'water',    x:36,  z:-30,  r:7,  seg:10 },                                 // lily pond
    { type:'lilypads', x:36,  z:-30,  count:6, spread:9, exclude:10 },
    /* the 1913 Benedict boathouse pavilion — SOUTH shore of Smith Lake,
       facing north across the water toward the bathhouse */
    { type:'boathouse', x:-8,  z:-73, ry: Math.PI },
    /* Dos Chappell bathhouse — north shore, across the water from the
       boathouse (the west shore is too tight between road and lake) */
    { type:'bathhouse', x:-20, z:-130 },
    { type:'boats',    x:-16, z:-106, count:4 },
    { type:'kayaks',   x:-28, z:-95,  count:2, spread:8 },
    { type:'kayaks',   x:10,  z:110,  count:1, spread:4 },

    /* City Ditch: inflow to Grasmere, then Grasmere → lily pond → Smith */
    { type:'cityDitch', olives:5, points:[
      [-30,0,188],[-24,0,160],[-16,0,135],[-10,0,116]
    ]},
    { type:'cityDitch', olives:10, points:[
      [-2,0,94],[-30,0,70],[-48,0,42],[-44,0,8],[-24,0,-12],
      [0,0,-24],[30,0,-30],[22,0,-50],[0,0,-72]
    ]},
    { type:'roadBridge', t:0.50 },
    { type:'roadBridge', t:0.895 },
    { type:'roadBridge', t:0.965 },
    { type:'footbridge', x:-30, z:186 },
    { type:'footbridge', x:-36, z:58, ry:0.7 },
    { type:'flowerBed', x:-6,  z:-40, w:10, d:5, ry: 0.3 },
    { type:'flowerBed', x:24,  z:-48, w:10, d:5, ry:-0.2 },
    { type:'flowerBed', x:-42, z: 62, w:10, d:5, ry: 0.2 },
    { type:'flowerBed', x:-6,  z: 42, w:10, d:5, ry:-0.2 },
    { type:'blankets',  x:-14, z:8, spreadX:30, spreadZ:38, count:7 },
    { type:'volleyball', x:-78, z:-56 },
    { type:'volleyball', x:-78, z:-70 },
    { type:'volleyball', x:-78, z:-84 },
    /* tennis court cluster (the real park has ten) */
    { type:'tennis',    x:-62, z:104 },
    { type:'tennis',    x:-62, z:116 },
    { type:'tennis',    x:-62, z:128 },
    /* rec center just SE of Smith Lake, parking lot toward Franklin */
    { type:'recCenter', x:52, z:-64, ry:Math.PI/2, parking:true },
    { type:'playground', x:68, z:-52 },
    /* Denver's two largest flower gardens */
    { type:'formalGarden', x:72, z:38, w:22, d:34 },          // Mount Vernon Gardens (east)
    { type:'perennialGarden', x:-74, z:-10, w:16, d:24 },     // Perennial Garden at Downing
    /* Eugene Field cottage + shoe fountain, west edge where they really sit */
    { type:'cottage',   x:-78, z:-30 },
    { type:'lawnBowling', x:10, z:166 },
    { type:'slackline', x:-2, z:36 },
    /* the Olmsted evergreen grove on the north side */
    { type:'pines', x:0, z:-170, spreadX:100, spreadZ:20, count:16 },
    /* the neighborhood: mansions along Downing (west) & Franklin (east),
       modest bungalows on Louisiana (south), high-rise apartments up on
       the Virginia Ave edge (north) — each set back behind its street */
    { type:'mansionRow', xEdge:103, zSpan:165, step:22 },
    { type:'houseRow',   z:202, xSpan:80, step:30, ry:Math.PI },
    { type:'apartments', z:-208, xSpan:85, count:6 },

    /* perimeter streets: Downing (W), Franklin (E), Virginia (N), Louisiana (S) */
    { type:'street', width:6, points:[
      [-91,0,-160],[-60,0,-194],[  0,0,-194],[ 60,0,-194],[ 91,0,-160],
      [ 91,0, -60],[ 91,0,  60],[ 91,0, 160],[ 60,0, 194],[  0,0, 194],
      [-60,0, 194],[-91,0, 160],[-91,0,  60],[-91,0, -60]
    ]},
    /* the streets a block behind */
    { type:'street', width:5, points:[
      [-112,0,-200],[-70,0,-236],[  0,0,-236],[ 70,0,-236],[ 112,0,-200],
      [ 112,0, -60],[ 112,0,  60],[ 112,0, 196],[ 70,0, 214],[  0,0, 214],
      [ -70,0, 214],[-112,0, 196],[-112,0,  60],[-112,0, -60]
    ]},
    /* cross streets between the rows of homes */
    { type:'street', width:5, closed:false, points:[[ 91,0,-120],[ 113,0,-120]] },
    { type:'street', width:5, closed:false, points:[[ 91,0, -40],[ 113,0, -40]] },
    { type:'street', width:5, closed:false, points:[[ 91,0,  40],[ 113,0,  40]] },
    { type:'street', width:5, closed:false, points:[[ 91,0, 120],[ 113,0, 120]] },
    { type:'street', width:5, closed:false, points:[[-91,0,-120],[-113,0,-120]] },
    { type:'street', width:5, closed:false, points:[[-91,0, -40],[-113,0, -40]] },
    { type:'street', width:5, closed:false, points:[[-91,0,  40],[-113,0,  40]] },
    { type:'street', width:5, closed:false, points:[[-91,0, 120],[-113,0, 120]] },
    { type:'street', width:5, closed:false, points:[[-28,0,-193],[-28,0,-238]] },
    { type:'street', width:5, closed:false, points:[[ 28,0,-193],[ 28,0,-238]] },
    { type:'street', width:5, closed:false, points:[[-45,0, 193],[-45,0, 216]] },
    { type:'street', width:5, closed:false, points:[[  0,0, 193],[  0,0, 216]] },
    { type:'street', width:5, closed:false, points:[[ 45,0, 193],[ 45,0, 216]] },

    /* the Great Meadow — keep the southern middle wide open */
    { type:'keepClear', x:8,  z:55, r:42 },
    { type:'keepClear', x:-5, z:14, r:26 },
    /* …and fill it with park life instead */
    { type:'picnickers', x:8, z:52, spread:34, count:9 },
    { type:'grassVolleyball', x:-2, z:70, ry:0.4 },
    { type:'grassVolleyball', x:22, z:44, ry:-0.7 },
    /* the famous 2.6-mile gravel jogging loop */
    { type:'path', width:3, points:[
      [-82,0,-140],[-50,0,-180],[  0,0,-188],[ 50,0,-180],[ 82,0,-140],
      [ 86,0, -60],[ 86,0,  60],[ 82,0, 140],[ 50,0, 182],[  0,0, 190],
      [-50,0, 182],[-82,0, 140],[-86,0,  60],[-86,0, -60]
    ]},
    { type:'clouds', count:10, spreadX:500, spreadZ:560, yMin:60, yMax:95 },
    { type:'skylineDenver',   z:-420 },
    { type:'mountains', x:-430, z:-300 },
    { type:'trees',     count:130, parkX:100, parkZ:300, outerX:220, outerZ:430,
      avoidX:[[86,118]], avoidZ:[[-242,-186],[186,220]] }
  ],

  /* runners on the gravel loop, both directions */
  joggers: 6,

  /* Denver pedestrians wandering the racing line (see PED_TYPES in world.js) */
  pedestrians: { count: 10, tMin: 0.05, tMax: 0.97 },

  /* geese floating out on the lakes */
  lakeGeese: [
    { x:-14, z:-98, count:4, spread:16 },   // Smith Lake
    { x:  2, z:112, count:3, spread:12 }    // Grasmere
  ],

  /* resident goose gaggles: fixed spots or a t along the spline */
  gaggles: [
    { x:-34, z:-68, count:6, spread:11 },  // Smith Lake south lawn, by the boathouse
    { x: 34, z:126, count:6, spread:11 },  // Grasmere east bank
    { t: 0.36,      count:4, spread:7 }    // the rec center hairpin welcoming committee
  ]
};
