import React from 'react';
import { zone, chemin, aire, transformerChemin } from './outils';

// ORL : OREILLES, GORGE, SINUS — planche d'atlas (candidat A).
// Trois vues : otoscopie des deux oreilles, bouche ouverte vue de face, face avec projection des sinus.

const r2 = (n) => Math.round(n * 100) / 100;

// Courbe lisse (Catmull-Rom converti en Bézier cubiques), coordonnées absolues.
const lisse = (pts, ferme = true, t = 1 / 6) => {
    const n = pts.length;
    const g = (i) => pts[((i % n) + n) % n];
    let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`;
    const fin = ferme ? n : n - 1;
    for (let i = 0; i < fin; i++) {
        const p0 = ferme ? g(i - 1) : pts[Math.max(i - 1, 0)];
        const p1 = g(i);
        const p2 = ferme ? g(i + 1) : pts[i + 1];
        const p3 = ferme ? g(i + 2) : pts[Math.min(i + 2, n - 1)];
        d += `C${r2(p1[0] + (p2[0] - p0[0]) * t)},${r2(p1[1] + (p2[1] - p0[1]) * t)} ${r2(p2[0] - (p3[0] - p1[0]) * t)},${r2(p2[1] - (p3[1] - p1[1]) * t)} ${r2(p2[0])},${r2(p2[1])}`;
    }
    return d + (ferme ? 'Z' : '');
};

// =====================================================================================================
// VUE 1 — OREILLES (otoscopie)
// viewBox 640 x 370. Oreille droite à GAUCHE de l'écran (centre 160,165), oreille gauche à droite (480,165).
// Dessin en repère local (centre du disque = 0,0, antérieur = +x pour l'oreille droite), puis reflet pour l'oreille gauche.
// =====================================================================================================
const RD = 142;   // rayon du champ otoscopique
const CY = 165;
const OREILLES = [
    { cote: 'd', cx: 162, s: 1 },
    { cote: 'g', cx: 478, s: -1 },
];

const TYMPAN = 'M-8,-84 C26,-86 62,-66 76,-30 C90,6 80,52 52,78 C30,98 -4,102 -34,92 C-64,80 -84,46 -84,8 C-84,-34 -52,-76 -8,-84 Z';
const FLACCIDA = 'M-8,-84 C9,-85 26.5,-80.5 41.5,-71.25 Q32,-66 18,-58 Q2,-68 -8,-84 Z';
const MANCHE = 'M14,-59.3 C11,-45 3,-30 -8.5,2.9 C-10.5,9 -9,15 -5.4,16.3 C-1,16.5 3.5,12 4.9,7.1 C9,-8 17,-40 22,-56.7 Z';
const CONE = 'M-3,14 C12,32 46,52 58,62 Q46,78 28,86 C20,60 6,34 -3,14 Z';
const CONE_HALO = 'M-3,14 C14,30 50,48 63,60 Q52,82 27,92 C19,64 5,36 -3,14 Z';
const DISQUE = `M${-RD},0 A${RD},${RD} 0 1 0 ${RD},0 A${RD},${RD} 0 1 0 ${-RD},0 Z`;

const blob = (r, k) => {
    const pts = [];
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + k;
        const rr = r * (1 + 0.035 * Math.sin(3 * a + k * 2) + 0.025 * Math.cos(5 * a + k));
        pts.push([rr * Math.cos(a), rr * Math.sin(a) + 3]);
    }
    return lisse(pts);
};

// poils du conduit externe : petits traits courbes près du bord, en haut surtout
const POILS = (() => {
    const out = [];
    for (let i = 0; i < 26; i++) {
        const a = (-Math.PI * 0.95) + (i / 25) * Math.PI * 0.9 + Math.sin(i * 7.3) * 0.05;
        const r1 = RD - 1;
        const r0 = RD - 11 - 5 * Math.abs(Math.sin(i * 3.1));
        const am = a + 0.07 * Math.sin(i * 2.3);
        out.push(`M${r2(r1 * Math.cos(a))},${r2(r1 * Math.sin(a))} Q${r2(((r0 + r1) / 2) * Math.cos(am))},${r2(((r0 + r1) / 2) * Math.sin(am))} ${r2(r0 * Math.cos(a + 0.02))},${r2(r0 * Math.sin(a + 0.02))}`);
    }
    return out;
})();

// fibres radiaires de la pars tensa, du ombilic vers l'annulus
const FIBRES = (() => {
    const out = [];
    for (let i = 0; i < 15; i++) {
        const a = (i / 15) * Math.PI * 2 + 0.3 + 0.12 * Math.sin(i * 5.1);
        const r0 = 14 + 8 * Math.abs(Math.sin(i * 2.7));
        out.push(`M${r2(-4 + r0 * Math.cos(a))},${r2(12 + r0 * Math.sin(a))} L${r2(-4 + 130 * Math.cos(a))},${r2(12 + 130 * Math.sin(a))}`);
    }
    return out;
})();

const Oreille = ({ c, cx, s, cote }) => {
    const p = `orl-oreilles-a-${cote}`;
    const sb = c.sombre;
    const canalC = sb ? '#85605f' : '#f3d6c6';
    const canalM = sb ? '#5f4443' : '#d9a898';
    const canalE = sb ? '#2b2022' : '#8c5d58';
    const tm0 = sb ? '#98a0ab' : '#e7e5e2';
    const tm1 = sb ? '#6f7886' : '#d0d0d1';
    const tm2 = sb ? '#555d6b' : '#b3b6bc';
    const ivoire = sb ? '#e3d6bd' : '#f6ecd6';
    const ivoireO = sb ? '#a89677' : '#d3c19c';
    return (
        <g transform={`translate(${cx} ${CY}) scale(${s} 1)`}>
            <defs>
                <radialGradient id={`${p}-canal`} cx="4" cy="8" r="146" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={canalC} />
                    <stop offset="0.55" stopColor={canalM} />
                    <stop offset="1" stopColor={canalE} />
                </radialGradient>
                <radialGradient id={`${p}-tymp`} cx="-4" cy="10" r="100" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={tm0} />
                    <stop offset="0.6" stopColor={tm1} />
                    <stop offset="1" stopColor={tm2} />
                </radialGradient>
                <linearGradient id={`${p}-cone`} x1="0" y1="0" x2="0.75" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.15" />
                    <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0.97" />
                </linearGradient>
                <radialGradient id={`${p}-proc`} cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor={ivoireO} />
                </radialGradient>
                <clipPath id={`${p}-clip`}><path d={TYMPAN} /></clipPath>
                <clipPath id={`${p}-disque`}><path d={DISQUE} /></clipPath>
            </defs>

            {/* champ otoscopique : conduit auditif */}
            <path d={DISQUE} fill={`url(#${p}-canal)`} />
            <g clipPath={`url(#${p}-disque)`}>
                <path d={blob(129, 0.4)} fill="none" stroke={c.sombre ? '#1c1418' : '#6d4b52'} strokeOpacity="0.28" strokeWidth="7" />
                <path d={blob(113, 1.3)} fill="none" stroke={c.sombre ? '#b99' : '#fff0e6'} strokeOpacity={c.sombre ? 0.08 : 0.2} strokeWidth="3" />
                <path d={blob(101, 2.1)} fill="none" stroke={c.sombre ? '#1c1418' : '#6d4b52'} strokeOpacity="0.2" strokeWidth="3" />
                {POILS.map((d, i) => <path key={i} d={d} fill="none" stroke={c.sombre ? '#17100f' : '#5c4044'} strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" />)}
            </g>
            <path d={DISQUE} fill="none" stroke={c.trait} strokeWidth="2" />

            {/* membrane tympanique */}
            <path d={TYMPAN} fill="none" stroke={c.sombre ? '#140e11' : '#5b3f45'} strokeOpacity="0.5" strokeWidth="15" strokeLinejoin="round" />
            <path d={TYMPAN} fill={`url(#${p}-tymp)`} />
            <g clipPath={`url(#${p}-clip)`}>
                {FIBRES.map((d, i) => <path key={i} d={d} stroke={c.traitFin} strokeOpacity="0.2" strokeWidth="0.7" fill="none" />)}
                <path d={TYMPAN} fill="none" stroke={c.chairClair} strokeOpacity="0.8" strokeWidth="9" />
                {/* branche de l'enclume vue par transparence, niche de la fenêtre ronde */}
                <path d="M8,-44 C2,-34 -10,-24 -26,-16" stroke="#ffffff" strokeOpacity="0.42" strokeWidth="3.4" strokeLinecap="round" fill="none" />
                <ellipse cx="-38" cy="52" rx="15" ry="11" fill={c.sombre ? '#10161f' : '#6b7a8e'} fillOpacity="0.2" />
                <ellipse cx="-22" cy="-14" rx="30" ry="24" fill="#ffffff" fillOpacity="0.06" />
            </g>
            <path d={TYMPAN} fill="none" stroke={c.trait} strokeOpacity="0.55" strokeWidth="1.2" strokeLinejoin="round" />

            {/* triangle lumineux */}
            <g clipPath={`url(#${p}-clip)`}>
                <path d={CONE_HALO} fill="#ffffff" fillOpacity="0.14" />
            </g>
            <path d={CONE} fill={`url(#${p}-cone)`} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" strokeLinejoin="round" />

            {/* pars flaccida (membrane de Shrapnell) et replis malléolaires */}
            <path d={FLACCIDA} fill={c.rouge} fillOpacity={c.sombre ? 0.3 : 0.22} stroke={c.trait} strokeOpacity="0.45" strokeWidth="0.9" strokeLinejoin="round" />
            <path d="M18,-58 Q4,-70 -8,-84" fill="none" stroke={c.chairClair} strokeOpacity="0.9" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M18,-58 Q32,-66 41.5,-71.25" fill="none" stroke={c.chairClair} strokeOpacity="0.9" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M18,-58 Q4,-70 -8,-84" fill="none" stroke={c.trait} strokeOpacity="0.5" strokeWidth="0.8" />
            <path d="M18,-58 Q32,-66 41.5,-71.25" fill="none" stroke={c.trait} strokeOpacity="0.5" strokeWidth="0.8" />

            {/* manche du marteau, apophyse courte, ombilic */}
            <path d={MANCHE} fill={ivoire} stroke={c.trait} strokeOpacity="0.7" strokeWidth="1" strokeLinejoin="round" />
            <path d="M22,-56.7 C17,-40 9,-8 4.9,7.1 C3.5,12 -1,16.5 -5.4,16.3 Q0,12 1.6,5 C8,-10 14,-38 18.5,-56 Z" fill={ivoireO} fillOpacity="0.8" />
            <path d="M13,-54 C9,-38 2,-22 -4,-2" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <circle cx="18" cy="-58" r="4.8" fill={`url(#${p}-proc)`} stroke={c.trait} strokeOpacity="0.75" strokeWidth="1" />
            <circle cx="-4.5" cy="12" r="3.6" fill="#ffffff" fillOpacity="0.9" stroke={c.trait} strokeOpacity="0.5" strokeWidth="0.7" />
        </g>
    );
};

const decorOreilles = (c) => (
    <g>
        {OREILLES.map(o => <Oreille key={o.cote} c={c} {...o} />)}
    </g>
);

const CONSTATS_TYMPAN = ['Normal (gris perle, triangle lumineux visible)', 'Congestif', 'Bombé et purulent (otite moyenne aiguë)', 'Rétracté', 'Perforé',
    'Épanchement rétrotympanique (otite séromuqueuse)', 'Tympanosclérose', 'Aérateur transtympanique'];
const CONSTATS_CONDUIT = ['Normal', 'Bouchon de cérumen', 'Otite externe (tragus douloureux)', 'Otorrhée', 'Corps étranger'];

const zonesOreilles = () => {
    const z = {};
    OREILLES.forEach(({ cote, cx, s }) => {
        const nom = cote === 'd' ? 'droit' : 'gauche';
        const T = (d) => transformerChemin(d, s, 1, cx, CY);
        z[`conduit_${cote}`] = zone(`Conduit auditif ${nom}`, `Oreille ${nom}`, CONSTATS_CONDUIT,
            [chemin(T(`${DISQUE} ${TYMPAN}`), { fillRule: 'evenodd' })]);
        z[`tympan_${cote}`] = zone(`Tympan ${nom}`, `Oreille ${nom}`, CONSTATS_TYMPAN, [chemin(T(TYMPAN))]);
    });
    return z;
};

// =====================================================================================================
// VUE 2 — GORGE (bouche grande ouverte, vue de face)
// viewBox 400 x 460, axe de symétrie x = 200. Côté droit du patient = GAUCHE de l'écran.
// =====================================================================================================
const AXE_G = 200;
const sym = (moitie) => [...moitie, ...moitie.slice(1, -1).reverse().map(([x, y]) => [2 * AXE_G - x, y])];
const rnd = (i) => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };

const OUVERTURE_PTS = sym([[200, 74], [244, 78], [288, 96], [320, 134], [336, 190], [338, 232], [324, 284], [292, 334], [248, 366], [200, 376]]);
const LEVRES_PTS = sym([[200, 49], [221, 42], [250, 46], [294, 65], [331, 104], [356, 160], [364, 222], [354, 286], [326, 344], [284, 386], [238, 408], [200, 412]]);
const OUVERTURE = lisse(OUVERTURE_PTS);
const LEVRES = lisse(LEVRES_PTS);

// arche des piliers (ouverture de l'oropharynx) : sommet à la base de la luette
const ARCHE_PTS = sym([[200, 181], [222, 183], [254, 194], [276, 214], [283, 246], [278, 284], [200, 296]]);
const ARCHE = lisse(ARCHE_PTS);
const ARCHE_EXT = lisse(sym([[200, 157], [234, 160], [266, 175], [289, 203], [297, 246], [293, 290], [200, 300]]));
const PILIER_G = lisse([[120, 296], [117, 250], [124, 216], [146, 194], [178, 183], [200, 181]], false);
const PILIER_D = lisse([[280, 296], [283, 250], [276, 216], [254, 194], [222, 183], [200, 181]], false);
const PILIER_POST_G = lisse([[176, 190], [165, 214], [163, 246], [168, 272]], false);
const PILIER_POST_D = lisse([[224, 190], [235, 214], [237, 246], [232, 272]], false);
const PALAIS_DUR = lisse([[118, 120], [158, 104], [200, 100], [242, 104], [282, 120], [270, 146], [236, 156], [200, 160], [164, 156], [130, 146]]);

// amygdale droite du patient (écran gauche) ; la gauche en est le reflet
const AMYGDALE_G = lisse([[130, 224], [141, 210], [157, 208], [168, 222], [171, 247], [164, 270], [148, 277], [134, 267], [127, 244]]);
const AMYGDALE_D = lisse([[270, 224], [259, 210], [243, 208], [232, 222], [229, 247], [236, 270], [252, 277], [266, 267], [273, 244]]);
const PAROI = lisse([[173, 181], [200, 179], [227, 181], [230, 214], [230, 250], [226, 274], [200, 280], [174, 274], [170, 250], [170, 214]]);
const UVULE = lisse([[187, 181], [190, 196], [190, 213], [189, 225], [194, 235], [200, 238], [206, 235], [211, 225], [210, 213], [210, 196], [213, 181]]);
const VOILE = lisse([[122, 214], [130, 190], [160, 166], [200, 160], [240, 166], [270, 190], [278, 214], [276, 216], [254, 194], [222, 183], [200, 181], [178, 183], [146, 194], [124, 216]]);
const LANGUE_PTS = [[104, 322], [106, 296], [126, 276], [164, 268], [200, 266], [236, 268], [274, 276], [294, 296], [296, 322], [280, 372], [200, 392], [120, 372]];
const LANGUE = lisse(LANGUE_PTS);

// dents : { dx, h, w, type } du centre vers la droite de l'écran ; le reflet donne l'autre côté
const DENTS_HAUT = [
    { dx: 14, w: 29, h: 38, t: 'i' }, { dx: 38, w: 22, h: 33, t: 'i' }, { dx: 60, w: 21, h: 36, t: 'c' },
    { dx: 79, w: 17, h: 28, t: 'p' }, { dx: 93, w: 15, h: 25, t: 'p' }, { dx: 105, w: 13, h: 21, t: 'p' },
];
const DENTS_BAS = [
    { dx: 8, w: 16, h: 28, t: 'i' }, { dx: 25, w: 17, h: 29, t: 'i' }, { dx: 44, w: 19, h: 31, t: 'c' },
    { dx: 63, w: 17, h: 25, t: 'p' }, { dx: 80, w: 15, h: 22, t: 'p' }, { dx: 94, w: 13, h: 19, t: 'p' },
];
const colHaut = (dx) => 98 + 0.0036 * dx * dx;
const colBas = (dx) => 362 - 0.0042 * dx * dx;

// une dent : cou en (x, y), couronne vers le bas (haut = arcade supérieure) ou vers le haut
const dent = (x, y, d, bas, cote) => {
    const { w, h, t } = d;
    const base = t === 'c'
        ? [[-0.38, 0], [-0.5, 0.3], [-0.42, 0.72], [0, 1.08], [0.42, 0.72], [0.5, 0.3], [0.38, 0]]
        : t === 'p'
            ? [[-0.4, 0], [-0.52, 0.35], [-0.42, 0.85], [-0.15, 1], [0.15, 1], [0.42, 0.85], [0.52, 0.35], [0.4, 0]]
            : [[-0.4, 0], [-0.5, 0.36], [-0.47, 0.8], [-0.3, 1], [0.3, 1], [0.47, 0.8], [0.5, 0.36], [0.4, 0]];
    const th = (bas ? -1 : 1) * Math.atan(0.0072 * d.dx * cote);
    const cs = Math.cos(th), sn = Math.sin(th);
    const pts = base.map(([u, v]) => {
        const px = u * w, py = (bas ? -v : v) * h;
        return [x + px * cs - py * sn, y + px * sn + py * cs];
    });
    return lisse(pts);
};
const toutesDents = (() => {
    const out = [];
    DENTS_HAUT.forEach((d, i) => [1, -1].forEach(cote => out.push({ id: `h${i}${cote}`, d: dent(AXE_G + cote * d.dx, colHaut(d.dx), d, false, cote), bas: false, cx: AXE_G + cote * d.dx, cy: colHaut(d.dx) + d.h * 0.5, w: d.w })));
    DENTS_BAS.forEach((d, i) => [1, -1].forEach(cote => out.push({ id: `b${i}${cote}`, d: dent(AXE_G + cote * d.dx, colBas(d.dx), d, true, cote), bas: true, cx: AXE_G + cote * d.dx, cy: colBas(d.dx) - d.h * 0.5, w: d.w })));
    return out;
})();
const ligneCol = (f, de, a, pas = 6) => {
    const pts = [];
    for (let x = de; x <= a; x += pas) pts.push([x, r2(f(Math.abs(x - AXE_G)))]);
    return pts;
};
const GENCIVE_HAUT = (() => {
    const pts = ligneCol(colHaut, 56, 344, 12);
    return `${lisse(pts, false)} L344,20 L56,20 Z`;
})();
const GENCIVE_BAS = (() => {
    const pts = ligneCol(colBas, 56, 344, 12);
    return `${lisse(pts, false)} L344,450 L56,450 Z`;
})();

// plis radiaires des lèvres
const PLIS_LEVRES = (() => {
    const out = [];
    for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2 + 0.02;
        const jit = (rnd(i + 3) - 0.5) * 0.04;
        const rx = 138, ry = 150;
        const cs = Math.cos(a + jit), sn = Math.sin(a + jit);
        const k = (u) => [r2(200 + (rx + u) * cs), r2(226 + (ry + u) * sn)];
        const l0 = 5 + rnd(i + 8) * 4, l1 = l0 + 6 + rnd(i + 20) * 8;
        const [x0, y0] = k(l0), [x1, y1] = k(l1);
        if (Math.abs(cs) > 0.96) continue;   // commissures : pas de plis
        out.push(`M${x0},${y0} L${x1},${y1}`);
    }
    return out;
})();

