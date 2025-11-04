import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import fr from './locales/fr.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

// Get device locale safely
const getDeviceLocale = () => {
  try {
    const locale = Localization.locale || Localization.getLocales?.()?.[0]?.languageCode || 'fr';
    return typeof locale === 'string' ? locale.split('-')[0] : 'fr';
  } catch (error) {
    console.warn('Error getting device locale, defaulting to French:', error);
    return 'fr';
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLocale(),
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });

export default i18n;
