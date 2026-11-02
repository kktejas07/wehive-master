import { router } from 'expo-router';
import { BookOpen, Calendar, ChevronRight, FileText, GraduationCap } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { PressableScale } from '@/core/ui/pressable-scale';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { COURSE_CATEGORIES, INTAKE_TIMES, REQUIRED_DOCUMENTS, STUDENT_COUNTRIES } from '../model/types';

export function StudentVisaScreen() {
  const { c } = useTheme();

  return (
    <Screen
      header={
        <GradientHero>
          <Text variant="hero" style={styles.white}>Student Visa</Text>
          <Text style={styles.whiteMuted}>
            University search, course finder, intake timelines and document checklists for Indian students.
          </Text>
        </GradientHero>
      }>

      {/* Popular destinations */}
      <View style={styles.section}>
        <Text variant="label" tone="muted">POPULAR DESTINATIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {STUDENT_COUNTRIES.map((country) => (
            <PressableScale
              key={country.id}
              onPress={() => router.push({ pathname: '/destinations/[id]', params: { id: country.code.toLowerCase() } })}
              style={[styles.countryChip, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text variant="bodyStrong">{country.name}</Text>
              <ChevronRight size={14} color={c.textMuted} />
            </PressableScale>
          ))}
        </ScrollView>
      </View>

      {/* Course categories */}
      <View style={styles.section}>
        <Text variant="label" tone="muted">COURSE CATEGORIES</Text>
        <View style={styles.grid}>
          {COURSE_CATEGORIES.map((cat) => (
            <Card key={cat.id} style={styles.catCard}>
              <GraduationCap size={20} color={c.primary} />
              <Text variant="bodyStrong">{cat.label}</Text>
              <Text variant="small" tone="muted">{cat.description}</Text>
            </Card>
          ))}
        </View>
      </View>

      {/* Intake timelines */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={c.primary} />
          <Text variant="heading">Intake Timelines</Text>
        </View>
        {INTAKE_TIMES.map((intake) => (
          <Card key={intake.season}>
            <Text variant="bodyStrong">{intake.season}</Text>
            <View style={styles.intakeMeta}>
              <Text variant="small" tone="primary">Classes: {intake.months}</Text>
              <Text variant="small" tone="muted">Apply by: {intake.applyBy}</Text>
            </View>
            <Text variant="small" tone="muted">{intake.description}</Text>
            <Text variant="small" tone="muted">{intake.countries}</Text>
          </Card>
        ))}
      </View>

      {/* Required documents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileText size={18} color={c.primary} />
          <Text variant="heading">Required Documents</Text>
        </View>
        {REQUIRED_DOCUMENTS.map((doc) => (
          <View key={doc.title} style={[styles.docRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <BookOpen size={18} color={c.primary} />
            <View style={styles.docBody}>
              <Text variant="bodyStrong">{doc.title}</Text>
              <Text variant="small" tone="muted">{doc.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Button
        label="Book a free consultation"
        onPress={() => router.push('/free-consultation')}
        full
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hScroll: { gap: spacing.sm, paddingBottom: spacing.xs },
  countryChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catCard: { width: '47%', flexGrow: 1, minWidth: 140 },
  intakeMeta: { flexDirection: 'row', gap: spacing.lg },
  docRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
  },
  docBody: { flex: 1, gap: spacing.xxs },
});
