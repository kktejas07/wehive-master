import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { maxContentWidth, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';

/** Page container: safe areas, centred readable width on web/tablet, optional pull-to-refresh. */
export function Screen({
  children, header, refreshing, onRefresh, padded = true,
}: {
  children: ReactNode;
  header?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxxl }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}
      keyboardShouldPersistTaps="handled">
      {header}
      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
});
