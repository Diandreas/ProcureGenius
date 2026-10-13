import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SITE, LANGUES_SEO, OG_LOCALE, cheminLangue, cheminSansLangue, estMultilingue, imagePartage,
} from '../seo/site';

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

function upsertLink(rel, href, hreflang) {
  const selecteur = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.querySelector(selecteur);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function applyMeta({ titre, description, image, path, langue, imageAlt }) {
  const base = cheminSansLangue(path || window.location.pathname).chemin;
  const multilingue = estMultilingue(base);
  const url = `${SITE}${multilingue ? cheminLangue(base, langue) : base}`;
  const finalImage = image || imagePartage(langue);

  if (titre) document.title = titre;
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', titre);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', finalImage);
  upsertMeta('property', 'og:image:alt', imageAlt);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:locale', OG_LOCALE[langue] || OG_LOCALE.fr);
  upsertMeta('name', 'twitter:title', titre);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', finalImage);
  upsertLink('canonical', url);

  // Versions de la page dans les autres langues (hreflang)
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
  if (multilingue) {
    LANGUES_SEO.forEach((l) => upsertLink('alternate', `${SITE}${cheminLangue(base, l)}`, l));
    upsertLink('alternate', `${SITE}${base}`, 'x-default');
  }
}

/**
 * Balises <title>/meta/Open Graph/canonical/hreflang d'une page publique, dans la
 * langue affichée. `page` : clé de seo.json (home, pricing…) pour reprendre le titre
 * et la description de référencement ; `title`/`description` les remplacent.
 *
 * Les pages publiques sont aussi pré-générées au build (seo-prerender.mjs) : les
 * robots et les aperçus de partage qui n'exécutent pas le JS voient les mêmes balises.
 */
export default function usePageMeta({ page, title, description, image, path } = {}) {
  const { t, i18n } = useTranslation('seo');
  const langue = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2);
  const titre = title ? `${title} | Procura` : (page ? t(`seo:pages.${page}.title`) : t('seo:pages.home.title'));
  const desc = description || (page ? t(`seo:pages.${page}.description`) : t('seo:pages.home.description'));
  const imageAlt = t('seo:imageAlt');

  useEffect(() => {
    applyMeta({ titre, description: desc, image, path, langue, imageAlt });
    return () => applyMeta({
      titre: t('seo:pages.home.title'), description: t('seo:pages.home.description'), langue, imageAlt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titre, desc, image, path, langue]);
}
