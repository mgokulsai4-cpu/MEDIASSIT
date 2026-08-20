import { Platform } from 'react-native';

export const colors = {
  background: '#F4F8FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF4F7',
  primary: '#14658C',
  primaryDark: '#0D4A66',
  primarySoft: '#DDF0F8',
  accent: '#1F8A7A',
  accentSoft: '#DCF3EC',
  ink: '#0E2A3D',
  inkMuted: '#4E6476',
  inkSubtle: '#8398A8',
  border: '#DDE8EF',
  borderStrong: '#C3D5E0',
  success: '#147A55',
  successSoft: '#DBF3E6',
  warning: '#A96B0A',
  warningSoft: '#FCEFCF',
  danger: '#B32633',
  dangerSoft: '#FBE3E5',
  onPrimary: '#FFFFFF',
  onSuccess: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ThemeColors = { [Key in keyof typeof colors]: string };
export type ThemeName = 'ocean' | 'sage' | 'lavender' | 'sunrise' | 'sand' | 'midnight' | 'dusk';

export interface ThemePreset {
  name: ThemeName;
  label: string;
  description: string;
  isDark: boolean;
  colors: ThemeColors;
}

function preset(overrides: Partial<ThemeColors>): ThemeColors {
  return { ...colors, ...overrides };
}

export const themePresets = {
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    description: 'Calm clinical blue',
    isDark: false,
    colors: preset({}),
  },
  sage: {
    name: 'sage',
    label: 'Sage',
    description: 'Soft natural green',
    isDark: false,
    colors: preset({
      background: '#F3F9F5',
      surfaceMuted: '#E9F4EC',
      primary: '#2C7459',
      primaryDark: '#1E5440',
      primarySoft: '#DDF1E5',
      accent: '#5A9468',
      accentSoft: '#E2F1E4',
      border: '#D5E6DA',
      borderStrong: '#B7D3C1',
      ink: '#173329',
      inkMuted: '#567060',
      inkSubtle: '#7A9486',
    }),
  },
  lavender: {
    name: 'lavender',
    label: 'Lavender',
    description: 'Gentle purple',
    isDark: false,
    colors: preset({
      background: '#F7F6FC',
      surfaceMuted: '#EFEDF9',
      primary: '#5F51A5',
      primaryDark: '#463B85',
      primarySoft: '#E9E5FA',
      accent: '#8470BE',
      accentSoft: '#EDE7FA',
      border: '#E1DCF0',
      borderStrong: '#C9BFE3',
      ink: '#252041',
      inkMuted: '#67607F',
      inkSubtle: '#8A84A0',
    }),
  },
  sunrise: {
    name: 'sunrise',
    label: 'Sunrise',
    description: 'Warm coral and peach',
    isDark: false,
    colors: preset({
      background: '#FFF6F1',
      surface: '#FFFFFF',
      surfaceMuted: '#FDECE4',
      primary: '#C45C3E',
      primaryDark: '#9A3F28',
      primarySoft: '#FDE4DB',
      accent: '#D4893A',
      accentSoft: '#F8E6CC',
      border: '#F0D5C8',
      borderStrong: '#E3B8A4',
      ink: '#3A221C',
      inkMuted: '#7A5348',
      inkSubtle: '#A88478',
      success: '#2F7A4A',
      warning: '#B86A12',
    }),
  },
  sand: {
    name: 'sand',
    label: 'Sand',
    description: 'Soft cream and gold',
    isDark: false,
    colors: preset({
      background: '#F8F4EC',
      surface: '#FFFCF7',
      surfaceMuted: '#F3E8D0',
      primary: '#8A6A32',
      primaryDark: '#6A5024',
      primarySoft: '#F3E8D0',
      accent: '#B07A3A',
      accentSoft: '#F6E8D2',
      border: '#E6D9BF',
      borderStrong: '#D2BE96',
      ink: '#2C2418',
      inkMuted: '#6B5B3F',
      inkSubtle: '#978564',
    }),
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    description: 'Dark navy with teal',
    isDark: true,
    colors: preset({
      background: '#0B1622',
      surface: '#152536',
      surfaceMuted: '#1D3245',
      primary: '#6FD0DC',
      primaryDark: '#A9EDF1',
      primarySoft: '#1D4654',
      accent: '#6FCF9C',
      accentSoft: '#1D4A38',
      ink: '#F2F8FB',
      inkMuted: '#BCCDD9',
      inkSubtle: '#89A0B2',
      border: '#294256',
      borderStrong: '#40607A',
      success: '#6FCF9C',
      successSoft: '#1D4A38',
      warning: '#EFC870',
      warningSoft: '#4E3F20',
      danger: '#F7969E',
      dangerSoft: '#4F2932',
      onPrimary: '#06222C',
      onSuccess: '#06251B',
    }),
  },
  dusk: {
    name: 'dusk',
    label: 'Dusk',
    description: 'Dark plum with lilac',
    isDark: true,
    colors: preset({
      background: '#16121C',
      surface: '#221C2C',
      surfaceMuted: '#2E263A',
      primary: '#D4A0FF',
      primaryDark: '#E8C6FF',
      primarySoft: '#3A2A4A',
      accent: '#F0A8C0',
      accentSoft: '#4A2A36',
      ink: '#F6F0FA',
      inkMuted: '#C9BED6',
      inkSubtle: '#978AA8',
      border: '#3A3148',
      borderStrong: '#564866',
      success: '#86D4A8',
      successSoft: '#1E3A2C',
      warning: '#EFC870',
      warningSoft: '#4E3F20',
      danger: '#F7969E',
      dangerSoft: '#4F2932',
      onPrimary: '#22102E',
      onSuccess: '#0E2418',
    }),
  },
} as const satisfies Record<ThemeName, ThemePreset>;

export const THEME_ORDER: ThemeName[] = ['ocean', 'sage', 'lavender', 'sunrise', 'sand', 'midnight', 'dusk'];

export const themes: Record<ThemeName, ThemeColors> = {
  ocean: themePresets.ocean.colors,
  sage: themePresets.sage.colors,
  lavender: themePresets.lavender.colors,
  sunrise: themePresets.sunrise.colors,
  sand: themePresets.sand.colors,
  midnight: themePresets.midnight.colors,
  dusk: themePresets.dusk.colors,
};

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return Boolean(value && value in themePresets);
}

export function isDarkTheme(name: ThemeName): boolean {
  return themePresets[name].isDark;
}

/** @deprecated Use the user's selected theme from Settings. Kept for login role tint only. */
export const roleThemes: Record<'patient' | 'doctor', ThemeColors> = {
  patient: themes.sage,
  doctor: themes.ocean,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fonts = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemi: 'IBMPlexSans_600SemiBold',
  serif: 'SourceSerif4_600SemiBold',
  serifBold: 'SourceSerif4_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.3 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.15 },
  heading: { fontFamily: fonts.sansSemi, fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
} as const;

export const shadows = Platform.select({
  ios: {
    shadowColor: '#0E2A3D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {},
});

export const shadowsStrong = Platform.select({
  ios: {
    shadowColor: '#0E2A3D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  android: { elevation: 5 },
  default: {},
});

export const layout = {
  horizontalPadding: spacing.xl,
  minTouchTarget: 48,
  floatingTabInset: 16,
  floatingTabHeight: 68,
};
