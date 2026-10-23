/**
 * WeHive design tokens, shared by every screen on iOS, Android and web.
 * Brand colours come from the website (frontend/src/index.css) and the logo:
 * royal blue #011CB5 and signal red #FF0302.
 */
export const palette = {
  royalBlue: '#011CB5',
  electricBlue: '#0518FE',
  midnightNavy: '#0B1240',
  signalRed: '#FF0302',
  festiveRed: '#E10600',
  marigold: '#FFC531',
  iceBlue: '#EEF1FF',
  skyMist: '#E9EEFF',
  slate: '#5E6690',
  white: '#FFFFFF',
} as const;

export const colors = {
  light: {
    background: '#F7F8FD',
    surface: '#FFFFFF',
    surfaceAlt: palette.iceBlue,
    text: palette.midnightNavy,
    textMuted: palette.slate,
    border: '#DCE1F5',
    primary: palette.royalBlue,
    onPrimary: '#FFFFFF',
    accent: palette.festiveRed,
    success: '#0F7A4F',
    successBg: '#E3F5EC',
    warning: '#8A5200',
    warningBg: '#FFF2D9',
    danger: '#B4161D',
    dangerBg: '#FDE6E6',
    info: palette.royalBlue,
    infoBg: palette.iceBlue,
  },
  dark: {
    background: '#070B22',
    surface: '#10163A',
    surfaceAlt: '#18205A',
    text: '#E9ECFB',
    textMuted: '#A3ABD0',
    border: '#262F62',
    primary: '#7F92FF',
    onPrimary: '#070B22',
    accent: '#FF6A6F',
    success: '#5FD3A0',
    successBg: '#0F2D22',
    warning: '#F2B552',
    warningBg: '#33260D',
    danger: '#FF8A8F',
    dangerBg: '#3A1416',
    info: '#9FB0FF',
    infoBg: '#18205A',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof typeof colors.light]: string };

/** Brand gradients (same stops as --grad-navy / --grad-brand on the website). */
export const gradients = {
  navy: ['#0518FE', '#011CB5', '#0B1240'] as const,
  brand: ['#011CB5', '#0518FE', '#FF0302'] as const,
  dusk: ['#0B1240', '#18205A', '#011CB5'] as const,
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const maxContentWidth = 960;

export const fonts = {
  display: 'Figtree_800ExtraBold',
  heading: 'Figtree_700Bold',
  semibold: 'Figtree_600SemiBold',
  body: 'NotoSans_400Regular',
  bodyMedium: 'NotoSans_500Medium',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' as const },
} as const;

export type TypeVariant = keyof typeof type;