const Gorge = ({ c }) => {
    const p = 'orl-gorge-a';
    const sb = c.sombre;
    const mu0 = sb ? '#a05a66' : '#e9aeb2';
    const mu1 = sb ? '#7a3f4b' : '#d27c86';
    const mu2 = sb ? '#4d2530' : '#a24a58';
    const prof = sb ? '#1b0b10' : '#4c1a26';
    const contour = sb ? '#1d0b11' : '#7a2d3b';
    const palais = sb ? '#b4727c' : '#f2bcc0';
    const voile = sb ? '#a65a67' : '#e58d96';
    const pilier = sb ? '#bf7480' : '#f0a3aa';
    const langue0 = sb ? '#cb7f89' : '#f3b1b5';
    const langue1 = sb ? '#a65a66' : '#e8929a';
    const langue2 = sb ? '#6f3340' : '#c3616e';
    const amy0 = sb ? '#cb858c' : '#f3adb0';
    const amy1 = sb ? '#954f5b' : '#da7a84';
    const gencive = sb ? '#b8606d' : '#ec8c96';
    const dent0 = sb ? '#efe9db' : '#fffdf7';
    const dent1 = sb ? '#b3ab9a' : '#e5dcc6';
    const levre0 = sb ? '#b25c68' : '#d9737c';
    const levre1 = sb ? '#c4707b' : '#ec9097';

    return (
        <g>
            <defs>
                <radialGradient id={`${p}-peau`} cx="200" cy="230" r="215" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={c.chair} />
                    <stop offset="0.8" stopColor={c.chairOmbre} stopOpacity="0.85" />
                    <stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${p}-cavite`} cx="200" cy="232" r="170" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={prof} />
                    <stop offset="0.34" stopColor={mu2} />
                    <stop offset="0.72" stopColor={mu1} />
                    <stop offset="1" stopColor={mu0} />
                </radialGradient>
                <radialGradient id={`${p}-langue`} cx="200" cy="318" r="104" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0)">
                    <stop offset="0" stopColor={langue0} />
                    <stop offset="0.65" stopColor={langue1} />
                    <stop offset="1" stopColor={langue2} />
                </radialGradient>
                <radialGradient id={`${p}-mur`} cx="200" cy="236" r="70" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={sb ? '#7c3a47' : '#c3636f'} />
                    <stop offset="1" stopColor={sb ? '#4a212c' : '#8e3f4d'} />
                </radialGradient>
                <linearGradient id={`${p}-amy`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={amy1} />
                    <stop offset="0.55" stopColor={amy0} />
                    <stop offset="1" stopColor={amy1} />
                </linearGradient>
                <linearGradient id={`${p}-dent`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={dent1} />
                    <stop offset="0.35" stopColor={dent0} />
                    <stop offset="0.8" stopColor={dent0} />
                    <stop offset="1" stopColor={dent1} />
                </linearGradient>
                <linearGradient id={`${p}-levres`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={levre0} />
                    <stop offset="0.5" stopColor={levre1} />
                    <stop offset="1" stopColor={levre1} />
                </linearGradient>
                <clipPath id={`${p}-clip`}><path d={OUVERTURE} /></clipPath>
                <clipPath id={`${p}-levres`}><path d={`${LEVRES} ${OUVERTURE}`} clipRule="evenodd" /></clipPath>
            </defs>

            {/* peau autour de la bouche */}
            <ellipse cx="200" cy="230" rx="196" ry="226" fill={`url(#${p}-peau)`} />
            <path d="M191,12 Q190,24 191,34 M209,12 Q210,24 209,34" stroke={c.traitFin} strokeOpacity="0.5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M150,440 Q200,450 250,440" stroke={c.traitFin} strokeOpacity="0.5" strokeWidth="1.3" fill="none" strokeLinecap="round" />

            {/* intérieur de la bouche */}
            <path d={OUVERTURE} fill={`url(#${p}-cavite)`} />
            <g clipPath={`url(#${p}-clip)`}>
                {/* palais dur et ses crêtes */}
                <path d={PALAIS_DUR} fill={palais} fillOpacity="0.95" />
                <path d="M200,104 L200,156" stroke={contour} strokeOpacity="0.28" strokeWidth="1.2" />
                {[[0, 120], [1, 132], [2, 143]].map(([k, y]) => (
                    <g key={k}>
                        <path d={`M${194 - 3 * k},${y} Q${170 - 8 * k},${y - 5} ${150 - 12 * k},${y + 4 + k * 2}`} stroke={contour} strokeOpacity="0.24" strokeWidth="1" fill="none" strokeLinecap="round" />
                        <path d={`M${206 + 3 * k},${y} Q${230 + 8 * k},${y - 5} ${250 + 12 * k},${y + 4 + k * 2}`} stroke={contour} strokeOpacity="0.24" strokeWidth="1" fill="none" strokeLinecap="round" />
                    </g>
                ))}

                {/* voile du palais */}
                <path d={ARCHE_EXT} fill={voile} stroke={contour} strokeOpacity="0.3" strokeWidth="1.2" />
                <path d="M200,152 L200,181" stroke={contour} strokeOpacity="0.3" strokeWidth="1.2" />

                {/* fond du pharynx */}
                <path d={ARCHE} fill={`url(#${p}-mur)`} />
                <path d={PAROI} fill={sb ? '#8a4452' : '#cf6f7b'} fillOpacity="0.55" />
                {[[186, 232, 180, 250, 188, 268], [214, 230, 222, 250, 212, 270], [200, 246, 196, 258, 203, 272]].map((v, i) => (
                    <path key={i} d={`M${v[0]},${v[1] - 36} Q${v[2]},${v[1]} ${v[4]},${v[5]}`} stroke={sb ? '#d4707b' : '#b8434f'} strokeOpacity="0.55" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                ))}
                {Array.from({ length: 26 }).map((_, i) => (
                    <circle key={i} cx={r2(176 + rnd(i) * 48)} cy={r2(196 + rnd(i + 90) * 70)} r={r2(1 + rnd(i + 40) * 1.3)} fill={sb ? '#e99aa3' : '#f0a4ac'} fillOpacity="0.45" />
                ))}
                <path d="M173,262 Q200,252 227,262 L227,274 L173,274 Z" fill={prof} fillOpacity="0.25" />

                {/* piliers antérieurs et postérieurs */}
                {[PILIER_G, PILIER_D].map((d, i) => (
                    <g key={i}>
                        <path d={d} stroke={contour} strokeOpacity="0.55" strokeWidth="17" fill="none" strokeLinecap="round" />
                        <path d={d} stroke={pilier} strokeWidth="14" fill="none" strokeLinecap="round" />
                        <path d={d} stroke="#ffffff" strokeOpacity="0.28" strokeWidth="4" fill="none" strokeLinecap="round" transform={i === 0 ? 'translate(-2 0)' : 'translate(2 0)'} />
                    </g>
                ))}

                {/* amygdales */}
                {[[AMYGDALE_G, 148, 242], [AMYGDALE_D, 252, 242]].map(([d, x, y], i) => (
                    <g key={i}>
                        <path d={d} fill={`url(#${p}-amy)`} stroke={contour} strokeOpacity="0.6" strokeWidth="1.2" />
                        {[[-9, -20, 1.9], [4, -13, 1.6], [-4, -3, 2.1], [8, 6, 1.7], [-8, 13, 1.9], [3, 21, 1.5], [10, -2, 1.2]].map(([dx, dy, r], k) => (
                            <ellipse key={k} cx={x + (i === 0 ? dx : -dx)} cy={y + dy} rx={r * 1.2} ry={r * 0.8} fill={contour} fillOpacity="0.38" />
                        ))}
                        <path d={`M${x - 8},${y - 14} Q${x},${y - 4} ${x - 6},${y + 16}`} stroke={contour} strokeOpacity="0.22" strokeWidth="1" fill="none" />
                    </g>
                ))}
                {[PILIER_POST_G, PILIER_POST_D].map((d, i) => (
                    <g key={i}>
                        <path d={d} stroke={contour} strokeOpacity="0.45" strokeWidth="6" fill="none" strokeLinecap="round" />
                        <path d={d} stroke={pilier} strokeWidth="4" fill="none" strokeLinecap="round" />
                    </g>
                ))}

                {/* luette */}
                <path d={UVULE} fill={pilier} stroke={contour} strokeOpacity="0.6" strokeWidth="1.2" />
                <path d="M200,186 L200,232" stroke={contour} strokeOpacity="0.25" strokeWidth="1" />
                <path d="M195,190 Q193,212 197,230" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2" fill="none" strokeLinecap="round" />
                <ellipse cx="200" cy="248" rx="13" ry="3.5" fill={prof} fillOpacity="0.28" />

                {/* langue */}
                <path d={LANGUE} fill="none" stroke={prof} strokeOpacity="0.3" strokeWidth="6" />
                <path d={LANGUE} fill={`url(#${p}-langue)`} stroke={contour} strokeOpacity="0.55" strokeWidth="1.3" />
                {Array.from({ length: 80 }).map((_, i) => {
                    const x = 200 + (rnd(i + 7) - 0.5) * 180;
                    const y = 270 + rnd(i + 300) * 100;
                    const dx = (x - 200) / 94;
                    const dy = (y - 320) / 56;
                    if (dx * dx + dy * dy > 0.86 || Math.abs(x - 200) < 4) return null;
                    return <circle key={i} cx={r2(x)} cy={r2(y)} r={r2(0.9 + rnd(i + 11) * 0.9)} fill="#ffffff" fillOpacity="0.26" />;
                })}
                <path d="M200,372 C198,340 202,310 200,288" stroke={contour} strokeOpacity="0.5" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M202,372 C200,340 204,310 202,288" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                {/* V lingual (papilles caliciformes) */}
                {[[178, 274], [168, 281], [186, 281], [193, 288], [222, 274], [232, 281], [214, 281], [207, 288], [200, 292]].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="2.4" fill={langue2} fillOpacity="0.8" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.6" />
                ))}

                {/* arcade inférieure */}
                <path d={GENCIVE_BAS} fill={gencive} />
                {toutesDents.filter(t => t.bas).map(t => (
                    <g key={t.id}>
                        <path d={t.d} fill={`url(#${p}-dent)`} stroke={c.trait} strokeOpacity="0.55" strokeWidth="1" strokeLinejoin="round" />
                        <ellipse cx={t.cx - t.w * 0.14} cy={t.cy} rx={t.w * 0.09} ry="7" fill="#ffffff" fillOpacity="0.7" />
                    </g>
                ))}
                <path d={lisse(ligneCol(colBas, 56, 344, 12), false)} stroke={contour} strokeOpacity="0.35" strokeWidth="1.3" fill="none" />

                {/* arcade supérieure */}
                {toutesDents.filter(t => !t.bas).map(t => (
                    <g key={t.id}>
                        <path d={t.d} fill={`url(#${p}-dent)`} stroke={c.trait} strokeOpacity="0.55" strokeWidth="1" strokeLinejoin="round" />
                        <ellipse cx={t.cx - t.w * 0.14} cy={t.cy} rx={t.w * 0.09} ry="8" fill="#ffffff" fillOpacity="0.7" />
                    </g>
                ))}
                <path d={GENCIVE_HAUT} fill={gencive} />
                <path d={lisse(ligneCol(colHaut, 56, 344, 12), false)} stroke={contour} strokeOpacity="0.4" strokeWidth="1.3" fill="none" />
            </g>

            {/* lèvres */}
            <path d={`${LEVRES} ${OUVERTURE}`} fillRule="evenodd" fill={`url(#${p}-levres)`} />
            <g clipPath={`url(#${p}-levres)`}>
                <path d={LEVRES} fill="none" stroke={levre1} strokeWidth="9" strokeLinejoin="round" strokeOpacity="0.9" />
                <path d={OUVERTURE} fill="none" stroke={contour} strokeWidth="10" strokeOpacity="0.14" strokeLinejoin="round" />
                {PLIS_LEVRES.map((d, i) => <path key={i} d={d} stroke={contour} strokeOpacity="0.2" strokeWidth="0.9" fill="none" strokeLinecap="round" />)}
            </g>
            <path d={LEVRES} fill="none" stroke={contour} strokeOpacity="0.7" strokeWidth="1.5" strokeLinejoin="round" />
            <path d={OUVERTURE} fill="none" stroke={contour} strokeOpacity="0.8" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M158,406 Q200,414 242,406" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M168,52 Q200,60 232,52" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
    );
};

