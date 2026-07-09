/* Pure data & tuning. No imports, no DOM. */

export const INTERNAL_H = 320;          // internal render height (retro upscale)
export const RIDER_SCALE = 1.18;        // kart-game cheat: riders oversized for readability

/* player physics */
export const MAX_SPEED = 19, BOOST_SPEED = 32, OFFROAD_MAX = 8, OFFROAD_SPRINT = 13,
             ACCEL = 10, BRAKE = 26,
             TURN = 2.7, GRIP_LOSS = 0.62, SCRUB = 5.5,
             DRIFT_TURN = 0.85, DRIFT_STEER = 1.15, DRIFT_SLIP = 0.26,
             MINI = 0.6, SUPER = 1.3, ULTRA = 2.2;  // drift-charge seconds per boost tier

/* the LEGS system: sprint burns energy, drafting banks it, empty = bonk */
export const SPRINT_SPEED = 24.5,
             ENERGY_DRAIN = 0.36,     // /s while sprinting (~2.8s of full gas)
             ENERGY_REGEN = 0.055,    // /s baseline
             DRAFT_REGEN  = 0.30,     // /s bonus while in a slipstream
             DRAFT_PULL   = 2,        // free target-speed bonus while drafting
             BONK_TIME    = 2.4, BONK_SPEED = 15;

export const AI_SKILL = 1.08;           // global AI speed multiplier — the difficulty dial

export const ITEMS = {
  coffee:'☕', chile:'🌶️', goose:'🪿',
  frisbee:'🥏', bison:'🦬', chinook:'🌬️', coldbrew:'🥤'
};
export const PLACES = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
