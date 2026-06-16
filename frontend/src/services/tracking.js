/**
 * Tracking visiteurs anonymes (RGPD-friendly, sans cookie tiers).
 *
 * - anon_id : identifiant aléatoire persistant en localStorage (regroupe les
 *   pages vues d'un même visiteur, sans données nominatives).
 * - trackVisit() : ping le backend (POST /api/v1/track/) à chaque vue de page
 *   du site public (landing, pricing, blog...).
 * - getAnonId() : exposé pour joindre l'anon_id au payload d'inscription
 *   (mesure de conversion visite -> compte).
 */
import api from './api';

const ANON_KEY = 'procura_anon_id';

function generateId() {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch (_) { /* noop */ }
  return 'a-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getAnonId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch (_) {
    // localStorage indisponible (mode privé strict) : id éphémère
    return generateId();
  }
}

function readUtm() {
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || '',
      utm_medium: p.get('utm_medium') || '',
      utm_campaign: p.get('utm_campaign') || '',
    };
  } catch (_) {
    return { utm_source: '', utm_medium: '', utm_campaign: '' };
  }
}

/**
 * Envoie une vue de page. Best-effort : n'échoue jamais visiblement,
 * ne bloque pas le rendu. À appeler une fois par page publique.
 */
export function trackVisit(path) {
  try {
    const payload = {
      anon_id: getAnonId(),
      path: path || window.location.pathname,
      referrer: document.referrer || '',
      language: navigator.language || '',
      ...readUtm(),
    };
    // fire-and-forget
    api.post('/track/', payload).catch(() => {});
  } catch (_) {
    /* le tracking ne doit jamais casser l'app */
  }
}

export default { trackVisit, getAnonId };
