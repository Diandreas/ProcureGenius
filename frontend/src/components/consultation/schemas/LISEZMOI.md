# Schémas anatomiques de la consultation — contrat et guide de dessin

Un **schéma** est un fichier de données (`schemas/<nom>.jsx`) qui contient le **dessin** (SVG) et les **zones à toucher**
d'une région du corps. Il est affiché par `SchemaCliquable` (interactif) / `SchemaSvg` (dessin pur). Le médecin touche
une zone, puis un constat ; chaque constat écrit une ligne `Libellé de la zone : constat` dans le dossier.

## 1. Contrat d'un fichier de schéma

```jsx
import React from 'react';
import { zone, chemin, cercle, ellipse, rectangle, aire, paire, miroirX, miroirFormes, symetrique } from './outils';

export default {
    id: 'corps-adulte',                 // identifiant stable, en minuscules, sans espace
    titre: 'Corps adulte',
    vues: [                             // une ou plusieurs vues (face / dos / profil…)
        {
            id: 'face',                 // unique dans le schéma
            titre: 'Face',              // texte du bouton de bascule si plusieurs vues
            viewBox: '0 0 300 640',     // coordonnées libres ; le dessin est mis à l'échelle
            largeur: 220,               // largeur d'affichage souhaitée sur ordinateur, en px
            reperes: true,              // facultatif : autorise « Placer un repère » (lésions libres) sur cette vue
            decor: (c, opts) => (<g>…</g>),   // dessin NON cliquable, voir §2
            etiquettes: [{ x: 60, y: 14, texte: 'D', ancre: 'middle', taille: 12 }],   // facultatif : repères D / G, titres
            zones: {                    // ids uniques dans TOUT le schéma (toutes vues confondues)
                epigastre: zone('Épigastre', 'Abdomen', ['Normal', 'Douleur', 'Défense'], [chemin('M…Z')]),
            },
        },
    ],
};
```

* `zone(libelle, groupe, constats, formes)` ; `formes` = liste de `{ type, props }` (`path`, `circle`, `ellipse`, `rect`,
  `polygon`) : utiliser les raccourcis `chemin`, `cercle`, `ellipse`, `rectangle` d'`outils.js`.
* **`constats[0]` est TOUJOURS le constat normal** (« Normal », « Souple, indolore », « Col sain »…). Il colore la zone
  en vert ; tout autre constat la colore en rouge.
* **`libelle`** : français clinique, sans abréviation obscure, unique dans le schéma ; il est écrit tel quel dans le dossier.
  Orthographe et accents corrects. Ne jamais renommer un libellé existant sans raison : les anciennes notes le contiennent.
* **constats** : 4 à 10 par zone, termes de sémiologie réellement utilisés par un médecin francophone (« Défense »,
  « Signe de Murphy », « Souffle systolique », « Râles crépitants », « Frottis… »). Pas de phrases, pas de « : » dans un constat.
