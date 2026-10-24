/**
 * Timing for the WeHive brand loaders (thinking, flight plan, radar), taken from
 * the design handoff's CSS keyframes so web and native move the same way.
 */
export const VARIANTS = ['thinking', 'flight-plan', 'radar'] as const;
export type LoaderVariant = (typeof VARIANTS)[number];

/** One full loop of the thinking and flight-plan loaders; "auto" switches loader on this beat. */
export const LOOP_MS = 8000;
export const RADAR_MS = 2600;
export const BREATHE_MS = 2400;
/** Each thinking status line is on screen for this long. */
export const LINE_MS = 2000;

/** Fraction of the flight-plan loop at which each step lights up, and when they all reset. */
export const STEP_ON = [0.01, 0.2225, 0.435, 0.6475, 0.86] as const;
export const STEP_OFF = 0.92;

let shown = 0;

/** Round-robin across mounts, so consecutive loading screens show different loaders. */
export function takeVariant(): LoaderVariant {
  return VARIANTS[shown++ % VARIANTS.length];
}

export function nextVariant(v: LoaderVariant): LoaderVariant {
  return VARIANTS[(VARIANTS.indexOf(v) + 1) % VARIANTS.length];
}

/** Position in [0, 1) of a looping animation that starts `delay` (a fraction of the loop) late. */
export function phase(t: number, delay: number): number {
  'worklet';
  return (((t - delay) % 1) + 1) % 1;
}
