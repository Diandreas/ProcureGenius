// Neumorphisme premium : ombres douces et diffuses, teinte froide subtile
// (bleu-gris #cdd4e0) côté ombre — plus raffiné qu'un gris plat. Le highlight
// reste blanc pur. Plus de blur pour un rendu soyeux, offsets modérés.
export const getNeumorphicShadow = (mode, type = 'medium') => {
  const shadows = {
    light: {
      soft: '6px 6px 14px #cdd4e0, -6px -6px 14px #ffffff',
      medium: '9px 9px 22px #c9d1de, -9px -9px 22px #ffffff',
      strong: '14px 14px 32px #c4cddc, -14px -14px 32px #ffffff',
      inset: 'inset 4px 4px 9px #cdd4e0, inset -4px -4px 9px #ffffff',
      insetMedium: 'inset 7px 7px 15px #c9d1de, inset -7px -7px 15px #ffffff',
    },
    dark: {
      soft: '6px 6px 14px #14191f, -6px -6px 14px #283041',
      medium: '9px 9px 22px #11161c, -9px -9px 22px #2a3344',
      strong: '14px 14px 32px #0e1217, -14px -14px 32px #2c3648',
      inset: 'inset 4px 4px 9px #14191f, inset -4px -4px 9px #283041',
      insetMedium: 'inset 7px 7px 15px #11161c, inset -7px -7px 15px #2a3344',
    },
  };

  return shadows[mode][type];
};

// Survol : l'élément « se rapproche » (ombre resserrée + légère montée)
export const getNeumorphicHover = (mode) => ({
  boxShadow: mode === 'light'
    ? '4px 4px 10px #cdd4e0, -4px -4px 10px #ffffff'
    : '4px 4px 10px #14191f, -4px -4px 10px #283041',
  transform: 'translateY(-2px)',
});

// Pressé : enfoncement doux (inset)
export const getNeumorphicActive = (mode) => ({
  boxShadow: mode === 'light'
    ? 'inset 3px 3px 7px #cdd4e0, inset -3px -3px 7px #ffffff'
    : 'inset 3px 3px 7px #14191f, inset -3px -3px 7px #283041',
  transform: 'translateY(0)',
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
  background: mode === 'light' ? '#eef1f6' : '#1e2530',
  boxShadow: getNeumorphicShadow(mode, 'medium'),
  borderRadius: '20px',
  border: 'none',
  transition: 'box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
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
  background: mode === 'light' ? '#eef1f6' : '#1e2530',
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
