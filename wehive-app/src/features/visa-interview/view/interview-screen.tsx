import { AlertCircle, CheckCircle, ChevronRight, Clock, Shield, SkipForward, XCircle } from 'lucide-react-native';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { fonts, palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useInterview } from '../viewmodel/use-interview';

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function scoreTone(s: number): 'success' | 'warning' | 'danger' {
  if (s >= 75) return 'success';
  if (s >= 50) return 'warning';
  return 'danger';
}

export function InterviewScreen() {
  const vm = useInterview();
  const { c } = useTheme();

  /* ── Select phase ─────────────────────────────────────────── */
  if (vm.phase === 'select') {
    return (
      <Screen
        header={
          <GradientHero compact>
            <Text variant="title" style={styles.white}>Visa Interview Simulator</Text>
            <Text style={styles.whiteMuted}>Practice mock embassy interviews and get scored.</Text>
          </GradientHero>
        }>
        <Text variant="label" tone="muted">Select visa type</Text>
        <View style={styles.grid}>
          {vm.sets.map((s) => {
            const on = vm.setId === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => vm.setSetId(s.id)}
                style={[styles.setCard, { backgroundColor: on ? palette.iceBlue : c.surface, borderColor: on ? c.primary : c.border }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}>
                <Text style={styles.flag}>{s.flag}</Text>
                <Text variant="bodyStrong">{s.label}</Text>
                <Text variant="small" tone="muted">{s.questions.length} questions</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Card>
          <Text variant="heading">Tips</Text>
          {['Speak clearly and confidently', 'Give specific, detailed answers', 'Show ties to your home country', 'Be honest with the officer', '2 minutes per question'].map((t) => (
            <View key={t} style={styles.tipRow}>
              <CheckCircle size={14} color={c.success} />
              <Text variant="small" tone="muted">{t}</Text>
            </View>
          ))}
        </Card>

        <Button label="Start mock interview" icon={ChevronRight} onPress={vm.start} full />
      </Screen>
    );
  }

  /* ── Interview phase ──────────────────────────────────────── */
  if (vm.phase === 'interview' && vm.current) {
    return (
      <Screen>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text variant="label" tone="muted">Question {vm.qIndex + 1} of {vm.total}</Text>
          <View style={styles.timerRow}>
            <Clock size={14} color={vm.timeLeft < 30 ? c.danger : c.text} />
            <Text variant="bodyStrong" style={{ color: vm.timeLeft < 30 ? c.danger : c.text }}>{formatTime(vm.timeLeft)}</Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: c.border }]}>
          <View style={[styles.progressFill, { width: `${((vm.qIndex + 1) / vm.total) * 100}%`, backgroundColor: c.primary }]} />
        </View>

        {/* Question */}
        <Card>
          <View style={styles.officerRow}>
            <Text style={styles.flag}>{vm.interviewSet.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text variant="label" tone="primary">{vm.interviewSet.label}</Text>
              <Text variant="small" tone="muted">Consular Officer</Text>
            </View>
          </View>
          <Text variant="heading" style={{ marginTop: spacing.md }}>{vm.current.question}</Text>
          {vm.current.tips ? (
            <View style={[styles.tipBanner, { backgroundColor: c.warningBg, borderColor: '#FFC531' }]}>
              <AlertCircle size={14} color={c.warning} />
              <Text variant="small" style={{ color: c.warning, flex: 1 }}>Tip: {vm.current.tips}</Text>
            </View>
          ) : null}
        </Card>

        {/* Answer */}
        <Text variant="label" tone="muted">Your answer</Text>
        <TextInput
          value={vm.answer}
          onChangeText={vm.setAnswer}
          multiline
          placeholder="Type your answer..."
          placeholderTextColor={c.textMuted}
          style={[styles.textarea, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
        />

        <View style={styles.actionRow}>
          <Button label="Skip" variant="ghost" onPress={vm.skip} icon={SkipForward} />
          <Button
            label={vm.qIndex + 1 < vm.total ? 'Next question' : 'See results'}
            onPress={vm.submitAnswer}
            icon={ChevronRight}
          />
        </View>
      </Screen>
    );
  }

  /* ── Scoring phase ────────────────────────────────────────── */
  if (vm.phase === 'scoring') {
    return (
      <Screen>
        <Loading label="Reviewing your answers..." />
      </Screen>
    );
  }

  /* ── Results phase ────────────────────────────────────────── */
  if (vm.phase === 'results' && vm.result) {
    if (vm.result.error) {
      return (
        <Screen>
          <View style={styles.center}>
            <AlertCircle size={40} color={c.warning} />
            <Text variant="heading" style={{ textAlign: 'center' }}>Could not score this interview</Text>
            <Button label="Try again" onPress={vm.start} />
          </View>
        </Screen>
      );
    }

    const total = vm.result.total ?? 0;
    const tone = scoreTone(total);
    const toneColor = { success: c.success, warning: c.warning, danger: c.danger }[tone];

    return (
      <Screen>
        <View style={styles.center}>
          {tone === 'success' ? <CheckCircle size={48} color={c.success} /> : tone === 'warning' ? <AlertCircle size={48} color={c.warning} /> : <XCircle size={48} color={c.danger} />}
          <Text variant="hero" style={{ color: toneColor }}>{total}%</Text>
          <Text variant="heading">{vm.interviewSet.label}</Text>
          <Text variant="small" tone="muted">{vm.result.method === 'ai' ? 'Scored by WeHive AI' : 'Scored with answer rubric'}</Text>
        </View>

        <Card>
          <Text variant="heading">Score Breakdown</Text>
          <View style={styles.criteriaGrid}>
            {(['clarity', 'specificity', 'confidence', 'preparation'] as const).map((k) => (
              <View key={k} style={styles.criteriaItem}>
                <Text variant="title" style={{ color: c.primary }}>{vm.result!.criteria?.[k] ?? 0}</Text>
                <Text variant="label" tone="muted">{k}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text variant="heading">Question Review</Text>
          {vm.answers.map((a, i) => {
            const item = vm.result!.items?.[i];
            const s = item?.score ?? 0;
            return (
              <View key={i} style={[styles.reviewItem, { borderColor: c.border }]}>
                <View style={styles.reviewRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={2}>{a.question}</Text>
                    <Text variant="small" tone="muted" numberOfLines={2}>{a.answer}</Text>
                    {item?.feedback ? <Text variant="small" tone="primary" style={{ marginTop: 4 }}>{item.feedback}</Text> : null}
                  </View>
                  <Text variant="heading" style={{ color: scoreTone(s) === 'success' ? c.success : scoreTone(s) === 'warning' ? c.warning : c.danger }}>{s}%</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <View style={styles.actionRow}>
          <Button label="Practice again" variant="outline" onPress={vm.start} />
          <Button label="Change visa type" variant="ghost" onPress={vm.restart} />
        </View>
      </Screen>
    );
  }

  return <Screen><Loading /></Screen>;
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  setCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs, minWidth: '45%' as unknown as number, flex: 1 },
  flag: { fontSize: 28, lineHeight: 34 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  officerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tipBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  textarea: { minHeight: 120, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, fontFamily: fonts.body, fontSize: 15, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  criteriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  criteriaItem: { alignItems: 'center', minWidth: 70, flex: 1 },
  reviewItem: { borderBottomWidth: 1, paddingVertical: spacing.md },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
});
