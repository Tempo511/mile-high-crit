/* Pure data & tuning. No imports, no DOM. */

export const INTERNAL_H = 240;          // internal render height (retro upscale)

/* player physics */
export const MAX_SPEED = 19, BOOST_SPEED = 32, OFFROAD_MAX = 8,
             ACCEL = 10, BRAKE = 26,
             TURN = 2.7, GRIP_LOSS = 0.62, SCRUB = 5.5,
             DRIFT_TURN = 1.9, DRIFT_STEER = 1.35, DRIFT_SLIP = 0.30,
             MINI = 0.6, SUPER = 1.3;   // drift-charge seconds for mini/super boost

export const ITEMS = { coffee:'☕', sopapilla:'🫓', goose:'🪿' };
export const PLACES = ['1st','2nd','3rd','4th','5th','6th','7th','8th'];
