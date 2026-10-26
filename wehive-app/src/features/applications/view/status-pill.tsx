import { StyleSheet, View } from 'react-native';

import { Text } from '@/core/ui/text';

import type { ApplicationStatus } from '../model/types';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; color: string }> = {
  draft:           { label: 'Draft',        bg: '#1e293b', color: '#94a3b8' },
  submitted:       { label: 'Submitted',    bg: '#1e3a5f', color: '#7dd3fc' },
  docs_pending:    { label: 'Docs needed',  bg: '#451a03', color: '#fcd34d' },
  payment_pending: { label: 'Payment due',  bg: '#451a03', color: '#fcd34d' },
  in_review:       { label: 'In review',    bg: '#1e3a5f', color: '#93c5fd' },
  embassy:         { label: 'At embassy',   bg: '#1e1b4b', color: '#a5b4fc' },
  approved:        { label: 'Approved',     bg: '#052e16', color: '#86efac' },
  visa_issued:     { label: 'Visa issued',  bg: '#052e16', color: '#4ade80' },
  rejected:        { label: 'Rejected',     bg: '#450a0a', color: '#fca5a5' },
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text variant="small" style={{ color: cfg.color, fontWeight: '700' }}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
});
