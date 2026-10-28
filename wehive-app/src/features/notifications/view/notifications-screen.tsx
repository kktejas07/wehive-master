import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { spacing } from '@/core/theme/tokens';
import { Screen } from '@/core/ui/screen';
import { Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useNotificationsViewModel } from '../viewmodel/use-notifications';
import type { AppNotification } from '../model/types';

const KIND_DOT: Record<string, string> = {
  status_update: '#93c5fd',
  document_request: '#fcd34d',
  payment_due: '#fca5a5',
  message: '#86efac',
  appointment: '#c4b5fd',
  general: '#94a3b8',
};

function NotifRow({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  return (
    <TouchableOpacity
      onPress={() => { onRead(); if (n.link) router.push(n.link as never); }}
      style={[styles.row, !n.read && styles.rowUnread]}
      accessibilityRole="button"
      accessibilityLabel={n.title}
    >
      <View style={[styles.dot, { backgroundColor: KIND_DOT[n.kind] ?? '#94a3b8' }]} />
      <View style={styles.content}>
        <Text variant="bodyStrong" style={!n.read ? { color: '#f8fafc' } : undefined}>{n.title}</Text>
        <Text variant="small" tone="muted">{n.body}</Text>
        <Text variant="small" tone="muted">{new Date(n.created_at).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const { notifications, loading, unreadCount, markRead, markAllRead, refetch } =
    useNotificationsViewModel();

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">
          {unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllRead()} accessibilityRole="button">
            <Text variant="small" style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading && <Loading />}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotifRow n={item} onRead={() => markRead(item.id)} />
        )}
        onRefresh={refetch}
        refreshing={loading}
        ListEmptyComponent={
          !loading ? <Text variant="body" tone="muted" style={styles.empty}>No notifications.</Text> : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  markAll: { color: '#93c5fd' },
  row: { flexDirection: 'row', gap: spacing.sm + 4, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowUnread: { backgroundColor: 'rgba(1,28,181,0.08)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  content: { flex: 1, gap: 2 },
  empty: { paddingTop: spacing.xl },
});
