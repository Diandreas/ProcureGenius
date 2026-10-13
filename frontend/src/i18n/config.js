import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Toutes les traductions : locales/<langue>/<namespace>.json, chargées automatiquement.
// Ajouter une langue = ajouter son dossier et la déclarer dans LANGUES.
const fichiers = import.meta.glob('../locales/*/*.json', { eager: true });
const resources = {};
for (const [chemin, module] of Object.entries(fichiers)) {
  const [, langue, ns] = chemin.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  (resources[langue] ||= {})[ns] = module.default || module;
}

/** Langues proposées dans l'app (code, nom dans sa propre langue). */
export const LANGUES = [
  { code: 'fr', nom: 'Français' },
  { code: 'en', nom: 'English' },
  { code: 'de', nom: 'Deutsch' },
];

// Configuration i18next
i18n
  .use(LanguageDetector) // Détecte la langue du navigateur
  .use(initReactI18next) // Passe i18n à react-i18next
  .init({
    resources,

    // Langue par défaut
    supportedLngs: LANGUES.map((l) => l.code),
    nonExplicitSupportedLngs: true, // de-DE, en-GB… -> de, en
    // Texte manquant : l'allemand retombe sur l'anglais, l'anglais sur le français
    fallbackLng: { de: ['en', 'fr'], en: ['fr'], default: ['fr'] },

    // Namespace par défaut
    defaultNS: 'common',

    // Détection de la langue
    detection: {
      // Ordre de détection: localStorage > navigateur
      // Choix mémorisé, sinon la langue de la page (<html lang> des pages pré-générées).
      // Pas la langue du navigateur : Google visite en anglais et doit voir le français
      // sur les adresses françaises, l'anglais sur /en/…, l'allemand sur /de/…
      order: ['localStorage', 'htmlTag'],

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
    ns: Object.keys(resources.fr || {}),

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

// La page annonce sa langue au navigateur (lecteurs d'écran, traduction automatique, césure)
const marquerLangue = (lng) => {
  if (typeof document !== 'undefined' && lng) document.documentElement.lang = lng.slice(0, 2);
};
i18n.on('languageChanged', marquerLangue);
marquerLangue(i18n.language);

export default i18n;
