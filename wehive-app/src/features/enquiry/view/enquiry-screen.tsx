import { Check, Send } from 'lucide-react-native';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { fonts, palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { PURPOSES, type EnquiryPurpose } from '../model/types';
import { useEnquiry } from '../viewmodel/use-enquiry';

export function EnquiryScreen() {
  const { c } = useTheme();
  const { form, set, busy, sent, error, ready, showPromo, promoText, submit, reset } = useEnquiry();

  if (sent) {
    return (
      <Screen>
        <View style={styles.success}>
          <View style={[styles.check, { backgroundColor: c.successBg }]}>
            <Check size={32} color={c.success} />
          </View>
          <Text variant="title" style={{ textAlign: 'center' }}>Got it, {sent}!</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Our team will reach out within one business day.
          </Text>
          <Button label="Submit another enquiry" variant="outline" onPress={reset} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="hero" tone="onPrimary">Start your journey</Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.8 }}>
            Tell us what you need — visas, study abroad or immigration. We'll take it from there.
          </Text>
        </GradientHero>
      }>

      {/* Purpose chips */}
      <View style={styles.section}>
        <Text variant="label" tone="muted">What do you need help with?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {PURPOSES.map((p) => {
            const active = form.purpose === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => set('purpose', p.id as EnquiryPurpose)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border },
                ]}>
                <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{p.label}</Text>
                <Text variant="small" style={{ color: active ? 'rgba(255,255,255,0.7)' : c.textMuted }}>{p.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Promo banner */}
      {showPromo && (
        <View style={[styles.promo, { backgroundColor: '#FFF2D9', borderColor: '#FFC531' }]}>
          <Text variant="small" style={{ color: '#8A5200', fontFamily: fonts.semibold }}>{promoText}</Text>
        </View>
      )}

      {/* Contact fields */}
      <TextField label="Full name" value={form.name} onChangeText={(v) => set('name', v)}
        autoCapitalize="words" autoComplete="name" returnKeyType="next" />
      <TextField label="Email" value={form.email} onChangeText={(v) => set('email', v)}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next" />
      <TextField label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)}
        keyboardType="phone-pad" autoComplete="tel" returnKeyType="next" />
      <TextField label="Destination country / city" value={form.destination} onChangeText={(v) => set('destination', v)}
        autoCapitalize="words" returnKeyType="next" />

      {/* Travellers */}
      <View style={styles.section}>
        <Text variant="label" tone="muted">Number of travellers</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            accessibilityLabel="Decrease travellers"
            onPress={() => set('travellers', Math.max(1, form.travellers - 1))}
            style={[styles.stepBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text variant="bodyStrong" tone="primary">−</Text>
          </TouchableOpacity>
          <Text variant="bodyStrong" style={{ minWidth: 32, textAlign: 'center' }}>{form.travellers}</Text>
          <TouchableOpacity
            accessibilityLabel="Increase travellers"
            onPress={() => set('travellers', Math.min(50, form.travellers + 1))}
            style={[styles.stepBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text variant="bodyStrong" tone="primary">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextField label="Preferred travel date (optional)" value={form.travel_date}
        onChangeText={(v) => set('travel_date', v)}
        placeholder="e.g. March 2025" autoCapitalize="words" />

      {/* Message */}
      <View style={styles.section}>
        <Text variant="label" tone="muted">Anything else? (optional)</Text>
        <TextInput
          value={form.message}
          onChangeText={(v) => set('message', v)}
          multiline
          numberOfLines={4}
          placeholder="Your question, current visa status, specific concerns…"
          placeholderTextColor={c.textMuted}
          style={[styles.textarea, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
        />
      </View>

      {error ? <Text variant="small" tone="danger">{error}</Text> : null}

      <Button label="Send enquiry" icon={Send} onPress={submit} busy={busy} disabled={!ready} full />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  chip: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2, minWidth: 90 },
  promo: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: { width: 40, height: 40, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  textarea: { minHeight: 100, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, fontFamily: fonts.body, fontSize: 15, textAlignVertical: 'top' },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.xxxl },
  check: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
