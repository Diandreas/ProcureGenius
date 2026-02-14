import React from 'react';
import { BottomNavigationAction } from '@mui/material';
import { iconProp, safeLabel } from '../../utils/propHelpers';

/**
 * Wrapper sécurisé pour BottomNavigationAction
 * Évite les erreurs PropTypes pour icon/label invalides
 */
const SafeBottomNavigationAction = ({ icon, label, ...otherProps }) => {
  return (
    <BottomNavigationAction
      {...iconProp('icon', icon)}
      label={safeLabel(label)}
      {...otherProps}
    />
  );
};

export default SafeBottomNavigationAction;
