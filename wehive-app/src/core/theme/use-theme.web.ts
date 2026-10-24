import { useColorScheme } from 'react-native';

import { useHydrated } from '@/core/hooks/use-hydrated';

import { colors, type ColorScheme, type ThemeColors } from './tokens';

/**
 * Web: static HTML is rendered in light mode (the server cannot know the visitor's
 * setting), and React keeps server styles while hydrating. So start light and switch
 * to the visitor's scheme right after hydration.
 */
export function useTheme(): { scheme: ColorScheme; c: ThemeColors } {
  const system = useColorScheme();
  const hydrated = useHydrated();
  const scheme: ColorScheme = hydrated && system === 'dark' ? 'dark' : 'light';
  return { scheme, c: colors[scheme] };
}
