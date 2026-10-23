import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Text } from '@/core/ui/text';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost';

/** The one button. Variants replace the website's hundreds of hand-styled buttons. */
export function Button({
  label, onPress, variant = 'primary', icon, busy = false, disabled = false, testID, full = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
  full?: boolean;
}) {
  const { c } = useTheme();
  const bg = { primary: c.primary, accent: c.accent, outline: 'transparent', ghost: 'transparent' }[variant];
  const fg = variant === 'primary' || variant === 'accent' ? c.onPrimary : c.primary;
  const off = disabled || busy;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy }}
      style={[
        styles.base,
        { backgroundColor: bg, borderColor: variant === 'outline' ? c.border : bg, opacity: off ? 0.55 : 1 },
        full && styles.full,
      ]}>
      <View style={styles.row}>
        {busy ? <ActivityIndicator color={fg} /> : icon ? <AnimatedIcon icon={icon} size={18} color={fg} trigger={label} /> : null}
        <Text variant="bodyStrong" style={{ color: fg }}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
