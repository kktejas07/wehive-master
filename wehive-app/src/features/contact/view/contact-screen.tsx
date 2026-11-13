import { Check, Mail, MessageCircle, Phone, Send } from 'lucide-react-native';
import { Linking, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { useContact } from '../viewmodel/use-contact';

export function ContactScreen() {
  const { c } = useTheme();
  const vm = useContact();

  if (vm.sent) {
    return (
      <Screen>
        <View style={styles.success}>
          <View style={[styles.checkCircle, { backgroundColor: c.successBg }]}>
            <Check size={32} color={c.success} />
          </View>
          <Text variant="title" style={{ textAlign: 'center' }}>Message sent!</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            We will get back to you within 24 hours.
          </Text>
          <Button label="Send another message" variant="outline" onPress={vm.reset} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="hero" tone="onPrimary">Get in touch</Text>
          <Text variant="body" tone="onPrimary" style={{ opacity: 0.82 }}>
            Have a question about your visa? Let us chat about your travel dreams.
          </Text>
        </GradientHero>
      }>

      <TextField label="Full name" value={vm.form.name} onChangeText={(v) => vm.set('name', v)}
        autoCapitalize="words" autoComplete="name" returnKeyType="next" />
      <TextField label="Email" value={vm.form.email} onChangeText={(v) => vm.set('email', v)}
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" returnKeyType="next" />
      <TextField label="Phone (optional)" value={vm.form.phone} onChangeText={(v) => vm.set('phone', v)}
        keyboardType="phone-pad" autoComplete="tel" returnKeyType="next" />

      <View style={styles.section}>
        <Text variant="label" tone="muted">Your message</Text>
        <TextInput
          value={vm.form.message}
          onChangeText={(v) => vm.set('message', v)}
          multiline
          numberOfLines={4}
          placeholder="Tell us how we can help..."
          placeholderTextColor={c.textMuted}
          style={[styles.textarea, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
        />
      </View>

      {vm.error ? <Text variant="small" tone="danger">{vm.error}</Text> : null}

      <Button label="Send message" icon={Send} onPress={vm.submit} busy={vm.busy} disabled={!vm.ready} full />

      {/* Other ways to reach us */}
      <Card>
        <Text variant="heading">Other ways to reach us</Text>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('tel:+919121495077')}>
          <View style={[styles.contactIcon, { backgroundColor: c.surfaceAlt }]}>
            <Phone size={16} color={c.primary} />
          </View>
          <Text variant="body">+91 91214 95077</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://wa.me/919121495077')}>
          <View style={[styles.contactIcon, { backgroundColor: c.surfaceAlt }]}>
            <MessageCircle size={16} color={c.primary} />
          </View>
          <Text variant="body">WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:info@wehive.co.in')}>
          <View style={[styles.contactIcon, { backgroundColor: c.surfaceAlt }]}>
            <Mail size={16} color={c.primary} />
          </View>
          <Text variant="body">info@wehive.co.in</Text>
        </TouchableOpacity>
        <Text variant="small" tone="muted">Mon - Sat, 9:00 AM - 7:00 PM IST</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  textarea: { minHeight: 100, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, fontFamily: fonts.body, fontSize: 15, textAlignVertical: 'top' },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.xxxl },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  contactIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
