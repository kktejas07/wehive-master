import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { EmptyState, Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';

import type { ApplicationStatus } from '../model/types';
import { useApplicationsViewModel } from '../viewmodel/use-applications';
import { ApplicationCard } from './application-card';

const FILTERS: { label: string; value: ApplicationStatus | undefined }[] = [
  { label: 'All',           value: undefined },
  { label: 'Action needed', value: 'docs_pending' },
  { label: 'In review',     value: 'in_review' },
  { label: 'Approved',      value: 'approved' },
];

export function ApplicationsScreen() {
  const {
    applications, loading, error, refetch, refreshing,
    statusFilter, setStatusFilter, urgentCount,
  } = useApplicationsViewModel();

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" tone="onPrimary">
            {urgentCount > 0 ? `Applications · ${urgentCount} need action` : 'My Applications'}
          </Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.8 }}>
            Track your visa and study applications.
          </Text>
        </GradientHero>
      }
    >
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value)}
            onPress={() => setStatusFilter(f.value)}
            style={[styles.chip, statusFilter === f.value && styles.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: statusFilter === f.value }}
          >
            <Text
              variant="small"
              style={{ color: statusFilter === f.value ? '#fff' : '#94a3b8', fontWeight: '600' }}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <Loading />}
      {error ? <Text variant="small" tone="danger">{error}</Text> : null}

      {!loading && !error && applications.length === 0 && (
        <EmptyState
          title="No applications yet"
          body="Start a new enquiry from the Apply tab."
        />
      )}

      {applications.length > 0 && (
        <FlatList
          data={applications}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ApplicationCard app={item} />}
          onRefresh={refetch}
          refreshing={refreshing}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  chipActive: { backgroundColor: '#011CB5', borderColor: '#011CB5' },
  list: { paddingBottom: spacing.xl },
});
