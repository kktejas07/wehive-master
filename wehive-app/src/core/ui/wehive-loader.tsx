import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, interpolate, interpolateColor, type SharedValue,
  useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { useHydrated } from '@/core/hooks/use-hydrated';
import {
  BREATHE_MS, LINE_MS, LOOP_MS, nextVariant, phase, RADAR_MS, STEP_OFF, STEP_ON, takeVariant, VARIANTS, type LoaderVariant,
} from '@/core/motion/loader-timing';
import { fonts, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';

/**
 * WeHive brand loaders from the design handoff (same designs as the website's
 * WeHiveLoader): "thinking", "flight-plan" and "radar". variant="auto" shows a
 * different loader each time one appears and moves to the next every loop.
 * Fin and plane paths are the logo; keep them as-is.
 */
const brand = { blue: '#1450a0', red: '#d42a2a', fin: '#e0262b' } as const;
const FIN = 'M0,308 L222,25 C240,4 262,0 288,0 L340,0 L346,306 L200,308 C182,290 184,262 200,238 L210,212 C168,272 92,308 0,308Z';
const PLANE = 'M0,-23 L3,-8 L4,-5 L22,7 L22,12 L4,7 L4,16 L10,22 L10,25 L0,22 L-10,25 L-10,22 L-4,16 L-4,7 L-22,12 L-22,7 L-4,-5 L-3,-8Z';
const STATUS = ['Verifying your documents…', 'Examining paper records…', 'Plotting your route…', 'Clearing for takeoff…'];
const STEPS = ['Apply', 'Documents', 'Vetting', 'Visa', 'Depart'];
const BLIPS = [
  { x: 0.7, y: 0.22, delay: 0.7, red: false },
  { x: 0.24, y: 0.3, delay: 1.6, red: true },
  { x: 0.62, y: 0.74, delay: 2.3, red: false },
  { x: 0.18, y: 0.66, delay: 1.1, red: true },
];
const TAGLINE = 'YOUR GLOBAL JOURNEY STARTS HERE';

type Props = {
  variant?: LoaderVariant | 'auto';
  /** Replaces the default status lines / caption, e.g. "Loading your applications". */
  label?: string;
  /** Radar diameter in points. */
  size?: number;
  showCaption?: boolean;
};

export function WehiveLoader({ variant = 'auto', label, size = 240, showCaption = true }: Props) {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const [auto, setAuto] = useState<LoaderVariant>(takeVariant);

  useEffect(() => {
    if (variant !== 'auto' || reduce) return;
    const id = setInterval(() => setAuto(nextVariant), LOOP_MS);
    return () => clearInterval(id);
  }, [variant, reduce]);

  // Static web HTML is rendered once per page, so the rotation only starts after hydration.
  const current = variant !== 'auto' ? variant : hydrated ? auto : VARIANTS[0];
  const caption = showCaption
    ? `${label ? label.toUpperCase() : current === 'radar' ? 'SCANNING ROUTES' : 'FLIGHT PLAN'} · ${TAGLINE}`
    : undefined;

  return (
    <View
      style={styles.center}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      accessibilityLiveRegion="polite"
    >
      {current === 'thinking' && <Thinking lines={label ? [`${label}…`] : STATUS} />}
      {current === 'flight-plan' && <FlightPlan caption={caption} />}
      {current === 'radar' && <Radar caption={caption} size={size} />}
    </View>
  );
}

/** A 0 → 1 clock that loops every `ms`; stays at 0 when the user prefers reduced motion. */
function useClock(ms: number) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [ms, reduce, t]);
  return t;
}

/** 0 → 1 → 0 over one loop, eased like CSS `ease-in-out` on a 50% keyframe. */
function wave(p: number) {
  'worklet';
  return (1 - Math.cos(2 * Math.PI * p)) / 2;
}

function Fin({ height }: { height: number }) {
  return (
    <Svg width={(height * 350) / 310} height={height} viewBox="0 0 350 310">
      <Path d={FIN} fill={brand.fin} />
      <G transform="translate(262,142) rotate(42) scale(2.1)">
        <Path d={PLANE} fill="#fff" />
      </G>
    </Svg>
  );
}

