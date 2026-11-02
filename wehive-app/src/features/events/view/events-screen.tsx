import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { spacing } from '@/core/theme/tokens';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { EventCard } from '@/features/events/view/event-card';
import { useEvents } from '@/features/events/viewmodel/use-events';

export function EventsScreen() {
  const vm = useEvents();
  const reduce = useReducedMotion();
  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Global Events</Text>
          <Text style={styles.whiteMuted}>Education fairs, webinars and study-abroad expos worldwide.</Text>
        </GradientHero>
      }>
      <TextField
        label="Search"
        placeholder="Search events"
        value={vm.query}
        onChangeText={vm.setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      {vm.loading ? <SkeletonRows count={4} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No events found" body="Check back for upcoming events." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((event, i) => (
            <Animated.View key={event.id} entering={reduce || i > 8 ? undefined : FadeInDown.delay(i * 40).duration(260)}>
              <EventCard event={event} />
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
  list: { gap: spacing.lg },
});
