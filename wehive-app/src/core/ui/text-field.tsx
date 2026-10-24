import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, radius, spacing } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';
import { Text } from '@/core/ui/text';

export function TextField({ label, hint, ...rest }: TextInputProps & { label: string; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        {...rest}
        style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
      />
      {hint ? <Text variant="small" tone="muted">{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: { minHeight: 50, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontFamily: fonts.body, fontSize: 16 },
});
