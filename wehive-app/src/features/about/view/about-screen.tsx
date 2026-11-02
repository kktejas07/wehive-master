import { Globe, Heart, Compass, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';

const STATS = [
  { id: 'universities', value: '200+', label: 'Partner universities' },
  { id: 'offices', value: '5', label: 'Offices in India & US' },
  { id: 'countries', value: '190+', label: 'Countries covered' },
];

const VALUES = [
  { id: 'v1', icon: ShieldCheck, title: 'Honesty over hype', body: 'If a visa takes 14 days, we say 14 days. No false promises.' },
  { id: 'v2', icon: Globe, title: 'Built for the world', body: '18 cities, 11 languages, embassy network spanning 150+ countries.' },
  { id: 'v3', icon: Heart, title: 'Travel changes lives', body: '1% of every visa goes to organizations funding refugee documentation.' },
  { id: 'v4', icon: Compass, title: 'Designed end-to-end', body: 'Every screen, email and SMS is crafted in-house. No copy-pasted templates.' },
];

const CONTACTS = [
  { id: 'phone', icon: Phone, label: '+91 91214 95077', action: () => Linking.openURL('tel:+919121495077') },
  { id: 'email', icon: Mail, label: 'info@wehive.co.in', action: () => Linking.openURL('mailto:info@wehive.co.in') },
  { id: 'hyd', icon: MapPin, label: 'Mathrusree Nagar, Miyapur, Hyderabad 500049' },
  { id: 'blr', icon: MapPin, label: 'Shanti Plaza, Moka Road, Ballari 583103' },
  { id: 'usa', icon: MapPin, label: '339 Princeton-Hightstown Rd, East Windsor, NJ 08512' },
];

export function AboutScreen() {
  const { c } = useTheme();

  return (
    <Screen
      header={
        <GradientHero>
          <Text variant="hero" tone="onPrimary">
            A visa should never stand between you and a memory.
          </Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.82 }}>
            We Hive Immigration Services was founded with a simple promise — bridging dreams
            and connecting continents. From Hyderabad to 5 offices, with transparent fees and
            honest timelines.
          </Text>
        </GradientHero>
      }>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((s) => (
          <View key={s.id} style={[styles.stat, { borderLeftColor: palette.iceBlue }]}>
            <Text variant="title" tone="primary">{s.value}</Text>
            <Text variant="small" tone="muted">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Values */}
      <Text variant="label" tone="muted">What we stand for</Text>
      {VALUES.map((v) => {
        const Icon = v.icon;
        return (
          <Card key={v.id}>
            <View style={[styles.iconTile, { backgroundColor: c.surfaceAlt }]}>
              <Icon size={18} color={c.primary} />
            </View>
            <Text variant="heading">{v.title}</Text>
            <Text variant="body" tone="muted">{v.body}</Text>
          </Card>
        );
      })}

      {/* Contact info */}
      <Card>
        <Text variant="label" tone="muted">Visit us</Text>
        <Text variant="heading">Fly with WeHive</Text>
        <Text variant="small" tone="muted">
          Drop by one of our offices or reach a counsellor by phone or email.
        </Text>
        {CONTACTS.map((item) => {
          const Icon = item.icon;
          return (
            <PressableScale
              key={item.id}
              onPress={item.action}
              disabled={!item.action}
              style={styles.contactRow}>
              <View style={[styles.contactIcon, { backgroundColor: c.surfaceAlt }]}>
                <Icon size={16} color={c.primary} />
              </View>
              <Text variant="body" style={{ flex: 1 }}>{item.label}</Text>
            </PressableScale>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, borderLeftWidth: 2, paddingLeft: spacing.sm, gap: spacing.xxs },
  iconTile: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contactIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
