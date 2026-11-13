import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useResources } from '@/features/resources/viewmodel/use-resources';

export function ResourcesScreen() {
  const vm = useResources();
  const { c } = useTheme();
  const reduce = useReducedMotion();

  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Student Resources</Text>
          <Text style={styles.whiteMuted}>Guides, checklists and tools for your journey.</Text>
        </GradientHero>
      }>
      {vm.categories.length > 0 && (
        <View style={styles.chips}>
          <PressableScale onPress={() => vm.setCategory(null)}>
            <Chip label="All" tone={vm.category === null ? 'info' : 'neutral'} />
          </PressableScale>
          {vm.categories.map((cat) => (
            <PressableScale key={cat} onPress={() => vm.setCategory(cat)}>
              <Chip label={cat} tone={vm.category === cat ? 'info' : 'neutral'} />
            </PressableScale>
          ))}
        </View>
      )}

      {vm.loading ? <SkeletonRows count={5} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No resources" body="Resources will appear here soon." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((r, i) => (
            <Animated.View key={r.id} entering={reduce || i > 10 ? undefined : FadeInDown.delay(i * 40).duration(260)}>
              <PressableScale
                onPress={r.url ? () => Linking.openURL(r.url!) : undefined}
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text variant="heading" numberOfLines={2}>{r.title}</Text>
                {r.body ? <Text variant="small" tone="muted" numberOfLines={3}>{r.body}</Text> : null}
                {r.category ? <Chip label={r.category} tone="info" /> : null}
              </PressableScale>
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.lg },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
});
