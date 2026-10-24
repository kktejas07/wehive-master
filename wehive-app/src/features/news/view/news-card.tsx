import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Chip } from '@/core/ui/chip';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Text } from '@/core/ui/text';
import type { NewsRow } from '@/features/news/viewmodel/use-news';

export function NewsCard({ item }: { item: NewsRow }) {
  const { c } = useTheme();
  return (
    <PressableScale
      disabled={!item.url}
      onPress={() => item.url && WebBrowser.openBrowserAsync(item.url)}
      accessibilityRole="link"
      accessibilityHint="Opens the original article"
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.meta}>
        {item.category ? <Chip label={item.category} tone="info" /> : null}
        <Text variant="small" tone="muted" numberOfLines={1} style={styles.source}>
          {[item.source, item.when].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="heading">{item.title}</Text>
      {item.summary ? <Text tone="muted" numberOfLines={3}>{item.summary}</Text> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  source: { flex: 1, minWidth: 0 },
});
