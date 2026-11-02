import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { spacing } from '@/core/theme/tokens';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { BlogCard } from '@/features/blog/view/blog-card';
import { useBlog } from '@/features/blog/viewmodel/use-blog';

export function BlogScreen() {
  const vm = useBlog();
  const reduce = useReducedMotion();
  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Blog</Text>
          <Text style={styles.whiteMuted}>Study abroad tips, visa guides and student stories.</Text>
        </GradientHero>
      }>
      <TextField
        label="Search"
        placeholder="Search articles"
        value={vm.query}
        onChangeText={vm.setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      {vm.loading ? <SkeletonRows count={4} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : vm.items.length === 0 ? (
        <EmptyState title="No articles yet" body="Check back soon for new posts." />
      ) : (
        <View style={styles.list}>
          {vm.items.map((post, i) => (
            <Animated.View key={post.id} entering={reduce || i > 8 ? undefined : FadeInDown.delay(i * 40).duration(260)}>
              <BlogCard post={post} onPress={() => router.push(`/blog`)} />
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  list: { gap: spacing.lg },
});
