import type { LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';

import { duration, spring } from '@/core/motion/tokens';

type Motion = 'pop' | 'wiggle' | 'none';

/**
 * Animated icon: pops (or wiggles) whenever `active` turns true or `trigger` changes,
 * e.g. a tab becoming selected or a status updating. Static when reduced motion is on.
 */
export function AnimatedIcon({
  icon: Icon, size = 22, color, active = false, trigger, motion = 'pop', strokeWidth = 2,
}: {
  icon: LucideIcon;
  size?: number;
  color: string;
  active?: boolean;
  trigger?: unknown;
  motion?: Motion;
  strokeWidth?: number;
}) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (reduce || motion === 'none' || (!active && trigger === undefined)) return;
    if (motion === 'pop') {
      scale.set(withSequence(withTiming(0.8, { duration: duration.instant }), withSpring(1, spring.pop)));
    } else {
      rotate.set(withSequence(
        withTiming(-12, { duration: 80 }), withTiming(10, { duration: 80 }),
        withTiming(-6, { duration: 80 }), withTiming(0, { duration: 80 }),
      ));
    }
  }, [active, trigger, motion, reduce, scale, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${rotate.get()}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Icon size={size} color={color} strokeWidth={active ? strokeWidth + 0.4 : strokeWidth} />
    </Animated.View>
  );
}
