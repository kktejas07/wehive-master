import { Calendar, Clock, Info, Star } from 'lucide-react-native';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { fonts, palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Card } from '@/core/ui/card';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useIntakes } from '../viewmodel/use-intakes';

export function IntakeCalendarScreen() {
  const { c } = useTheme();
  const vm = useIntakes();

  return (
    <Screen
      refreshing={vm.refreshing}
      onRefresh={vm.refresh}
      header={
        <GradientHero compact>
          <View style={styles.labelRow}>
            <Calendar size={16} color="rgba(255,255,255,0.8)" />
            <Text variant="small" style={{ color: 'rgba(255,255,255,0.8)' }}>University Intakes</Text>
          </View>
          <Text variant="title" style={styles.white}>Intake Calendar</Text>
          <Text style={styles.whiteMuted}>When to apply and when classes start, by country and program.</Text>
        </GradientHero>
      }>

      {vm.loading ? <SkeletonRows count={4} /> : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refresh} />
      ) : (
        <>
          {/* Country selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {vm.countries.map((country) => {
              const active = vm.selectedCountry === country.name;
              return (
                <TouchableOpacity
                  key={country.name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => vm.setSelectedCountry(country.name)}
                  style={[styles.countryTab, { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border }]}>
                  <Text variant="body">{country.flag}</Text>
                  <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{country.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Track selector */}
          {vm.tracks.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {vm.tracks.map((track) => {
                const active = vm.selectedTrack === track;
                return (
                  <TouchableOpacity
                    key={track}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => vm.setSelectedTrack(track)}
                    style={[styles.trackTab, { backgroundColor: active ? c.infoBg : c.surface, borderColor: active ? c.info : c.border }]}>
                    <Text variant="small" style={{ color: active ? c.info : c.text, fontFamily: fonts.semibold }}>{track}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Intake cards */}
          <View style={styles.list}>
            {vm.intakes.map((intake) => (
              <Card key={intake.name}>
                <View style={styles.intakeHeader}>
                  <Text variant="bodyStrong" style={{ flex: 1 }}>{intake.name}</Text>
                  {intake.popular && <Chip label="Popular" tone="success" />}
                </View>
                <View style={styles.intakeMeta}>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color={c.primary} />
                    <Text variant="small" tone="primary">Classes: {intake.months}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color={c.textMuted} />
                    <Text variant="small" tone="muted">Apply: {intake.apply_start} - {intake.apply_end}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          {/* Notes */}
          {vm.notes ? (
            <View style={[styles.noteCard, { backgroundColor: c.infoBg, borderColor: c.info }]}>
              <Info size={16} color={c.info} />
              <Text variant="small" style={{ color: c.info, flex: 1 }}>{vm.notes}</Text>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  countryTab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  trackTab: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  list: { gap: spacing.sm },
  intakeHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  intakeMeta: { gap: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
  },
});