function useCaptionStyle() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 480;
  return { fontFamily: fonts.body, fontSize: narrow ? 11 : 13, letterSpacing: narrow ? 1.3 : 2.6, color: c.text, textAlign: 'center' as const };
}

// ---------- thinking: breathing fin + rotating status lines ----------
const LINE_SIZE = 20;

function Thinking({ lines }: { lines: string[] }) {
  const breathe = useClock(BREATHE_MS);
  const t = useClock(LINE_MS * lines.length);
  const fin = useAnimatedStyle(() => {
    const e = wave(breathe.get());
    return { transform: [{ scale: 1 - 0.12 * e }, { rotate: `${-4 * e}deg` }] };
  });
  return (
    <View style={styles.think}>
      <Animated.View style={fin}><Fin height={LINE_SIZE * 2.2} /></Animated.View>
      <View style={styles.lines}>
        {lines.map((l, i) => <StatusLine key={l} text={l} index={i} total={lines.length} t={t} />)}
      </View>
    </View>
  );
}

function StatusLine({ text, index, total, t }: { text: string; index: number; total: number; t: SharedValue<number> }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const style = useAnimatedStyle(() => {
    if (total === 1 || reduce) return { opacity: index === 0 ? 1 : 0, transform: [{ translateY: 0 }] };
    // Same keyframes as the web loader's `wh-wd`: fade up in, hold, fade up out.
    const p = phase(t.get(), index / total);
    const steps = [0, 0.03 * 4 / total, 0.23 * 4 / total, 0.26 * 4 / total, 1];
    return {
      opacity: interpolate(p, steps, [0, 1, 1, 0, 0]),
      transform: [{ translateY: interpolate(p, steps, [0.4, 0, 0, -0.4, -0.4]) * LINE_SIZE }],
    };
  });
  return (
    <Animated.Text numberOfLines={1} style={[styles.line, { color: c.text }, style]}>
      {text}
    </Animated.Text>
  );
}

// ---------- flight plan: jet flies Apply → Depart, steps light up ----------
function FlightPlan({ caption }: { caption?: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - (width < 480 ? 88 : 112), 720);
  const t = useClock(LOOP_MS);
  const captionStyle = useCaptionStyle();
  const { c, scheme } = useTheme();
  const track = scheme === 'dark' ? c.border : '#cdd3e6';

  const prog = useAnimatedStyle(() => ({
    width: interpolate(t.get(), [0, 0.85, 1], [0, w, w]),
    opacity: interpolate(t.get(), [0, 0.85, 0.95, 1], [1, 1, 0, 0]),
  }));
  const jet = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 0.85, 0.95, 1], [1, 1, 0, 0]),
    transform: [{ translateX: interpolate(t.get(), [0, 0.85, 1], [0, w, w]) - 17 }, { rotate: '90deg' }],
  }));

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: w, height: 96 }}>
        <Svg width={w} height={4} style={styles.dashes}>
          <Line x1={0} y1={2} x2={w} y2={2} stroke={track} strokeWidth={2} strokeDasharray="6 5" />
        </Svg>
        <Animated.View style={[styles.prog, prog]}>
          <LinearGradient colors={[brand.blue, brand.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: w, height: 3 }} />
        </Animated.View>
        {STEPS.map((s, i) => <Step key={s} label={s} index={i} x={(i * w) / 4} t={t} track={track} />)}
        <Animated.View style={[styles.jet, jet]}>
          <Svg width={34} height={34} viewBox="-24 -26 48 54"><Path d={PLANE} fill={brand.red} /></Svg>
        </Animated.View>
      </View>
      {caption ? <Animated.Text style={captionStyle}>{caption}</Animated.Text> : null}
    </View>
  );
}

function Step({ label, index, x, t, track }: { label: string; index: number; x: number; t: SharedValue<number>; track: string }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const lit = index < 3 ? brand.blue : brand.red;
  const idle = c.surface;
  const on = STEP_ON[index];
  const dot = useAnimatedStyle(() => {
    const from = Math.max(on - 0.02, 0);
    const input = from > 0 ? [0, from, on, STEP_OFF, 1] : [0, on, STEP_OFF, 1];
    const fill = from > 0 ? [idle, idle, lit, lit, idle] : [idle, lit, lit, idle];
    const edge = from > 0 ? [track, track, lit, lit, track] : [track, lit, lit, track];
    return {
      backgroundColor: interpolateColor(t.get(), input, fill),
      borderColor: interpolateColor(t.get(), input, edge),
    };
  });
  return (
    <>
      <Animated.View style={[styles.node, { left: x - 11 }, dot]} />
      <Animated.Text numberOfLines={1} style={[styles.step, { left: x - 50, color: c.text, fontSize: width < 480 ? 11 : 14 }]}>
        {label}
      </Animated.Text>
    </>
  );
}

