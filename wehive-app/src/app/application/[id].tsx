import { Check, CheckCircle, XCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { Button } from '@/core/ui/button';
import { Screen } from '@/core/ui/screen';
import { Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { StatusPill } from '@/features/applications/view/status-pill';
import { useApplicationDetailViewModel } from '@/features/applications/viewmodel/use-application-detail';

const POST_APPROVAL_STEPS = [
  'Book your flights (if not already done)',
  'Arrange travel insurance',
  'Notify your employer / university of your departure date',
  'Pack your visa documents for the trip',
  'Check entry requirements for your destination country',
];

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { application, loading, error } = useApplicationDetailViewModel(id ?? '');

  if (loading) return <Screen><Loading /></Screen>;

  if (error || !application) {
    return (
      <Screen>
        <Text variant="body" tone="danger">{error ?? 'Application not found.'}</Text>
      </Screen>
    );
  }

  const isApproved = application.status === 'visa_approved' || application.status === 'visa_issued';
  const isRejected = application.status === 'visa_rejected' || application.status === 'rejected';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="heading">{application.destination}</Text>
          <Text variant="body" tone="muted">{application.visa_type}</Text>
          <StatusPill status={application.status} />
        </View>

        {/* Visa Approved Banner */}
        {isApproved && (
          <>
            <View style={[styles.banner, styles.bannerSuccess]}>
              <CheckCircle size={24} color="#16a34a" />
              <View style={styles.bannerText}>
                <Text variant="bodyStrong" style={{ color: '#15803d' }}>Visa Approved!</Text>
                <Text variant="small" style={{ color: '#166534' }}>
                  {application.visa_valid_from && application.visa_valid_to
                    ? `Valid: ${application.visa_valid_from} – ${application.visa_valid_to}`
                    : 'Congratulations — your visa has been approved.'}
                </Text>
              </View>
            </View>
            <View style={styles.checklistCard}>
              <Text variant="label" tone="muted">Next steps</Text>
              {POST_APPROVAL_STEPS.map((step, i) => (
                <View key={i} style={styles.checklistRow}>
                  <Check size={14} color="#16a34a" />
                  <Text variant="small">{step}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Visa Rejected Banner */}
        {isRejected && (
          <>
            <View style={[styles.banner, styles.bannerDanger]}>
              <XCircle size={24} color="#dc2626" />
              <View style={styles.bannerText}>
                <Text variant="bodyStrong" style={{ color: '#b91c1c' }}>Application Not Approved</Text>
                <Text variant="small" style={{ color: '#991b1b' }}>
                  {application.rejection_reason ?? 'Your application was not approved at this time.'}
                </Text>
              </View>
            </View>
            <Button
              label="Start New Application"
              variant="outline"
              onPress={() => router.push('/(tabs)/apply' as never)}
              full
            />
          </>
        )}

        {application.documents.length > 0 && (
          <View style={styles.section}>
            <Text variant="label" tone="muted">Documents</Text>
            {application.documents.map((doc) => (
              <View key={doc.id} style={styles.docRow}>
                <Text variant="body" style={{ flex: 1 }}>{doc.name}</Text>
                <Text variant="small" tone="muted">{doc.status}</Text>
              </View>
            ))}
          </View>
        )}

        {(application.timeline?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text variant="label" tone="muted">Timeline</Text>
            {application.timeline.map((t, i) => (
              <View key={i} style={styles.timelineRow}>
                <Text variant="bodyStrong">{t.stage}</Text>
                <Text variant="small" tone="muted">
                  {t.date}{t.note ? ` · ${t.note}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.lg },
  header: { gap: 6 },
  section: { gap: spacing.sm },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  bannerSuccess: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  bannerDanger: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  bannerText: { flex: 1, gap: 2 },
  checklistCard: {
    padding: spacing.lg,
    backgroundColor: '#f0fdf4',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#86efac',
    gap: spacing.sm,
  },
  checklistRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  timelineRow: {
    gap: 2,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
});
