import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BookOpen, DollarSign, ExternalLink, GraduationCap, MapPin, Trophy, Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { Chip } from '@/core/ui/chip';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { ErrorState, Loading } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { useUniversityDetail } from '@/features/universities/viewmodel/use-university-detail';

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat}>
      <Icon size={18} color={c.primary} />
      <Text variant="small" tone="muted">{label}</Text>
      <Text variant="heading">{value}</Text>
    </View>
  );
}

export function UniversityDetailScreen({ id }: { id: string }) {
  const { view: v, loading, error, refresh } = useUniversityDetail(id);
  const { c } = useTheme();
  if (loading) return <Screen><Loading /></Screen>;
  if (error || !v) return <Screen><ErrorState message={error ?? 'University not found.'} onRetry={refresh} /></Screen>;

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text style={styles.flag}>{v.flag}</Text>
          <Text variant="title" style={styles.white}>{v.name}</Text>
          {v.city ? <Text style={styles.whiteMuted}><MapPin size={14} color="rgba(255,255,255,0.82)" /> {v.city}, {v.country}</Text> : (
            <Text style={styles.whiteMuted}>{v.country}</Text>
          )}
        </GradientHero>
      }>
      <View style={styles.stats}>
        {v.rank ? <Stat icon={Trophy} label="QS Rank" value={`#${v.rank}`} /> : null}
        {v.tuition ? <Stat icon={DollarSign} label="Tuition" value={v.tuition} /> : null}
        {v.students ? <Stat icon={Users} label="Students" value={v.students} /> : null}
        {v.acceptance ? <Stat icon={GraduationCap} label="Acceptance" value={v.acceptance} /> : null}
        {v.salary ? <Stat icon={DollarSign} label="Avg Salary" value={v.salary} /> : null}
      </View>

      <Card>
        <Text variant="heading">Requirements</Text>
        <View style={styles.reqRow}>
          {v.ielts ? <Chip label={`IELTS ${v.ielts}`} tone="info" /> : null}
          {v.toefl ? <Chip label={`TOEFL ${v.toefl}`} tone="info" /> : null}
          {v.gre !== null ? <Chip label={v.gre ? 'GRE required' : 'No GRE'} tone={v.gre ? 'warning' : 'success'} /> : null}
          {v.gmat !== null ? <Chip label={v.gmat ? 'GMAT required' : 'No GMAT'} tone={v.gmat ? 'warning' : 'success'} /> : null}
          {v.scholarships ? <Chip label="Scholarships" tone="success" /> : null}
        </View>
      </Card>

      {v.intakes.length > 0 ? (
        <Card>
          <Text variant="heading">Intakes</Text>
          <View style={styles.reqRow}>
            {v.intakes.map((intake) => <Chip key={intake} label={intake} />)}
          </View>
        </Card>
      ) : null}

      {v.courses.length > 0 ? (
        <Card>
          <View style={styles.cardHead}>
            <BookOpen size={18} color={c.primary} />
            <Text variant="heading">Courses ({v.courses.length})</Text>
          </View>
          {v.courses.map((course) => (
            <Text key={course} variant="small">• {course}</Text>
          ))}
        </Card>
      ) : null}

      {v.website ? (
        <Button
          variant="ghost"
          icon={ExternalLink}
          label="Visit website"
          onPress={() => WebBrowser.openBrowserAsync(v.website!)}
        />
      ) : null}

      <Button label="Apply through WeHive" variant="accent" full onPress={() => router.push('/apply')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flag: { fontSize: 44, lineHeight: 52 },
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.85)' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { alignItems: 'center', gap: spacing.xs, minWidth: 80 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
