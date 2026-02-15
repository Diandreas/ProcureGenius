import React from 'react';
import { ListItemText } from '@mui/material';
import { safeChildren } from '../../utils/propHelpers';

/**
 * Wrapper sécurisé pour ListItemText
 * Évite les erreurs PropTypes pour primary/secondary invalides
 */
const SafeListItemText = ({ primary, secondary, children, ...otherProps }) => {
  return (
    <ListItemText
      primary={safeChildren(primary)}
      secondary={safeChildren(secondary)}
      {...otherProps}
    >
      {safeChildren(children)}
    </ListItemText>
  );
};

export default SafeListItemText;
