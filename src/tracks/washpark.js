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
  fog: [70, 540],   // far enough to read the layered Front Range + skyline
  ambient: [0xfff2e0, 0.6],
  sun: [0xfff7e0, 0.9],
  bounds: { x: 130, z: 225 },   // hard world clamp for the player

  roadWidth: 8.8,
  spline: [
    [-58,0,  15],[-60,0, -20],
    [-66,0, -52],[-50,0, -80],
    [-56,0,-108],
    [-38,0,-138],[ -4,0,-150],[ 28,0,-140],
    [ 44,0,-114],[ 36,0, -86],
    [ 18,0, -66],[  8,0, -46],
    [ 22,0, -26],[ 40,0,  -6],
    [ 54,0,  22],[ 56,0,  58],
    [ 48,0,  92],[ 40,0, 128],[ 16,0, 150],
    [-14,0, 160],[-48,0, 120],
    [-46,0,  78],[-20,0,  52],[-44,0,  34]
  ],

  boostPads: [0.03, 0.50, 0.74],          // t along spline
  itemBoxes: { at: [0.08, 0.44, 0.66], offsets: [-2.2, 0, 2.2] },

  callouts: [
    { t:0.11, label:'VOLLEYBALL CHICANE' },
    { t:0.17, label:'DOS CHAPPELL BATHHOUSE' },
    { t:0.26, label:'SMITH LAKE ESSES' },
    { t:0.36, label:'REC CENTER HAIRPIN' },
    { t:0.42, label:'THE BOATHOUSE' },
    { t:0.30, label:'LILY POND' },
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
    [-8, 108, 19, 31],          // Grasmere Lake — large tall teardrop, west-of-center
    [66, -162,  9, 12]          // Lily Pond (NE corner)
  ],

  props: [
    { type:'water',    x:-8,  z:-102, r:44, seg:16, scale:[0.86,0.60], exclude:40 },  // Smith Lake
    /* Grasmere — big tall teardrop tilted NW–SE, west-of-center; the
       southern racing loop wraps around its west and south shores */
    /* Grasmere Lake — real shoreline traced from OpenStreetMap */
    { type:'water',    x:-8,  z:108, exclude:40, points:[
      [6.8,-15.5],[10.8,-18.1],[16.5,-24.0],[19.5,-27.0],[20.0,-33.8],
      [18.9,-35.5],[10.6,-35.2],[2.2,-35.2],[-5.0,-31.7],[-10.3,-26.8],
      [-18.3,-24.5],[-23.4,-18.3],[-23.5,-9.9],[-25.8,-1.9],[-25.8,6.5],
      [-23.9,14.7],[-23.8,23.0],[-25.5,31.2],[-21.9,36.9],[-13.9,34.8],
      [-7.6,29.4],[-1.7,23.3],[3.6,16.1],[4.2,7.7],[5.8,-0.5],[6.2,-8.7]
    ]},
    /* keep trees out of the tall lake's tips (the circular exclude above
       doesn't reach the ends of the ellipse) */
    { type:'keepClear', x:-16, z:76,  r:16 },
    { type:'keepClear', x:0,   z:140, r:16 },
    { type:'island',   x:-12, z:123,  r:6,  trees:4 },                                // the iconic island
    /* Lily Pond — the tiny pond tucked in the park's NE corner
       (real outline traced from OSM, near Franklin & Virginia) */
    { type:'water',    x:66, z:-162, exclude:14, points:[
      [-10.1,8.9],[-6.6,13.0],[-1.4,13.0],[3.6,11.2],[7.8,7.6],[9.0,2.5],
      [7.4,-2.8],[9.1,-7.9],[8.8,-13.0],[4.0,-12.6],[1.8,-7.6],[1.2,-2.0],
      [-2.9,1.1],[-7.0,4.6]
    ]},
    { type:'lilypads', x:66, z:-162, count:8, spread:7, exclude:14 },
    /* the pond's regulars — lines in the water */
    { type:'fisherman', x:65.5, z:-160,   ry:Math.PI/2 },
    { type:'fisherman', x:71,   z:-147.2, ry:Math.PI },
    /* the 1913 Benedict boathouse pavilion — SOUTH shore of Smith Lake,
       facing north across the water toward the bathhouse */
    { type:'boathouse', x:-8,  z:-73, ry: Math.PI },
    /* Dos Chappell bathhouse — north shore, across the water from the
       boathouse (the west shore is too tight between road and lake) */
    { type:'bathhouse', x:-20, z:-130 },
    { type:'boats',    x:-16, z:-106, count:4 },
    { type:'kayaks',   x:-28, z:-95,  count:2, spread:8 },
    { type:'kayaks',   x:-8,  z:106,  count:2, spread:6 },

    /* Smith Lk Lp & Grasmere Lp — lakeside loop paths hugging each shore */
    { type:'path', width:2.5, points:[
      [-8,0,-132],[26,0,-122],[35,0,-100],[26,0,-78],[-8,0,-70],
      [-40,0,-77],[-47,0,-100],[-40,0,-123]
    ]},
    /* Grasmere Loop — offset ~5.5u out from the real shoreline polygon */
    { type:'path', width:2.5, points:[
      [3.7,0,121.1],[16.8,0,134.4],[9.2,0,148.9],[-9.7,0,147.3],
      [-26.1,0,138.1],[-36.7,0,123.8],[-39.3,0,104.9],[-37.3,0,85.9],
      [-33.5,0,68.6],[-16.7,0,70.5],[-3.4,0,84.2],[2.1,0,102.0]
    ]},

    /* City Ditch: inflow to Grasmere's south shore, then around to Smith
       (endpoints kept outside the lakes so the ribbon doesn't run into water) */
    { type:'cityDitch', olives:5, points:[
      [-34,0,188],[-28,0,168],[-20,0,152]
    ]},
    { type:'cityDitch', olives:10, points:[
      [-34,0,72],[-48,0,42],[-44,0,8],[-24,0,-12],
      [0,0,-24],[30,0,-30],[22,0,-50],[0,0,-72]
    ]},
    { type:'banners', at:[
      { t:0.015, text:'MILE HIGH CRIT', bg:'#4b2d5e', fg:'#ffd166', side:1 },
      { t:0.30,  text:'GO GO GO!',      bg:'#c75146', fg:'#f5e9d0', side:-1 },
      { t:0.56,  text:'WASH PARK GP',   bg:'#2e5a8f', fg:'#ffd166', side:1 },
      { t:0.72,  text:'HONK FOR BIKES', bg:'#3e6b35', fg:'#f5e9d0', side:1 }
    ]},
    /* landmark placards — name what you're passing (recognition cues) */
    { type:'parkSign', t:0.04, side:1,  text:'PERENNIAL GARDEN', w:6.4 },
    { type:'parkSign', t:0.225, side:-1, text:'DOS CHAPPELL BATHHOUSE', w:7.2 },
    { type:'parkSign', t:0.25, side:-1,  text:'SMITH LAKE' },
    { type:'parkSign', t:0.455, side:1,  text:'REC CENTER' },
    { type:'parkSign', t:0.42, side:-1, text:'BOATHOUSE' },
    { type:'parkSign', t:0.295, side:1,  text:'LILY POND' },
    { type:'parkSign', t:0.60, side:-1,  text:'MT VERNON GARDEN', w:6.6 },
    { type:'parkSign', t:0.66, side:-1,  text:'GRASMERE LAKE', w:5.6 },
    { type:'parkSign', t:0.49, side:1, text:'CITY DITCH' },
    /* amber crossing signs ~0.025t BEFORE each ped zone (zones start at
       0.07 / 0.39 / 0.77) so the warning arrives before the hazard */
    { type:'parkSign', t:0.045, side:-1, text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    { type:'parkSign', t:0.365, side:1,  text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    { type:'parkSign', t:0.745, side:1,  text:'PED XING', w:4, bg:'#d9a520', fg:'#1a1423' },
    /* street-name blades at the park edges for orientation */
    { type:'streetSign', x:-95, z:-30, text:'S DOWNING ST',   ry:Math.PI/2 },
    { type:'streetSign', x: 95, z:  6, text:'S FRANKLIN ST',  ry:-Math.PI/2 },
    { type:'streetSign', x: -6, z:-168, text:'E VIRGINIA AVE', ry:0 },
    { type:'streetSign', x: -6, z: 176, text:'E LOUISIANA AVE', ry:0 },
    /* east-edge cross streets (match the real N→S order off Franklin) */
    { type:'streetSign', x:95, z:-113, text:'E EXPOSITION AVE', ry:-Math.PI/2 },
    { type:'streetSign', x:95, z:-33,  text:'E OHIO AVE',       ry:-Math.PI/2 },
    { type:'streetSign', x:95, z:47,   text:'E KENTUCKY AVE',   ry:-Math.PI/2 },
    { type:'streetSign', x:95, z:127,  text:'E ARIZONA AVE',    ry:-Math.PI/2 },
    /* South High School — SE of the park (its real spot: Louisiana & Franklin) */
    { type:'southHigh', x:85, z:246, ry:Math.PI },
    { type:'roadBridge', t:0.50 },
    { type:'roadBridge', t:0.895 },
    { type:'roadBridge', t:0.965 },
    { type:'footbridge', x:-30, z:186 },
    { type:'footbridge', x:-36, z:58, ry:0.7 },
    { type:'flowerBed', x:-6,  z:-40, w:10, d:5, ry: 0.3 },
    { type:'flowerBed', x:62,  z:-34, w:10, d:5, ry:-0.2 },
    { type:'flowerBed', x:-58, z: 66, w:10, d:5, ry: 0.2 },
    { type:'flowerBed', x:-6,  z: 42, w:10, d:5, ry:-0.2 },
    { type:'blankets',  x:-14, z:8, spreadX:30, spreadZ:38, count:9 },
    { type:'volleyball', x:-78, z:-56 },
    { type:'volleyball', x:-78, z:-70 },
    { type:'volleyball', x:-78, z:-84 },
    /* tennis courts — the real park has clusters on BOTH the west side
       and the south end (the park has ~10 courts total) */
    { type:'tennis',    x:-72, z:104 },
    { type:'tennis',    x:-72, z:116 },
    { type:'tennis',    x:-72, z:128 },
    { type:'tennis',    x:10, z:176, ry:Math.PI/2 },
    { type:'tennis',    x:22, z:176, ry:Math.PI/2 },
    { type:'tennis',    x:34, z:176, ry:Math.PI/2 },
    /* rec center south-central below the boathouse, parking toward Franklin */
    { type:'recCenter', x:34, z:-44, ry:Math.PI/2, parking:true },
    /* playground west-central by the boathouse (near Downing) */
    { type:'playground', x:-40, z:-52 },
    /* Denver's two largest flower gardens */
    { type:'marthaGarden', x:30, z:62, w:18, d:20 },          // Mt Vernon / Martha Washington garden
    { type:'perennialGarden', x:-77, z:-10, w:16, d:24 },     // Perennial Garden at Downing
    /* Eugene Field House + Wynken/Blynken/Nod shoe fountain — EAST side near
       Franklin & Exposition (moved there by Molly Brown in 1930) */
    { type:'cottage',   x:84, z:-14, fdx:-9, ry:-Math.PI/2 },   // porch faces the park
    { type:'parkSign',  x:72, z:-4, ry:-Math.PI/2, text:'EUGENE FIELD HOUSE', w:7.6 },
    /* Fire Station 21 — the red-brick landmark at the park's NE corner */
    { type:'fireStation', x:98, z:-186, ry:-Math.PI/2 },
    { type:'parkSign',  x:80, z:-186, ry:-Math.PI/2, text:'FIRE STATION 21', w:7 },
    { type:'lawnBowling', x:-38, z:178 },
    { type:'slackline', x:-2, z:36 },
    { type:'slackline', x:30, z:40 },
    /* the Olmsted evergreen grove on the north side + scattered north meadow */
    { type:'pines', x:-55, z:-165, spreadX:50, spreadZ:40, count:9 },
    { type:'grove', x:35, z:-172, spreadX:60, spreadZ:40, count:10, margin:7 },
    /* the park is heavily wooded on the east (toward Franklin) */
    { type:'grove', x:76, z:-92, spreadX:28, spreadZ:70, count:16, margin:7 },
    { type:'grove', x:78, z:58,  spreadX:26, spreadZ:90, count:18, margin:7 },
    /* the neighborhood: mansions along Downing (west) & Franklin (east),
       modest bungalows on Louisiana (south), high-rise apartments up on
       the Virginia Ave edge (north) — each set back behind its street */
    /* perimeter streets — true grid: straight N-S / E-W, right-angle corners */
    { type:'street', width:6, closed:false, points:[[-91,0,-372],[-91,0, 214]] },
    { type:'street', width:6, closed:false, points:[[ 91,0,-236],[ 91,0, 214]] },
    { type:'street', width:6, closed:false, points:[[-290,0,-194],[380,0,-194]] },
    { type:'street', width:6, closed:false, points:[[-290,0, 194],[380,0, 194]] },
    /* the streets a block behind — straight grid, no ring */
    { type:'street', width:5, closed:false, points:[[ 112,0,-236],[ 112,0, 214]] },
    { type:'street', width:5, closed:false, points:[[-112,0,-236],[-112,0, 214]] },
    { type:'street', width:5, closed:false, points:[[-290,0,-236],[ 380,0,-236]] },
    { type:'street', width:5, closed:false, points:[[-290,0, 214],[ 380,0, 214]] },
    /* quiet neighborhood street a block west of Downing */
    { type:'street', width:5, closed:false, points:[[-124,0,-194],[-124,0,194]] },
    /* NW corner, like the real map: Downing continues north past the park,
       Virginia crosses east-west, and Marion St Parkway angles NW off
       Virginia — the Park Lane Towers sit in the Downing/Marion wedge */
    { type:'street', width:5, y:0.0125, closed:false, points:[
      [-68,0,-196],[-68,0,-250],[-68,0,-300],[-68,0,-340],[-91,0,-368]
    ]},
    /* cross streets between the rows of homes */
    { type:'street', width:5, closed:false, points:[[ 91,0,-120],[ 127,0,-120]] },
    { type:'street', width:5, closed:false, points:[[ 91,0, -40],[ 127,0, -40]] },
    { type:'street', width:5, closed:false, points:[[ 91,0,  40],[ 127,0,  40]] },
    { type:'street', width:5, closed:false, points:[[ 91,0, 120],[ 127,0, 120]] },
    { type:'street', width:5, closed:false, points:[[-91,0,-120],[-127,0,-120]] },
    { type:'street', width:5, closed:false, points:[[-91,0, -40],[-127,0, -40]] },
    { type:'street', width:5, closed:false, points:[[-91,0,  40],[-127,0,  40]] },
    { type:'street', width:5, closed:false, points:[[-91,0, 120],[-127,0, 120]] },
    { type:'street', width:5, closed:false, points:[[-28,0,-193],[-28,0,-238]] },
    { type:'street', width:5, closed:false, points:[[ 28,0,-193],[ 28,0,-238]] },
    { type:'street', width:5, closed:false, points:[[-45,0, 193],[-45,0, 216]] },
    { type:'street', width:5, closed:false, points:[[  0,0, 193],[  0,0, 216]] },
    { type:'street', width:5, closed:false, points:[[ 45,0, 193],[ 45,0, 216]] },

    { type:'mansionRow', xEdge:103, zSpan:165, step:22 },
    { type:'houseRow',   z:202, xSpan:80, step:30, ry:Math.PI },
    /* Park Lane Towers: three matching 20-story condos stacked N-S along
       Marion Pkwy at the NW corner (the real trio at 420-480 S Marion) */
    { type:'parkLane', x:-45, z:-263, step:34, stagger:0 },

    /* painted street names on the asphalt */
    { type:'streetName', text:'S DOWNING ST',    x:-91,  z:-100, ry:Math.PI/2 },
    { type:'streetName', text:'S DOWNING ST',    x:-91,  z:  90, ry:Math.PI/2 },
    { type:'streetName', text:'S DOWNING ST',    x:-91,  z:-260, ry:Math.PI/2 },
    { type:'streetName', text:'S FRANKLIN ST',   x: 91,  z:-100, ry:Math.PI/2 },
    { type:'streetName', text:'S FRANKLIN ST',   x: 91,  z:  90, ry:Math.PI/2 },
    { type:'streetName', text:'E VIRGINIA AVE',  x:   0, z:-194 },
    { type:'streetName', text:'E VIRGINIA AVE',  x:-115, z:-194 },
    { type:'streetName', text:'E VIRGINIA AVE',  x: 100, z:-194 },
    { type:'streetName', text:'E LOUISIANA AVE', x:  10, z: 194 },
    { type:'streetName', text:'S MARION ST PKWY',x: -68, z:-225, ry:Math.PI/2, len:20 },
    { type:'streetName', text:'S MARION ST PKWY',x: -68, z:-310, ry:Math.PI/2, len:20 },
    { type:'streetName', text:'S OGDEN ST',      x:-112, z: -60, ry:Math.PI/2 },
    { type:'streetName', text:'S OGDEN ST',      x:-112, z: 100, ry:Math.PI/2 },
    { type:'streetName', text:'S EMERSON ST',    x:-124, z:   0, ry:Math.PI/2 },
    { type:'streetName', text:'S HIGH ST',       x: 112, z: -60, ry:Math.PI/2, len:12 },
    { type:'streetName', text:'S HIGH ST',       x: 112, z: 100, ry:Math.PI/2, len:12 },
    { type:'streetName', text:'E CEDAR AVE',     x: -40, z:-236 },
    { type:'streetName', text:'E CEDAR AVE',     x: 150, z:-236 },
    { type:'streetName', text:'E ARKANSAS AVE',  x:   0, z: 214 },
    { type:'streetName', text:'E ARKANSAS AVE',  x: 150, z: 214 },
    { type:'streetName', text:'E EXPOSITION AVE',x: 109, z:-120 },
    { type:'streetName', text:'E OHIO AVE',      x: 109, z: -40, len:12 },
    { type:'streetName', text:'E KENTUCKY AVE',  x: 109, z:  40 },
    { type:'streetName', text:'E ARIZONA AVE',   x: 109, z: 120 },
    { type:'streetName', text:'E EXPOSITION AVE',x:-109, z:-120 },
    { type:'streetName', text:'E OHIO AVE',      x:-109, z: -40, len:12 },
    { type:'streetName', text:'E KENTUCKY AVE',  x:-109, z:  40 },
    { type:'streetName', text:'E ARIZONA AVE',   x:-109, z: 120 },

    /* the Great Meadow — keep the southern middle wide open */
    { type:'keepClear', x:8,  z:55, r:42 },
    { type:'keepClear', x:-5, z:14, r:26 },
    /* …and fill it with park life instead */
    /* peak Wash Park summer: the meadow packed with volleyball & park life */
    { type:'picnickers', x:8,   z:52, spread:34, count:10 },
    { type:'picnickers', x:-24, z:20, spread:22, count:7 },
    { type:'picnickers', x:14,  z:66, spread:18, count:6 },
    { type:'grassVolleyball', x:10,  z:50, ry:0.4 },
    { type:'grassVolleyball', x:22,  z:44, ry:-0.7 },
    { type:'grassVolleyball', x:-20, z:30, ry:0.2 },
    { type:'grassVolleyball', x:32,  z:24, ry:-0.3 },
    { type:'grassVolleyball', x:-12, z:64, ry:0.6 },
    { type:'grassVolleyball', x:36,  z:54, ry:-0.5 },
    { type:'hammock', x:2,  z:20, ry:0.3 },
    { type:'hammock', x:30, z:6,  ry:-0.4 },
    { type:'bootcamp', x:18, z:14, ry:0.2 },
    /* the famous 2.6-mile gravel jogging loop */
    { type:'path', width:3, jog:true, points:[
      [-82,0,-140],[-50,0,-180],[  0,0,-188],[ 50,0,-180],
      [ 64,0,-181],[ 79,0,-166],[ 82,0,-140],
      [ 86,0, -60],[ 86,0,  60],[ 82,0, 140],[ 50,0, 182],[  0,0, 190],
      [-50,0, 182],[-82,0, 140],[-86,0,  60],[-86,0, -60]
    ]},
    { type:'clouds', count:10, spreadX:500, spreadZ:560, yMin:60, yMax:95 },
    { type:'skylineDenver',   z:-420 },
    /* the neighborhood, stretching to the fog line in every direction */
    { type:'sprawl',
      xMin:-290, xMax:380, zMin:-385, zMax:400,   // grid ends where the foothills rise
      clearX:126, clearZ:250,
      streetsX:[-290,-240,-195,-140, 140,195,240,290,340],
      streetsZ:[-360,-315,-280, 280,315,360,395],
      crossZ:[-120,-40,40,120],
      gridX:17, gridZ:19, carsPerStreet:2 },
    { type:'mountains', x:-430, z:-300 },
    { type:'trees',     count:130, parkX:100, parkZ:300, outerX:220, outerZ:430,
      avoidX:[[86,118]], avoidZ:[[-242,-186],[186,220]] }
  ],

  /* gravel-loop traffic: joggers, dog walkers, rollerbladers, surreys */
  joggers: 20,

  /* Denver pedestrians in authored crossing zones (see PED_TYPES in world.js):
     playground/volleyball, the boathouse, and the Great Meadow crossing */
  pedestrians: { zones: [
    { t:0.10, span:0.03, count:4 },
    { t:0.42, span:0.03, count:4 },
    { t:0.80, span:0.03, count:3 }
  ]},

  /* geese floating out on the lakes */
  lakeGeese: [
    { x:-14, z:-98, count:4, spread:16 },   // Smith Lake
    { x:-8, z:108, count:4, spread:16 }    // Grasmere
  ],

  /* resident goose gaggles — several right by the racing line to feed the
     goose-poop gauntlet (fixed spots or a t along the spline) */
  gaggles: [
    { x:-34, z:-68, count:6, spread:11 },  // Smith Lake south lawn, by the boathouse
    { x: 24, z:110, count:6, spread:10 },  // Grasmere east bank
    { t: 0.36,      count:5, spread:7 },   // the rec center hairpin welcoming committee
    { t: 0.55,      count:4, spread:7 },   // flower-gardens straight
    { t: 0.80,      count:5, spread:8 }    // great-meadow crossing
  ]
};
