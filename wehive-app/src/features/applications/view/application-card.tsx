import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { Text } from '@/core/ui/text';

import type { ApplicationSummary } from '../model/types';
import { StatusPill } from './status-pill';

export function ApplicationCard({ app }: { app: ApplicationSummary }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/application/${app.id}` as never)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${app.destination} ${app.visa_type} application`}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text variant="bodyStrong">{app.destination || 'Unknown destination'}</Text>
          <Text variant="small" tone="muted">{app.visa_type}</Text>
        </View>
        <StatusPill status={app.status} />
      </View>
      {app.alert ? (
        <Text variant="small" style={styles.alert}>{app.alert}</Text>
      ) : null}
      <Text variant="small" tone="muted" style={styles.date}>
        Updated {new Date(app.updated_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  info: { flex: 1, gap: 2 },
  alert: { color: '#fcd34d' },
  date: { marginTop: 2 },
});
