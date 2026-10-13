// Detection FIABLE de la connectivite reelle (au-dela de navigator.onLine, qui
// ment souvent sur certains appareils : wifi sans internet, mode avion non
// reporte, etc.). On teste un vrai aller-retour vers le backend.

import { BACKEND_ROOT } from '../api';

let online = (typeof navigator !== 'undefined') ? navigator.onLine !== false : true;
const listeners = new Set();

export const getOnline = () => online;
export const getOffline = () => !online;

export function onConnectivityChange(cb) {
  listeners.add(cb);
  cb(online);
  return () => listeners.delete(cb);
}

function setOnline(v) {
  if (online === v) return;
  online = v;
  listeners.forEach((cb) => { try { cb(online); } catch { /* ignore */ } });
}

// Connexions lentes (fréquentes en 3G) : on attend 10 s, et il faut deux échecs
// de suite pour se déclarer hors ligne, sauf si le navigateur le dit lui-même.
let echecs = 0;

// Ping leger : HEAD sur le backend. Met a jour l'etat.
export async function checkConnectivity() {
  // Si le navigateur dit explicitement hors-ligne, inutile de tester.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setOnline(false);
    return false;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    // no-cors + cache:no-store : on veut juste savoir si ca repond.
    // Toute reponse HTTP (meme 401/404) prouve que le serveur est joignable.
    await fetch(`${BACKEND_ROOT || ''}/api/v1/`, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    echecs = 0;
    setOnline(true);
    return true;
  } catch {
    echecs += 1;
    if (echecs >= 2) setOnline(false);
    else setTimeout(() => checkConnectivity(), 3000); // deuxième essai rapide
    return !(echecs >= 2);
  }
}

// Surveille les changements navigateur + ping periodique leger.
let watching = false;
export function startConnectivityWatch() {
  if (typeof window === 'undefined' || watching) return;
  watching = true;
  window.addEventListener('online', () => checkConnectivity());
  window.addEventListener('offline', () => setOnline(false));
  checkConnectivity();
  // Re-verifie toutes les 20 s, seulement quand l'onglet est visible
  setInterval(() => { if (document.visibilityState !== 'hidden') checkConnectivity(); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkConnectivity(); });
}
