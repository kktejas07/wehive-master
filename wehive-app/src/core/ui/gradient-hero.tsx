import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gradients, maxContentWidth, palette, spacing } from '@/core/theme/tokens';

/**
 * Brand gradient header with a slow drifting glow (the website's --grad-navy).
 * The glow stays still when the user prefers reduced motion.
 */
export function GradientHero({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    drift.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, drift]);

  // A soft red light sweeping in from the top-right corner; no hard edges at any size.
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + drift.get() * 0.4 }));

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, glow]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,3,2,0.7)', 'rgba(255,3,2,0.18)', 'rgba(255,3,2,0)']}
          locations={[0, 0.35, 0.75]}
          start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={[styles.inner, { paddingTop: insets.top + (compact ? spacing.lg : spacing.xxl), paddingBottom: compact ? spacing.xl : spacing.xxxl }]}>
        {children}
      </View>
      <View style={styles.flag} pointerEvents="none">
        <View style={[styles.flagPart, { backgroundColor: palette.signalRed }]} />
        <View style={[styles.flagPart, { backgroundColor: palette.white }]} />
        <View style={[styles.flagPart, { backgroundColor: palette.royalBlue }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  inner: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  flag: { flexDirection: 'row', height: 4 },
  flagPart: { flex: 1 },
});