* **`aire(forme)`** : zone d'appui invisible. Obligatoire pour toute zone dont la plus petite dimension, une fois le
  dessin affiché à `largeur` px, fait moins de ~36 px (foyers d'auscultation, mamelon, tympan…) : ajouter une `aire`
  plus grande autour de la forme visible.
* Convention gauche/droite : en vue de **face**, le côté DROIT du patient est à GAUCHE de l'écran ; en vue de **dos**,
  il est à DROITE de l'écran. Placer des `etiquettes` « D » / « G » (ou « Droit » / « Gauche ») pour que ce soit évident.
* Aucun import autre que `react` et `./outils`. Aucun hook dans `decor` (c'est une simple fonction).

## 2. Dessiner : palette `c` et style

`decor(c, opts)` reçoit la palette (clair ET sombre : tout doit rester lisible dans les deux) :

| clé | usage |
|---|---|
| `c.trait` / `c.traitFin` | contour principal / détails fins (plis, côtes, nombril, articulations) |
| `c.chair`, `c.chairClair`, `c.chairOmbre` | remplissage du corps, reflets, ombres (bleu-gris NEUTRE : pas de teinte de peau) |
| `c.os` | os, dents |
| `c.coeur`, `c.poumon`, `c.foie`, `c.rouge` | organes et sang (teintes discrètes) |
| `c.sombre` | booléen, pour une nuance spécifique au thème sombre |
| `c.texte`, `c.fond` | texte secondaire, fond de carte |
| `c.repere` | couleur des repères posés (ne pas utiliser pour dessiner) |

`opts = { sexe: 'F'|'M'|null, ageMois: nombre|null }` : adapter finement le dessin (poitrine, bassin, épaules) si pertinent,
**sans jamais déplacer les zones** (elles doivent rester valides pour les deux sexes).

**Style attendu** : illustration médicale propre, moderne, de type atlas / application d'anatomie 2D — formes organiques
en courbes de Bézier (jamais de rectangles arrondis pour un corps), 2 à 3 tons par volume (remplissage + ombre portée
douce + reflet), contours fins et réguliers (≈ 1,2 à 1,8 unités pour un viewBox de 300 de large), repères anatomiques
discrets (clavicules, sternum, côtes suggérées, nombril, mamelons, rotules, plis du coude…). Dégradés `linearGradient`
/ `radialGradient` autorisés (ids PRÉFIXÉS par l'id du schéma et de la vue : `corps-adulte-face-peau`), pas de filtres
ni de flou. Pas de texte dans le dessin (utiliser `etiquettes`). Pas d'yeux ni de visage détaillé sauf schéma de visage.

**Proportions** : respecter les canons (adulte ≈ 7,5 têtes de haut ; épaules ≈ 2 têtes de large chez l'homme, ≈ 1,75 chez la
femme ; mamelons à 2 têtes, nombril à 3 têtes, pubis à 4 têtes, genoux à 5,5 têtes ; poignets à hauteur du pubis ; bras
le long du corps légèrement écartés pour que les aisselles et les flancs restent cliquables). Enfant et nourrisson : têtes
plus grandes (voir le brief du schéma).

**Zones** : suivent les vraies régions anatomiques (poumons en forme de poumons, abdomen en 9 régions qui se raccordent
exactement, etc.), restent à l'intérieur de la silhouette, ne se chevauchent pas (sauf organe superposé voulu), n'ont aucun trou
entre régions voisines d'un même ensemble. Les zones sont dessinées PAR-DESSUS le décor (remplissage translucide).

**Outils** (`outils.js`) : dessiner UNE moitié (côté gauche de l'écran) puis la refléter : `symetrique(axe, forme1, forme2…)`
pour le décor, `paire(id, axe, 'face'|'dos', { libelles:[droit, gauche], groupe, constats, formes })` pour les zones droite/gauche.
`miroirX(d, axe)` reflète un chemin absolu. **Les chemins doivent être en coordonnées absolues** (M L H V C S Q T A Z en majuscules).

## 3. Voir son dessin (obligatoire)

Depuis `frontend/` :

```bash
node dev-preview/preview.mjs dev-preview/schema_preview.jsx dev-preview/out/<monschema>/clair.png \
     --schema=src/components/consultation/schemas/<fichier>.jsx --mode=light --w=1400 --h=900
```

Puis **ouvrir l'image avec l'outil Read** et la regarder réellement. Options : `--mode=dark` (thème sombre, à vérifier aussi),
`--w=375 --q="app=340&taille=300"` (téléphone), `--q="panneaux=repos,zones"` (choix des panneaux : `repos`, `decor`, `zones`, `etats`, `app`),
`--q="vue=dos"`, `--q="sexe=F"`, `--q="ageMois=18"`, `--scale=3` (détail), `--sel="svg"` (photographier un seul élément).
Chaque rendu prend ~4 s. Les erreurs de compilation et les messages de la console s'affichent dans le terminal :
**un rendu sans message d'erreur ne prouve rien tant que l'image n'a pas été regardée.**

Panneaux : *Repos* (ce que voit le médecin), *Décor seul*, *Zones numérotées* (chaque zone d'une couleur et d'un numéro : sert à
vérifier forme, couverture, chevauchements), *États* (sélection / normal / anormal), *Dans l'application* (composant réel).

Dossier de sortie : `frontend/dev-preview/out/<votre-schema>/` uniquement (ne rien écrire ailleurs que dans votre fichier de schéma).

## 4. Critères d'acceptation

1. Reconnaissable au premier coup d'œil, proportions et orientation justes, silhouette fluide (aucune forme géométrique « mannequin »).
2. Lisible en clair ET en sombre, à 220 px de large (ordinateur) et à 340 px (téléphone).
3. Chaque zone : bonne forme anatomique, bonne position, cible tactile suffisante, libellé exact, constats cliniquement justes.
4. Régions voisines jointives, sans chevauchement parasite ni trou.
5. Fichier valide, < 60 Ko, aucun import hors `react` / `./outils`, ids de dégradés uniques.
