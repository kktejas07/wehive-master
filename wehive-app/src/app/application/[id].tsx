import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { Screen } from '@/core/ui/screen';
import { Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { StatusPill } from '@/features/applications/view/status-pill';
import { useApplicationDetailViewModel } from '@/features/applications/viewmodel/use-application-detail';

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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="heading">{application.destination}</Text>
          <Text variant="body" tone="muted">{application.visa_type}</Text>
          <StatusPill status={application.status} />
        </View>

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
