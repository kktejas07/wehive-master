import { ArrowLeftRight, Calculator, DollarSign, Globe } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { fonts, palette, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { FOREX_CURRENCIES } from '../model/types';
import { useForex } from '../viewmodel/use-forex';
import { useLoanCalc } from '../viewmodel/use-loan-calc';
import { useProofOfFunds } from '../viewmodel/use-pof';

type Tab = 'loan' | 'forex' | 'pof';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function FinancialScreen() {
  const { c } = useTheme();
  const [tab, setTab] = useState<Tab>('loan');

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>Financial Tools</Text>
          <Text style={styles.whiteMuted}>Loan calculator, currency converter and proof-of-funds estimator.</Text>
        </GradientHero>
      }>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {([
          { key: 'loan' as Tab, label: 'Loan Calc', icon: Calculator },
          { key: 'forex' as Tab, label: 'Forex', icon: Globe },
          { key: 'pof' as Tab, label: 'Proof of Funds', icon: DollarSign },
        ]).map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t.key)}
              style={[styles.tab, { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border }]}>
              <t.icon size={14} color={active ? '#fff' : c.textMuted} />
              <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tab === 'loan' && <LoanTab />}
      {tab === 'forex' && <ForexTab />}
      {tab === 'pof' && <PofTab />}
    </Screen>
  );
}

/* ── Loan Calculator ─────────────────────────────────────────────────────── */

function LoanTab() {
  const { c } = useTheme();
  const vm = useLoanCalc();

  return (
    <>
      <View style={styles.form}>
        <TextField label="Loan amount" placeholder="e.g. 2000000" value={vm.amount} onChangeText={vm.setAmount} keyboardType="numeric" />
        <TextField label="Interest rate (% p.a.)" placeholder="e.g. 9.5" value={vm.rate} onChangeText={vm.setRate} keyboardType="decimal-pad" />
        <TextField label="Tenure (months)" placeholder="e.g. 60" value={vm.tenure} onChangeText={vm.setTenure} keyboardType="number-pad" />
      </View>
      {vm.result && (
        <Card>
          <ResultRow label="Monthly EMI" value={fmt(vm.result.emi)} bold />
          <ResultRow label="Total payment" value={fmt(vm.result.totalPayment)} />
          <ResultRow label="Total interest" value={fmt(vm.result.totalInterest)} />
        </Card>
      )}
    </>
  );
}

/* ── Forex Converter ─────────────────────────────────────────────────────── */

function ForexTab() {
  const { c } = useTheme();
  const vm = useForex();

  return (
    <>
      <TextField label="Amount" value={vm.amount} onChangeText={vm.setAmount} keyboardType="decimal-pad" />

      <View style={styles.currencyRow}>
        <View style={{ flex: 1 }}>
          <Text variant="label" tone="muted">FROM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyChips}>
            {FOREX_CURRENCIES.map((cur) => {
              const active = vm.base === cur;
              return (
                <TouchableOpacity key={cur} onPress={() => vm.setBase(cur)}
                  style={[styles.curChip, { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border }]}>
                  <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{cur}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <TouchableOpacity onPress={vm.swap} style={styles.swapBtn} accessibilityLabel="Swap currencies">
        <ArrowLeftRight size={18} color={c.primary} />
      </TouchableOpacity>

      <View>
        <Text variant="label" tone="muted">TO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyChips}>
          {FOREX_CURRENCIES.map((cur) => {
            const active = vm.target === cur;
            return (
              <TouchableOpacity key={cur} onPress={() => vm.setTarget(cur)}
                style={[styles.curChip, { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border }]}>
                <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{cur}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {vm.rate !== null && !vm.loading && (
        <Card>
          <Text variant="small" tone="muted">Converted amount</Text>
          <Text variant="title" tone="primary">{vm.rate.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {vm.target}</Text>
        </Card>
      )}
      {vm.loading && <Text variant="small" tone="muted">Fetching rate...</Text>}
    </>
  );
}

/* ── Proof of Funds ──────────────────────────────────────────────────────── */

function PofTab() {
  const { c } = useTheme();
  const vm = useProofOfFunds();

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {vm.countries.map((country) => {
          const active = vm.country === country;
          return (
            <TouchableOpacity key={country} onPress={() => vm.setCountry(country)}
              style={[styles.tab, { backgroundColor: active ? palette.royalBlue : c.surface, borderColor: active ? palette.royalBlue : c.border }]}>
              <Text variant="small" style={{ color: active ? '#fff' : c.text, fontFamily: fonts.semibold }}>{country}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {vm.scheme && (
        <Card>
          <Text variant="label" tone="muted">{vm.scheme.name}</Text>
          <View style={styles.pofAmount}>
            <Text variant="title" tone="primary">{vm.scheme.amount.toLocaleString()}</Text>
            <Text variant="body" tone="muted">{vm.scheme.currency}</Text>
          </View>
          <Text variant="small" tone="muted">{vm.scheme.notes}</Text>
        </Card>
      )}
    </>
  );
}

/* ── Shared ───────────────────────────────────────────────────────────────── */

function ResultRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text variant="small" tone="muted">{label}</Text>
      <Text variant={bold ? 'heading' : 'body'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.xs },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  form: { gap: spacing.md },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyRow: { gap: spacing.sm },
  currencyChips: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  curChip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  swapBtn: { alignSelf: 'center', padding: spacing.sm },
  pofAmount: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
});
