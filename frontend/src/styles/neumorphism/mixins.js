/**
 * Mixins de profondeur partagés.
 *
 * L'app était en néomorphisme intégral : double ombre claire/foncée
 * ('5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff') sur absolument tout, avec
 * la même couleur pour le fond et les surfaces. Résultat : aucune hiérarchie
 * (un bouton avait la même profondeur qu'une carte), des champs "creusés"
 * peu lisibles, et un rendu global un peu terne/chargé.
 *
 * On garde EXACTEMENT la même API (mêmes noms de fonctions, mêmes clés
 * soft/medium/strong/inset/insetMedium) pour que tous les appels existants
 * continuent de marcher sans modification — seul le langage visuel change :
 * ombres douces et discrètes, portées vers le bas, comme une vraie élévation.
 */

export const getNeumorphicShadow = (mode, type = 'medium') => {
  const shadows = {
    light: {
      soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
      medium: '0 2px 4px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.07)',
      strong: '0 4px 8px rgba(15, 23, 42, 0.05), 0 12px 28px rgba(15, 23, 42, 0.10)',
      inset: 'inset 0 1px 2px rgba(15, 23, 42, 0.05)',
      insetMedium: 'inset 0 2px 4px rgba(15, 23, 42, 0.07)',
    },
    dark: {
      soft: '0 1px 2px rgba(0, 0, 0, 0.30), 0 1px 3px rgba(0, 0, 0, 0.24)',
      medium: '0 2px 4px rgba(0, 0, 0, 0.30), 0 4px 12px rgba(0, 0, 0, 0.36)',
      strong: '0 4px 8px rgba(0, 0, 0, 0.34), 0 12px 28px rgba(0, 0, 0, 0.46)',
      inset: 'inset 0 1px 2px rgba(0, 0, 0, 0.32)',
      insetMedium: 'inset 0 2px 4px rgba(0, 0, 0, 0.40)',
    },
  };

  return shadows[mode][type];
};

export const getNeumorphicHover = (mode) => ({
  boxShadow: getNeumorphicShadow(mode, 'medium'),
});

export const getNeumorphicActive = (mode) => ({
  boxShadow: getNeumorphicShadow(mode, 'inset'),
});

export const getNeumorphicFocus = (mode, color = '#2563eb') => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '37, 99, 235';
  };

  return {
    boxShadow: `0 0 0 3px rgba(${hexToRgb(color)}, 0.18)`,
  };
};

// Surface de base : une vraie surface posée sur le fond, pas un relief creusé.
export const getNeumorphicBase = (mode) => ({
  background: mode === 'light' ? '#ffffff' : '#1e2530',
  boxShadow: getNeumorphicShadow(mode, 'soft'),
  border: mode === 'light'
    ? '1px solid rgba(15, 23, 42, 0.06)'
    : '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '14px',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
});

export const getNeumorphicButton = (mode) => ({
  ...getNeumorphicBase(mode),
  borderRadius: '10px',
  boxShadow: 'none',
  '&:hover': { boxShadow: getNeumorphicShadow(mode, 'soft') },
  '&:active': getNeumorphicActive(mode),
});

export const getNeumorphicInput = (mode) => ({
  background: mode === 'light' ? '#ffffff' : '#161b22',
  boxShadow: 'none',
  border: mode === 'light'
    ? '1px solid rgba(15, 23, 42, 0.12)'
    : '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '10px',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
});

export const getNeumorphicCard = (mode) => ({
  ...getNeumorphicBase(mode),
  '&:hover': {
    boxShadow: getNeumorphicShadow(mode, 'medium'),
  },
});
