import { FlatList, StyleSheet, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { Screen } from '@/core/ui/screen';
import { ErrorState, Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';

import { usePaymentsViewModel } from '../viewmodel/use-payments';
import { PaymentCard } from './payment-card';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

export function PaymentsScreen() {
  const { payments, totalPaid, loading, error, refetch } = usePaymentsViewModel();

  if (loading) return <Screen><Loading /></Screen>;
  if (error) return <Screen><ErrorState message={error} onRetry={refetch} /></Screen>;

  return (
    <Screen onRefresh={refetch}>
      <View style={styles.summary}>
        <Text variant="small" tone="muted">Total paid</Text>
        <Text variant="title">{inr(totalPaid)}</Text>
      </View>
      <FlatList
        data={payments}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PaymentCard payment={item} />}
        contentContainerStyle={styles.list}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text tone="muted">No payment records yet.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginBottom: spacing.lg, gap: spacing.xs },
  list: { paddingBottom: spacing.xl },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
});
