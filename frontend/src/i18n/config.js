import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import commonFr from '../locales/fr/common.json';
import commonEn from '../locales/en/common.json';
import settingsFr from '../locales/fr/settings.json';
import settingsEn from '../locales/en/settings.json';
import invoicesFr from '../locales/fr/invoices.json';
import invoicesEn from '../locales/en/invoices.json';
import purchaseOrdersFr from '../locales/fr/purchaseOrders.json';
import purchaseOrdersEn from '../locales/en/purchaseOrders.json';
import clientsFr from '../locales/fr/clients.json';
import clientsEn from '../locales/en/clients.json';
import productsFr from '../locales/fr/products.json';
import productsEn from '../locales/en/products.json';
import dashboardFr from '../locales/fr/dashboard.json';
import dashboardEn from '../locales/en/dashboard.json';

// Configuration i18next
i18n
  .use(LanguageDetector) // Détecte la langue du navigateur
  .use(initReactI18next) // Passe i18n à react-i18next
  .init({
    resources: {
      fr: {
        common: commonFr,
        settings: settingsFr,
        invoices: invoicesFr,
        purchaseOrders: purchaseOrdersFr,
        clients: clientsFr,
        products: productsFr,
        dashboard: dashboardFr,
      },
      en: {
        common: commonEn,
        settings: settingsEn,
        invoices: invoicesEn,
        purchaseOrders: purchaseOrdersEn,
        clients: clientsEn,
        products: productsEn,
        dashboard: dashboardEn,
      },
    },

    // Langue par défaut
    fallbackLng: 'fr',

    // Namespace par défaut
    defaultNS: 'common',

    // Détection de la langue
    detection: {
      // Ordre de détection: localStorage > navigateur
      order: ['localStorage', 'navigator'],

      // Clé pour localStorage
      lookupLocalStorage: 'appLanguage',

      // Cache la langue dans localStorage
      caches: ['localStorage'],
    },

    // Options d'interpolation
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },

    // Support des namespaces séparés
    ns: ['common', 'settings', 'invoices', 'purchaseOrders', 'clients', 'products', 'dashboard'],

    // Mode debug (désactiver en production)
    debug: process.env.NODE_ENV === 'development',

    // Réagir aux changements de langue
    react: {
      useSuspense: false, // Désactive Suspense pour éviter les problèmes de chargement
      bindI18n: 'languageChanged loaded', // CRITIQUE : Force le re-render des composants
      bindI18nStore: 'added removed', // Re-render si les ressources changent
      transEmptyNodeValue: undefined,
    },
  });

export default i18n;
