import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Compass, GraduationCap, Newspaper, Plane, Search, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';
import { Button } from '@/core/ui/button';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { NewsCard } from '@/features/news/view/news-card';
import { useNews } from '@/features/news/viewmodel/use-news';

const SHORTCUTS: { icon: LucideIcon; title: string; body: string; href: '/destinations' | '/news' | '/account' }[] = [
  { icon: Compass, title: 'Destinations', body: 'Visa rules and decision times for 190+ countries', href: '/destinations' },
  { icon: GraduationCap, title: 'Study abroad', body: 'Apply to partner universities with expert help', href: '/account' },
  { icon: Plane, title: 'Visa applications', body: 'Track every step, documents to decision', href: '/account' },
  { icon: Newspaper, title: 'News', body: 'Rule changes and embassy updates', href: '/news' },
];

export function HomeScreen() {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const news = useNews(3);
  const reduce = useReducedMotion();
  const search = () => router.push({ pathname: '/destinations', params: q.trim() ? { q: q.trim() } : {} });

  return (
    <Screen
      header={
        <GradientHero>
          {Platform.OS !== 'web' ? (
            <View style={styles.logoPill}>
              <Image source={require('@/assets/images/wehive-logo.png')} style={styles.logo} contentFit="contain" accessibilityLabel="WeHive" />
            </View>
          ) : null}
          <Text variant="hero" style={styles.white}>Your Global Journey Starts Here</Text>
          <Text style={styles.whiteMuted}>Visas, study abroad and travel for Indian passport holders, with experts beside you.</Text>
          <View style={[styles.search, { backgroundColor: c.surface }]}>
            <Search size={18} color={c.textMuted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onSubmitEditing={search}
              placeholder="Where are you going?"
              placeholderTextColor={c.textMuted}
              returnKeyType="search"
              accessibilityLabel="Search destinations"
              style={[styles.searchInput, { color: c.text }]}
            />
            <Button label="Search" onPress={search} />
          </View>
        </GradientHero>
      }>
      <View style={styles.grid}>
        {SHORTCUTS.map((s, i) => (
          <Animated.View key={s.title} style={styles.cell} entering={reduce ? undefined : FadeInUp.delay(80 + i * 70).duration(320)}>
            <PressableScale
              onPress={() => router.push(s.href)}
              accessibilityRole="link"
              style={[styles.shortcut, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.iconBubble, { backgroundColor: c.surfaceAlt }]}>
                <AnimatedIcon icon={s.icon} color={c.primary} active />
              </View>
              <Text variant="heading">{s.title}</Text>
              <Text variant="small" tone="muted">{s.body}</Text>
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      {news.items.length ? (
        <View style={styles.section}>
          <Text variant="title">Latest updates</Text>
          {news.items.slice(0, 3).map((n) => <NewsCard key={n.id} item={n} />)}
          <Button label="All news" variant="outline" onPress={() => router.push('/news')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.85)', maxWidth: 560 },
  logoPill: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  logo: { width: 112, height: 36 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, paddingLeft: spacing.lg, padding: spacing.xs, marginTop: spacing.sm },
  searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 16, minHeight: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flexGrow: 1, flexBasis: 220 },
  shortcut: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, minHeight: 150 },
  iconBubble: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  section: { gap: spacing.md, marginTop: spacing.lg },
});
