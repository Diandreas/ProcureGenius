// Pages publiques pré-générées pour le référencement (une par page et par langue).
//
// L'app est une SPA : sans ça, Google et les aperçus de partage (WhatsApp,
// Facebook, LinkedIn…) ne voient que le index.html générique, en français.
// Après le build, on écrit build/<chemin>/index.html avec le bon <html lang>,
// titre, description, Open Graph, canonical, hreflang et données structurées.
// nginx (try_files $uri $uri/ /index.html) sert ces fichiers tels quels ;
// l'app React prend ensuite le relais normalement.
import fs from 'node:fs';
import path from 'node:path';

// Charge un module ESM sans import (site.js, blogPosts.js) quel que soit Node :
// Node 18 traiterait ces .js comme CommonJS (pas de "type": "module" dans package.json).
const importerModule = (fichier) => import(`data:text/javascript;charset=utf-8,${encodeURIComponent(fs.readFileSync(fichier, 'utf-8'))}`);

const ici = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const echapper = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function lireSeo(langue) {
  return JSON.parse(fs.readFileSync(path.join(ici, 'src', 'locales', langue, 'seo.json'), 'utf-8'));
}

// Retire du <head> tout ce que l'on régénère
function nettoyerHead(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="(canonical|alternate)"[^>]*>\s*/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '')
    .replace(/<!-- Open Graph[^>]*-->\s*/gi, '')
    .replace(/<!-- Twitter -->\s*/gi, '');
}

function blocHead({ langue, titre, description, url, image, imageAlt, alternates, ogLocale, autresLocales, type, jsonLd, siteName }) {
  const l = [];
  l.push(`<title>${echapper(titre)}</title>`);
  l.push(`<meta name="description" content="${echapper(description)}" />`);
  l.push(`<link rel="canonical" href="${url}" />`);
  for (const a of alternates) l.push(`<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`);
  l.push(`<meta property="og:type" content="${type}" />`);
  l.push(`<meta property="og:site_name" content="${echapper(siteName)}" />`);
  l.push(`<meta property="og:url" content="${url}" />`);
  l.push(`<meta property="og:title" content="${echapper(titre)}" />`);
  l.push(`<meta property="og:description" content="${echapper(description)}" />`);
  l.push(`<meta property="og:image" content="${image}" />`);
  l.push(`<meta property="og:image:secure_url" content="${image}" />`);
  if (image.endsWith('.png')) l.push('<meta property="og:image:type" content="image/png" />');
  l.push('<meta property="og:image:width" content="1200" />');
  l.push('<meta property="og:image:height" content="630" />');
  l.push(`<meta property="og:image:alt" content="${echapper(imageAlt)}" />`);
  l.push(`<meta property="og:locale" content="${ogLocale}" />`);
  for (const o of autresLocales) l.push(`<meta property="og:locale:alternate" content="${o}" />`);
  l.push('<meta name="twitter:card" content="summary_large_image" />');
  l.push(`<meta name="twitter:title" content="${echapper(titre)}" />`);
  l.push(`<meta name="twitter:description" content="${echapper(description)}" />`);
  l.push(`<meta name="twitter:image" content="${image}" />`);
  l.push(`<meta name="twitter:image:alt" content="${echapper(imageAlt)}" />`);
  for (const j of jsonLd) l.push(`<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`);
  return `  ${l.join('\n  ')}\n`;
}

function construirePage(gabarit, meta) {
  const propre = nettoyerHead(gabarit).replace(/<html lang="[^"]*"/i, `<html lang="${meta.langue}"`);
  return propre.replace('</head>', `${blocHead(meta)}</head>`);
}

function ecrire(dossierBuild, chemin, html) {
  const dossier = path.join(dossierBuild, ...chemin.split('/').filter(Boolean));
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'index.html'), html);
}

