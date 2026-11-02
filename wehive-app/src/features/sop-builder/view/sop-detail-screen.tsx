import { useLocalSearchParams } from 'expo-router';
import { ClipboardCopy, FileText, Sparkles } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Button } from '@/core/ui/button';
import { Card } from '@/core/ui/card';
import { GradientHero } from '@/core/ui/gradient-hero';
import { Screen } from '@/core/ui/screen';
import { ErrorState, SkeletonRows } from '@/core/ui/states';
import { Text } from '@/core/ui/text';
import { TextField } from '@/core/ui/text-field';
import { useSopDetail, useSopPersonalise } from '../viewmodel/use-sop-templates';

export function SopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { template, loading, error } = useSopDetail(id);
  const gen = useSopPersonalise();
  const { c } = useTheme();

  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState('');
  const [background, setBackground] = useState('');
  const [goals, setGoals] = useState('');

  const handleGenerate = useCallback(() => {
    if (!template) return;
    gen.generate({
      template_id: template.id,
      applicant_name: name,
      university_name: university,
      program,
      background,
      goals,
    });
  }, [template, name, university, program, background, goals, gen]);

  const handleCopy = useCallback(async () => {
    if (!gen.result?.content) return;
    const { setStringAsync } = await import('expo-clipboard');
    await setStringAsync(gen.result.content);
  }, [gen.result]);

  if (loading) return <Screen><SkeletonRows count={6} /></Screen>;
  if (error || !template) return <Screen><ErrorState message={error ?? 'Template not found'} /></Screen>;

  return (
    <Screen
      header={
        <GradientHero compact>
          <Text variant="title" style={styles.white}>{template.title}</Text>
          <Text style={styles.whiteMuted}>{template.country_name} &middot; {template.program_type} &middot; ~{template.word_count} words</Text>
        </GradientHero>
      }>

      <Card>
        <Text variant="heading">Structure</Text>
        {template.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text variant="heading" style={{ fontSize: 14 }}>{s.heading}</Text>
            <Text variant="small" tone="muted">{s.hint} (~{s.target_words} words)</Text>
          </View>
        ))}
      </Card>

      {template.tips.length > 0 ? (
        <Card>
          <Text variant="heading">Tips</Text>
          {template.tips.map((tip, i) => (
            <Text key={i} variant="small" tone="muted" style={styles.tip}>{'•'} {tip}</Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text variant="heading">Personalise with AI</Text>
        <Text variant="small" tone="muted" style={{ marginBottom: spacing.sm }}>
          Fill in your details and we'll generate a tailored SOP.
        </Text>
        <TextField label="Your name" value={name} onChangeText={setName} placeholder="Full name" />
        <TextField label="University" value={university} onChangeText={setUniversity} placeholder="Target university" />
        <TextField label="Program" value={program} onChangeText={setProgram} placeholder="Program / course name" />
        <TextField label="Background" value={background} onChangeText={setBackground} placeholder="Academic background, major, GPA..." multiline />
        <TextField label="Career goals" value={goals} onChangeText={setGoals} placeholder="What you want to achieve..." multiline />

        <Button
          label={gen.loading ? 'Generating...' : 'Generate SOP'}
          onPress={handleGenerate}
          disabled={gen.loading}
          busy={gen.loading}
          icon={Sparkles}
        />
        {gen.error ? <Text variant="small" tone="danger">{gen.error}</Text> : null}
      </Card>

      {gen.result ? (
        <Card>
          <View style={styles.resultHeader}>
            <Text variant="heading">Your SOP</Text>
            <Button label="Copy" onPress={handleCopy} variant="outline" icon={ClipboardCopy} />
          </View>
          <Text variant="small" tone="muted">{gen.result.word_count} words</Text>
          <ScrollView style={styles.resultScroll}>
            <Text style={styles.resultText}>{gen.result.content}</Text>
          </ScrollView>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  white: { color: '#FFFFFF' },
  whiteMuted: { color: 'rgba(255,255,255,0.82)' },
  section: { gap: 2, paddingVertical: spacing.xs },
  tip: { paddingLeft: spacing.sm },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultScroll: { maxHeight: 400 },
  resultText: { lineHeight: 22 },
});
