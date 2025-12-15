import React from 'react';
import { Box, useTheme } from '@mui/material';

/**
 * Composant pour afficher les icônes PNG personnalisées
 * Supporte le dark mode avec fond beige/crème
 * @param {string} src - Chemin vers l'icône (ex: "/icon/dashboard.png")
 * @param {string} alt - Texte alternatif
 * @param {number} size - Taille de l'icône en pixels (default: 24)
 * @param {boolean} withBackground - Ajouter un fond beige en dark mode (default: false)
 * @param {object} sx - Styles MUI supplémentaires
 */
function IconImage({ src, alt, size = 24, withBackground = false, sx = {} }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Couleur beige/crème chaude au lieu de blanc pur
  const bgColor = '#fef7ed'; // Warm cream/beige

  if (withBackground && isDark) {
    return (
      <Box
        sx={{
          width: size + 8,
          height: size + 8,
          borderRadius: '6px',
          backgroundColor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          ...sx
        }}
      >
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            width: size,
            height: size,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        ...sx
      }}
    />
  );
}

export default IconImage;