// ---------- radar: rotating sweep, blips, logo fin in the middle ----------
function Radar({ caption, size }: { caption?: string; size: number }) {
  const { c, scheme } = useTheme();
  const t = useClock(RADAR_MS);
  const captionStyle = useCaptionStyle();
  const r = size / 2;
  const ring = scheme === 'dark' ? c.border : '#e6eaf5';
  const edge = scheme === 'dark' ? c.border : '#dfe4f1';

  const sweep = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.get() * 360}deg` }] }));
  const blink = useAnimatedStyle(() => ({ opacity: 1 - 0.6 * wave(t.get()) }));

  return (
    <View style={{ alignItems: 'center', gap: 22 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={r} cy={r} r={r - 1} stroke={edge} strokeWidth={2} fill="none" />
          {[0.25, 0.5, 0.75].map((k) => <Circle key={k} cx={r} cy={r} r={r * k} stroke={ring} strokeWidth={1} fill="none" />)}
          <Line x1={r} y1={0} x2={r} y2={size} stroke={ring} strokeWidth={1} />
          <Line x1={0} y1={r} x2={size} y2={r} stroke={ring} strokeWidth={1} />
        </Svg>
        {/* SVG has no conic gradient: a quarter wedge, faint at its trailing edge, bright at the leading one. */}
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <Svg width={size} height={size}>
            <Defs>
              <SvgGradient id="wh-sweep" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={brand.red} stopOpacity={0} />
                <Stop offset="1" stopColor={brand.red} stopOpacity={0.35} />
              </SvgGradient>
            </Defs>
            <Path d={`M${r},${r} L${1},${r} A${r - 1},${r - 1} 0 0 1 ${r},${1} Z`} fill="url(#wh-sweep)" />
          </Svg>
        </Animated.View>
        {BLIPS.map((b) => <Blip key={b.x} {...b} size={size} t={t} />)}
        <View style={[StyleSheet.absoluteFill, styles.middle]} pointerEvents="none">
          <Fin height={size * 0.27} />
        </View>
      </View>
      {caption ? <Animated.Text style={[captionStyle, { paddingHorizontal: spacing.lg }, blink]}>{caption}</Animated.Text> : null}
    </View>
  );
}

function Blip({ x, y, delay, red, size, t }: (typeof BLIPS)[number] & { size: number; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const p = phase(t.get(), (delay * 1000) / RADAR_MS);
    return {
      opacity: interpolate(p, [0, 0.08, 0.4, 1], [0, 1, 0, 0]),
      transform: [{ scale: interpolate(p, [0, 0.08, 0.4, 1], [0.5, 1.4, 1, 1]) }],
    };
  });
  return <Animated.View style={[styles.blip, { left: x * size, top: y * size, backgroundColor: red ? brand.red : brand.blue }, style]} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl },
  think: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', gap: 18, paddingHorizontal: spacing.lg },
  // Takes the rest of the row, capped like the web's 15em, so lines never collapse to zero width.
  lines: { flex: 1, maxWidth: LINE_SIZE * 15, height: LINE_SIZE * 1.4 },
  line: { position: 'absolute', left: 0, top: 0, fontFamily: fonts.bodyMedium, fontSize: LINE_SIZE, lineHeight: LINE_SIZE * 1.4 },
  dashes: { position: 'absolute', top: 39, left: 0 },
  prog: { position: 'absolute', top: 39, left: 0, height: 3, overflow: 'hidden' },
  node: { position: 'absolute', top: 30, width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  step: { position: 'absolute', top: 64, width: 100, textAlign: 'center', fontFamily: fonts.bodyMedium, letterSpacing: 0.8 },
  jet: { position: 'absolute', top: 23, left: 0, width: 34, height: 34 },
  blip: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  middle: { alignItems: 'center', justifyContent: 'center' },
});
