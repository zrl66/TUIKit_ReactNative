/**
 * react-native-tuikit-live
 * Live streaming UI module for React Native
 */

// Import i18n from tuikit-atomic-x to ensure it's initialized
// This side-effect import ensures i18n is configured before any component uses useTranslation
import { i18n } from 'react-native-tuikit-atomic-x';

// Log i18n initialization status
console.log('[react-native-tuikit-live] i18n initialized, current language:', i18n?.language);

// Export all live-related pages
export { AnchorPage } from './pages/Anchor';
export type { AnchorPageProps } from './pages/Anchor';

export { LiveAudiencePage } from './pages/LiveAudience';
export type { LiveAudiencePageProps } from './pages/LiveAudience';

export { LiveListPage } from './pages/LiveList';
export type { LiveListPageProps } from './pages/LiveList';

export { LiveEndPage } from './pages/LiveEnd';
export type { LiveEndPageProps } from './pages/LiveEnd';

export { LivePage as LiveHomePage } from './pages/Live';
