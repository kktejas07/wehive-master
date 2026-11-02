import { Building2, Calendar, ChevronLeft, ChevronRight, Clock, Plus, Shield } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { EmptyState, ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { EMBASSY_CITIES } from '../model/types';
import { useScheduling } from '../viewmodel/use-scheduling';

export function SchedulingScreen() {
  const vm = useScheduling();
  const { c } = useTheme();

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" tone="onPrimary">Visa Scheduling</Text>
          <Text tone="onPrimary" style={{ opacity: 0.8 }}>Book and manage embassy appointments.</Text>
        </GradientHero>
      }>

      {/* ── My appointments list ── */}
      {vm.phase === 'list' && (
        <>
          {vm.appointmentsLoading ? <SkeletonRows /> : vm.appointments.length === 0 ? (
            <EmptyState title="No appointments" body="Book your first visa appointment below." />
          ) : (
            <View style={styles.list}>
              {vm.appointments.map((a) => (
                <Card key={a._id}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading">{a.country_name}</Text>
                      <Text variant="small" tone="muted">{a.embassy} -- {a.date} at {a.time}</Text>
                    </View>
                    <Chip label={a.status} tone={a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'danger' : 'neutral'} />
                  </View>
                </Card>
              ))}
            </View>
          )}
          <Button label="Book new appointment" icon={Plus} onPress={vm.startBooking} full />
        </>
      )}

      {/* ── Select application ── */}
      {vm.phase === 'select_app' && (
        <Card>
          <BackButton onPress={vm.back} c={c} />
          <Text variant="heading">Select application</Text>
          {vm.appsLoading ? <SkeletonRows count={3} /> : vm.apps.length === 0 ? (
            <EmptyState title="No eligible applications" body="Submit a visa application first." />
          ) : (
            <View style={styles.list}>
              {vm.apps.map((app) => (
                <TouchableOpacity key={app._id} onPress={() => vm.selectApp(app)} style={[styles.appRow, { borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{app.applicant_name ?? app._id.slice(0, 8)}</Text>
                    <Text variant="small" tone="muted">{app.visa_type} -- {app.country_name ?? app.country_id}</Text>
                  </View>
                  <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* ── Select city ── */}
      {vm.phase === 'select_city' && (
        <Card>
          <BackButton onPress={vm.back} c={c} />
          <Text variant="heading">Select embassy location</Text>
          <View style={styles.cityGrid}>
            {EMBASSY_CITIES.map((ct) => (
              <TouchableOpacity key={ct.id} onPress={() => vm.selectCity(ct.name)} style={[styles.cityCard, { borderColor: c.border, backgroundColor: c.surface }]}>
                <Building2 size={20} color={c.primary} />
                <Text variant="bodyStrong">{ct.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* ── Select slot ── */}
      {vm.phase === 'select_slot' && (
        <Card>
          <BackButton onPress={vm.back} c={c} />
          <Text variant="heading">Available slots</Text>
          <Text variant="small" tone="muted">Pick a date and time at {vm.city}.</Text>
          {vm.slotsLoading ? <SkeletonRows count={3} /> : vm.availableSlots.length === 0 ? (
            <EmptyState title="No slots available" body="Try again later or pick a different location." />
          ) : (
            <View style={styles.slotGrid}>
              {vm.availableSlots.map((s) => (
                <TouchableOpacity key={s._id} onPress={() => vm.selectSlot(s._id, s.date, s.time)} style={[styles.slotBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
                  <Calendar size={14} color={c.primary} />
                  <Text variant="small">{s.date}</Text>
                  <Clock size={14} color={c.primary} />
                  <Text variant="bodyStrong">{s.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* ── Confirm ── */}
      {vm.phase === 'confirm' && (
        <Card>
          <BackButton onPress={vm.back} c={c} />
          <Text variant="heading">Confirm appointment</Text>
          <View style={[styles.summaryBox, { backgroundColor: c.surfaceAlt }]}>
            {[
              ['Embassy', `${vm.country.toUpperCase()} Embassy`],
              ['City', vm.city],
              ['Date', vm.date],
              ['Time', vm.time],
            ].map(([label, value]) => (
              <View key={label} style={styles.summaryRow}>
                <Text variant="small" tone="muted">{label}</Text>
                <Text variant="bodyStrong">{value}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.warningBox, { backgroundColor: c.warningBg }]}>
            <Shield size={14} color={c.warning} />
            <Text variant="small" style={{ color: c.warning, flex: 1 }}>Arrive 30 minutes early with all original documents.</Text>
          </View>
          {vm.bookingError ? <Text variant="small" style={{ color: c.danger }}>{vm.bookingError}</Text> : null}
          <Button label="Confirm booking" onPress={vm.book} busy={vm.bookingLoading} full />
        </Card>
      )}
    </Screen>
  );
}

function BackButton({ onPress, c }: { onPress: () => void; c: ReturnType<typeof useTheme>['c'] }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backRow}>
      <ChevronLeft size={16} color={c.primary} />
      <Text variant="bodyStrong" style={{ color: c.primary }}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cityCard: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, minWidth: '45%' as unknown as number, flex: 1 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  summaryBox: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
});
