import { Easing } from 'react-native-reanimated';

/** One motion language for every screen. Animations read these, never literals. */
export const duration = { instant: 120, quick: 200, base: 320, slow: 520 } as const;

export const easing = {
  standard: Easing.bezier(0.2, 0.8, 0.2, 1),
  emphasized: Easing.bezier(0.3, 0, 0, 1),
} as const;

export const spring = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  pop: { damping: 10, stiffness: 260, mass: 0.7 },
} as const;
