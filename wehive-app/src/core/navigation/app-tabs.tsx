import { Tabs } from 'expo-router';

import { TABS } from '@/core/navigation/tabs';
import { fonts } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { AnimatedIcon } from '@/core/ui/animated-icon';

/** iOS / Android: bottom tabs whose icons pop when selected. */
export default function AppTabs() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused, color }) => <AnimatedIcon icon={t.icon} color={String(color)} active={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}
