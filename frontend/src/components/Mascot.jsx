import React from 'react';
import { Box, keyframes } from '@mui/material';

// Animations pour la mascotte
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const bounce = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const wave = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

/**
 * Composant Mascotte réutilisable - Procura
 *
 * @param {string} pose - Type de pose : 'main', 'happy', 'excited', 'thinking', 'reading', 'thumbup', 'error'
 * @param {string} animation - Type d'animation : 'float', 'bounce', 'wave', 'pulse', 'none'
 * @param {number} size - Taille en pixels (défaut: 120)
 * @param {string} position - Position : 'static', 'absolute', 'fixed'
 * @param {object} sx - Styles MUI supplémentaires
 */
function Mascot({
  pose = 'main',
  animation = 'none',
  size = 120,
  position = 'static',
  sx = {},
  ...props
}) {
  // Mapping des poses aux fichiers
  const poseFiles = {
    main: '/mascote/main.png',
    happy: '/mascote/Procura_happy.png',
    excited: '/mascote/Procura_excited.png',
    thinking: '/mascote/Procura_thinking.png',
    reading: '/mascote/Procura_reading.png',
    thumbup: '/mascote/Procura_thumbup.png',
    error: '/mascote/procura_error.png',
  };

  // Mapping des animations
  const animations = {
    float: float,
    bounce: bounce,
    wave: wave,
    pulse: pulse,
    none: null,
  };

  const getAnimationStyle = () => {
    const anim = animations[animation];
    if (!anim) return {};

    return {
      animation: `${anim} 2s ease-in-out infinite`,
    };
  };

  return (
    <Box
      component="img"
      src={poseFiles[pose] || poseFiles.main}
      alt={`Procura - ${pose}`}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        position: position,
        userSelect: 'none',
        pointerEvents: 'none',
        ...getAnimationStyle(),
        ...sx,
      }}
      {...props}
    />
  );
}

export default Mascot;
