import React, { forwardRef } from 'react';
import { Tab } from '@mui/material';
import { iconProp, safeLabel } from '../../utils/propHelpers';

/**
 * Wrapper sécurisé pour Tab qui gère les props icon et label de manière robuste
 * Évite les erreurs PropTypes pour icon/label invalides
 * Utilise forwardRef pour la compatibilité avec MUI Tabs
 */
const SafeTab = forwardRef(({ icon, label, ...otherProps }, ref) => {
  return (
    <Tab
      {...iconProp('icon', icon)}
      label={safeLabel(label)}
      ref={ref}
      {...otherProps}
    />
  );
});

SafeTab.displayName = 'SafeTab';

export default SafeTab;
