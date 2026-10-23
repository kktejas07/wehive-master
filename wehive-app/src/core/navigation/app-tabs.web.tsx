import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type PressableProps } from 'react-native';

import { useHydrated } from '@/core/hooks/use-hydrated';
import { TABS } from '@/core/navigation/tabs';
import { maxContentWidth, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';
import { Text } from '@/core/ui/text';

/** Web: a top navbar (the same sections as the mobile tabs) above the page. */
export default function AppTabs() {
  const { c } = useTheme();
  const width = useWindowDimensions().width;
  // Static HTML is rendered without a window: show full labels first, adapt after hydration.
  const hydrated = useHydrated();
  const compact = hydrated && width < 560;
  return (
    <Tabs>
      <TabList asChild>
        <View style={StyleSheet.flatten([styles.bar, { backgroundColor: c.surface, borderBottomColor: c.border }])}>
          <View style={styles.inner}>
            <Link href="/" accessibilityLabel="WeHive home" style={styles.brand}>
              <View style={StyleSheet.flatten([styles.logoBox, { backgroundColor: '#FFFFFF' }])}>
                <Image source={require('@/assets/images/wehive-logo.png')} style={styles.logo} contentFit="contain" />
              </View>
            </Link>
            <View style={styles.links}>
              {TABS.map((t) => (
                <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
                  <NavButton icon={t.icon} label={t.title} compact={compact} />
                </TabTrigger>
              ))}
            </View>
          </View>
        </View>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

type NavProps = TabTriggerSlotProps & { icon: (typeof TABS)[number]['icon']; label: string; compact: boolean };

function NavButton({ icon, label, compact, isFocused, ...rest }: NavProps) {
  const { c } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...(rest as PressableProps)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={StyleSheet.flatten([styles.nav, { backgroundColor: isFocused ? c.surfaceAlt : hovered ? c.background : 'transparent' }])}>
      <AnimatedIcon icon={icon} size={18} color={isFocused ? c.primary : c.textMuted} active={!!isFocused} />
      {compact ? null : (
        <Text variant="small" style={{ color: isFocused ? c.primary : c.text, fontFamily: 'Figtree_600SemiBold' }}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1 },
  inner: {
    width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md,
  },
  brand: { paddingVertical: spacing.xs },
  logoBox: { borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  logo: { width: 104, height: 32 },
  links: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
});
