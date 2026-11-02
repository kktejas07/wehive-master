import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Chip } from '@/core/ui/chip';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Text } from '@/core/ui/text';
import type { EventRow } from '@/features/events/viewmodel/use-events';

export function EventCard({ event }: { event: EventRow }) {
  const { c } = useTheme();
  return (
    <PressableScale style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      {event.image ? (
        <Image source={{ uri: event.image }} style={styles.cover} contentFit="cover" />
      ) : null}
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={2}>{event.title}</Text>
        {event.description ? <Text variant="small" tone="muted" numberOfLines={2}>{event.description}</Text> : null}
        <View style={styles.meta}>
          {event.date ? <Text variant="small" tone="muted">{new Date(event.date).toLocaleDateString()}</Text> : null}
          {event.location ? <Text variant="small" tone="muted">{event.location}</Text> : null}
        </View>
        {event.category ? <Chip label={event.category} tone="info" /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  cover: { width: '100%', height: 140 },
  body: { padding: spacing.lg, gap: spacing.xs },
  meta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
