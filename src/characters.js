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
  { id:'magpie',   name:'MAGPIE',      torso:0x1a1423, helmet:0xf5e9d0, base:19.2, amp:1.6, ph:0.0,
    look:{ head:'bird', tailFeathers:true } },
  { id:'blucifer', name:'BLUCIFER',    torso:0x2e5fd0, helmet:0x1a1423, base:19.8, amp:1.1, ph:2.1,
    look:{ head:'horse' } },
  { id:'yeti',     name:'THE YETI',    torso:0xf5f0e6, helmet:0x5db3c9, base:20.3, amp:2.0, ph:4.2,
    look:{ head:'yeti', fur:true, hump:true, claws:true, sleeveless:true, skinTone:0xf5f0e6,
           th:0.66, ty:1.38 } },   // monsters stay bulky
  { id:'bighorn',  name:'BIGHORN',     torso:0xc9a06a, helmet:0x8a6a48, base:19.7, amp:0.8, ph:0.4,
    look:{ head:'bighorn' } },
  { id:'honker',   name:'HONKER',      torso:0xd9d2c5, helmet:0xe8912d, base:20.6, amp:3.0, ph:2.4,
    corner:{ grip:0.35 },                   // geese do not believe in brakes
    look:{ head:'goose', fur:true, sleeveless:true, skinTone:0xd9d2c5 } },
  { id:'diver', name:'CLIFF DIVER',    torso:0xd9a066, helmet:0xe84855, base:19.6, amp:1.8, ph:0.8,
    corner:{ grip:0.4 },                    // dives into corners without fear
    look:{ head:'diver', trunks:true, sleeveless:true } },
  { id:'bronco', name:'BRONCO',        torso:0xe8622d, helmet:0x2b4a8f, base:19.4, amp:1.3, ph:5.8,
    boostThreshold:15,                      // fourth-quarter energy
    look:{ head:'bronco', pads:true } },

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

  { id:'pitviper', name:'PIT VIPER GUY', torso:0xb0402f, helmet:0xf25caf,
    base:19.5, amp:2.2, ph:1.7, corner:{ grip:0.5 },
    look:{ head:'pitviper', sleeveless:true } },
  { id:'chile', name:'GREEN CHILE', torso:0x5d8f4a, helmet:0x3e6b35,
    base:19.3, amp:1.5, ph:2.9, boostThreshold:25,   // runs spicy
    look:{ head:'chile' } },
  { id:'prospector', name:'PROSPECTOR', torso:0x8a3d2a, helmet:0x6e4b2a,
    base:18.9, amp:2.4, ph:4.9,
    look:{ head:'prospector' } },
  { id:'wanda', name:'WASH PARK WANDA', torso:0xf25caf, helmet:0xf5e9d0,
    base:18.6, amp:1.2, ph:3.6,             // steady as 50 years of loops
    look:{ head:'wanda', floral:true } },
  { id:'transplant', name:'JUST MOVED HERE', torso:0xf5e9d0, helmet:0x5db3c9,
    base:20.0, amp:1.6, ph:5.3,
    look:{ head:'transplant', skinTone:0xe86a55, oxygen:true } },
];
