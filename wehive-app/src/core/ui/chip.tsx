import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Text } from '@/core/ui/text';

export type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Small status label. Tone carries meaning; the text always says it too. */
export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const { c } = useTheme();
  const map = {
    success: [c.successBg, c.success], warning: [c.warningBg, c.warning], danger: [c.dangerBg, c.danger],
    info: [c.infoBg, c.info], neutral: [c.surfaceAlt, c.textMuted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text variant="small" style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 3 },
  text: { fontFamily: 'Figtree_700Bold', fontSize: 12 },
});
