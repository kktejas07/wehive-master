import { Text as RNText, type TextProps } from 'react-native';

import { type, type TypeVariant } from '@/core/theme/tokens';
import { useTheme } from '@/core/theme/use-theme';

type Tone = 'default' | 'muted' | 'primary' | 'accent' | 'onPrimary' | 'danger';

export function Text({
  variant = 'body', tone = 'default', style, ...rest
}: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  const { c } = useTheme();
  const color = {
    default: c.text, muted: c.textMuted, primary: c.primary, accent: c.accent, onPrimary: c.onPrimary, danger: c.danger,
  }[tone];
  const heading = variant === 'hero' || variant === 'title';
  return <RNText accessibilityRole={heading ? 'header' : undefined} {...rest} style={[type[variant], { color }, style]} />;
}