const CONSTATS_AMYGDALE = ['Normales', 'Hypertrophiées (grade 2)', 'Hypertrophiées (grade 3)', 'Érythémateuses', 'Avec exsudat / pus', 'Fausses membranes', 'Vésicules'];
const CONSTATS_GORGE = ['Gorge normale', 'Érythème pharyngé', 'Enduit blanchâtre (muguet)'];

const zonesGorge = () => ({
    langue: zone('Langue', 'Bouche et gorge', ['Normale', 'Enduit blanchâtre (muguet)', 'Langue saburrale', 'Langue dépapillée', 'Ulcération'], [chemin(LANGUE)]),
    voile: zone('Voile du palais et luette', 'Bouche et gorge', [...CONSTATS_GORGE, 'Luette œdématiée', 'Voile bombé asymétrique'], [chemin(VOILE), chemin(UVULE)]),
    amygdale_d: zone('Amygdale droite', 'Amygdales', CONSTATS_AMYGDALE, [chemin(AMYGDALE_G)]),
    amygdale_g: zone('Amygdale gauche', 'Amygdales', CONSTATS_AMYGDALE, [chemin(AMYGDALE_D)]),
    paroi: zone('Paroi pharyngée postérieure', 'Bouche et gorge', [...CONSTATS_GORGE, 'Granulations lymphoïdes', 'Écoulement postérieur'], [chemin(`${PAROI} ${UVULE}`, { fillRule: 'evenodd' })]),
    dents: zone('Dents et gencives', 'Bouche et gorge', ['Normales', 'Caries', 'Gingivite', 'Tartre', 'Dents manquantes', 'Abcès dentaire'], []),
});

export default {
    id: 'orl',
    titre: 'ORL : oreilles, gorge, sinus',
    vues: [
        {
            id: 'oreilles',
            titre: 'Oreilles',
            viewBox: '0 0 640 370',
            largeur: 520,
            decor: decorOreilles,
            etiquettes: [
                { x: 162, y: 352, texte: 'Oreille droite', taille: 19 },
                { x: 478, y: 352, texte: 'Oreille gauche', taille: 19 },
            ],
            zones: zonesOreilles(),
        },
        {
            id: 'gorge',
            titre: 'Gorge',
            viewBox: '0 0 400 460',
            largeur: 340,
            decor: (c) => <Gorge c={c} />,
            etiquettes: [
                { x: 26, y: 30, texte: 'D', taille: 16 },
                { x: 374, y: 30, texte: 'G', taille: 16 },
            ],
            zones: zonesGorge(),
        },
    ],
};
