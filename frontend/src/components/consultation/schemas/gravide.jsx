import React from 'react';
import { zone, chemin, cercle, ellipse, rectangle, aire, miroirX } from './outils';

// ─────────────────────────────────────────────────────────────────────────────
//  ABDOMEN GRAVIDE — version « Illustration moderne »
//  Vue 1 « Abdomen » : tronc d'une femme enceinte (≈ 27 SA), utérus et fœtus vus par transparence,
//                      graduation de la hauteur utérine en 5 bandes jointives (ruban gradué à droite).
//  Vue 2 « Fœtus »   : utérus agrandi, fœtus en présentation céphalique (dos à gauche de la mère),
//                      placenta, cordon, quadrants et foyers d'auscultation des BDCF.
//  Axe de symétrie du tronc x = 160. Droit de la patiente = GAUCHE de l'écran.
//  Échelle verticale de la vue 1 : ≈ 5,7 unités par centimètre (symphyse pubienne y = 360, xiphoïde y = 148).
// ─────────────────────────────────────────────────────────────────────────────

const AX = 160;
const r1 = (n) => Math.round(n * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;

// Courbe lisse (Catmull-Rom convertie en Bézier cubiques absolus)
const cmds = (pts, ferme = false) => {
    const n = pts.length;
    const g = (i) => (ferme ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = '';
    const segs = ferme ? n : n - 1;
    for (let i = 0; i < segs; i += 1) {
        const p0 = g(i - 1); const p1 = g(i); const p2 = g(i + 1); const p3 = g(i + 2);
        d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return d;
};
const lisse = (pts, ferme = false) => `M${r1(pts[0][0])} ${r1(pts[0][1])}${cmds(pts, ferme)}${ferme ? 'Z' : ''}`;
const poly = (pts, ferme = true) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}${ferme ? 'Z' : ''}`;
const miroir = (d) => miroirX(d, AX);
const deux = (d) => `${d}${miroir(d)}`;

// Sens d'une suite de points (aire signée) : positive = sens horaire à l'écran
const aireSignee = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + (a[0] * b[1] - b[0] * a[1]); }, 0) / 2;
const orient = (p) => (aireSignee(p) < 0 ? p.slice().reverse() : p);

// Interpolation de Hermite (tangentes de différences finies) dans une table [[x, valeur], …]
const interp = (tab, x) => {
    const n = tab.length;
    if (x <= tab[0][0]) return tab[0][1];
    if (x >= tab[n - 1][0]) return tab[n - 1][1];
    let i = 0;
    while (i < n - 2 && tab[i + 1][0] < x) i += 1;
    const t = (j) => {
        const a = tab[Math.max(0, j - 1)]; const b = tab[Math.min(n - 1, j + 1)];
        return (b[1] - a[1]) / (b[0] - a[0]);
    };
    const [x0, y0] = tab[i]; const [x1, y1] = tab[i + 1];
    const h = x1 - x0; const s = (x - x0) / h; const s2 = s * s; const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * t(i) + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * t(i + 1);
};
const echelle = (a, b, pas) => { const n = Math.max(1, Math.ceil(Math.abs(b - a) / pas)); return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n); };

// ═════════════════════════ TRONC (vue 1) ═════════════════════════
// demi-largeur du tronc selon y
const HW = [[-30, 80], [0, 82], [30, 88], [60, 94], [100, 98], [125, 95], [145, 89], [165, 83], [190, 83], [215, 87], [245, 93], [275, 99], [305, 104], [330, 107], [352, 107], [372, 104], [395, 99], [440, 93]];
const hw = (y) => interp(HW, y);
const gauche = (y) => [AX - hw(y), y];
const droite = (y) => [AX + hw(y), y];
const CORPS = poly([...echelle(-12, 432, 3).map(gauche), ...echelle(432, -12, 3).map(droite)]);

// Repères verticaux (échelle 5,7 u/cm) : bas de la bande 1 = symphyse pubienne ; haut de la bande 5 = pointe du xiphoïde
const SYMPHYSE = 360;
const XIPHOIDE = 148;
const BND = [360, 318, 270, 224, 185, 148];
const OMBILIC = 247;

// pli inguinal (côté gauche de l'écran) : limite basse de l'abdomen
const PLI = [[54, 331], [72, 347], [100, 362], [132, 371], [160, 374]];
const pliY = (x) => interp(PLI.map((p) => [p[0], p[1]]), Math.min(160, Math.max(54, x)));
const xs = (a, b, pas) => echelle(a, b, pas);

// Bande horizontale n (0 = tout en bas) : limitée par la silhouette ; la bande 0 est limitée en bas par les plis inguinaux
const polygoneBande = (n) => {
    const haut = BND[n + 1]; const bas = BND[n];
    if (n > 0) return poly([...echelle(haut, bas, 3).map(gauche), ...echelle(bas, haut, 3).map(droite)]);
    const yG = pliY(AX - hw(haut + 14));
    const lat = echelle(haut, 332, 3);
    const pli = xs(54, 266, 4).map((x) => [x, x <= 160 ? pliY(x) : pliY(2 * AX - x)]);
    void yG;
    return poly([...lat.map(gauche), ...pli, ...lat.slice().reverse().map(droite)]);
};

// ═════════════════════════ UTÉRUS ═════════════════════════
// demi-largeur selon la profondeur y (0 = fond, 158 = bas) d'un utérus d'environ 27 semaines
const UT = [[0, 0], [2, 13], [6, 22], [14, 34], [28, 48], [50, 59], [80, 64], [108, 60], [130, 49], [146, 35], [154, 20], [158, 0]];
const UH = 158;
// geometrie d'un utérus : cx0 = axe au niveau du fond, top = ordonnée du fond, k = échelle, incl = décalage de l'axe (fond vers la droite de la patiente)
const uterus = (cx0, top, k, incl) => {
    const axe = (y) => cx0 - incl * k * (1 - y / UH);
    const ys = echelle(0, UH, 2);
    const pg = (y, ec = 0) => [axe(y) - k * interp(UT, y) * (1 - ec), top + k * y];
    const pd = (y, ec = 0) => [axe(y) + k * interp(UT, y) * (1 - ec), top + k * y];
    const ext = [...ys.map((y) => pd(y)), ...ys.slice(1, -1).reverse().map((y) => pg(y))];
    const cen = [axe(UH / 2), top + (k * UH) / 2];
    const w = 7 * k * 0.62;
    const reduire = (p) => [cen[0] + (p[0] - cen[0]) * (1 - w / (k * 64)), cen[1] + (p[1] - cen[1]) * (1 - w / ((k * UH) / 2))];
    const int = ext.map(reduire);
    return { axe, pg, pd, ext, int, cen, k, top, bas: top + k * UH };
};

// ═════════════════════════ FŒTUS ═════════════════════════
// Coordonnées locales : 0..100 en x, 0..155 en y ; tête en bas, siège en haut, dos à droite, face et membres à gauche.
const F_TETE = [[52, 151], [38, 148], [31, 140], [28.5, 132], [28, 126.5], [23.5, 122], [27, 118], [27.5, 112.5], [30, 106.5], [38, 103], [50, 102], [62, 106], [70, 114], [74, 126], [72, 138], [64, 147]];
const F_TRONC = [[62, 106], [76, 97], [86, 82], [90, 64], [89, 46], [84, 30], [74, 17], [60, 11], [47, 14], [39, 26], [38, 46], [40, 64], [43, 82], [46, 97], [52, 105]];
const F_MEMBRES = [
    { id: 'bras', a: [68, 91], b: [51, 73], r: 4.8 },
    { id: 'avantbras', a: [51, 73], b: [39, 95], r: 3.9 },
    { id: 'main', a: [39, 95], b: [36, 100], r: 4.6 },
    { id: 'cuisse', a: [66, 26], b: [37, 58], r: 7.6 },
    { id: 'jambe', a: [37, 58], b: [43, 25], r: 5.3 },
    { id: 'pied', a: [41, 18.5], b: [49, 15.5], r: 3.9 },
];
const F_CORDON = [39, 46];
const F_COEUR = [66, 79];

const transfo = (s, rot, tx, ty) => (p) => {
    const a = rad(rot); const x = (p[0] - 50) * s; const y = (p[1] - 75) * s;
    return [tx + x * Math.cos(a) - y * Math.sin(a), ty + x * Math.sin(a) + y * Math.cos(a)];
};
const geomFoetus = (s, rot, tx, ty) => {
    const T = transfo(s, rot, tx, ty);
    return {
        s, T,
        tete: orient(F_TETE.map(T)), tronc: orient(F_TRONC.map(T)),
        membres: F_MEMBRES.map((m) => ({ ...m, a: T(m.a), b: T(m.b), r: m.r * s })),
        cordon: T(F_CORDON), coeur: T(F_COEUR),
        nuque: T([62, 104]), siege: T([68, 14]), dos: T([89, 56]), vertex: T([50, 150]),
    };
};

// capsule (segment épaissi) en chemin absolu : toutes de même sens, donc réunies sans trou ni doublon
const stade = (a, b, r) => {
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * r; const ny = (dx / L) * r;
    const P = (x, y) => `${r1(x)} ${r1(y)}`;
    return `M${P(a[0] + nx, a[1] + ny)}L${P(b[0] + nx, b[1] + ny)}A${r1(r)} ${r1(r)} 0 0 0 ${P(b[0] - nx, b[1] - ny)}L${P(a[0] - nx, a[1] - ny)}A${r1(r)} ${r1(r)} 0 0 0 ${P(a[0] + nx, a[1] + ny)}Z`;
};
const cheminMembres = (G, plus = 0) => G.membres.map((m) => stade(m.a, m.b, m.r + plus)).join('');

// ═════════════════════════ COULEURS ═════════════════════════
const teintes = (c) => {
    const S = c.sombre;
    return {
        mur: S ? '#c9708a' : '#ea93a8',
        murTrait: S ? '#e79bb0' : '#c4566f',
        murFonce: S ? '#8d4a60' : '#d97790',
        liquide: S ? '#5d86b8' : '#cfe3f6',
        liquideClair: S ? '#86abd6' : '#eaf4fd',
        placenta: S ? '#a64258' : '#c9475c',
        placentaClair: S ? '#c4647a' : '#e47a8b',
        cordon: S ? '#d7bdb4' : '#f4dccf',
        cordonTrait: S ? '#9a7b72' : '#b58878',
        peau: S ? '#c99a82' : '#f2c5ac',
        peauClair: S ? '#e0b8a2' : '#fde6d6',
        peauOmbre: S ? '#92654f' : '#d99f84',
        peauTrait: S ? '#efcfbd' : '#a2694f',
        ovaire: S ? '#b88aa0' : '#e6b3c4',
        foyer: S ? '#4fc3ad' : '#2f9e8d',
        veine: S ? '#7a9fd4' : '#8aa9d8',
    };
};

// ═════════════════════════ OUTILS DE DESSIN ═════════════════════════
const lin = (id, x1, y1, x2, y2, stops) => (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
        {stops.map(([o, col, op = 1], i) => <stop key={i} offset={o} stopColor={col} stopOpacity={op} />)}
    </linearGradient>
);
const rayon = (id, cx, cy, r, stops, fx = cx, fy = cy) => (
    <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r} fx={fx} fy={fy}>
        {stops.map(([o, col, op = 1], i) => <stop key={i} offset={o} stopColor={col} stopOpacity={op} />)}
    </radialGradient>
);

// Le fœtus dessiné (tête, tronc, membres, cordon). P = préfixe des ids ; detail = visage, cœur, ondes
const dessinFoetus = (c, P, G, opts = {}) => {
    const t = teintes(c);
    const u = (n) => `url(#${P}${n})`;
    const s = G.s;
    const membre = (m, i) => (
        <g key={i}>
            <path d={`M${r1(m.a[0])} ${r1(m.a[1])}L${r1(m.b[0])} ${r1(m.b[1])}`} stroke={t.peauTrait} strokeOpacity="0.85" strokeWidth={r1(2 * m.r + 1.5 * (opts.fin ? 0.7 : 1))} />
            <path d={`M${r1(m.a[0])} ${r1(m.a[1])}L${r1(m.b[0])} ${r1(m.b[1])}`} stroke={u('f-membre')} strokeWidth={r1(2 * m.r)} />
            <path d={`M${r1(m.a[0] - m.r * 0.28)} ${r1(m.a[1] - m.r * 0.3)}L${r1(m.b[0] - m.r * 0.28)} ${r1(m.b[1] - m.r * 0.3)}`} stroke={t.peauClair} strokeOpacity="0.7" strokeWidth={r1(m.r * 0.7)} />
        </g>
    );
    const [ox, oy] = G.T([50, 75]);
    const L = (x, y) => G.T([x, y]);
    const yeux = L(33, 127); const oreille = L(56, 124);
    return (
        <g>
            <defs>
                {rayon(`${P}f-corps`, ox - 8 * s, oy - 4 * s, 70 * s, [[0, t.peauClair], [0.45, t.peau], [1, t.peauOmbre]])}
                {rayon(`${P}f-tete`, ...L(40, 122), 30 * s, [[0, t.peauClair], [0.55, t.peau], [1, t.peauOmbre]])}
                {lin(`${P}f-membre`, ox - 40 * s, oy, ox + 30 * s, oy, [[0, t.peau], [1, t.peauOmbre]])}
            </defs>
            {/* tronc */}
            <path d={lisse(G.tronc, true)} fill={u('f-corps')} stroke={t.peauTrait} strokeOpacity="0.85" strokeWidth={r1(1.3 * (opts.fin ? 0.8 : 1))} />
            <path d={lisse([L(80, 92), L(85, 72), L(86, 50), L(81, 32)])} stroke={t.peauOmbre} strokeOpacity="0.7" strokeWidth={r1(3 * s)} />
            {/* colonne vertébrale suggérée */}
            <path d={lisse([L(78, 98), L(83, 76), L(83, 52), L(78, 32), L(70, 20)])} stroke={t.peauTrait} strokeOpacity="0.35" strokeWidth={r1(1 * s + 0.4)} strokeDasharray={`${r1(1.4 * s)} ${r1(2.4 * s)}`} />
            {/* tête */}
            <path d={lisse(G.tete, true)} fill={u('f-tete')} stroke={t.peauTrait} strokeOpacity="0.9" strokeWidth={r1(1.4 * (opts.fin ? 0.8 : 1))} />
            <path d={lisse([L(60, 140), L(68, 132), L(70, 122)])} stroke={t.peauOmbre} strokeOpacity="0.55" strokeWidth={r1(3.4 * s)} />
            {opts.visage !== false && (
                <g>
                    <path d={`M${r1(yeux[0] - 3 * s)} ${r1(yeux[1] - 0.6 * s)}Q${r1(yeux[0])} ${r1(yeux[1] + 2.6 * s)} ${r1(yeux[0] + 3 * s)} ${r1(yeux[1] - 0.8 * s)}`} stroke={t.peauTrait} strokeWidth={r1(Math.max(0.7, 0.9 * s))} />
                    <path d={`M${r1(oreille[0])} ${r1(oreille[1] - 4 * s)}C${r1(oreille[0] - 4 * s)} ${r1(oreille[1] - 3 * s)} ${r1(oreille[0] - 4 * s)} ${r1(oreille[1] + 3 * s)} ${r1(oreille[0])} ${r1(oreille[1] + 4 * s)}`} stroke={t.peauTrait} strokeOpacity="0.7" strokeWidth={r1(Math.max(0.6, 0.8 * s))} />
                    <path d={lisse([L(27.2, 113), L(30, 112.2), L(32, 112.8)])} stroke={t.peauTrait} strokeOpacity="0.7" strokeWidth={r1(Math.max(0.6, 0.8 * s))} />
                </g>
            )}
            {/* membres : bras replié devant le thorax, jambe fléchie */}
            {G.membres.filter((m) => ['cuisse', 'jambe', 'pied'].includes(m.id)).map(membre)}
            {G.membres.filter((m) => ['bras', 'avantbras', 'main'].includes(m.id)).map(membre)}
        </g>
    );
};

// ═════════════════════════ DÉCOR : VUE 1 (ABDOMEN) ═════════════════════════
const U1 = uterus(160, 204, 1, 4);
const G1 = geomFoetus(0.84, -3, 164, 282);
const PLACENTA_1 = [0.2, 0.52]; // portion de la paroi gauche (écran) occupée par le placenta (fraction de la hauteur)

const murParoi = (U, y0, y1, cote) => echelle(y0, y1, 3).map((f) => {
    const y = f * UH;
    return cote < 0 ? U.pg(y, 0.055) : U.pd(y, 0.055);
});

const decorAbdomen = (c) => {
    const P = 'gravide-abdomen-b-';
    const u = (s) => `url(#${P}${s})`;
    const S = c.sombre;
    const t = teintes(c);
    const blanc = S ? c.chairClair : '#ffffff';
    const aureole = S ? '#1b2431' : '#9fadc1';
    const U = U1;
    const sein = (cx) => {
        const cy = 101; const rx = 37; const ry = 39;
        const pts = Array.from({ length: 24 }, (_, i) => [cx + rx * Math.cos(rad(i * 15)), cy + ry * Math.sin(rad(i * 15))]);
        const g = cx < AX ? -1 : 1;
        const tub = Array.from({ length: 9 }, (_, i) => [cx + g * 0 + 11.5 * Math.cos(rad(i * 40 + 12)), cy + 5 + 10.5 * Math.sin(rad(i * 40 + 12))]);
        return (
            <g key={cx}>
                <path d={lisse(pts, true)} fill={u('sein')} stroke="none" mask={u('m-seins')} />
                <path d={lisse(pts, true)} fill="none" stroke={u('sein-trait')} strokeWidth="1.5" />
                <path d={lisse(pts.slice(2, 11))} fill="none" stroke={u('sein-ombre')} strokeWidth="9" transform="translate(0 3)" />
                <ellipse cx={cx} cy={cy + 5} rx="15.5" ry="14" fill={u('areole')} />
                {tub.map((p, i) => <circle key={i} cx={r1(p[0])} cy={r1(p[1])} r="0.8" fill={c.traitFin} fillOpacity="0.55" />)}
                <ellipse cx={cx + 1} cy={cy + 8.2} rx="5.6" ry="2.4" fill={c.trait} opacity="0.16" />
                <ellipse cx={cx} cy={cy + 5} rx="5.2" ry="4.6" fill={u('mamelon')} stroke={c.trait} strokeWidth="0.6" strokeOpacity="0.5" />
                {/* réseau veineux de la grossesse */}
                <path d={lisse([[cx + g * 8, cy - 4], [cx + g * 14, cy - 18], [cx + g * 20, cy - 30]])} stroke={t.veine} strokeOpacity="0.45" strokeWidth="0.9" />
                <path d={lisse([[cx - g * 4, cy - 6], [cx - g * 6, cy - 19], [cx - g * 12, cy - 30]])} stroke={t.veine} strokeOpacity="0.35" strokeWidth="0.8" />
            </g>
        );
    };

    // ruban gradué à droite
    const CH = { x: 274, w: 38 };
    const tintes = [0.1, 0.17, 0.24, 0.31, 0.38];
    const reperes = [
        { y: XIPHOIDE, texte: 'Xiphoïde' }, { y: OMBILIC, texte: 'Ombilic' }, { y: SYMPHYSE, texte: 'Pubis' },
    ];
    const xChip = (y) => (hw(y) + AX);

    // paroi utérine gauche pour le placenta
    const parLat = murParoi(U, PLACENTA_1[0], PLACENTA_1[1], -1);
    const parIn = parLat.map((p) => [p[0] + 9.5 * Math.min(1, 1.2), p[1]]);
    const placentaD = poly([...parLat, ...parIn.slice().reverse()]);

    // trompes, ovaires, ligaments ronds
    const cornG = U.pg(26); const cornD = U.pd(26);
    const trompe = (corne, g) => lisse([[corne[0] + g * 2, corne[1] - 1], [corne[0] + g * 14, corne[1] - 9], [corne[0] + g * 26, corne[1] - 4], [corne[0] + g * 34, corne[1] + 8]]);
    const ovaire = (corne, g) => [corne[0] + g * 36, corne[1] + 15];
    const ligament = (corne, g) => lisse([[corne[0] + g * 2, corne[1] + 10], [corne[0] + g * 8, corne[1] + 40], [corne[0] + g * 5, corne[1] + 78], [corne[0] - g * 6, corne[1] + 100]]);

    const axeF = [G1.siege, G1.vertex];
    const ext = (a, b, f) => [a[0] + (a[0] - b[0]) * f, a[1] + (a[1] - b[1]) * f];

    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                {lin(`${P}fondu-g`, 0, 0, 0, 420, [[0, '#000'], [0.1, '#fff'], [0.935, '#fff'], [1, '#000']])}
                <mask id={`${P}fondu`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="360" height="460"><rect x="-20" y="-20" width="360" height="460" fill={u('fondu-g')} /></mask>
                {lin(`${P}seins-g`, 0, 54, 0, 96, [[0, '#000'], [1, '#fff']])}
                <mask id={`${P}m-seins`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="360" height="460"><rect x="-20" y="-20" width="360" height="460" fill={u('seins-g')} /></mask>
                <clipPath id={`${P}clip-corps`}><path d={CORPS} /></clipPath>
                {lin(`${P}peau`, 50, 0, 270, 0, [[0, c.chairOmbre], [0.12, c.chair], [0.5, c.chairClair], [0.88, c.chair], [1, c.chairOmbre]])}
                {rayon(`${P}ventre`, 148, 256, 104, [[0, blanc, S ? 0.1 : 0.85], [0.55, blanc, S ? 0.04 : 0.3], [1, blanc, 0]])}
                {rayon(`${P}ventre-bas`, 160, 352, 100, [[0, c.chairOmbre, 0.55], [1, c.chairOmbre, 0]])}
                {rayon(`${P}sein`, 90, 88, 52, [[0, c.chairClair], [0.4, c.chair], [1, c.chairOmbre, 0.9]])}
                {lin(`${P}sein-trait`, 0, 74, 0, 140, [[0, c.trait, 0], [0.5, c.trait, 0.45], [1, c.trait, 1]])}
                {lin(`${P}sein-ombre`, 0, 120, 0, 148, [[0, c.chairOmbre, 0.45], [1, c.chairOmbre, 0]])}
                {rayon(`${P}areole`, 0, 0, 1, [[0, aureole, 0.55]])}
                <radialGradient id={`${P}areole`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={aureole} stopOpacity="0.62" /><stop offset="0.7" stopColor={aureole} stopOpacity="0.5" /><stop offset="1" stopColor={aureole} stopOpacity="0" /></radialGradient>
                <radialGradient id={`${P}mamelon`} cx="0.36" cy="0.3" r="0.85"><stop offset="0" stopColor={S ? c.os : '#e4eaf3'} stopOpacity="0.85" /><stop offset="0.5" stopColor={aureole} stopOpacity="0.9" /><stop offset="1" stopColor={c.trait} stopOpacity="0.85" /></radialGradient>
                <radialGradient id={`${P}nombril`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.9" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" /></radialGradient>
                {lin(`${P}ligne`, 0, 196, 0, 366, [[0, c.trait, 0], [0.2, c.trait, 0.5], [0.8, c.trait, 0.5], [1, c.trait, 0]])}
                {/* utérus */}
                {rayon(`${P}u-mur`, 140, 250, 120, [[0, t.mur, S ? 0.42 : 0.4], [0.6, t.mur, S ? 0.38 : 0.34], [1, t.murFonce, S ? 0.7 : 0.55]])}
                {rayon(`${P}u-liquide`, 150, 270, 100, [[0, t.liquideClair, S ? 0.3 : 0.75], [1, t.liquide, S ? 0.5 : 0.62]])}
                {lin(`${P}u-trait`, 80, 200, 240, 360, [[0, t.murTrait, 0.95], [1, t.murTrait, 0.7]])}
                {lin(`${P}placenta`, 96, 0, 112, 0, [[0, t.placentaClair], [1, t.placenta]])}
                {lin(`${P}ruban`, 0, 148, 0, 360, [[0, t.mur, 0.42], [1, t.mur, 0.08]])}
            </defs>

            <g mask={u('fondu')}>
                {/* silhouette : thorax, abdomen arrondi, hanches, cuisses */}
                <path d={CORPS} fill={u('peau')} stroke="none" />
                <g clipPath={u('clip-corps')}>
                    <path d={CORPS} stroke={c.chairOmbre} strokeWidth="46" opacity="0.1" />
                    <path d={CORPS} stroke={c.chairOmbre} strokeWidth="28" opacity="0.14" />
                    <path d={CORPS} stroke={c.chairOmbre} strokeWidth="14" opacity="0.2" />
                    <path d={CORPS} stroke={c.chairOmbre} strokeWidth="6" opacity="0.28" />
                    {/* volume de l'abdomen : reflet central, ombre sous le ventre */}
                    <ellipse cx="148" cy="262" rx="100" ry="112" fill={u('ventre')} />
                    <ellipse cx="160" cy="350" rx="108" ry="46" fill={u('ventre-bas')} />
                    {/* sillon intermammaire et sternum */}
                    <path d="M160 40L160 140" stroke={c.chairOmbre} strokeWidth="14" opacity="0.1" />
                    <path d="M160 52L160 138" stroke={c.chairOmbre} strokeWidth="5" opacity="0.14" />
                </g>
                {/* seins */}
                {sein(100)}
                {sein(220)}
                {/* thorax inférieur : xiphoïde et arcs costaux */}
                <path d="M156 138C157 147 159 153 160 156C161 153 163 147 164 138Z" fill={c.os} stroke={c.traitFin} strokeWidth="1" />
                <path d={deux('M157 144C147 152 125 162 105 180C96 188 89 199 85 212')} stroke={c.trait} strokeOpacity="0.55" strokeWidth="1.6" />
                <path d={deux('M154 128C138 136 118 148 100 166')} stroke={c.traitFin} strokeOpacity="0.6" strokeWidth="1.2" />
                <path d={deux('M152 112C140 120 128 128 116 140')} stroke={c.traitFin} strokeOpacity="0.45" strokeWidth="1.1" />
                <path d={deux('M142 150C128 160 113 174 102 190')} stroke={c.traitFin} strokeOpacity="0.4" strokeWidth="1" />
                {/* ligne brune et ombilic */}
                <path d="M160 204L160 238M160 256L160 358" stroke={u('ligne')} strokeWidth="1.8" />
                <ellipse cx="160" cy={OMBILIC} rx="11" ry="7" fill={u('nombril')} />
                <path d={`M152 ${OMBILIC - 1}C155 ${OMBILIC + 5} 165 ${OMBILIC + 5} 168 ${OMBILIC - 1}`} stroke={c.trait} strokeOpacity="0.8" strokeWidth="1.2" />
                <path d={`M155 ${OMBILIC - 3}C158 ${OMBILIC - 5} 162 ${OMBILIC - 5} 165 ${OMBILIC - 3}`} stroke={c.traitFin} strokeWidth="0.9" />
                <ellipse cx="160" cy={OMBILIC + 5} rx="4" ry="1.4" fill={blanc} opacity={S ? 0.12 : 0.7} />
                {/* plis inguinaux et mont du pubis */}
                <path d={deux(lisse(PLI))} stroke={c.chairOmbre} strokeWidth="7" opacity="0.22" transform="translate(0 4)" />
                <path d={deux(lisse(PLI))} stroke={c.trait} strokeOpacity="0.8" strokeWidth="1.5" />
                <ellipse cx="160" cy="388" rx="24" ry="11" fill={blanc} opacity={S ? 0.06 : 0.45} />
                {/* cuisses : séparation et reflets */}
                <path d="M160 392C160 402 159 412 160 426" stroke={c.chairOmbre} strokeWidth="10" opacity="0.2" />
                <path d="M160 390C160 402 159 412 160 426" stroke={c.trait} strokeOpacity="0.7" strokeWidth="1.3" />
                <ellipse cx="116" cy="408" rx="20" ry="26" fill={blanc} opacity={S ? 0.05 : 0.4} />
                <ellipse cx="204" cy="408" rx="20" ry="26" fill={blanc} opacity={S ? 0.05 : 0.4} />
                {/* contour de la silhouette */}
                <path d={poly([...echelle(0, 432, 3).map(gauche)], false)} stroke={c.trait} strokeWidth="1.7" />
                <path d={poly([...echelle(0, 432, 3).map(droite)], false)} stroke={c.trait} strokeWidth="1.7" />
            </g>

            {/* trompes, ovaires, ligaments ronds */}
            <g opacity="0.95">
                <path d={ligament(cornG, -1)} stroke={t.murTrait} strokeOpacity="0.55" strokeWidth="1.3" strokeDasharray="1.5 2.5" />
                <path d={ligament(cornD, 1)} stroke={t.murTrait} strokeOpacity="0.55" strokeWidth="1.3" strokeDasharray="1.5 2.5" />
                <path d={trompe(cornG, -1)} stroke={t.murTrait} strokeWidth="3.4" strokeOpacity="0.85" />
                <path d={trompe(cornD, 1)} stroke={t.murTrait} strokeWidth="3.4" strokeOpacity="0.85" />
                <path d={trompe(cornG, -1)} stroke={t.mur} strokeWidth="1.8" />
                <path d={trompe(cornD, 1)} stroke={t.mur} strokeWidth="1.8" />
                {[[cornG, -1], [cornD, 1]].map(([co, g]) => {
                    const o = ovaire(co, g);
                    return <ellipse key={g} cx={r1(o[0])} cy={r1(o[1])} rx="9.5" ry="6.5" transform={`rotate(${g * 24} ${r1(o[0])} ${r1(o[1])})`} fill={t.ovaire} stroke={t.murTrait} strokeWidth="1" fillOpacity="0.9" />;
                })}
            </g>

            {/* utérus gravide vu par transparence */}
            <path d={poly(U.ext)} fill={u('u-mur')} stroke="none" />
            <path d={poly(U.int)} fill={u('u-liquide')} stroke={t.murTrait} strokeOpacity="0.5" strokeWidth="0.9" />
            <path d={placentaD} fill={u('placenta')} stroke={t.placenta} strokeWidth="0.8" />
            <path d={lisse(parLat.map((p, i) => [p[0] + 2.4 + (i % 2) * 0.4, p[1]]))} stroke={t.placentaClair} strokeOpacity="0.55" strokeWidth="0.9" strokeDasharray="1.5 2.2" />
            {/* col et segment inférieur */}
            <path d="M149 352C150 358 150 366 152 372M171 352C170 358 170 366 168 372" stroke={t.murTrait} strokeWidth="1.5" strokeOpacity="0.8" />
            <path d="M152 372C157 375 163 375 168 372" stroke={t.murTrait} strokeWidth="1.3" strokeOpacity="0.7" />
            {/* cordon ombilical */}
            {(() => {
                const a = G1.cordon; const fin = [parIn[Math.floor(parIn.length * 0.55)][0] - 4, parIn[Math.floor(parIn.length * 0.55)][1]];
                const cd = lisse([a, [a[0] - 14, a[1] + 6], [a[0] - 30, a[1] - 4], [fin[0] + 18, fin[1] + 12], fin]);
                return (
                    <g>
                        <path d={cd} stroke={t.cordonTrait} strokeWidth="4.2" strokeOpacity="0.85" />
                        <path d={cd} stroke={t.cordon} strokeWidth="2.8" />
                        <path d={cd} stroke={t.cordonTrait} strokeWidth="2.8" strokeDasharray="0.9 2.3" strokeOpacity="0.7" />
                    </g>
                );
            })()}
            {dessinFoetus(c, `${P}`, G1, { fin: true })}
            {/* axe longitudinal du fœtus */}
            <path d={lisse([ext(axeF[0], axeF[1], 0.12), ext(axeF[1], axeF[0], 0.1)])} stroke={c.trait} strokeOpacity="0.75" strokeWidth="1.1" strokeDasharray="4 3" />
            <path d={`M${r1(ext(axeF[1], axeF[0], 0.1)[0] - 3.2)} ${r1(ext(axeF[1], axeF[0], 0.1)[1] - 5)}L${r1(ext(axeF[1], axeF[0], 0.1)[0])} ${r1(ext(axeF[1], axeF[0], 0.1)[1] + 1)}L${r1(ext(axeF[1], axeF[0], 0.1)[0] + 3.2)} ${r1(ext(axeF[1], axeF[0], 0.1)[1] - 5)}`} stroke={c.trait} strokeOpacity="0.85" strokeWidth="1.3" />
            {/* contour d'utérus par-dessus pour netteté */}
            <path d={poly(U.ext)} stroke={u('u-trait')} strokeWidth="1.7" />

            {/* ruban gradué de la hauteur utérine (à droite) et repères */}
            <g>
                {BND.slice(0, 5).map((bas, i) => {
                    const haut = BND[i + 1]; const m = (haut + bas) / 2;
                    return (
                        <g key={i}>
                            <path d={`M${r1(xChip(m) + 3)} ${r1(m)}L${CH.x - 2} ${r1(m)}`} stroke={c.traitFin} strokeWidth="1" strokeDasharray="1 2.6" />
                            <rect x={CH.x} y={haut + 0.8} width={CH.w} height={bas - haut - 1.6} rx="5" fill={c.chair} stroke="none" />
                            <rect x={CH.x} y={haut + 0.8} width={CH.w} height={bas - haut - 1.6} rx="5" fill={t.mur} fillOpacity={tintes[i] * 1.3} stroke={c.traitFin} strokeWidth="1" />
                        </g>
                    );
                })}
                {BND.map((y, i) => <path key={i} d={`M${CH.x - 6} ${y}L${CH.x} ${y}`} stroke={c.trait} strokeWidth="1.3" strokeOpacity="0.8" />)}
                {reperes.map((r) => (
                    <path key={r.texte} d={`M${r1(AX - hw(r.y) - 3)} ${r.y}L${r1(AX - hw(r.y) - 15)} ${r.y}`} stroke={c.traitFin} strokeWidth="1" strokeDasharray="1 2.6" />
                ))}
            </g>
        </g>
    );
};

// ═════════════════════════ DÉCOR : VUE 2 (FŒTUS) ═════════════════════════
const K2 = 1.85;
const U2 = uterus(160, 30, K2, 4);
const G2 = geomFoetus(1.5, -3, 163, 158);
const NAVEL2 = [160, 30 + K2 * (OMBILIC - 204)];
const FOYERS = {
    sd: [105, 74], sg: [215, 74], id: [102, 208], ig: [220, 206],
};

const decorFoetus = (c) => {
    const P = 'gravide-foetus-b-';
    const u = (s) => `url(#${P}${s})`;
    const S = c.sombre;
    const t = teintes(c);
    const blanc = S ? c.chairClair : '#ffffff';
    const U = U2;
    const G = G2;
    const placentaSeg = murParoi(U, 0.2, 0.62, -1);
    const placentaInt = placentaSeg.map((p) => [p[0] + 14, p[1]]);
    const placentaD = poly([...placentaSeg, ...placentaInt.slice().reverse()]);
    const tige = placentaInt[Math.floor(placentaInt.length * 0.5)];
    const cd = lisse([G.cordon, [G.cordon[0] - 22, G.cordon[1] + 10], [G.cordon[0] - 46, G.cordon[1] - 4], [tige[0] + 20, tige[1] + 18], [tige[0] + 2, tige[1]]]);
    const L = G.T;
    const coeur = G.coeur;
    const fo = (k) => {
        const [x, y] = FOYERS[k];
        return (
            <g key={k}>
                <circle cx={x} cy={y} r="27" fill={t.foyer} fillOpacity={S ? 0.1 : 0.1} stroke={t.foyer} strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2.5 3" />
                <circle cx={x} cy={y} r="20" fill={u('foyer')} stroke={t.foyer} strokeWidth="1.5" />
                <circle cx={x} cy={y} r="3" fill={t.foyer} />
            </g>
        );
    };
    const axeF = [G.siege, G.vertex];
    const ext = (a, b, f) => [a[0] + (a[0] - b[0]) * f, a[1] + (a[1] - b[1]) * f];
    const a0 = ext(axeF[0], axeF[1], 0.06); const a1 = ext(axeF[1], axeF[0], 0.05);
    const ligne = (x1, y1, x2, y2, pt) => <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={c.traitFin} strokeWidth="1" />;
    void ligne;
    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                {rayon(`${P}paroi`, 160, 200, 200, [[0, c.chairClair], [0.6, c.chair], [1, c.chairOmbre]])}
                {lin(`${P}fondu-g`, 0, 0, 0, 420, [[0, '#000'], [0.04, '#fff'], [0.96, '#fff'], [1, '#000']])}
                {rayon(`${P}u-mur`, 150, 150, 190, [[0, t.mur, S ? 0.55 : 0.5], [0.7, t.mur, S ? 0.5 : 0.48], [1, t.murFonce, S ? 0.8 : 0.7]])}
                {rayon(`${P}u-liquide`, 150, 190, 170, [[0, t.liquideClair, S ? 0.34 : 0.9], [1, t.liquide, S ? 0.55 : 0.75]])}
                {lin(`${P}u-trait`, 40, 30, 280, 320, [[0, t.murTrait, 0.95], [1, t.murTrait, 0.75]])}
                {lin(`${P}placenta`, 60, 0, 90, 0, [[0, t.placentaClair], [1, t.placenta]])}
                {rayon(`${P}foyer`, 0, 0, 1, [[0, t.foyer, 0.3]])}
                <radialGradient id={`${P}foyer`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={t.foyer} stopOpacity="0.5" /><stop offset="1" stopColor={t.foyer} stopOpacity="0.14" /></radialGradient>
                <clipPath id={`${P}clip-u`}><path d={poly(U.int)} /></clipPath>
            </defs>
            {/* paroi abdominale, en arrière-plan */}
            <ellipse cx="160" cy="200" rx="152" ry="192" fill={u('paroi')} stroke={c.trait} strokeOpacity="0.35" strokeWidth="1.2" />
            <ellipse cx="160" cy="200" rx="152" ry="192" fill="none" stroke={c.chairOmbre} strokeOpacity="0.35" strokeWidth="14" />
            {/* plans de repérage : ligne médiane et plan ombilical */}
            <path d={`M160 12L160 ${NAVEL2[1] - 10}M160 ${NAVEL2[1] + 10}L160 392`} stroke={c.trait} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="5 4" />
            <path d={`M14 ${NAVEL2[1]}L148 ${NAVEL2[1]}M172 ${NAVEL2[1]}L306 ${NAVEL2[1]}`} stroke={c.trait} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="5 4" />
            <ellipse cx="160" cy={NAVEL2[1]} rx="9" ry="5.6" fill={c.chairOmbre} opacity="0.6" />
            <path d={`M153 ${NAVEL2[1] - 1}C156 ${NAVEL2[1] + 4.5} 164 ${NAVEL2[1] + 4.5} 167 ${NAVEL2[1] - 1}`} stroke={c.trait} strokeOpacity="0.8" strokeWidth="1.2" />
            {/* utérus coupé */}
            <path d={poly(U.ext)} fill={u('u-mur')} stroke="none" />
            <path d={poly(U.ext)} stroke={c.murTrait} strokeWidth="1" opacity="0" />
            <path d={poly(U.int)} fill={u('u-liquide')} stroke={t.murTrait} strokeOpacity="0.55" strokeWidth="1" />
            {/* fibres du myomètre */}
            <g clipPath={u('clip-u')} opacity="0" />
            <path d={placentaD} fill={u('placenta')} stroke={t.placenta} strokeWidth="1" />
            <path d={lisse(placentaSeg.map((p, i) => [p[0] + 5.5 + (i % 2) * 0.5, p[1]]))} stroke={t.placentaClair} strokeOpacity="0.6" strokeWidth="1.1" strokeDasharray="2 3" />
            <path d={lisse(placentaSeg.map((p) => [p[0] + 9.5, p[1]]))} stroke={t.placentaClair} strokeOpacity="0.4" strokeWidth="0.9" strokeDasharray="1.5 3" />
            {/* col */}
            <path d={`M${r1(U.axe(UH) - 12)} ${r1(U.bas - 8)}C${r1(U.axe(UH) - 11)} ${r1(U.bas + 8)} ${r1(U.axe(UH) - 11)} ${r1(U.bas + 18)} ${r1(U.axe(UH) - 9)} ${r1(U.bas + 26)}M${r1(U.axe(UH) + 12)} ${r1(U.bas - 8)}C${r1(U.axe(UH) + 11)} ${r1(U.bas + 8)} ${r1(U.axe(UH) + 11)} ${r1(U.bas + 18)} ${r1(U.axe(UH) + 9)} ${r1(U.bas + 26)}`} stroke={t.murTrait} strokeWidth="2" strokeOpacity="0.8" />
            {/* cordon */}
            <path d={cd} stroke={t.cordonTrait} strokeWidth="6.4" strokeOpacity="0.85" />
            <path d={cd} stroke={t.cordon} strokeWidth="4.4" />
            <path d={cd} stroke={t.cordonTrait} strokeWidth="4.4" strokeDasharray="1.1 3.4" strokeOpacity="0.65" />
            {dessinFoetus(c, P, G, {})}
            {/* cœur fœtal et ondes sonores vers le foyer */}
            <path d={`M${r1(coeur[0])} ${r1(coeur[1] + 5)}C${r1(coeur[0] - 8)} ${r1(coeur[1] - 1)} ${r1(coeur[0] - 5)} ${r1(coeur[1] - 8)} ${r1(coeur[0])} ${r1(coeur[1] - 3.2)}C${r1(coeur[0] + 5)} ${r1(coeur[1] - 8)} ${r1(coeur[0] + 8)} ${r1(coeur[1] - 1)} ${r1(coeur[0])} ${r1(coeur[1] + 5)}Z`} fill={t.placenta} fillOpacity="0.9" stroke={blanc} strokeOpacity="0.8" strokeWidth="0.8" />
            {[12, 19, 26].map((r, i) => (
                <path key={r} d={`M${r1(coeur[0] + r * Math.cos(rad(-8)))} ${r1(coeur[1] + r * Math.sin(rad(-8)))}A${r} ${r} 0 0 1 ${r1(coeur[0] + r * Math.cos(rad(46)))} ${r1(coeur[1] + r * Math.sin(rad(46)))}`} stroke={t.foyer} strokeOpacity={0.9 - i * 0.2} strokeWidth="1.5" />
            ))}
            {/* axe fœtal */}
            <path d={lisse([a0, a1])} stroke={c.trait} strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="5 3.5" />
            <path d={`M${r1(a1[0] - 4)} ${r1(a1[1] - 6)}L${r1(a1[0])} ${r1(a1[1] + 1)}L${r1(a1[0] + 4)} ${r1(a1[1] - 6)}`} stroke={c.trait} strokeOpacity="0.85" strokeWidth="1.4" />
            <path d={poly(U.ext)} stroke={u('u-trait')} strokeWidth="2" />
            {/* foyers d'auscultation */}
            {Object.keys(FOYERS).map(fo)}
            {/* repères : tête, dos, siège, petites parties */}
            <g stroke={c.trait} strokeOpacity="0.75" strokeWidth="1">
                <path d={`M${r1(G.vertex[0] + 20)} ${r1(G.vertex[1] - 8)}L${r1(U.axe(UH) + 78)} ${r1(U.bas - 4)}`} />
                <circle cx={r1(G.vertex[0] + 20)} cy={r1(G.vertex[1] - 8)} r="2" fill={c.trait} />
            </g>
        </g>
    );
};

// ═════════════════════════ ZONES ═════════════════════════
const CST_HU = [
    'Conforme au terme',
    'Inférieure au terme (suspicion de retard de croissance)',
    'Supérieure au terme (macrosomie, hydramnios, jumeaux ?)',
    'Stagnation de la hauteur utérine entre deux visites',
];
const LIB_HU = [
    'Fond utérin au-dessus du pubis (≈ 12-16 SA)',
    'Fond utérin à mi-distance pubis-ombilic (≈ 16-20 SA)',
    'Fond utérin à l’ombilic (≈ 20-24 SA)',
    'Fond utérin à mi-distance ombilic-xiphoïde (≈ 28-32 SA)',
    'Fond utérin sous l’appendice xiphoïde (≈ 36 SA)',
];
const ID_HU = ['hu_pubis', 'hu_pubis_ombilic', 'hu_ombilic', 'hu_ombilic_xiphoide', 'hu_xiphoide'];
const CHIP = { x: 274, w: 38 };

const zonesHauteur = () => Object.fromEntries(ID_HU.map((id, n) => [id,
    zone(LIB_HU[n], 'Hauteur utérine', CST_HU, [
        chemin(polygoneBande(n)),
        rectangle(CHIP.x, BND[n + 1], CHIP.w, BND[n] - BND[n + 1], 5),
    ])]));

const CST_BDCF = [
    'BDCF perçus, réguliers (110-160 /min)',
    'BDCF non perçus',
    'Tachycardie fœtale',
    'Bradycardie fœtale',
    'BDCF irréguliers',
];
const zonesFoyers = () => ({
    bdcf_id: zone('Foyer des BDCF — quadrant inférieur droit', 'Bruits du cœur fœtal', CST_BDCF, [cercle(FOYERS.id[0], FOYERS.id[1], 21), aire(cercle(FOYERS.id[0], FOYERS.id[1], 36))]),
    bdcf_ig: zone('Foyer des BDCF — quadrant inférieur gauche', 'Bruits du cœur fœtal', CST_BDCF, [cercle(FOYERS.ig[0], FOYERS.ig[1], 21), aire(cercle(FOYERS.ig[0], FOYERS.ig[1], 36))]),
    bdcf_sd: zone('Foyer des BDCF — quadrant supérieur droit', 'Bruits du cœur fœtal', CST_BDCF, [cercle(FOYERS.sd[0], FOYERS.sd[1], 21), aire(cercle(FOYERS.sd[0], FOYERS.sd[1], 34))]),
    bdcf_sg: zone('Foyer des BDCF — quadrant supérieur gauche', 'Bruits du cœur fœtal', CST_BDCF, [cercle(FOYERS.sg[0], FOYERS.sg[1], 21), aire(cercle(FOYERS.sg[0], FOYERS.sg[1], 34))]),
});

const zonesFoetus = () => {
    const G = G2; const U = U2;
    const anneau = `${poly(U.ext)}${poly(orient(U.int).slice().reverse())}`;
    return {
        tonus: zone('Tonus utérin', 'Utérus', ['Utérus souple', 'Contractions utérines perçues', 'Utérus hypertonique', 'Utérus irritable (contractions de Braxton Hicks)'],
            [chemin(anneau), aire(chemin(poly(U.ext)))]),
        presentation: zone('Présentation fœtale', 'Fœtus', ['Céphalique', 'Siège', 'Transverse', 'Oblique', 'Mobile'],
            [chemin(`${lisse(G.tete, true)}${lisse(G.tronc, true)}`)]),
        mouvements: zone('Mouvements fœtaux', 'Fœtus', ['Mouvements actifs perçus', 'Mouvements diminués', 'Mouvements non perçus', 'Mouvements visibles à travers la paroi'],
            [chemin(cheminMembres(G, 0)), aire(chemin(cheminMembres(G, 9)))]),
        ...zonesFoyers(),
    };
};

export default {
    id: 'gravide',
    titre: 'Abdomen gravide : hauteur utérine et fœtus',
    vues: [
        {
            id: 'abdomen',
            titre: 'Abdomen',
            viewBox: '0 0 320 420',
            largeur: 320,
            decor: (c) => decorAbdomen(c),
            etiquettes: [
                { x: 20, y: 34, texte: 'D', taille: 13 },
                { x: 300, y: 34, texte: 'G', taille: 13 },
                { x: AX - hw(XIPHOIDE) - 17, y: XIPHOIDE + 3.5, texte: 'Xiphoïde', ancre: 'end', taille: 9.5 },
                { x: AX - hw(OMBILIC) - 17, y: OMBILIC + 3.5, texte: 'Ombilic', ancre: 'end', taille: 9.5 },
                { x: AX - hw(SYMPHYSE) - 17, y: SYMPHYSE + 3.5, texte: 'Pubis', ancre: 'end', taille: 9.5 },
                ...[['12–16', 0], ['16–20', 1], ['20–24', 2], ['28–32', 3], ['36', 4]].flatMap(([txt, n]) => {
                    const m = (BND[n] + BND[n + 1]) / 2;
                    return [
                        { x: CHIP.x + CHIP.w / 2, y: m + 1, texte: txt, taille: 11 },
                        { x: CHIP.x + CHIP.w / 2, y: m + 12.5, texte: 'SA', taille: 8 },
                    ];
                }),
            ],
            zones: zonesHauteur(),
        },
        {
            id: 'foetus',
            titre: 'Fœtus',
            viewBox: '0 0 320 420',
            largeur: 320,
            decor: (c) => decorFoetus(c),
            etiquettes: [
                { x: 20, y: 24, texte: 'D', taille: 13 },
                { x: 300, y: 24, texte: 'G', taille: 13 },
            ],
            zones: zonesFoetus(),
        },
    ],
};

// exportés pour les essais en ligne de commande
export { ellipse };
