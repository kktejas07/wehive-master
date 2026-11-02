import { ArrowLeft, ArrowRight, CheckCircle, ClipboardCheck, GraduationCap, Globe2, Send, ShieldCheck } from 'lucide-react-native';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { COUNTRIES, type Pathway } from '../model/types';
import { useAssessment } from '../viewmodel/use-assessment';

function ChoiceButton({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.choice, { backgroundColor: on ? palette.iceBlue : c.surface, borderColor: on ? c.primary : c.border }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}>
      <Text variant="bodyStrong" style={{ color: on ? c.primary : c.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AssessmentScreen() {
  const vm = useAssessment();
  const { c } = useTheme();

  /* ── Submitted ──────────────────────────────────────────── */
  if (vm.submitted) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.successCircle, { backgroundColor: c.successBg }]}>
            <CheckCircle size={40} color={c.success} />
          </View>
          <Text variant="title" style={{ textAlign: 'center' }}>Your Eligibility Analysis</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Thanks {vm.name.split(' ')[0]}! A visa consultant will contact you within 24 hours.
          </Text>
          <Button label="Calculate again" variant="outline" onPress={() => { vm.back(); vm.back(); vm.back(); }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Visa Eligibility Assessment</Text>
          <Text style={styles.whiteMuted}>Check your eligibility in under 2 minutes.</Text>
        </GradientHero>
      }>

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text variant="label" tone="muted">Step {vm.step} of 4</Text>
        <Text variant="label" tone="muted">{Math.round((vm.step / 4) * 100)}%</Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: c.border }]}>
        <View style={[styles.progressFill, { width: `${(vm.step / 4) * 100}%`, backgroundColor: c.primary }]} />
      </View>

      {/* Step 1: Choose pathway */}
      {vm.step === 1 && (
        <View style={styles.stepContent}>
          <Text variant="heading">Choose your visa pathway</Text>
          <View style={styles.pathwayGrid}>
            {([
              { id: 'pr' as Pathway, icon: ShieldCheck, title: 'Canada PR (Express Entry)', desc: 'Calculate your CRS score.' },
              { id: 'australia_pr' as Pathway, icon: Globe2, title: 'Australia PR (189/190)', desc: 'Points test for skilled migration.' },
              { id: 'student' as Pathway, icon: GraduationCap, title: 'Student Visa', desc: 'See how your profile fits.' },
            ]).map((p) => {
              const Icon = p.icon;
              const on = vm.pathway === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => vm.selectPathway(p.id)}
                  style={[styles.pathwayCard, { backgroundColor: on ? palette.iceBlue : c.surface, borderColor: on ? c.primary : c.border }]}>
                  <Icon size={28} color={c.primary} />
                  <Text variant="bodyStrong">{p.title}</Text>
                  <Text variant="small" tone="muted">{p.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Step 2: PR demographics */}
      {vm.step === 2 && vm.pathway === 'pr' && (
        <Card>
          <Text variant="heading">Core Demographics</Text>
          <TextField label="Your age" value={vm.prAge} onChangeText={vm.setPrAge} keyboardType="number-pad" />
          <Text variant="label" tone="muted">Highest education</Text>
          <View style={styles.choiceGroup}>
            {[['phd', 'PhD'], ['masters', "Master's"], ['bachelors', "Bachelor's"], ['diploma', 'Diploma']].map(([v, l]) => (
              <ChoiceButton key={v} label={l} on={vm.prEdu === v} onPress={() => vm.setPrEdu(v)} />
            ))}
          </View>
          <View style={styles.navRow}>
            <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={vm.back} />
            <Button label="Continue" icon={ArrowRight} onPress={vm.next} />
          </View>
        </Card>
      )}

      {/* Step 3: PR language & exp */}
      {vm.step === 3 && vm.pathway === 'pr' && (
        <Card>
          <Text variant="heading">Experience & Language</Text>
          <Text variant="label" tone="muted">English proficiency</Text>
          <View style={styles.choiceGroup}>
            {[['clb9', 'CLB 9+'], ['clb8', 'CLB 8'], ['clb7', 'CLB 7'], ['clb6', 'Below CLB 7']].map(([v, l]) => (
              <ChoiceButton key={v} label={l} on={vm.prLanguage === v} onPress={() => vm.setPrLanguage(v)} />
            ))}
          </View>
          <Text variant="label" tone="muted">Work experience</Text>
          <View style={styles.choiceGroup}>
            {[['3plus', '3+ years'], ['2years', '2 years'], ['1year', '1 year'], ['none', 'None']].map(([v, l]) => (
              <ChoiceButton key={v} label={l} on={vm.prExp === v} onPress={() => vm.setPrExp(v)} />
            ))}
          </View>
          <View style={styles.navRow}>
            <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={vm.back} />
            <Button label="Calculate" icon={ArrowRight} onPress={vm.next} />
          </View>
        </Card>
      )}

      {/* Step 2: Student target & background */}
      {vm.step === 2 && vm.pathway === 'student' && (
        <Card>
          <Text variant="heading">Target & Background</Text>
          <Text variant="label" tone="muted">Target destination</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryRow}>
            {COUNTRIES.map((ct) => {
              const on = vm.studentCountry === ct.id;
              return (
                <TouchableOpacity
                  key={ct.id}
                  onPress={() => vm.setStudentCountry(ct.id)}
                  style={[styles.countryBtn, { backgroundColor: on ? palette.iceBlue : c.surface, borderColor: on ? c.primary : c.border }]}>
                  <Text style={{ fontSize: 20 }}>{ct.flag}</Text>
                  <Text variant="small" style={{ color: on ? c.primary : c.text }}>{ct.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text variant="label" tone="muted">Current education</Text>
          <View style={styles.choiceGroup}>
            {[['masters', "Master's"], ['bachelors', "Bachelor's"], ['highschool', 'High School']].map(([v, l]) => (
              <ChoiceButton key={v} label={l} on={vm.studentEdu === v} onPress={() => vm.setStudentEdu(v)} />
            ))}
          </View>
          <View style={styles.navRow}>
            <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={vm.back} />
            <Button label="Continue" icon={ArrowRight} onPress={vm.next} />
          </View>
        </Card>
      )}

      {/* Step 3: Student GPA & budget */}
      {vm.step === 3 && vm.pathway === 'student' && (
        <Card>
          <Text variant="heading">Academic & Budget</Text>
          <TextField label={`GPA / Score: ${vm.studentGpa}%`} value={vm.studentGpa} onChangeText={vm.setStudentGpa} keyboardType="number-pad" />
          <Text variant="label" tone="muted">Yearly tuition budget</Text>
          <View style={styles.choiceGroup}>
            {[['low', 'Under 15L'], ['mid', '15-30 Lakh'], ['high', 'Over 30L']].map(([v, l]) => (
              <ChoiceButton key={v} label={l} on={vm.studentBudget === v} onPress={() => vm.setStudentBudget(v)} />
            ))}
          </View>
          <View style={styles.navRow}>
            <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={vm.back} />
            <Button label="Get match" icon={ArrowRight} onPress={vm.next} />
          </View>
        </Card>
      )}

      {/* Step 2/3 for australia_pr — simplified */}
      {vm.step === 2 && vm.pathway === 'australia_pr' && (
        <Card>
          <Text variant="heading">Australia PR Assessment</Text>
          <Text variant="small" tone="muted">Simplified points assessment. Full details at submission.</Text>
          <View style={styles.navRow}>
            <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={vm.back} />
            <Button label="Continue" icon={ArrowRight} onPress={() => { vm.next(); vm.next(); }} />
          </View>
        </Card>
      )}

      {/* Step 4: Contact lead gen */}
      {vm.step === 4 && (
        <Card>
          <View style={styles.center}>
            <View style={[styles.calcBadge, { backgroundColor: c.successBg }]}>
              <ShieldCheck size={14} color={c.success} />
              <Text variant="small" style={{ color: c.success, fontWeight: '700' }}>Calculation Complete</Text>
            </View>
            <Text variant="heading" style={{ textAlign: 'center' }}>Reveal your assessment</Text>
            <Text variant="small" tone="muted" style={{ textAlign: 'center' }}>
              We will send your detailed analysis and document checklist.
            </Text>
          </View>
          <TextField label="Full name" value={vm.name} onChangeText={vm.setName} autoCapitalize="words" autoComplete="name" />
          <TextField label="Email" value={vm.email} onChangeText={vm.setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <TextField label="Phone" value={vm.phone} onChangeText={vm.setPhone} keyboardType="phone-pad" autoComplete="tel" />
          {vm.submitError ? <Text variant="small" tone="danger">{vm.submitError}</Text> : null}
          <Button label="See My Eligibility Score" icon={Send} onPress={vm.submit} busy={vm.submitting} disabled={!vm.ready} full />
          <View style={styles.navRow}>
            <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={vm.back} />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  successCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: spacing.md },
  progressFill: { height: 4, borderRadius: 2 },
  stepContent: { gap: spacing.md },
  pathwayGrid: { gap: spacing.sm },
  pathwayCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  choiceGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 80 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  countryRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  calcBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
