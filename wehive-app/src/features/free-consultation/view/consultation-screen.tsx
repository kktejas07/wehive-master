import { Check, MapPin, MessageCircle, Send } from 'lucide-react-native';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { fonts, palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { BRANCHES, PURPOSES } from '../model/types';
import { useConsultation } from '../viewmodel/use-consultation';

export function ConsultationScreen() {
  const { c } = useTheme();
  const vm = useConsultation();

  if (vm.sent) {
    return (
      <Screen>
        <View style={styles.success}>
          <View style={[styles.checkCircle, { backgroundColor: c.successBg }]}>
            <Check size={32} color={c.success} />
          </View>
          <Text variant="title" style={{ textAlign: 'center' }}>Thanks, {vm.sent}!</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Our visa consultant will reach out within one business day.
          </Text>
          <Button label="Submit another request" variant="outline" onPress={vm.reset} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <GradientHero compact>
          <View style={styles.labelRow}>
            <MessageCircle size={14} color="rgba(255,255,255,0.8)" />
            <Text variant="small" style={{ color: 'rgba(255,255,255,0.8)' }}>Free Consultation</Text>
          </View>
          <Text variant="title" style={styles.white}>Talk to a visa consultant, free</Text>
          <Text style={styles.whiteMuted}>
            No sign-in needed. Tell us where you're going and we'll get back within one working day.
          </Text>
        </GradientHero>
      }>

      {/* Purpose selector */}
      <View style={styles.section}>
        <Text variant="label" tone="muted">WHAT DO YOU NEED HELP WITH?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {PURPOSES.map((p) => {
            const active = vm.form.purpose === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => vm.set('purpose', p.id)}
                style={[styles.chip, { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border }]}>
                <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contact fields */}
      <TextField label="Full name" value={vm.form.name} onChangeText={(v) => vm.set('name', v)}
        autoCapitalize="words" autoComplete="name" returnKeyType="next" />
      <TextField label="Email" value={vm.form.email} onChangeText={(v) => vm.set('email', v)}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next" />
      <TextField label="Phone" value={vm.form.phone} onChangeText={(v) => vm.set('phone', v)}
        keyboardType="phone-pad" autoComplete="tel" returnKeyType="next" />
      <TextField label="Destination country" value={vm.form.destination} onChangeText={(v) => vm.set('destination', v)}
        autoCapitalize="words" returnKeyType="next" />
      <TextField label="Anything else? (optional)" value={vm.form.message} onChangeText={(v) => vm.set('message', v)}
        placeholder="Your question or concerns..." multiline />

      {vm.error ? <Text variant="small" tone="danger">{vm.error}</Text> : null}

      <Button label="Send request" icon={Send} onPress={vm.submit} busy={vm.busy} disabled={!vm.ready} full />

      {/* Branches */}
      <View style={styles.section}>
        <Text variant="heading">Visit us in person</Text>
        {BRANCHES.map((b) => (
          <View key={b.id} style={[styles.branchCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.branchHeader}>
              <MapPin size={16} color={c.primary} />
              <Text variant="bodyStrong">{b.city}</Text>
              {b.isNew && !b.address && (
                <View style={[styles.tag, { backgroundColor: c.warningBg }]}>
                  <Text variant="small" style={{ color: c.warning, fontFamily: fonts.semibold }}>Coming soon</Text>
                </View>
              )}
            </View>
            {b.address ? (
              <Text variant="small" tone="muted">{b.address}</Text>
            ) : (
              <Text variant="small" tone="muted">Opening soon. Book a free consultation online in the meantime.</Text>
            )}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  branchCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  branchHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.xxxl },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
