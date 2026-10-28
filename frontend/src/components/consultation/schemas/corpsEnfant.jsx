import React from 'react';
import { zone, chemin, aire, ellipse, paire, miroirX } from './outils';

// Corps enfant (5-6 ans, neutre) — face et dos. Illustration moderne : volumes lisses, dégradés doux.
// Le dessin est calculé à partir de points de contrôle (splines de Catmull-Rom converties en courbes de Bézier
// absolues) ; les zones à toucher réutilisent exactement les mêmes courbes que le dessin.

const AXE = 130;
const f2 = (n) => Math.round(n * 100) / 100;
const f1 = (n) => Math.round(n * 10) / 10;
const mir = (pts) => pts.map(([x, y]) => [2 * AXE - x, y]);

/* ------------------------------------------------------------------ géométrie générique */
const courbe = (pts, k = 1) => {
    let s = '';
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
        s += `C${f2(p1[0] + (p2[0] - p0[0]) * k / 6)} ${f2(p1[1] + (p2[1] - p0[1]) * k / 6)} ${f2(p2[0] - (p3[0] - p1[0]) * k / 6)} ${f2(p2[1] - (p3[1] - p1[1]) * k / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
    }
    return s;
};
const trace = (morceaux) => morceaux.map((m, i) => `${i === 0 ? 'M' : 'L'}${f2(m[0][0])} ${f2(m[0][1])}${courbe(m)}`).join('');
const boucle = (pts, k = 1) => {
    const n = pts.length;
    let s = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        s += `C${f2(p1[0] + (p2[0] - p0[0]) * k / 6)} ${f2(p1[1] + (p2[1] - p0[1]) * k / 6)} ${f2(p2[0] - (p3[0] - p1[0]) * k / 6)} ${f2(p2[1] - (p3[1] - p1[1]) * k / 6)} ${f2(p2[0])} ${f2(p2[1])}`;
    }
    return s + 'Z';
};
const dense = (pts, n = 6, k = 1) => {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
        const b1 = [p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6];
        const b2 = [p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6];
        for (let j = 1; j <= n; j++) {
            const t = j / n, u = 1 - t;
            out.push([u * u * u * p1[0] + 3 * u * u * t * b1[0] + 3 * u * t * t * b2[0] + t * t * t * p2[0],
                u * u * u * p1[1] + 3 * u * u * t * b1[1] + 3 * u * t * t * b2[1] + t * t * t * p2[1]]);
        }
    }
    return out;
};
const poly = (pts) => `M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z`;
const ligne = (pts) => `M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
const rev = (a) => a.slice().reverse();
const interp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// portion d'une polyligne dont y croît, entre ya et yb
const coupe = (pl, ya, yb) => {
    const out = [];
    for (let i = 0; i < pl.length - 1; i++) {
        const a = pl[i], b = pl[i + 1];
        if (b[1] < ya || a[1] > yb || a[1] === b[1]) continue;
        if (!out.length) out.push(a[1] >= ya ? a : interp(a, b, (ya - a[1]) / (b[1] - a[1])));
        out.push(b[1] <= yb ? b : interp(a, b, (yb - a[1]) / (b[1] - a[1])));
    }
    return out;
};
// portion d'une polyligne dont x croît, entre xa et xb
const coupeX = (pl, xa, xb) => {
    const out = [];
    for (let i = 0; i < pl.length - 1; i++) {
        const a = pl[i], b = pl[i + 1];
        if (b[0] < xa || a[0] > xb || a[0] === b[0]) continue;
        if (!out.length) out.push(a[0] >= xa ? a : interp(a, b, (xa - a[0]) / (b[0] - a[0])));
        out.push(b[0] <= xb ? b : interp(a, b, (xb - a[0]) / (b[0] - a[0])));
    }
    return out;
};
const auY = (pl, y) => { const p = coupe(pl, y, y + 0.001); return p[0]; };
const auX = (pl, x) => { const p = coupeX(pl, x, x + 0.001); return p[0]; };

// bords d'un membre décrit par [x, y, demi-largeur] le long de son axe
const bords = (st) => {
    const ext = [], int = [];
    st.forEach((s, i) => {
        const a = st[Math.max(i - 1, 0)], b = st[Math.min(i + 1, st.length - 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const l = Math.hypot(tx, ty); tx /= l; ty /= l;
        ext.push([s[0] - ty * s[2], s[1] + tx * s[2]]);
        int.push([s[0] + ty * s[2], s[1] - tx * s[2]]);
    });
    return { ext, int };
};
// bande entre les fractions a et b de la demi-largeur (−1 = bord externe, +1 = bord interne)
const bande = (st, a, b, n = 5) => {
    const pa = [], pb = [];
    st.forEach((s, i) => {
        const p = st[Math.max(i - 1, 0)], q = st[Math.min(i + 1, st.length - 1)];
        let tx = q[0] - p[0], ty = q[1] - p[1];
        const l = Math.hypot(tx, ty); tx /= l; ty /= l;
        pa.push([s[0] + ty * s[2] * a, s[1] - tx * s[2] * a]);
        pb.push([s[0] + ty * s[2] * b, s[1] - tx * s[2] * b]);
    });
    return poly([...dense(pa, n), ...rev(dense(pb, n))]);
};

// reflet en forme de lentille le long d'un membre (s'efface aux extrémités)
const lentille = (st, a, b, n = 5) => {
    const pa = [], pb = [];
    st.forEach((s, i) => {
        const p = st[Math.max(i - 1, 0)], q = st[Math.min(i + 1, st.length - 1)];
        let tx = q[0] - p[0], ty = q[1] - p[1];
        const l = Math.hypot(tx, ty); tx /= l; ty /= l;
        const g = Math.pow(Math.sin(Math.PI * i / (st.length - 1)), 0.6);
        pa.push([s[0] + ty * s[2] * a * g, s[1] - tx * s[2] * a * g]);
        pb.push([s[0] + ty * s[2] * b * g, s[1] - tx * s[2] * b * g]);
    });
    return poly([...dense(pa, n), ...rev(dense(pb, n))]);
};

/* ------------------------------------------------------------------ anatomie */
// bras gauche de l'écran (= bras droit du patient en vue de face) : [x, y, demi-largeur]
const BRAS = [[80, 146, 14.5], [75.5, 172, 13.4], [70.5, 198, 12.2], [64.5, 224, 11.6], [58.5, 245, 11.8], [52, 265, 10], [46.5, 284, 8.2]];
const JAMBE = [[107, 300, 22], [106, 336, 20.4], [104.5, 372, 18], [103.2, 408, 18.2], [102.4, 432, 16.9], [101.8, 456, 18.5], [103.6, 488, 13.8], [103.5, 516, 10.8]];
const bB = bords(BRAS);
const bJ = bords(JAMBE);

// crâne : moitié gauche, du sommet au menton
const TETE_G = [[130, 14], [116, 15.3], [104, 22.6], [97.4, 36.5], [95.8, 51.5], [96.6, 66], [99, 79.5], [104.6, 91], [113, 98.2], [122, 101.3], [130, 101.8]];
const TETE = boucle([...TETE_G, ...mir(TETE_G.slice(1, -1)).reverse()]);
const TETE_G_DOS = [[130, 14], [116, 15.3], [104, 22.6], [97.4, 36.5], [95.8, 51.5], [96.6, 66], [99.2, 79.5], [103.8, 89.5], [111.5, 95.2], [120.5, 97.4], [130, 98]];
const TETE_DOS = boucle([...TETE_G_DOS, ...mir(TETE_G_DOS.slice(1, -1)).reverse()]);
const OREILLE = boucle([[97.5, 53], [93.8, 52.5], [90.7, 55.5], [89.6, 62], [90.6, 69], [93.4, 74.5], [97, 76.5], [98.5, 70], [98.5, 58]]);

// cou et épaule
const COU = [[115.5, 90], [113.8, 98], [112, 107], [109, 115.2]];
const EPAULE = [[109, 115.2], [104.5, 118.6], [96, 121.4], [85, 124.5], [77, 128.5], [70.5, 135.5], [66.8, 144.5]];
const FLANC = [[87, 182], [86.5, 196], [87.2, 212], [88.4, 232], [87.8, 254], [86.5, 274], [85.2, 290]];
const AISSELLE = [[87, 182], [85.6, 190.5]];

// main (repère local : origine au poignet, y le long de la main, x vers la droite de l'écran)
const dW = (() => { const a = BRAS[5], b = BRAS[6]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();
const rW = [dW[1], -dW[0]];
const main = (pts) => pts.map(([x, y]) => [BRAS[6][0] + x * rW[0] + y * dW[0], BRAS[6][1] + x * rW[1] + y * dW[1]]);
const N0 = [-11.8, 25.5], N1 = [-5.9, 41], N2 = [0.2, 44.5], N3 = [6, 38.5];
const MAIN_LOCAL = [
    [[-8.2, 0], [-9.9, 6.5], [-13, 12.5], [-16.3, 18.5], [-18.4, 25], [-18.5, 31], [-16.5, 35.2], [-13.8, 34.6], [-12.6, 30], N0],
    [N0, [-11.95, 34], [-11.6, 41.5], [-10.5, 46.5], [-8.8, 48.6], [-7.1, 47.6], [-6.1, 44.8], N1],
    [N1, [-6, 46.5], [-5, 51], [-3.2, 53.6], [-1.3, 53.5], [-0.1, 50.8], [0.15, 47.5], N2],
    [N2, [0.3, 47], [1.2, 49.8], [3, 51.3], [4.8, 50.2], [5.8, 47.2], [6, 43], N3],
    [N3, [6.2, 40.5], [7.2, 42.8], [9, 43.6], [10.7, 42.2], [11.4, 39], [11.4, 34]],
    [[11.4, 34], [11.3, 26], [10.6, 16], [9.5, 7], [8.2, 0]],
];
const MAIN = MAIN_LOCAL.map(main);

// pied
const EJ = bJ.ext[7], IJ = bJ.int[7];
const ORTEILS = [[82.6, 88.8, 546.4], [88.8, 95.6, 548], [95.6, 102.8, 549], [102.8, 110.6, 549.4], [110.6, 121.4, 549.8]];
const PIED_FACE = (() => {
    const p = [[EJ, [91, 523], [88.2, 530], [85, 536], [83, 541.5], [82.6, 545]]];
    ORTEILS.forEach(([x0, x1, y]) => { const w = x1 - x0; p.push([[x0 + 0.1, y - 2.6], [x0 + 0.9, y - 0.8], [x0 + w / 2, y], [x1 - 0.9, y - 0.8], [x1 - 0.1, y - 2.6]]); });
    p.push([[121.5, 547], [121.2, 540], [119.4, 532], [117, 525], IJ]);
    return p;
})();
const PIED_DOS = [[EJ, [91.4, 524], [90, 531], [87.8, 538], [85, 543.2], [84.6, 547], [87, 549.4], [95, 549.8], [104, 550], [113, 549.8], [120.4, 549.4], [122.2, 547], [121.6, 543.2], [119, 538], [116.6, 531], [115, 524], IJ]];

/* ------------------------------------------------------------------ silhouette */
const SORTIE = [...FLANC, ...bJ.ext];
const ENTREE = [[130, 323], [127.2, 328.5], ...bJ.int.slice(1)];
const piecesGauche = (vue) => [
    [...COU, ...EPAULE.slice(1), ...bB.ext.slice(1)],
    ...MAIN,
    [...rev(bB.int.slice(2)), ...rev(AISSELLE)],
    SORTIE,
    ...(vue === 'face' ? PIED_FACE : PIED_DOS),
    [...rev(bJ.int.slice(1)), [127.2, 328.5], [130, 323]],
];
const silhouette = (vue) => {
    const g = piecesGauche(vue);
    const d = g.slice().reverse().map((p) => mir(p).reverse());
    return trace([...g, ...d]) + 'Z';
};
// bords denses réutilisés par les zones
const OUTd = dense(SORTIE);
const INd = dense(ENTREE);
const EXTBRASd = dense([...EPAULE, ...bB.ext.slice(1)]);
const INTBRASd = dense([...AISSELLE, ...bB.int.slice(2)]);
const Sd = dense([[109, 115.2], [105, 124], [99.5, 138], [95, 154], [91, 168], [87, 182]]);
const CBd = dense([[109, 115.2], [117, 118.8], [123.5, 120.8], [130, 121.8]]);
const NKd = dense([[113.8, 98], [112, 107], [109, 115.2]]);
const MAINd = MAIN.flatMap((p) => dense(p, 4));
const PIEDd_FACE = PIED_FACE.flatMap((p) => dense(p, 4));
const PIEDd_DOS = PIED_DOS.flatMap((p) => dense(p, 4));

/* ------------------------------------------------------------------ constats */
const MEMBRE = ['Normal', 'Douleur', 'Tuméfaction', 'Plaie', 'Déformation', 'Œdème', 'Éruption cutanée', 'Impotence fonctionnelle'];
const C = {
    tete: ['Normal', 'Gorge rouge', 'Amygdales hypertrophiées', 'Otite', 'Adénopathies cervicales', 'Conjonctives pâles', 'Ictère', 'Yeux enfoncés'],
    cou: ['Normal', 'Adénopathies cervicales', 'Raideur de nuque', 'Goitre', 'Torticolis', 'Tuméfaction cervicale'],
    poumon: ['Murmure vésiculaire normal', 'Tirage sous-costal', 'Tirage intercostal', 'Polypnée', 'Sibilants', 'Râles crépitants', 'Ronchi', 'Murmure vésiculaire diminué', 'Battement des ailes du nez', 'Matité'],
    coeur: ['Bruits du cœur normaux', 'Tachycardie', 'Bradycardie', 'Souffle systolique', 'Souffle diastolique', 'Bruit de galop', 'Frémissement', 'Cyanose'],
    aisselle: ['Normal', 'Adénopathies axillaires', 'Abcès', 'Intertrigo', 'Tuméfaction'],
    hypochondreD: ['Souple, indolore', 'Hépatomégalie', 'Douleur', 'Défense', 'Météorisme', 'Signe de Murphy'],
    hypochondreG: ['Souple, indolore', 'Splénomégalie', 'Douleur', 'Défense', 'Météorisme', 'Masse'],
    epigastre: ['Souple, indolore', 'Douleur épigastrique', 'Défense', 'Météorisme', 'Masse', 'Hépatomégalie'],
    flanc: ['Souple, indolore', 'Douleur', 'Météorisme', 'Défense', 'Masse', 'Ballottement rénal'],
    ombilic: ['Souple, indolore', 'Douleur péri-ombilicale', 'Météorisme', 'Hernie ombilicale', 'Masse', 'Pli cutané persistant', 'Défense'],
    fidD: ['Souple, indolore', 'Douleur FID', 'Défense', 'Signe de Blumberg', 'Masse', 'Météorisme'],
    fidG: ['Souple, indolore', 'Douleur FIG', 'Défense', 'Masse', 'Météorisme', 'Fécalome'],
    hypogastre: ['Souple, indolore', 'Douleur hypogastrique', 'Globe vésical', 'Masse', 'Défense', 'Météorisme'],
    inguinal: ['Normal', 'Hernie', 'Adénopathies', 'Tuméfaction', 'Douleur'],
    genital: ['Normal', 'Phimosis', 'Hydrocèle', 'Testicule non descendu', 'Écoulement', 'Érythème / irritation', 'Synéchie des petites lèvres', 'Hernie inguino-scrotale'],
    epaule: ['Normal', 'Douleur', 'Tuméfaction', 'Plaie', 'Déformation', 'Cicatrice vaccinale (BCG)', 'Impotence fonctionnelle', 'Éruption cutanée'],
    avantBras: ['Normal', 'Œdème', 'Douleur', 'Plaie', 'Déformation', 'Pâleur palmaire', 'Éruption cutanée', 'Impotence fonctionnelle'],
    cuisse: ['Normal', 'Douleur', 'Tuméfaction', 'Plaie', 'Déformation', 'Abcès', 'Éruption cutanée', 'Impotence fonctionnelle'],
    genou: ['Normal', 'Gonflement', 'Douleur', 'Limitation de la mobilité', 'Plaie', 'Genu valgum', 'Genu varum'],
    jambe: ['Normal', 'Œdème des pieds', 'Plaie', 'Déformation', 'Pied bot', 'Douleur', 'Ulcère', 'Éruption cutanée'],
    // dos
    teteDos: ['Normal', 'Plaie du cuir chevelu', 'Teigne', 'Tuméfaction', 'Pédiculose', 'Cheveux clairsemés'],
    rachisCervical: ['Normal', 'Raideur de nuque', 'Douleur à la palpation', 'Adénopathies cervicales', 'Torticolis', 'Tuméfaction'],
    omoplate: ['Normal', 'Omoplate saillante', 'Douleur', 'Tuméfaction', 'Plaie', 'Éruption cutanée'],
    pulmDos: ['Murmure vésiculaire normal', 'Râles crépitants', 'Sibilants', 'Ronchi', 'Murmure vésiculaire diminué', 'Souffle tubaire', 'Matité', 'Frottement pleural'],
    rachisDorsal: ['Normal', 'Cyphose', 'Scoliose', 'Gibbosité', 'Douleur à la percussion', 'Déformation', 'Tuméfaction'],
    rachisLombaire: ['Normal', 'Hyperlordose', 'Scoliose', 'Douleur à la percussion', 'Contracture paravertébrale', 'Tuméfaction'],
    sacre: ['Normal', 'Fossette sacrée', 'Touffe de poils', 'Tuméfaction sacrée', 'Escarre', 'Érythème fessier'],
    fosseLombaire: ['Normal', 'Douleur à l’ébranlement lombaire', 'Tuméfaction', 'Masse', 'Contracture'],
    fesse: ['Normal', 'Érythème fessier', 'Abcès', 'Plaie', 'Escarre', 'Éruption cutanée', 'Atrophie musculaire'],
};

/* ------------------------------------------------------------------ zones : géométrie commune */
const A_FLANC = auY(OUTd, 284);
const LIG = dense([A_FLANC, [97, 288.5], [106, 294], [113, 300], [121.5, 305.5]]);
const LIGcourt = coupeX(LIG, A_FLANC[0], 113);
const BC = dense([[113, 300], [121.5, 305.5], [130, 307.5], [138.5, 305.5], [147, 300]]);
const GS = dense([[113, 300], [118.5, 309.5], [124.5, 318], [130, 323.2]]);
const CMd = dense([[88.4, 219.5], [100, 213.5], [113, 207], [122, 202.5], [130, 199.5]]);
const LB = dense([A_FLANC, [87.4, 296], [89.6, 312], [92, 334]]);
const AXI = dense([[95, 154], [100.5, 163], [99.5, 174], [93.5, 183.5], [87, 182]]);
const JAW = dense([[113, 98.2], [122, 101.3], [130, 101.8]]);
const SCAP = boucle([[117, 141], [108, 143], [100, 148.5], [97.5, 156], [99, 167], [103, 177.5], [108, 186.5], [112, 189], [114.2, 184], [115.8, 164]]);

const JAW_DOS = dense([[114.2, 96], [120.5, 97.4], [130, 98]]);
const NKd_DOS = dense([[114.2, 96], [112, 107], [109, 115.2]]);
const COU_POLY = poly([...NKd, ...CBd, ...rev(mir(CBd)), ...rev(mir(NKd)), ...mir(JAW), ...rev(JAW)]);
const COU_DOS = poly([...NKd_DOS, ...CBd, ...rev(mir(CBd)), ...rev(mir(NKd_DOS)), ...mir(JAW_DOS), ...rev(JAW_DOS)]);

const zonesMembres = (vue) => {
    const suf = vue === 'dos' ? ' (dos)' : '';
    const bras = poly([...coupe(EXTBRASd, 115, 216), ...rev(coupe(INTBRASd, 182, 216)), ...rev(Sd)]);
    const avBras = poly([...coupe(EXTBRASd, 216, 400), ...MAINd, ...rev(coupe(INTBRASd, 216, 400))]);
    const genou = poly([...coupe(OUTd, 388, 436), ...rev(coupe(INd, 388, 436))]);
    const jambe = poly([...coupe(OUTd, 436, 600), ...(vue === 'face' ? PIEDd_FACE : PIEDd_DOS), ...rev(coupe(INd, 436, 600))]);
    const g = (id, lib, groupe, constats, d) => paire(id, AXE, vue, { libelles: lib, groupe, constats, formes: [chemin(d)] });
    return {
        ...g('bras', [`Épaule/bras droit${suf}`, `Épaule/bras gauche${suf}`], 'Membres supérieurs', C.epaule, bras),
        ...g('avbras', [`Avant-bras et main droits${suf}`, `Avant-bras et main gauches${suf}`], 'Membres supérieurs', C.avantBras, avBras),
        ...g('genou', [`Genou droit${suf}`, `Genou gauche${suf}`], 'Membres inférieurs', C.genou, genou),
        ...g('jambe', [`Jambe et pied droits${suf}`, `Jambe et pied gauches${suf}`], 'Membres inférieurs', C.jambe, jambe),
    };
};

const zonesFace = () => {
    const bas = BC;
    const P = auY(Sd, 130);
    const sommet = dense([P, [106.5, 127], [113.5, 125.4], [120.5, 126.6], [125.6, 131.5], [127, 138]]);
    const poumon = poly([...sommet, [126.5, 170], ...rev(coupeX(CMd, 88.4, 126)), ...rev(coupe(OUTd, 182, 219.5)), ...rev(AXI), ...rev(coupe(Sd, P[1], 154))]);
    const aisselle = poly([...coupe(Sd, 154, 182), ...rev(AXI)]);
    const hypo = poly([...coupeX(CMd, 88.4, 113), [113, 236], ...rev(coupe(OUTd, 219.5, 236))]);
    const flanc = poly([[113, 236], [113, 268], ...rev(coupe(OUTd, 236, 268))]);
    const fid = poly([[113, 268], ...coupe(OUTd, 268, 284), ...LIGcourt]);
    const moitieCM = coupeX(CMd, 113, 130);
    const epig = poly([...moitieCM, ...mir(rev(moitieCM)), [147, 236], [113, 236]]);
    const inguinal = poly([...LIGcourt, ...GS.slice(1), ...coupe(INd, 323.2, 334).slice(1), ...rev(LB)]);
    const cuisse = poly([...LB, ...coupe(INd, 334, 388), ...rev(coupe(OUTd, 284, 388))]);
    const p = (id, lib, groupe, constats, forme, extra = []) => paire(id, AXE, 'face', { libelles: lib, groupe, constats, formes: [chemin(forme), ...extra] });
    return {
        tete: zone('Tête / ORL', 'Tête et cou', C.tete, [chemin(TETE), chemin(OREILLE), chemin(miroirX(OREILLE, AXE))]),
        cou: zone('Cou', 'Tête et cou', C.cou, [chemin(COU_POLY)]),
        ...p('poumon', ['Poumon droit', 'Poumon gauche'], 'Thorax', C.poumon, poumon),
        coeur: zone('Cœur', 'Thorax', C.coeur, [chemin(boucle([[126.5, 150], [138, 146], [151, 150], [160, 164], [160, 180], [152, 192], [141, 199], [131, 197], [126, 184], [125.5, 166]]))]),
        ...p('aisselle', ['Aisselle droite', 'Aisselle gauche'], 'Thorax', C.aisselle, aisselle, [aire(ellipse(93, 168, 14, 25))]),
        ...p('hypochondre', ['Hypochondre droit', 'Hypochondre gauche'], 'Abdomen', C.hypochondreD, hypo),
        epigastre: zone('Épigastre', 'Abdomen', C.epigastre, [chemin(epig)]),
        ...p('flanc', ['Flanc droit', 'Flanc gauche'], 'Abdomen', C.flanc, flanc),
        ombilicale: zone('Région ombilicale', 'Abdomen', C.ombilic, [chemin(poly([[113, 236], [147, 236], [147, 268], [113, 268]]))]),
        ...p('fosse_iliaque', ['Fosse iliaque droite', 'Fosse iliaque gauche'], 'Abdomen', C.fidD, fid),
        hypogastre: zone('Hypogastre', 'Abdomen', C.hypogastre, [chemin(poly([[113, 268], [147, 268], [147, 300], ...rev(bas)]))]),
        genitaux: zone('Organes génitaux externes', 'Abdomen', C.genital, [chemin(poly([...BC, ...mir(GS), ...rev(GS)]))]),
        ...p('inguinal', ['Région inguinale droite', 'Région inguinale gauche'], 'Abdomen', C.inguinal, inguinal),
        ...p('cuisse', ['Hanche et cuisse droites', 'Hanche et cuisse gauches'], 'Membres inférieurs', C.cuisse, cuisse),
        ...zonesMembres('face'),
    };
};

const zonesDos = () => {
    const ID = auY(INd, 335.5), OD = auY(OUTd, 333), FA = auY(OUTd, 282);
    const GF = dense([ID, [115, 339.5], [100, 339.2], OD]);
    const CBl = coupeX(CBd, 109, 122);
    const P = auY(Sd, 130);
    const sommet = dense([P, [106.5, 127], [113.5, 125.6], [119, 127.5], [122, 133]]);
    const pulm = poly([...sommet, [122, 226], ...rev(coupe(OUTd, 182, 226)), ...rev(coupe(Sd, P[1], 182))]);
    const demiCB = coupeX(CBd, 122, 130);
    const dorsal = poly([...demiCB, ...mir(rev(demiCB)), [138, 226], [122, 226]]);
    const fosse = poly([[122, 226], ...coupe(OUTd, 226, 282), [122, 282]]);
    const fesse = poly([FA, [117, 282], [121.8, 303], [130, 323.2], ...coupe(INd, 323.2, ID[1]).slice(1), ...GF.slice(1), ...rev(coupe(OUTd, 282, OD[1])).slice(1)]);
    const cuisse = poly([ID, ...GF.slice(1), ...coupe(OUTd, OD[1], 388).slice(1), ...rev(coupe(INd, ID[1], 388))]);
    const p = (id, lib, groupe, constats, forme, extra = []) => paire(id, AXE, 'dos', { libelles: lib, groupe, constats, formes: [chemin(forme), ...extra] });
    return {
        tete_dos: zone('Tête (dos)', 'Tête et cou', C.teteDos, [chemin(TETE_DOS), chemin(OREILLE), chemin(miroirX(OREILLE, AXE))]),
        rachis_cervical: zone('Rachis cervical', 'Rachis', C.rachisCervical, [chemin(COU_DOS)]),
        ...p('champ_pulm', ['Champ pulmonaire postérieur droit', 'Champ pulmonaire postérieur gauche'], 'Thorax', C.pulmDos, pulm),
        ...p('omoplate', ['Omoplate droite', 'Omoplate gauche'], 'Thorax', C.omoplate, SCAP),
        ...p('fosse_lombaire', ['Fosse lombaire droite', 'Fosse lombaire gauche'], 'Abdomen', C.fosseLombaire, fosse),
        rachis_dorsal: zone('Rachis dorsal', 'Rachis', C.rachisDorsal, [chemin(dorsal), aire(chemin(poly([[117, 124], [143, 124], [143, 224], [117, 224]])))]),
        rachis_lombaire: zone('Rachis lombaire', 'Rachis', C.rachisLombaire, [chemin(poly([[122, 226], [138, 226], [138, 282], [122, 282]])), aire(chemin(poly([[117, 228], [143, 228], [143, 280], [117, 280]])))]),
        sacrum: zone('Région sacrée', 'Rachis', C.sacre, [chemin(poly([[117, 282], [143, 282], [138.2, 303], [130, 323.2], [121.8, 303]]))]),
        ...p('fesse', ['Fesse droite', 'Fesse gauche'], 'Fesses', C.fesse, fesse),
        ...p('cuisse', ['Hanche et cuisse droites (dos)', 'Hanche et cuisse gauches (dos)'], 'Membres inférieurs', C.cuisse, cuisse),
        ...zonesMembres('dos'),
    };
};

/* ------------------------------------------------------------------ décor */
const S2 = ({ d, ...p }) => (<><path d={d} {...p} /><path d={miroirX(d, AXE)} {...p} /></>);
const E2 = ({ cx, ...p }) => (<><ellipse cx={cx} {...p} /><ellipse cx={2 * AXE - cx} {...p} /></>);

const polyBras = poly([...dense(bB.ext), ...rev(dense(bB.int))]);
const polyJambe = poly([...dense(bJ.ext), ...rev(dense(bJ.int))]);
const SIL_FACE = silhouette('face');
const SIL_DOS = silhouette('dos');
const HAUT_CHEVEUX = [[94.8, 53.5], [94.4, 39], [100, 25], [113.5, 15], [130, 12.4], [146.5, 15], [160, 25], [165.6, 39], [165.2, 53.5]];
const RACINE_CHEVEUX = [[165.2, 53.5], [163.2, 46.5], [159.5, 41.5], [153, 37.2], [146, 36.4], [141, 33.6], [135, 34.6], [130, 32.8], [124.5, 34.6], [119, 33.8], [113, 36.6], [106, 37.2], [100.5, 41.5], [97, 47], [94.8, 53.5]];
const CHEVEUX_FACE = trace([HAUT_CHEVEUX, RACINE_CHEVEUX]) + 'Z';
const CHEVEUX_DOS = (() => {
    const g = [[130, 12.4], [113.5, 15], [100, 25], [94.4, 39], [94.8, 53.5], [96, 68], [99.6, 80.5], [105, 89.6], [112, 94.6], [121, 96.8], [130, 97.6]];
    return boucle([...g, ...mir(g.slice(1, -1)).reverse()]);
})();
const NAPE = [[96, 72], [99, 85], [104.5, 92], [111, 95.8], [118, 98.4], [124, 99.4], [130, 99.8]];

const Defs = ({ c, P, sil }) => (
    <defs>
        <clipPath id={`${P}clip`}><path d={sil} /></clipPath>
        <linearGradient id={`${P}ombre`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.9" />
            <stop offset="0.3" stopColor={c.chairOmbre} stopOpacity="0" />
            <stop offset="0.7" stopColor={c.chairOmbre} stopOpacity="0" />
            <stop offset="1" stopColor={c.chairOmbre} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${P}reflet`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={c.chairClair} stopOpacity="0" />
            <stop offset="0.5" stopColor={c.chairClair} stopOpacity="0.95" />
            <stop offset="1" stopColor={c.chairClair} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${P}refr`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={c.chairClair} stopOpacity="0.95" />
            <stop offset="1" stopColor={c.chairClair} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${P}ombr`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.9" />
            <stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${P}tete`} cx="0.5" cy="0.4" r="0.62">
            <stop offset="0" stopColor={c.chairClair} />
            <stop offset="0.62" stopColor={c.chair} />
            <stop offset="1" stopColor={c.chairOmbre} />
        </radialGradient>
        <linearGradient id={`${P}fond`} gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="548">
            <stop offset="0" stopColor={c.chairClair} />
            <stop offset="0.35" stopColor={c.chair} />
            <stop offset="1" stopColor={c.chair} />
        </linearGradient>
        <linearGradient id={`${P}cheveux`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.chairOmbre} />
            <stop offset="1" stopColor={c.traitFin} stopOpacity="0.4" />
        </linearGradient>
    </defs>
);

const Corps = ({ c, P, vue }) => {
    const face = vue === 'face';
    const sil = face ? SIL_FACE : SIL_DOS;
    const fin = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
    const u = (nom) => `url(#${P}${nom})`;
    return (
        <g>
            <Defs c={c} P={P} sil={sil} />
            {/* ombre portée au sol */}
            <ellipse cx="130" cy="549.5" rx="62" ry="4.6" fill={c.trait} opacity="0.1" />
            <ellipse cx="130" cy="549.5" rx="44" ry="2.8" fill={c.trait} opacity="0.12" />
            <path d={sil} fill={u('fond')} />
            <g clipPath={`url(#${P}clip)`}>
                {/* liseré d'ombre intérieur : donne du volume à tout le corps, sans arête dure */}
                <path d={sil} fill="none" stroke={c.chairOmbre} strokeWidth="18" strokeLinejoin="round" opacity="0.2" />
                <path d={sil} fill="none" stroke={c.chairOmbre} strokeWidth="11" strokeLinejoin="round" opacity="0.28" />
                <path d={sil} fill="none" stroke={c.chairOmbre} strokeWidth="5" strokeLinejoin="round" opacity="0.4" />
                <path d={sil} fill="none" stroke={c.traitFin} strokeWidth="6" strokeLinejoin="round" opacity="0.14" />
                <ellipse cx="130" cy="214" rx="34" ry="8" fill={u('ombr')} opacity="0.4" />
                {/* tronc */}
                <ellipse cx="130" cy="160" rx="38" ry="30" fill={u('refr')} />
                <ellipse cx="130" cy="256" rx="32" ry="42" fill={u('refr')} />
                <ellipse cx="130" cy="298" rx="30" ry="9" fill={u('ombr')} opacity="0.7" />
                {/* cou */}
                <ellipse cx="130" cy="106" rx="22" ry="9" fill={u('ombr')} />
                {/* membres */}
                <S2 d={lentille(BRAS, -0.5, 0.2)} fill={u('reflet')} />
                <S2 d={lentille(JAMBE, -0.5, 0.25)} fill={u('reflet')} />
                <E2 cx={74} cy="140" rx="9" ry="14" fill={u('refr')} />
                <E2 cx={90} cy="176" rx="6" ry="11" fill={u('ombr')} opacity="0.8" />
                <ellipse cx="130" cy="326" rx="12" ry="10" fill={u('ombr')} opacity="0.8" />
                {face ? (
                    <E2 cx={103.5} cy="408" rx="11" ry="12" fill={u('refr')} />
                ) : (
                    <>
                        <E2 cx={104} cy="414" rx="11" ry="9" fill={u('ombr')} opacity="0.75" />
                        <E2 cx={110} cy="316" rx="18" ry="22" fill={u('refr')} />
                        <E2 cx={110} cy="342" rx="18" ry="5" fill={u('ombr')} opacity="0.6" />
                        <E2 cx={110} cy="168" rx="15" ry="30" fill={u('refr')} opacity="0.7" />
                    </>
                )}
            </g>
            {face ? <DetailsFace c={c} P={P} fin={fin} /> : <DetailsDos c={c} P={P} fin={fin} />}
            <path d={sil} fill="none" stroke={c.trait} strokeWidth="1.3" strokeLinejoin="round" />
            <Tete c={c} P={P} face={face} fin={fin} />
        </g>
    );
};

const DetailsMains = ({ c, fin, face }) => {
    const L = (a, b) => ligne(main([a, b]));
    const doigts = [N1, N2, N3].map(([x, y]) => L([x, y], [x, y - 12]));
    return (
        <g>
            <S2 d={doigts.join('')} {...fin} opacity="0.7" />
            {face ? (
                <>
                    <S2 d={ligne(main(dense([[-9.5, 14], [-5, 21], [2, 24.5], [8, 24]], 4)))} {...fin} opacity="0.55" />
                    <S2 d={ligne(main(dense([[-8.5, 10], [-3, 14], [2, 15.5], [8.5, 13]], 4)))} {...fin} opacity="0.4" />
                </>
            ) : (
                <>
                    {[[-8.8, 47.4], [-3.2, 52.2], [3, 49.6], [9, 41.6]].map(([x, y], i) => (
                        <S2 key={i} d={ligne(main(dense([[x - 1.7, y - 3.4], [x, y - 4.6], [x + 1.7, y - 3.4]], 3)))} {...fin} opacity="0.32" />
                    ))}
                    <S2 d={ligne(main(dense([[-9.5, 28], [-3, 25.8], [3, 26.4], [9.4, 29]], 4)))} {...fin} opacity="0.3" />
                </>
            )}
        </g>
    );
};

const DetailsFace = ({ c, P, fin }) => {
    const u = (nom) => `url(#${P}${nom})`;
    const ribs = [0, 1, 2, 3, 4, 5].map((k) => { const y = 136 + k * 10.5; return `M125.5 ${y}C114 ${y + 1} 102 ${y + 6} 93.5 ${y + 15}`; }).join('');
    return (
        <g>
            {/* cou, clavicules, sternum */}
            <S2 d="M117 98C119.5 105 124 112 127.5 120" {...fin} opacity="0.5" />
            <S2 d="M127.5 122.3C118 120.4 105 121.4 90.5 126.5" {...fin} opacity="0.8" />
            <path d="M127.6 124L127.3 191Q130 198 132.7 191L132.4 124" {...fin} opacity="0.4" />
            <S2 d={ribs} {...fin} opacity="0.32" />
            <S2 d={ligne(CMd)} {...fin} opacity="0.6" />
            {/* épaule et aisselle */}
            <S2 d="M88.5 139C81 145 77.5 155 77.5 167" {...fin} opacity="0.4" />
            <S2 d="M87.5 181C93 172 96 163 97 153" {...fin} opacity="0.5" />
            {/* mamelons */}
            <E2 cx={102} cy="178" rx="2.5" ry="2.3" fill={c.chairOmbre} stroke={c.traitFin} strokeWidth="0.8" />
            {/* abdomen */}
            <path d="M130 204L130 247M130 258L130 298" {...fin} opacity="0.22" />
            <ellipse cx="130" cy="252.5" rx="2.1" ry="3.4" fill={c.chairOmbre} stroke={c.traitFin} strokeWidth="0.9" />
            <path d="M128.4 249.2Q130 247.6 131.6 249.2" {...fin} opacity="0.7" />
            <S2 d="M104 282C112 290 121 293.5 130 293.5" {...fin} opacity="0.3" />
            <S2 d={ligne(LIG)} {...fin} opacity="0.65" />
            <S2 d="M121.5 305.5C123.5 312 126.5 318 130 323" {...fin} opacity="0.35" />
            {/* coude */}
            <S2 d="M58.5 223.5Q63.5 228.2 68.5 225.2" {...fin} opacity="0.45" />
            <DetailsMains c={c} fin={fin} face />
            {/* genou et jambe */}
            <S2 d="M96 402.5Q103.2 398.6 110.4 402.5M97 415Q103.2 420 109.6 415" {...fin} opacity="0.5" />
            <S2 d="M93 424Q103 428.5 114 424" {...fin} opacity="0.45" />
            <S2 d="M99.5 428C101 450 103 470 104 495" {...fin} opacity="0.35" />
            <S2 d="M97 512.5C94.8 514.5 95 518.2 97.4 520.4" {...fin} opacity="0.55" />
            <S2 d="M110.8 510.5C112.6 512.5 112.4 516 110.4 518.2" {...fin} opacity="0.55" />
            {/* pied */}
            <S2 d="M97 524L97.6 534M103.4 522L103.4 536M109.6 523L110 534" {...fin} opacity="0.28" />
            {ORTEILS.slice(0, 4).map(([x0, x1, y], i) => (
                <S2 key={i} d={`M${f2(x1)} ${f2(y - 2.4)}L${f2(x1 - 0.2)} ${f2(y - 9)}`} {...fin} opacity="0.45" />
            ))}
            {ORTEILS.map(([x0, x1, y], i) => (
                <S2 key={`n${i}`} d={`M${f2((x0 + x1) / 2 - (x1 - x0) * 0.26)} ${f2(y - 3.3)}Q${f2((x0 + x1) / 2)} ${f2(y - 4.8)} ${f2((x0 + x1) / 2 + (x1 - x0) * 0.26)} ${f2(y - 3.3)}`} {...fin} opacity="0.6" />
            ))}
        </g>
    );
};

const DetailsDos = ({ c, P, fin }) => {
    const bosses = [];
    for (let y = 126; y <= 300; y += 10.5) bosses.push(y);
    return (
        <g>
            <S2 d="M120 98C121.5 104 123 110 124.5 117" {...fin} opacity="0.4" />
            <E2 cx={130} cy="119" rx="0.1" ry="0.1" fill="none" />
            <circle cx="130" cy="117.5" r="2.2" fill={c.chairClair} stroke={c.traitFin} strokeWidth="0.8" opacity="0.8" />
            {bosses.map((y, i) => <circle key={i} cx="130" cy={y} r="1.15" fill={c.traitFin} opacity="0.65" />)}
            <path d="M130 121L130 296" {...fin} opacity="0.2" />
            {/* omoplates */}
            <S2 d={SCAP} fill={c.chairClair} fillOpacity="0.55" stroke={c.traitFin} strokeWidth="0.9" strokeLinejoin="round" opacity="0.85" />
            <S2 d="M115 148.5C108 148 100 142.5 90 134" {...fin} opacity="0.5" />
            {/* côtes basses, crête iliaque, fossettes sacrées */}
            <S2 d={[203, 212, 221].map((y) => `M121 ${y}C110 ${y + 3} 100 ${y + 8} 92 ${y + 14}`).join('')} {...fin} opacity="0.28" />
            <S2 d="M122 228C121.4 246 121.4 264 123 280" {...fin} opacity="0.3" />
            <S2 d="M88 270C97 274 108 279 118 283.5" {...fin} opacity="0.5" />
            <E2 cx={121.5} cy="290" rx="2.4" ry="1.7" fill={c.chairOmbre} opacity="0.8" />
            <S2 d="M117 283.5L130 322.5" {...fin} opacity="0.15" />
            <S2 d="M90 300C98 311 113 316 127 308" {...fin} opacity="0.3" />
            {/* fessiers */}
            <path d="M130 298C130.8 308 129.2 316 130 323" {...fin} opacity="0.7" />
            <S2 d="M126.2 335.5C115 339.8 100 339.5 86.4 333" {...fin} opacity="0.75" />
            <S2 d="M112 345C109.5 358 108.5 372 109.5 386" {...fin} opacity="0.22" />
            {/* coude, mains */}
            <S2 d="M60.5 219.5C57.5 223.5 58.5 228.5 63 230.5C67 228.5 68 223.5 65.5 219.5" {...fin} opacity="0.3" />
            <DetailsMains c={c} fin={fin} face={false} />
            {/* creux poplité, mollet, tendon d’Achille, talon */}
            <S2 d="M87 407C96 411.5 108 411.5 119.5 406.5" {...fin} opacity="0.65" />
            <S2 d="M104 430C103.2 450 103.4 470 105 489" {...fin} opacity="0.35" />
            <S2 d="M100.6 491C101 500 101.6 508 102 517M106.4 491C106.5 500 106 508 105.4 517" {...fin} opacity="0.45" />
            <E2 cx={103.7} cy="538" rx="10" ry="7" fill={u2(P, 'refr')} opacity="0.9" />
            <S2 d="M96.6 534Q103.7 529.5 110.8 534" {...fin} opacity="0.35" />
            <S2 d="M97 512.5C94.8 514.5 95 518.2 97.4 520.4M110.8 510.5C112.6 512.5 112.4 516 110.4 518.2" {...fin} opacity="0.55" />
        </g>
    );
};
const u2 = (P, nom) => `url(#${P}${nom})`;

const Tete = ({ c, P, face, fin }) => {
    const u = (nom) => `url(#${P}${nom})`;
    return (
        <g>
            <path d={OREILLE} fill={c.chair} stroke={c.trait} strokeWidth="1.2" strokeLinejoin="round" />
            <path d={miroirX(OREILLE, AXE)} fill={c.chair} stroke={c.trait} strokeWidth="1.2" strokeLinejoin="round" />
            <S2 d="M95.6 57C92.6 58 91.8 63 92.6 67.5C93.2 70.5 94.6 72 96.4 72.6" {...fin} opacity="0.7" />
            <path d={face ? TETE : TETE_DOS} fill={u('tete')} stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            {face ? (
                <>
                    <path d={CHEVEUX_FACE} fill={u('cheveux')} />
                    <path d={trace([HAUT_CHEVEUX])} fill="none" stroke={c.trait} strokeWidth="1.3" strokeLinejoin="round" />
                    <path d={trace([RACINE_CHEVEUX])} fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinejoin="round" />
                    <path d="M130 13C131 21 136 28 148 33.5M118 15C118.5 21 122 27 127 31M143 14.5C148 21 156 28 162 33" {...fin} opacity="0.4" />
                    {/* modelé du visage */}
                    <ellipse cx="130" cy="44" rx="17" ry="6" fill={u('refr')} opacity="0.8" />
                    <E2 cx={110} cy="76" rx="9" ry="9" fill={u('ombr')} opacity="0.35" />
                    <ellipse cx="130" cy="97" rx="11" ry="3.2" fill={u('ombr')} opacity="0.6" />
                    <S2 d="M106 52.5Q115 48.8 124 52" {...fin} opacity="0.55" />
                    <path d="M130 56C129.2 63 128 69 126 75" {...fin} opacity="0.3" />
                    <path d="M123.8 77.2Q130 82 136.2 77.2" {...fin} opacity="0.75" />
                    <E2 cx={125.6} cy="77.4" rx="1.5" ry="0.9" fill={c.traitFin} opacity="0.7" />
                    <path d="M121.4 88.6Q130 92 138.6 88.6" {...fin} opacity="0.85" />
                    <path d="M125 93.4Q130 95.6 135 93.4" {...fin} opacity="0.35" />
                </>
            ) : (
                <>
                    <path d={TETE_DOS} fill={u('cheveux')} opacity="0.8" />
                    <path d={TETE_DOS} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
                    <S2 d="M128 24C121 25 115 30 112 38M127 28C118 31 110 40 106 52M126 33C118 38 110 48 106 62M127 40C121 48 116 60 114 74M129 46C126 58 124 72 124 88" {...fin} opacity="0.4" />
                    <path d="M130.6 27.5C126.8 27.5 125.6 22.8 128.6 21.4C131.6 20.2 134.2 23 132.8 25.4" {...fin} opacity="0.5" />
                </>
            )}
        </g>
    );
};

const vueFace = {
    id: 'face',
    titre: 'Face',
    viewBox: '0 0 260 560',
    largeur: 250,
    decor: (c) => <Corps c={c} P="corps-enfant-face-candb-" vue="face" />,
    etiquettes: [
        { x: 22, y: 30, texte: 'D', ancre: 'middle', taille: 14 },
        { x: 238, y: 30, texte: 'G', ancre: 'middle', taille: 14 },
    ],
    zones: zonesFace(),
};

const vueDos = {
    id: 'dos',
    titre: 'Dos',
    viewBox: '0 0 260 560',
    largeur: 250,
    decor: (c) => <Corps c={c} P="corps-enfant-dos-candb-" vue="dos" />,
    etiquettes: [
        { x: 22, y: 30, texte: 'G', ancre: 'middle', taille: 14 },
        { x: 238, y: 30, texte: 'D', ancre: 'middle', taille: 14 },
    ],
    zones: zonesDos(),
};

export default {
    id: 'corps-enfant',
    titre: 'Corps enfant (face et dos)',
    vues: [vueFace, vueDos],
};
