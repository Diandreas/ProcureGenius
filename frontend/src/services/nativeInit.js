// Initialisation de l'experience native (Capacitor) : status bar, splash,
// bouton retour Android. Appele une fois au demarrage (main.jsx), no-op en web.

import { isNativePlatform } from '../utils/platform';

const THEME_BG = '#e0e5ec'; // fond neumorphique clair de l'app

export async function initNativeApp() {
  if (!isNativePlatform()) return;

  // --- Status bar : texte sombre sur fond clair, assortie au theme ---
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light }); // icones sombres
    await StatusBar.setBackgroundColor({ color: THEME_BG }).catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  } catch { /* plugin absent : ignore */ }

  // --- Splash : on le cache une fois l'app prete ---
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }

  // --- Bouton retour Android : ne ferme plus l'app brutalement ---
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      // Sur les ecrans racines (login/dashboard), on minimise l'app au lieu
      // de la fermer net ; ailleurs on revient en arriere.
      const path = window.location.pathname;
      const rootPaths = ['/login', '/dashboard', '/landing', '/'];
      if (canGoBack && !rootPaths.includes(path)) {
        window.history.back();
      } else {
        App.minimizeApp().catch(() => {});
      }
    });
  } catch { /* ignore */ }
}
