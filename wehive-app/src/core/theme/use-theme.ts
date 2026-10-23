import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from './tokens';

export function useTheme(): { scheme: ColorScheme; c: ThemeColors } {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, c: colors[scheme] };
}
