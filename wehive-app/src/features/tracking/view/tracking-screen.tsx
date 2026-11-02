import { StyleSheet, View } from 'react-native';

import { useSession } from '@/core/auth/session';
import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Card } from '@/core/ui/card';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { SignInForm } from '@/features/auth/view/sign-in-form';
import { APP_STATUS_META, APP_STATUS_ORDER, type Application, type ApplicationStatus } from '../model/types';
import { useMyApplications } from '../viewmodel/use-my-applications';

function TimelineDot({ done, active, c }: { done: boolean; active: boolean; c: ReturnType<typeof useTheme>['c'] }) {
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: done || active ? c.primary : c.border },
        active && styles.dotActive,
      ]}
    />
  );
}

function StatusTimeline({ status, c }: { status: ApplicationStatus; c: ReturnType<typeof useTheme>['c'] }) {
  const idx = APP_STATUS_ORDER.indexOf(status);
  // rejected has no timeline position -- show just the chip
  if (status === 'rejected') return null;

  return (
    <View style={styles.timeline}>
      {APP_STATUS_ORDER.map((s, i) => (
        <View key={s} style={styles.timelineStep}>
          <TimelineDot done={i < idx} active={i === idx} c={c} />
          {i < APP_STATUS_ORDER.length - 1 && (
            <View style={[styles.timelineLine, { backgroundColor: i < idx ? c.primary : c.border }]} />
          )}
        </View>
      ))}
    </View>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const { c } = useTheme();
  const meta = APP_STATUS_META[app.status];

  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{app.university_name}</Text>
          <Text variant="small" tone="muted">{app.program}</Text>
        </View>
        <Chip label={meta.label} tone={meta.tone} />
      </View>
      <StatusTimeline status={app.status} c={c} />
      <Text variant="small" tone="muted">
        Updated {new Date(app.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
    </Card>
  );
}

export function TrackingScreen() {
  const { user, ready } = useSession();
  const { applications, loading, error, refetch } = useMyApplications();

  if (!ready) return <Screen><SkeletonRows /></Screen>;

  return (
    <Screen
      refreshing={false}
      onRefresh={() => refetch()}
      header={
        <GradientHero compact>
          <Text variant="title" tone="onPrimary">Track applications</Text>
          <Text tone="onPrimary" style={{ opacity: 0.8 }}>
            {user ? 'Your active visa and study applications.' : 'Sign in to see your applications.'}
          </Text>
        </GradientHero>
      }>
      {!user ? (
        <SignInForm />
      ) : loading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState message={error} onRetry={() => refetch()} />
      ) : applications.length === 0 ? (
        <EmptyState title="No applications yet" body="Your visa and university applications will appear here." />
      ) : (
        <View style={styles.list}>
          {applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  timeline: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  timelineStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotActive: { width: 16, height: 16, borderRadius: 8 },
  timelineLine: { flex: 1, height: 2 },
});
