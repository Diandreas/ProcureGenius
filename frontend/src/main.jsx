import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx'
import './index.css'
import { initNativeApp } from './services/nativeInit';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Initialise l'experience native (status bar, splash, bouton retour) — no-op en web.
initNativeApp();

// Enregistrement du Service Worker pour la PWA (web uniquement).
// En natif (Capacitor), on n'enregistre pas le SW : il pourrait intercepter
// les requêtes de la webview et le bundle est déjà servi localement.
const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
if (!isNativeApp && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
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