/** Plugin Vite : pages pré-générées + sitemap.xml multilingue. */
export default function seoPrerender() {
  let dossierBuild = 'build';
  return {
    name: 'procura-seo-prerender',
    apply: 'build',
    configResolved(config) { dossierBuild = path.resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const site = await importerModule(path.join(ici, 'src', 'seo', 'site.js'));
      const { BLOG_POSTS } = await importerModule(path.join(ici, 'src', 'data', 'blogPosts.js'));
      const { SITE, LANGUES_SEO, OG_LOCALE, PAGES_MULTILINGUES, PAGES_FR, cheminLangue, imagePartage } = site;
      const gabaritPath = path.join(dossierBuild, 'index.html');
      const gabarit = fs.readFileSync(gabaritPath, 'utf-8');
      const seo = Object.fromEntries(LANGUES_SEO.map((l) => [l, lireSeo(l)]));
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const urlsSitemap = [];

      const donneesStructurees = (langue) => {
        const s = seo[langue];
        return [
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Procura',
            url: `${SITE}${cheminLangue('/landing', langue)}`,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web, Android',
            inLanguage: langue,
            description: s.pages.home.description,
            image: imagePartage(langue),
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'XAF', description: s.pages.pricing.title },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Procura',
            url: SITE,
            logo: `${SITE}/main.png`,
          },
        ];
      };

      // 1. Pages disponibles dans toutes les langues
      for (const page of PAGES_MULTILINGUES) {
        const alternates = LANGUES_SEO.map((l) => ({ hreflang: l, href: `${SITE}${cheminLangue(page.chemin, l)}` }));
        alternates.push({ hreflang: 'x-default', href: `${SITE}${page.chemin}` });
        for (const langue of LANGUES_SEO) {
          const s = seo[langue];
          const chemin = cheminLangue(page.chemin, langue);
          const meta = {
            langue,
            siteName: s.siteName,
            titre: s.pages[page.cle].title,
            description: s.pages[page.cle].description,
            url: `${SITE}${chemin}`,
            image: imagePartage(langue),
            imageAlt: s.imageAlt,
            alternates,
            ogLocale: OG_LOCALE[langue],
            autresLocales: LANGUES_SEO.filter((l) => l !== langue).map((l) => OG_LOCALE[l]),
            type: 'website',
            jsonLd: ['home', 'pricing'].includes(page.cle) ? donneesStructurees(langue) : [],
          };
          ecrire(dossierBuild, chemin, construirePage(gabarit, meta));
          urlsSitemap.push({ loc: `${SITE}${chemin}`, alternates, priorite: page.cle === 'home' ? '1.0' : '0.8', freq: 'weekly' });
        }
      }

      // 2. Blog (en français) : liste et articles, chacun avec son image
      const fr = seo.fr;
      for (const page of PAGES_FR) {
        const url = `${SITE}${page.chemin}`;
        ecrire(dossierBuild, page.chemin, construirePage(gabarit, {
          langue: 'fr', siteName: fr.siteName, titre: fr.pages[page.cle].title, description: fr.pages[page.cle].description,
          url, image: imagePartage('fr'), imageAlt: fr.imageAlt, alternates: [], ogLocale: OG_LOCALE.fr,
          autresLocales: [], type: 'website', jsonLd: [],
        }));
        urlsSitemap.push({ loc: url, alternates: [], priorite: '0.8', freq: 'weekly' });
      }
      for (const article of BLOG_POSTS) {
        const chemin = `/blog/${article.slug}`;
        const url = `${SITE}${chemin}`;
        const image = article.cover ? `${SITE}${article.cover}` : imagePartage('fr');
        ecrire(dossierBuild, chemin, construirePage(gabarit, {
          langue: 'fr', siteName: fr.siteName, titre: `${article.title} | Procura`, description: article.excerpt,
          url, image, imageAlt: article.title, alternates: [], ogLocale: OG_LOCALE.fr, autresLocales: [],
          type: 'article',
          jsonLd: [{
            '@context': 'https://schema.org', '@type': 'BlogPosting', headline: article.title,
            description: article.excerpt, image, datePublished: article.date, inLanguage: 'fr',
            mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Procura' },
            publisher: { '@type': 'Organization', name: 'Procura', logo: { '@type': 'ImageObject', url: `${SITE}/main.png` } },
          }],
        }));
        urlsSitemap.push({ loc: url, alternates: [], priorite: '0.7', freq: 'monthly', modif: article.date });
      }

      // 3. Gabarit général (app, routes non listées) : balises de l'accueil français
      const accueil = PAGES_MULTILINGUES.find((p) => p.cle === 'home');
      fs.writeFileSync(gabaritPath, construirePage(gabarit, {
        langue: 'fr', siteName: fr.siteName, titre: fr.pages.home.title, description: fr.pages.home.description,
        url: `${SITE}${accueil.chemin}`, image: imagePartage('fr'), imageAlt: fr.imageAlt,
        alternates: [], ogLocale: OG_LOCALE.fr, autresLocales: [], type: 'website', jsonLd: [],
      }));

      // 4. Sitemap multilingue
      const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
      for (const u of urlsSitemap) {
        xml.push('  <url>', `    <loc>${u.loc}</loc>`, `    <lastmod>${u.modif || aujourdhui}</lastmod>`,
          `    <changefreq>${u.freq}</changefreq>`, `    <priority>${u.priorite}</priority>`);
        for (const a of u.alternates) xml.push(`    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`);
        xml.push('  </url>');
      }
      xml.push('</urlset>', '');
      fs.writeFileSync(path.join(dossierBuild, 'sitemap.xml'), xml.join('\n'));
      console.log(`[seo] ${urlsSitemap.length} pages pré-générées (${LANGUES_SEO.join(', ')}) + sitemap.xml`);
    },
  };
}
