// Référencement multilingue : adresses publiques par langue.
// Utilisé par l'app (balises à jour, sélecteur de langue) et au build
// (vite.config.js : pages HTML pré-générées + sitemap). Pas d'import ici :
// le fichier doit aussi se charger tel quel dans Node.

export const SITE = 'https://procura.mirlab.cloud';

/** Le français est la langue principale (adresses sans préfixe). */
export const LANGUE_PRINCIPALE = 'fr';
export const LANGUES_SEO = ['fr', 'en', 'de'];
export const OG_LOCALE = { fr: 'fr_FR', en: 'en_US', de: 'de_DE' };

/** Pages publiques disponibles dans toutes les langues (clé = entrée de seo.json). */
export const PAGES_MULTILINGUES = [
  { cle: 'home', chemin: '/landing' },
  { cle: 'pricing', chemin: '/pricing' },
  { cle: 'documentation', chemin: '/documentation' },
  { cle: 'support', chemin: '/support' },
  { cle: 'privacy', chemin: '/privacy' },
  { cle: 'terms', chemin: '/terms' },
];

/** Pages publiques en français seulement (le blog est rédigé en français). */
export const PAGES_FR = [{ cle: 'blog', chemin: '/blog' }];

const PREFIXE = /^\/(en|de)(?=\/|$)/;

/** Adresse d'une page publique dans une langue : /pricing -> /en/pricing ; accueil -> /en. */
export function cheminLangue(chemin, langue) {
  const base = cheminSansLangue(chemin).chemin;
  if (!langue || langue === LANGUE_PRINCIPALE) return base;
  if (!PAGES_MULTILINGUES.some((p) => p.chemin === base)) return base;
  return base === '/landing' ? `/${langue}` : `/${langue}${base}`;
}

/** Sépare le préfixe de langue : /en/pricing -> { langue: 'en', chemin: '/pricing' } ; /en -> accueil. */
export function cheminSansLangue(pathname = '/') {
  const m = pathname.match(PREFIXE);
  if (!m) return { langue: null, chemin: pathname };
  const reste = pathname.slice(m[0].length);
  return { langue: m[1], chemin: !reste || reste === '/' ? '/landing' : reste };
}

/** Vrai si la page existe dans toutes les langues (balises hreflang). */
export const estMultilingue = (chemin) => PAGES_MULTILINGUES.some((p) => p.chemin === cheminSansLangue(chemin).chemin);

/** Image de partage (Open Graph) de la langue. */
export const imagePartage = (langue) => `${SITE}/og-image${langue && langue !== LANGUE_PRINCIPALE ? `-${langue}` : ''}.png`;
