/**
 * Components index
 * Central export point for all reusable components
 */

export { default as BarcodeScanner } from './BarcodeScanner';
export { default as QuickCreateDialog } from './QuickCreateDialog';
export { default as ImportWizard } from './ImportWizard';
export { default as DocumentScanner } from './DocumentScanner';
export { default as WidgetLibrary } from './WidgetLibrary';

// Mascot components
export { default as Mascot } from './Mascot';
export { default as LoadingState } from './LoadingState';
export { default as EmptyState } from './EmptyState';
export { default as ErrorState } from './ErrorState';

// AdSense/AdMob components - NOTE: Only import these directly in native screens, not through this index
// They use native modules that don't work on web
// export { AdBanner, ConditionalAdBanner } from './AdSense';
