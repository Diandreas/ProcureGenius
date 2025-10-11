import React from 'react';
import { Box } from '@mui/material';

/**
 * Composant pour afficher les icônes PNG personnalisées
 * @param {string} src - Chemin vers l'icône (ex: "/icon/dashboard.png")
 * @param {string} alt - Texte alternatif
 * @param {number} size - Taille de l'icône en pixels (default: 24)
 * @param {object} sx - Styles MUI supplémentaires
 */
function IconImage({ src, alt, size = 24, sx = {} }) {
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
