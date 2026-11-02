import { useState } from 'react';
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
import { useCommunity } from '@/features/community/viewmodel/use-community';

type Tab = 'stories' | 'interviews' | 'questions';

export function CommunityScreen() {
  const vm = useCommunity();
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>('stories');

  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Community</Text>
          <Text style={styles.whiteMuted}>Student stories, visa interviews and Q&A.</Text>
        </GradientHero>
      }>
      <View style={styles.tabs}>
        {(['stories', 'interviews', 'questions'] as const).map((t) => (
          <PressableScale key={t} onPress={() => setTab(t)}>
            <Chip label={t[0].toUpperCase() + t.slice(1)} tone={tab === t ? 'info' : 'neutral'} />
          </PressableScale>
        ))}
      </View>

      {vm.loading ? <SkeletonRows count={4} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : tab === 'stories' ? (
        vm.stories.length === 0 ? <EmptyState title="No stories yet" body="Be the first to share your journey." /> : (
          <View style={styles.list}>
            {vm.stories.map((s, i) => (
              <Animated.View key={s.id} entering={reduce || i > 8 ? undefined : FadeInDown.delay(i * 40).duration(260)}>
                <PressableScale style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text variant="heading" numberOfLines={2}>{s.title}</Text>
                  {s.excerpt ? <Text variant="small" tone="muted" numberOfLines={2}>{s.excerpt}</Text> : null}
                  <View style={styles.meta}>
                    {s.author ? <Text variant="small" tone="muted">{s.author}</Text> : null}
                    {s.university ? <Chip label={s.university} tone="info" /> : null}
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )
      ) : tab === 'interviews' ? (
        vm.interviews.length === 0 ? <EmptyState title="No interviews yet" body="Check back soon." /> : (
          <View style={styles.list}>
            {vm.interviews.map((iv, i) => (
              <Animated.View key={iv.id} entering={reduce || i > 8 ? undefined : FadeInDown.delay(i * 40).duration(260)}>
                <PressableScale style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text variant="heading" numberOfLines={2}>{iv.title}</Text>
                  {iv.excerpt ? <Text variant="small" tone="muted" numberOfLines={2}>{iv.excerpt}</Text> : null}
                  <View style={styles.meta}>
                    {iv.person ? <Text variant="small" tone="muted">{iv.person}</Text> : null}
                    {iv.country ? <Chip label={iv.country} tone="info" /> : null}
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )
      ) : (
        vm.questions.length === 0 ? <EmptyState title="No questions yet" body="Community Q&A coming soon." /> : (
          <View style={styles.list}>
            {vm.questions.map((q, i) => (
              <Animated.View key={q.id} entering={reduce || i > 8 ? undefined : FadeInDown.delay(i * 40).duration(260)}>
                <PressableScale style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text variant="heading" numberOfLines={2}>{q.question}</Text>
                  {q.answer ? <Text variant="small" tone="muted" numberOfLines={3}>{q.answer}</Text> : null}
                  <View style={styles.meta}>
                    {q.visa_type ? <Chip label={q.visa_type} tone="info" /> : null}
                    {q.country ? <Chip label={q.country} tone="neutral" /> : null}
                  </View>
                </PressableScale>
              </Animated.View>
            ))}
          </View>
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.lg },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  meta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
});
