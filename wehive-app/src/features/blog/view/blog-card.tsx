import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Chip } from '@/core/ui/chip';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Text } from '@/core/ui/text';
import type { BlogRow } from '@/features/blog/viewmodel/use-blog';

export function BlogCard({ post, onPress }: { post: BlogRow; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      {post.cover ? (
        <Image source={{ uri: post.cover }} style={styles.cover} contentFit="cover" />
      ) : (
        <View style={[styles.cover, { backgroundColor: c.surfaceAlt }]} />
      )}
      <View style={styles.body}>
        <Text variant="heading" numberOfLines={2}>{post.title}</Text>
        {post.excerpt ? <Text variant="small" tone="muted" numberOfLines={2}>{post.excerpt}</Text> : null}
        <View style={styles.meta}>
          <Text variant="small" tone="muted">{post.author}</Text>
          {post.date ? <Text variant="small" tone="muted">·  {new Date(post.date).toLocaleDateString()}</Text> : null}
        </View>
        {post.tags.length > 0 && (
          <View style={styles.tags}>
            {post.tags.slice(0, 3).map((t) => <Chip key={t} label={t} tone="info" />)}
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  cover: { width: '100%', height: 160 },
  body: { padding: spacing.lg, gap: spacing.xs },
  meta: { flexDirection: 'row', gap: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
