import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { Text } from '@/core/ui/text';

import type { Payment, PaymentStatus } from '../model/types';

const STATUS_COLOR: Record<PaymentStatus, string> = {
  pending:    '#fcd34d',
  processing: '#93c5fd',
  paid:       '#86efac',
  failed:     '#fca5a5',
  refunded:   '#c4b5fd',
};

const inr = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 });

export function PaymentCard({ payment }: { payment: Payment }) {
  const color = STATUS_COLOR[payment.status];
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text variant="bodyStrong" style={styles.desc}>{payment.description}</Text>
        <Text variant="bodyStrong" style={{ color }}>{inr(payment.amount_inr)}</Text>
      </View>
      <View style={styles.row}>
        <Text variant="small" tone="muted">
          {new Date(payment.created_at).toLocaleDateString()}
        </Text>
        <View style={[styles.pill, { backgroundColor: color + '22' }]}>
          <Text variant="small" style={{ color, fontWeight: '700' }}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Text>
        </View>
      </View>
    </View>
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
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  desc: { flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
});
