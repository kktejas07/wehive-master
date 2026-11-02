import { router } from 'expo-router';
import { ChevronRight, FileText } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useSopTemplates } from '../viewmodel/use-sop-templates';
import type { SopTemplate } from '../model/types';

export function SopListScreen() {
  const vm = useSopTemplates();
  const { c } = useTheme();

  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>SOP Builder</Text>
          <Text style={styles.whiteMuted}>AI-powered Statement of Purpose templates for every country.</Text>
        </GradientHero>
      }>

      {vm.filters ? (
        <View style={styles.filterRow}>
          <PressableScale
            onPress={() => vm.setCountry(undefined)}
            style={[styles.chip, { backgroundColor: !vm.country ? c.primary : c.surface, borderColor: !vm.country ? c.primary : c.border }]}>
            <Text variant="small" style={{ color: !vm.country ? c.onPrimary : c.text, fontFamily: 'Figtree_600SemiBold' }}>All countries</Text>
          </PressableScale>
          {vm.filters.countries.slice(0, 6).map((ct) => {
            const on = vm.country === ct;
            return (
              <PressableScale
                key={ct}
                onPress={() => vm.setCountry(on ? undefined : ct)}
                style={[styles.chip, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.border }]}>
                <Text variant="small" style={{ color: on ? c.onPrimary : c.text, fontFamily: 'Figtree_600SemiBold' }}>{ct}</Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}

      {vm.loading ? <SkeletonRows count={5} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No templates" body="Try removing filters." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((t, i) => <TemplateRow key={t.id} item={t} index={i} />)}
        </View>
      )}
    </Screen>
  );
}

function TemplateRow({ item, index }: { item: SopTemplate; index: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();

  return (
    <Animated.View entering={reduce || index > 12 ? undefined : FadeInDown.delay(index * 30).duration(260)}>
      <PressableScale
        onPress={() => router.push({ pathname: '/sop-builder/[id]', params: { id: item.id } })}
        accessibilityRole="link"
        accessibilityLabel={`${item.title}, ${item.country_name}`}
        style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.icon, { backgroundColor: `${c.primary}18` }]}>
          <FileText size={20} color={c.primary} />
        </View>
        <View style={styles.rowBody}>
          <Text variant="heading" numberOfLines={1}>{item.title}</Text>
          <View style={styles.rowMeta}>
            <Chip label={item.country_name} tone="neutral" />
            <Chip label={item.program_type} tone="neutral" />
            <Text variant="small" tone="muted">~{item.word_count} words</Text>
          </View>
        </View>
        <ChevronRight size={18} color={c.textMuted} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2 },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
