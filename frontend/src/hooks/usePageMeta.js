import { useEffect } from 'react';

// Valeurs par défaut = celles codées en dur dans index.html (à restaurer
// quand une page ne fournit pas de meta spécifiques, ou en quittant une page
// qui en avait défini).
const DEFAULTS = {
  title: 'Procura - Gestion intelligente pour entreprises',
  description: "Découvrez Procura, l'application intelligente de gestion pour propulser votre entreprise vers l'avant.",
  ogTitle: "Procura — Toute ta gestion, une seule app, pilotée par l'IA",
  ogDescription: "Factures, devis, stocks, trésorerie, compta : tu parles, l'IA exécute. Essai gratuit 30 jours, sans carte.",
  image: 'https://procura.mirlab.cloud/og-image.png',
};

const SITE_ORIGIN = 'https://procura.mirlab.cloud';

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applyMeta({ title, description, image, path }) {
  const finalTitle = title || DEFAULTS.title;
  const finalDescription = description || DEFAULTS.description;
  const finalOgTitle = title ? `${title} | Procura` : DEFAULTS.ogTitle;
  const finalImage = image || DEFAULTS.image;
  const finalUrl = path ? `${SITE_ORIGIN}${path}` : SITE_ORIGIN;

  document.title = title ? `${title} | Procura` : DEFAULTS.title;
  upsertMeta('name', 'description', finalDescription);
  upsertMeta('property', 'og:title', finalOgTitle);
  upsertMeta('property', 'og:description', finalDescription);
  upsertMeta('property', 'og:image', finalImage);
  upsertMeta('property', 'og:url', finalUrl);
  upsertMeta('name', 'twitter:title', finalOgTitle);
  upsertMeta('name', 'twitter:description', finalDescription);
  upsertMeta('name', 'twitter:image', finalImage);
}

/**
 * Injecte des balises <title>/meta/OG spécifiques à une page publique
 * (blog, pricing...). Sans ça, toutes les pages partagent les meta statiques
 * d'index.html — chaque article de blog avait le même titre/description
 * pour les moteurs de recherche.
 *
 * Limite connue : l'app est une SPA sans rendu serveur. Les robots qui
 * exécutent le JS (Googlebot) voient bien ces balises mises à jour ; les
 * scrapers de prévisualisation qui ne les exécutent pas (certains partages
 * réseaux sociaux) peuvent encore afficher les meta statiques par défaut.
 * Un vrai correctif complet nécessiterait du pré-rendu/SSR (hors scope ici).
 */
export default function usePageMeta({ title, description, image, path } = {}) {
  useEffect(() => {
    applyMeta({ title, description, image, path });
    return () => applyMeta({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, image, path]);
}
