import { Check, Lock, ShieldCheck, Building2, CreditCard } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';

const PLANS = [
  {
    id: 'lite',
    name: 'Lite',
    tag: 'For solo travellers with a simple itinerary.',
    features: ['One visa application', 'Document review by expert', 'Email support', '7-10 day processing'],
  },
  {
    id: 'standard',
    name: 'Standard',
    tag: 'For families or repeat travellers who want speed.',
    highlighted: true,
    features: ['Everything in Lite', 'Priority chat support', 'Appointment & deadline reminders', 'Up to 4 applicants', 'Real-time tracking'],
  },
  {
    id: 'concierge',
    name: 'Concierge',
    tag: 'White-glove service with a dedicated specialist.',
    features: ['Everything in Standard', 'Dedicated visa specialist', 'Same-day rush eligible', 'Up to 8 applicants', '24/7 phone support'],
  },
];

const TRUST = [
  { id: 'ssl', icon: Lock, label: '256-bit SSL', sub: 'Encrypted connection' },
  { id: 'pci', icon: ShieldCheck, label: 'PCI Compliant', sub: 'Secure payments' },
  { id: 'govt', icon: Building2, label: 'Govt. Registered', sub: 'Legal entity' },
  { id: 'rp', icon: CreditCard, label: 'Razorpay', sub: 'Trusted partner' },
];

export function PricingScreen() {
  const { c } = useTheme();

  return (
    <Screen
      header={
        <GradientHero>
          <Text variant="hero" tone="onPrimary">Fair, flat prices.{'\n'}No surprises.</Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.82 }}>
            Government fees are passed through at cost. You only pay us for making the visa effortless.
          </Text>
        </GradientHero>
      }>

      {PLANS.map((plan) => (
        <Card key={plan.id} style={plan.highlighted ? { borderColor: palette.royalBlue, borderWidth: 2 } : undefined}>
          {plan.highlighted && (
            <View style={[styles.badge, { backgroundColor: palette.royalBlue }]}>
              <Text variant="small" style={{ color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Most popular
              </Text>
            </View>
          )}
          <Text variant="heading">{plan.name}</Text>
          <Text variant="small" tone="muted">{plan.tag}</Text>
          <View style={styles.featureList}>
            {plan.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Check size={16} color={c.primary} />
                <Text variant="body" style={{ flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>
        </Card>
      ))}

      <Text variant="small" tone="muted" style={{ textAlign: 'center' }}>
        Prices exclude government and embassy fees, which are charged at cost.
        Visit wehive.co.in/pricing for current prices.
      </Text>

      <Button label="View prices on web" variant="outline" onPress={() => Linking.openURL('https://wehive.co.in/pricing')} />

      {/* Trust badges */}
      <View style={styles.trustGrid}>
        {TRUST.map((t) => {
          const Icon = t.icon;
          return (
            <View key={t.id} style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: c.surfaceAlt }]}>
                <Icon size={18} color={c.primary} />
              </View>
              <View>
                <Text variant="bodyStrong">{t.label}</Text>
                <Text variant="small" tone="muted">{t.sub}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  featureList: { gap: spacing.sm, paddingTop: spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '45%' },
  trustIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
