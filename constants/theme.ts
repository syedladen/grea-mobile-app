import { Platform } from 'react-native';

export const theme = {
  colors: {
    background: '#070B10',
    surface: '#121A22',
    surfaceElevated: '#1A2430',
    card: '#101820',
    border: '#2A3744',
    text: '#F5F5F5',
    muted: '#A7B4C0',
    gold: '#D4A94A',
    goldSoft: '#F0C85C',
    success: '#4ADE80',
    danger: '#F87171',
    warning: '#FBBF24',
    input: '#111B24',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
  },
  // Additive semantic tokens: existing screen tokens remain unchanged.
  auth: {
    surface: '#121A22',
    surfaceInset: '#0C131B',
    surfacePressed: '#202D3A',
    accentSurface: '#272319',
    textPrimary: '#F5F5F5',
    textSecondary: '#A7B4C0',
    textOnAccent: '#070B10',
    accent: '#D4A94A',
    accentPressed: '#F0C85C',
    border: '#344452',
    focusBorder: '#D4A94A',
    errorSurface: '#2A171D',
    errorBorder: '#75404A',
    errorText: '#FFB4BC',
    disabledOpacity: 0.55,
    maxWidth: 480,
    controlHeight: 52,
    touchTarget: 48,
    controlRadius: 14,
    cardRadius: 24,
  },
  typography: {
    authTitle: { fontSize: 32, lineHeight: 44, fontWeight: '700' as const },
    body: { fontSize: 16, lineHeight: 26 },
    label: { fontSize: 14, lineHeight: 22, fontWeight: '600' as const },
    button: { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
    caption: { fontSize: 13, lineHeight: 20 },
  },
  shadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#D4A94A',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#D4A94A',
  },
  dark: {
    text: theme.colors.text,
    background: theme.colors.background,
    tint: theme.colors.gold,
    icon: theme.colors.muted,
    tabIconDefault: theme.colors.muted,
    tabIconSelected: theme.colors.gold,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
