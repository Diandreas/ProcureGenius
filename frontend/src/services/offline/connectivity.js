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

// Ping leger : HEAD sur le backend avec timeout court. Met a jour l'etat.
export async function checkConnectivity() {
  if (!BACKEND_ROOT) { setOnline(navigator.onLine !== false); return online; }
  // Si le navigateur dit explicitement hors-ligne, inutile de tester.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setOnline(false);
    return false;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    // no-cors + cache:no-store : on veut juste savoir si ca repond.
    await fetch(`${BACKEND_ROOT}/api/v1/`, { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    setOnline(true);
    return true;
  } catch {
    setOnline(false);
    return false;
  }
}

// Surveille les changements navigateur + ping periodique leger.
export function startConnectivityWatch() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => checkConnectivity());
  window.addEventListener('offline', () => setOnline(false));
  checkConnectivity();
  setInterval(() => checkConnectivity(), 20000); // re-verifie toutes les 20s
}
