import { StyleSheet, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { Button } from '@/core/ui/button';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { NewsCard } from '@/features/news/view/news-card';
import { useNews } from '@/features/news/viewmodel/use-news';

export function NewsScreen() {
  const vm = useNews();
  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>{'Visa & travel news'}</Text>
          <Text style={styles.whiteMuted}>From embassies, governments and trusted travel sources, updated through the day.</Text>
        </GradientHero>
      }>
      {vm.loading ? <SkeletonRows count={5} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No news yet" body="New updates appear here as soon as they are published." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((n) => <NewsCard key={n.id} item={n} />)}
          {vm.hasMore ? <Button label="Load more" variant="outline" busy={vm.loadingMore} onPress={vm.loadMore} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  list: { gap: spacing.md },
});
