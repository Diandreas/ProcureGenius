import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Colors matching the web application
export const Colors = {
  primary: '#1e40af', // Deep Blue - Professional & Trustworthy
  primaryLight: '#3b82f6',
  primaryDark: '#1e3a8a',
  secondary: '#059669', // Emerald Green - Success & Growth
  secondaryLight: '#10b981',
  secondaryDark: '#047857',
  success: '#059669',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  disabled: '#94a3b8',
};

// Light theme for React Native Paper
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primaryLight,
    secondary: Colors.secondary,
    secondaryContainer: Colors.secondaryLight,
    tertiary: Colors.info,
    error: Colors.error,
    errorContainer: '#fee2e2',
    background: Colors.background,
    surface: Colors.surface,
    surfaceVariant: '#f1f5f9',
    surfaceDisabled: '#e2e8f0',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: Colors.text,
    onSurface: Colors.text,
    onSurfaceVariant: Colors.textSecondary,
    outline: Colors.border,
    outlineVariant: '#cbd5e1',
    inverseSurface: '#1e293b',
    inverseOnSurface: '#f1f5f9',
    inversePrimary: Colors.primaryLight,
    scrim: '#000000',
    shadow: '#000000',
  },
};

// Dark theme for React Native Paper
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primaryLight,
    primaryContainer: Colors.primaryDark,
    secondary: Colors.secondaryLight,
    secondaryContainer: Colors.secondaryDark,
    tertiary: Colors.info,
    error: Colors.error,
    errorContainer: '#991b1b',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    surfaceDisabled: '#475569',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: '#f1f5f9',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#cbd5e1',
    outline: '#475569',
    outlineVariant: '#64748b',
    inverseSurface: '#f1f5f9',
    inverseOnSurface: '#1e293b',
    inversePrimary: Colors.primary,
    scrim: '#000000',
    shadow: '#000000',
  },
};

// Spacing system (8-point grid)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Typography scale
export const Typography = {
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  h2: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  h3: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  h4: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  h5: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  h6: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body1: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  body2: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  button: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};
