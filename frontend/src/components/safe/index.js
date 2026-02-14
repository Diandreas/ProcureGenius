/**
 * Composants MUI sécurisés qui évitent les erreurs PropTypes
 *
 * Usage:
 * import { SafeButton, SafeTab } from '@/components/safe';
 *
 * <SafeButton startIcon={maybeUndefinedIcon}>Click me</SafeButton>
 * <SafeTab icon={<SomeIcon />} label="Tab Label" />
 */

export { default as SafeButton } from './SafeButton';
export { default as SafeTab } from './SafeTab';
export { default as SafeBottomNavigationAction } from './SafeBottomNavigationAction';
export { default as SafeListItemText } from './SafeListItemText';
