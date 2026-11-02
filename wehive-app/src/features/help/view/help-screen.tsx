import { ChevronDown, Phone, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, LayoutAnimation, StyleSheet, TouchableOpacity, View } from 'react-native';

import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';

const FAQS = [
  { id: 'q1', q: 'How long will my visa take?', a: 'It depends on the country and embassy. Each visa page shows the typical time. Apply well before you travel.' },
  { id: 'q2', q: 'Which documents do I need?', a: 'Typically a passport scan, recent photo and bank statements from the last 3 months. Our portal lists exact requirements once you pick a country.' },
  { id: 'q3', q: 'Is my data safe?', a: 'Yes. All uploads are encrypted, stored in a SOC 2 vault and permanently erased 30 days after your visa is approved.' },
  { id: 'q4', q: 'Can I apply for my whole family?', a: 'Absolutely. Add up to eight applicants per case. Documents, payments and tracking stay in one place.' },
  { id: 'q5', q: 'Do you offer rush processing?', a: 'For 22 destinations we offer Same-Day and 48-Hour rush. Availability shows at checkout based on your travel date.' },
  { id: 'q6', q: 'What if my visa is rejected?', a: 'In the rare case of refusal not caused by misrepresentation, we refund 100% of the service fee and rebook a new appointment for free.' },
];

function FaqItem({ item, open, onToggle }: { item: typeof FAQS[number]; open: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={[styles.faq, { borderBottomColor: c.border }]}>
      <View style={styles.faqHeader}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>{item.q}</Text>
        <ChevronDown
          size={18}
          color={c.textMuted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </View>
      {open && <Text variant="body" tone="muted">{item.a}</Text>}
    </TouchableOpacity>
  );
}

export function HelpScreen() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="hero" tone="onPrimary">How can we help?</Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.82 }}>
            Answers to the questions we hear most.
          </Text>
        </GradientHero>
      }>

      <Card style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
        {FAQS.map((faq) => (
          <FaqItem key={faq.id} item={faq} open={openId === faq.id} onToggle={() => toggle(faq.id)} />
        ))}
      </Card>

      {/* Support card */}
      <Card>
        <Text variant="heading">Still need help?</Text>
        <Text variant="body" tone="muted">
          Chat with us on WhatsApp or call a counsellor directly.
        </Text>
        <View style={styles.supportRow}>
          <Button
            label="WhatsApp"
            icon={MessageCircle}
            variant="accent"
            onPress={() => Linking.openURL('https://wa.me/919121495077')}
          />
          <Button
            label="Call us"
            icon={Phone}
            variant="outline"
            onPress={() => Linking.openURL('tel:+919121495077')}
          />
        </View>
        <Text variant="small" tone="muted">Mon - Sat, 9:00 AM - 7:00 PM IST</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  faq: { borderBottomWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supportRow: { flexDirection: 'row', gap: spacing.sm },
});
