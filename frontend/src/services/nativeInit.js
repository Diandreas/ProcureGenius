// Initialisation de l'experience native (Capacitor) : status bar, splash,
// bouton retour Android. Appele une fois au demarrage (main.jsx), no-op en web.

import { isNativePlatform } from '../utils/platform';
import { initOfflineDb } from './offline/db';
import { startSyncEngine } from './offline/syncEngine';
import { startConnectivityWatch } from './offline/connectivity';
import { BACKEND_ROOT } from './api';

const THEME_BG = '#e0e5ec'; // fond neumorphique clair de l'app

// En natif, l'app est servie depuis https://localhost : tout appel
// window.fetch('/api/...') taperait localhost (et recevrait le index.html au
// lieu du JSON). On patche fetch UNE fois pour reecrire ces URLs vers le
// backend en ligne. Couvre tous les fetch directs du code (onboarding,
// permissions, settings, tutoriel...) sans les modifier un par un.
export function patchFetchForNative() {
  if (!isNativePlatform()) return;
  if (!BACKEND_ROOT || typeof window === 'undefined' || window.__procuraFetchPatched) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string' && input.startsWith('/api')) {
        return originalFetch(`${BACKEND_ROOT}${input}`, init);
      }
      if (input instanceof Request && input.url && input.url.startsWith('/api')) {
        return originalFetch(new Request(`${BACKEND_ROOT}${input.url}`, input), init);
      }
    } catch { /* fallback ci-dessous */ }
    return originalFetch(input, init);
  };
  window.__procuraFetchPatched = true;
}

// Masque le splash natif. A appeler une fois l'interface React rendue (sinon
// on voit un ecran blanc entre le splash et l'app).
export async function hideSplash() {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }
}

export async function initNativeApp() {
  if (!isNativePlatform()) return;

  // (patchFetchForNative est appele tres tot depuis main.jsx)

  // --- Detection fiable de la connectivite (ping backend) ---
  startConnectivityWatch();

  // --- Base locale hors-ligne (cache + file de mutations) ---
  initOfflineDb()
    .then(() => startSyncEngine()) // rejoue la file au retour reseau
    .catch(() => {});

  // --- Status bar : texte sombre sur fond clair, assortie au theme ---
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light }); // icones sombres
    // Overlay : le contenu remonte sous la status bar ; les paddings
    // env(safe-area-inset-top) gerent l'espacement (sinon ils valent 0).
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  } catch { /* plugin absent : ignore */ }

  // (le splash est masque par hideSplash() une fois React rendu — voir App.jsx)

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
