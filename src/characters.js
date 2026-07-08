/* The roster. Characters are pure data: kit colors, mesh accessories
   (interpreted by makeRider), and AI personality params (interpreted by
   aiDriver). Adding a racer = adding an entry here.

   AI personality:
     base           cruising speed
     amp / ph       lateral sway magnitude / phase (big amp = wanders wide)
     corner.ahead   how far ahead they read corners (big = brakes early)
     corner.grip    how hard corners slow them (small = never brakes)
     boostThreshold gap behind the player before they espresso (small = boost-happy)
*/

export const PLAYER_CHARACTER = {
  id:'you', name:'YOU', torso:0x2e86ab, helmet:0xffd166
};

export const ROSTER = [
  /* mascot tier */
  { id:'magpie',   name:'MAGPIE',      torso:0x1a1423, helmet:0xf5e9d0, base:19.2, amp:1.6, ph:0.0 },
  { id:'blucifer', name:'BLUCIFER JR', torso:0x2b4a8f, helmet:0xe84855, base:19.8, amp:1.1, ph:2.1 },
  { id:'yeti',     name:'THE YETI',    torso:0xf5e9d0, helmet:0x5db3c9, base:20.3, amp:2.0, ph:4.2 },

  /* locals tier */
  { id:'stravadad', name:'STRAVA DAD', torso:0xd7f13d, helmet:0xff5c8a,
    base:21.2, amp:0.9, ph:1.2,
    corner:{ ahead:14, grip:0.75 },        // monster straights, brakes way early
    boostThreshold:12,                      // espressos at the slightest excuse
    look:{ sleeveless:true, bigAeroTail:true, discWheel:true, frame:0xf5e9d0 } },

  { id:'fixie', name:'FIXIE KID', torso:0x1a1423, helmet:0x8a3d4a,
    base:19.4, amp:2.6, ph:3.0,
    corner:{ ahead:4, grip:0.25 },          // no brakes, sends every corner
    look:{ headgear:'beanie', bag:'messenger', frame:0x9b59b6, mixedLegs:true } },

  { id:'gravelbro', name:'GRAVEL BRO', torso:0xb0402f, helmet:0x7a6a3a,
    base:19.6, amp:4.2, ph:5.1,             // wanders onto the grass, doesn't care
    corner:{ grip:0.45 },
    look:{ beard:true, bag:'bikepacking', frame:0x5a6e46 } },
];
