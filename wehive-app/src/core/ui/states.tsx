import { CloudOff, Inbox, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';
import { Button } from '@/core/ui/button';
import { Text } from '@/core/ui/text';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={c.primary} />
      <Text tone="muted">{label}</Text>
    </View>
  );
}

/** Shimmering placeholder rows while a list loads. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (!reduce) o.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [reduce, o]);
  const pulse = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <View style={{ gap: spacing.sm }} accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[styles.skeleton, { backgroundColor: c.surfaceAlt }, pulse]} />
      ))}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Message icon={CloudOff} title="Couldn't load this" body={message} action={onRetry ? { label: 'Try again', onPress: onRetry } : undefined} />;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return <Message icon={Inbox} title={title} body={body} />;
}

function Message({
  icon, title, body, action,
}: { icon: LucideIcon; title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return (
    <View style={styles.center}>
      <AnimatedIcon icon={icon} size={32} color={c.textMuted} motion="wiggle" trigger={title} />
      <Text variant="heading">{title}</Text>
      {body ? <Text tone="muted" style={{ textAlign: 'center' }}>{body}</Text> : null}
      {action ? <Button label={action.label} variant="outline" onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  skeleton: { height: 72, borderRadius: radius.lg },
});
