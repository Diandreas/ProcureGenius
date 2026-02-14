import React from 'react';
import { Tab } from '@mui/material';
import { iconProp, safeLabel } from '../../utils/propHelpers';

/**
 * Wrapper sécurisé pour Tab qui gère les props icon et label de manière robuste
 * Évite les erreurs PropTypes pour icon/label invalides
 */
const SafeTab = ({ icon, label, ...otherProps }) => {
  return (
    <Tab
      {...iconProp('icon', icon)}
      label={safeLabel(label)}
      {...otherProps}
    />
  );
};

export default SafeTab;
