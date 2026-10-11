import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx'
import './index.css'
import { initNativeApp, initOffline, patchFetchForNative } from './services/nativeInit';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Patch fetch AVANT tout rendu/appel (reecrit /api -> backend en ligne en natif).
patchFetchForNative();

// Initialise l'experience native (status bar, splash, bouton retour, BDD offline).
initNativeApp();

// Mode hors ligne : cache local, file des enregistrements et synchro.
initOffline();

// Enregistrement du Service Worker pour la PWA (web uniquement).
// En natif (Capacitor), on n'enregistre pas le SW : il pourrait intercepter
// les requêtes de la webview et le bundle est déjà servi localement.
const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
if (!isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Verifie les mises a jour a chaque retour sur l'onglet
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
      })
      .catch((error) => {
        console.log('Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)