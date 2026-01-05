// Tokens de couleurs pour le neumorphism
export const neumorphicColors = {
  light: {
    background: '#e6e9ef',
    paper: '#e6e9ef',
    shadowDark: '#c1c5cc',
    shadowLight: '#ffffff',
  },
  dark: {
    background: '#1e2530',
    paper: '#1e2530',
    shadowDark: '#151820',
    shadowLight: '#272e3d',
  },
};

// Valeurs de distance pour les ombres
export const shadowDistances = {
  soft: { outer: 5, inner: 5 },
  medium: { outer: 8, inner: 8 },
  strong: { outer: 12, inner: 12 },
};

// Valeurs de blur pour les ombres
export const shadowBlurs = {
  soft: { outer: 10, inner: 10 },
  medium: { outer: 16, inner: 16 },
  strong: { outer: 24, inner: 24 },
};

// Border radius standards
export const neumorphicRadius = {
  small: '8px',
  medium: '12px',
  large: '20px',
  xlarge: '24px',
  round: '50%',
};

// Transitions
export const neumorphicTransitions = {
  fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  normal: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
};

// Spacing pour les composants neumorphiques
export const neumorphicSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
