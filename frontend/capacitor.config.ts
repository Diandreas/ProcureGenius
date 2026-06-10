import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.mirlab.procura',
  appName: 'Procura',
  // Le bundle web est embarqué dans l'app (résultat de `vite build`).
  // Les appels API tapent le backend en ligne (voir src/services/api.js).
  webDir: 'build',
  android: {
    // Origine = https://localhost (au lieu de http://localhost) :
    // cohérent avec le CORS Django et évite le blocage du contenu mixte.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    // iOS utilise déjà capacitor:// -> on garde le défaut.
  },
  plugins: {
    SplashScreen: {
      // On masque le splash nous-memes (App.jsx hideSplash) une fois React
      // rendu : evite l'ecran blanc entre le logo et l'interface.
      launchAutoHide: false,
      backgroundColor: '#e0e5ec',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
