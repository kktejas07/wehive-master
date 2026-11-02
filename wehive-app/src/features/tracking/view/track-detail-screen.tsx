import { useLocalSearchParams } from 'expo-router';
import { AlertCircle, CheckCircle, Clock, ShieldCheck, XCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { ErrorState, Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { STATUS_META, STATUS_ORDER, type TrackingStatus } from '../model/types';
import { useTracking } from '../viewmodel/use-tracking';

const STATUS_ICON = {
  draft: Clock,
  submitted: Clock,
  in_review: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
} as const;

function statusColor(status: TrackingStatus, c: ReturnType<typeof useTheme>['c']) {
  if (status === 'approved') return c.success;
  if (status === 'rejected') return c.danger;
  if (status === 'in_review') return c.warning;
  return c.primary;
}

export function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { app, loading, error, refetch } = useTracking(id);
  const { c } = useTheme();

  if (loading) return <Screen><Loading label="Loading application..." /></Screen>;
  if (error || !app) return <Screen><ErrorState message={error ?? 'Application not found'} onRetry={() => refetch()} /></Screen>;

  const cfg = STATUS_META[app.status] ?? STATUS_META.draft;
  const Icon = STATUS_ICON[app.status] ?? Clock;
  const color = statusColor(app.status, c);

  return (
    <Screen
      refreshing={false}
      onRefresh={() => refetch()}
      header={
        <GradientHero compact>
          <Text variant="label" style={styles.whiteMuted}>Visa Application Tracker</Text>
          <Text variant="title" style={styles.white}>
            {app.country_name ?? app.country_id?.toUpperCase()} {'·'} {app.visa_type}
          </Text>
          <Text style={styles.whiteMuted}>ID: #{id?.slice(0, 8).toUpperCase()}</Text>
        </GradientHero>
      }>

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
        <Icon size={32} color={color} />
        <Text variant="heading" style={{ color }}>{cfg.label}</Text>
        <Text variant="small" tone="muted">{cfg.desc}</Text>
        {app.estimated_date ? (
          <View style={styles.dateRow}>
            <Clock size={12} color={c.textMuted} />
            <Text variant="small" tone="muted">Est. result by: {app.estimated_date}</Text>
          </View>
        ) : null}
      </View>

      {/* Timeline */}
      <Card>
        <Text variant="label" tone="muted">Application Timeline</Text>
        {STATUS_ORDER.map((key, i) => {
          const entry = app.timeline?.find((t) => t.status === key);
          const order = STATUS_ORDER.indexOf(app.status);
          const stepOrder = STATUS_ORDER.indexOf(key);
          const isDone = stepOrder <= order;
          const isCurrent = key === app.status;
          const StepIcon = STATUS_ICON[key];
          const isLast = i === STATUS_ORDER.length - 1;

          return (
            <View key={key} style={styles.timelineRow}>
              <View style={styles.timelineLine}>
                <View style={[styles.timelineDot, { backgroundColor: isDone ? statusColor(key, c) + '22' : c.surfaceAlt }]}>
                  <StepIcon size={16} color={isDone ? statusColor(key, c) : c.textMuted} />
                </View>
                {!isLast ? <View style={[styles.timelineConnector, { backgroundColor: isDone && stepOrder < order ? c.success : c.border }]} /> : null}
              </View>
              <View style={styles.timelineContent}>
                <Text variant="bodyStrong" style={{ color: isDone ? c.text : c.textMuted }}>{STATUS_META[key].label}</Text>
                {isCurrent ? <Text variant="small" tone="muted">{cfg.desc}</Text> : null}
                {entry?.note ? <Text variant="small" tone="muted" style={[styles.note, { backgroundColor: c.surfaceAlt }]}>{entry.note}</Text> : null}
                {entry?.at ? (
                  <Text variant="small" tone="muted">{new Date(entry.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  statusBadge: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timelineRow: { flexDirection: 'row', gap: spacing.md },
  timelineLine: { alignItems: 'center', width: 36 },
  timelineDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timelineConnector: { width: 2, flex: 1, marginVertical: spacing.xxs },
  timelineContent: { flex: 1, paddingBottom: spacing.lg, gap: spacing.xxs },
  note: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontStyle: 'italic' },
});
