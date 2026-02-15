import { isValidElement } from 'react';

/**
 * Utilitaires pour nettoyer et valider les props avant de les passer aux composants MUI
 * Évite les erreurs PropTypes courantes
 */

/**
 * Nettoie les props d'un composant en retirant les valeurs undefined/null/false
 * Usage: <Button {...cleanProps({ startIcon: maybeUndefined, endIcon: null })} />
 */
export const cleanProps = (props) => {
  const cleaned = {};
  Object.keys(props).forEach(key => {
    const value = props[key];
    // Ne garder que les props avec des valeurs valides
    if (value !== undefined && value !== null && value !== false) {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

/**
 * Assure qu'une icône est un ReactNode valide ou undefined
 * Usage: <Button startIcon={safeIcon(icon)} />
 */
export const safeIcon = (icon) => {
  if (!icon) return undefined;
  if (typeof icon === 'string') return icon;
  if (isValidElement(icon)) return icon;
  return undefined;
};

/**
 * Assure qu'un texte/label est une string valide ou undefined
 * Usage: <Tab label={safeLabel(label)} />
 */
export const safeLabel = (label) => {
  if (!label) return '';
  if (typeof label === 'string') return label;
  if (typeof label === 'number') return String(label);
  return '';
};

/**
 * Assure qu'un children est valide pour un composant React
 * Usage: <Box>{safeChildren(children)}</Box>
 */
export const safeChildren = (children) => {
  if (children === undefined || children === null || children === false) {
    return null;
  }
  return children;
};

/**
 * Wrapper pour les props conditionnelles
 * Usage: <Button {...conditionalProp('startIcon', icon)} />
 */
export const conditionalProp = (propName, value) => {
  if (value !== undefined && value !== null && value !== false) {
    return { [propName]: value };
  }
  return {};
};

/**
 * Wrapper pour les props d'icône spécifiquement
 * Usage: <Button {...iconProp('startIcon', icon)} />
 */
export const iconProp = (propName, icon) => {
  const safeIconValue = safeIcon(icon);
  if (safeIconValue) {
    return { [propName]: safeIconValue };
  }
  return {};
};

export default {
  cleanProps,
  safeIcon,
  safeLabel,
  safeChildren,
  conditionalProp,
  iconProp
};
