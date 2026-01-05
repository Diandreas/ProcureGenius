export const getNeumorphicShadow = (mode, type = 'medium') => {
  const shadows = {
    light: {
      soft: '5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff',
      medium: '8px 8px 16px #c1c5cc, -8px -8px 16px #ffffff',
      strong: '12px 12px 24px #c1c5cc, -12px -12px 24px #ffffff',
      inset: 'inset 5px 5px 10px #c1c5cc, inset -5px -5px 10px #ffffff',
      insetMedium: 'inset 8px 8px 16px #c1c5cc, inset -8px -8px 16px #ffffff',
    },
    dark: {
      soft: '5px 5px 10px #151820, -5px -5px 10px #272e3d',
      medium: '8px 8px 16px #151820, -8px -8px 16px #272e3d',
      strong: '12px 12px 24px #151820, -12px -12px 24px #272e3d',
      inset: 'inset 5px 5px 10px #151820, inset -5px -5px 10px #272e3d',
      insetMedium: 'inset 8px 8px 16px #151820, inset -8px -8px 16px #272e3d',
    },
  };

  return shadows[mode][type];
};

export const getNeumorphicHover = (mode) => ({
  boxShadow: mode === 'light'
    ? '3px 3px 6px #c1c5cc, -3px -3px 6px #ffffff'
    : '3px 3px 6px #151820, -3px -3px 6px #272e3d',
  transform: 'translateY(1px)',
});

export const getNeumorphicActive = (mode) => ({
  boxShadow: mode === 'light'
    ? 'inset 4px 4px 8px #c1c5cc, inset -4px -4px 8px #ffffff'
    : 'inset 4px 4px 8px #151820, inset -4px -4px 8px #272e3d',
  transform: 'translateY(2px)',
});

export const getNeumorphicFocus = (mode, color = '#2563eb') => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '37, 99, 235';
  };

  return {
    boxShadow: `0 0 0 3px rgba(${hexToRgb(color)}, 0.2), ${getNeumorphicShadow(mode, 'soft')}`,
  };
};

// Styles de base pour un élément neumorphique
export const getNeumorphicBase = (mode) => ({
  background: mode === 'light' ? '#e6e9ef' : '#1e2530',
  boxShadow: getNeumorphicShadow(mode, 'medium'),
  borderRadius: '20px',
  border: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
});

// Styles pour boutons neumorphiques
export const getNeumorphicButton = (mode) => ({
  ...getNeumorphicBase(mode),
  borderRadius: '12px',
  boxShadow: getNeumorphicShadow(mode, 'soft'),
  '&:hover': getNeumorphicHover(mode),
  '&:active': getNeumorphicActive(mode),
});

// Styles pour inputs neumorphiques
export const getNeumorphicInput = (mode) => ({
  background: mode === 'light' ? '#e6e9ef' : '#1e2530',
  boxShadow: getNeumorphicShadow(mode, 'inset'),
  borderRadius: '12px',
  border: 'none',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
});

// Styles pour cards neumorphiques
export const getNeumorphicCard = (mode) => ({
  ...getNeumorphicBase(mode),
  '&:hover': {
    boxShadow: getNeumorphicShadow(mode, 'soft'),
    transform: 'translateY(-2px)',
  },
});
