import React from 'react';
import { Button } from '@mui/material';
import { iconProp } from '../../utils/propHelpers';

/**
 * Wrapper sécurisé pour Button qui gère les props d'icônes de manière robuste
 * Évite les erreurs PropTypes pour startIcon/endIcon invalides
 */
const SafeButton = ({ startIcon, endIcon, children, ...otherProps }) => {
  return (
    <Button
      {...iconProp('startIcon', startIcon)}
      {...iconProp('endIcon', endIcon)}
      {...otherProps}
    >
      {children}
    </Button>
  );
};

export default SafeButton;
