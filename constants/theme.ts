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
