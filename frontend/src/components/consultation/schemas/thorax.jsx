import React from 'react';
import { zone, chemin, cercle, ellipse, aire, paire } from './outils';

// ─────────────────────────────────────────────────────────────────────────────
//  THORAX : auscultation et pouls — version « Atlas médical »
//  Face (cage thoracique antérieure + foyers), Dos (thorax postérieur), Pouls (corps entier).
//  Les champs pulmonaires sont calculés en découpant le contour du poumon par des courbes de coupe communes :
//  les régions voisines sont donc parfaitement jointives. Les aires d'appui des foyers sont des cellules de Voronoï
//  (jamais de chevauchement). Le fondu du bas du dessin est un masque (aucun rectangle de fond).
// ─────────────────────────────────────────────────────────────────────────────

const AX = 190;
const r1 = (n) => Math.round(n * 10) / 10;
const G = (d, y) => [AX - d, y];          // côté droit du patient (gauche de l'écran), d = distance à la ligne médiane
const mir = (p) => [2 * AX - p[0], p[1]];
const mirs = (pts) => pts.map(mir);

// ───── outils de géométrie ─────
// Catmull-Rom -> polyligne dense
const cr = (pts, ferme = false, pas = 2.5) => {
    const n = pts.length;
    const out = [];
    const g = (i) => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    const segs = ferme ? n : n - 1;
    for (let i = 0; i < segs; i += 1) {
        const p0 = g(i - 1); const p1 = g(i); const p2 = g(i + 1); const p3 = g(i + 2);
        const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const k = Math.max(2, Math.ceil(L / pas));
        for (let j = 0; j < k; j += 1) {
            const t = j / k; const t2 = t * t; const t3 = t2 * t;
            out.push(p1.map((_, d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
        }
    }
    if (!ferme) out.push(pts[n - 1].slice());
    return out;
};
const pp = (pts) => pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L');
const D = (pts, ferme = true) => `M${pp(pts)}${ferme ? 'Z' : ''}`;
// Catmull-Rom -> courbes de Bézier absolues
const lisse = (pts, ferme = false) => {
    const n = pts.length;
    const g = (i) => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let s = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    const segs = ferme ? n : n - 1;
    for (let i = 0; i < segs; i += 1) {
        const p0 = g(i - 1); const p1 = g(i); const p2 = g(i + 1); const p3 = g(i + 2);
        s += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
    }
    return s + (ferme ? 'Z' : '');
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// ruban : stations [x, y, demi-largeur] -> contour fermé (bouts arrondis si boutA / boutB = 1)
const ruban = (st, pas = 2, boutA = 0, boutB = 0) => {
    const S = cr(st, false, pas);
    const A = []; const B = [];
    S.forEach((p, i) => {
        const q = S[Math.min(i + 1, S.length - 1)]; const o = S[Math.max(i - 1, 0)];
        let tx = q[0] - o[0]; let ty = q[1] - o[1];
        const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        A.push([p[0] + ty * p[2], p[1] - tx * p[2]]);
        B.push([p[0] - ty * p[2], p[1] + tx * p[2]]);
    });
    const a = S[0]; const b = S[S.length - 1];
    const cap = (c, sens, rayon, haut) => {
        if (!haut) return [];
        const ang = Math.atan2(sens[1], sens[0]);
        const o = [];
        for (let k = 1; k < 8; k += 1) { const t = ang + Math.PI / 2 - (Math.PI * k) / 8; o.push([c[0] + rayon * Math.cos(t) * haut, c[1] + rayon * Math.sin(t) * haut]); }
        return o;
    };
    const dirB = [b[0] - S[S.length - 2][0], b[1] - S[S.length - 2][1]];
    const dirA = [S[0][0] - S[1][0], S[0][1] - S[1][1]];
    return A.concat(cap(b, dirB, b[2], boutB), B.slice().reverse(), cap(a, dirA, a[2], boutA));
};
// bande de largeur variable le long d'une liste de points (demi-largeur w0 -> w1)
const bande = (pts, w0, w1 = w0, a = 0, b = 0) => D(ruban(pts.map((p, i) => [p[0], p[1], w0 + (w1 - w0) * (i / (pts.length - 1))]), 2, a, b));
const Sym = ({ children }) => (
    <>
        {children}
        <g transform={`matrix(-1 0 0 1 ${2 * AX} 0)`}>{children}</g>
    </>
);
// fonction y = f(d) interpolée à partir de points (d, y)
const courbe = (pts) => {
    const dense = cr(pts, false, 1);
    return (d) => {
        if (d <= dense[0][0]) return dense[0][1];
        for (let i = 0; i < dense.length - 1; i += 1) {
            if (d <= dense[i + 1][0]) { const t = (d - dense[i][0]) / ((dense[i + 1][0] - dense[i][0]) || 1); return dense[i][1] + t * (dense[i + 1][1] - dense[i][1]); }
        }
        return dense[dense.length - 1][1];
    };
};
const croise = (a, b, c, d) => {
    const rx = b[0] - a[0]; const ry = b[1] - a[1]; const sx = d[0] - c[0]; const sy = d[1] - c[1];
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den;
    const v = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
    return t >= 0 && t < 1 && v >= 0 && v < 1 ? t : null;
};
const scinder = (poly, cut) => {
    const n = poly.length; const hits = [];
    for (let i = 0; i < cut.length - 1; i += 1) {
        for (let j = 0; j < n; j += 1) {
            const t = croise(cut[i], cut[i + 1], poly[j], poly[(j + 1) % n]);
            if (t !== null) hits.push({ i, j, t, p: lerp(cut[i], cut[i + 1], t) });
        }
    }
    if (hits.length < 2) return { p: [poly, []], trait: [] };
    hits.sort((a, b) => a.i + a.t - (b.i + b.t));
    const A = hits[0]; const B = hits[hits.length - 1];
    const mid = cut.slice(A.i + 1, B.i + 1);
    const va = (de, vers) => { const o = []; let j = de.j; while (j !== vers.j) { j = (j + 1) % n; o.push(poly[j]); } return o; };
    return { p: [[A.p, ...va(A, B), B.p, ...mid.slice().reverse()], [B.p, ...va(B, A), A.p, ...mid]], trait: [A.p, ...mid, B.p] };
};
const centre = (poly) => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
// retourne les deux parties triées par cle(centre) croissante
const scinderPar = (poly, cut, cle) => {
    const r = scinder(poly, cut);
    return { p: r.p.slice().sort((a, b) => cle(centre(a)) - cle(centre(b))), trait: r.trait };
};
const cleAbs = (c) => Math.abs(c[0] - AX);
const cleY = (c) => c[1];
const coupeY = (f, sens) => { const o = []; for (let d = -14; d <= 190; d += 3) o.push([AX + sens * d, f(d)]); return o; };
const coupeLat = (pts, sens) => cr(pts.map(([d, y]) => [AX + sens * d, y]), false, 3);
const garder = (poly, a, b, c) => {
    const out = [];
    for (let i = 0; i < poly.length; i += 1) {
        const p = poly[i]; const q = poly[(i + 1) % poly.length];
        const fp = a * p[0] + b * p[1] - c; const fq = a * q[0] + b * q[1] - c;
        if (fp <= 0) out.push(p);
        if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
};
const cellule = (c, r, voisins = [], extras = []) => {
    let poly = Array.from({ length: 40 }, (_, k) => [c[0] + r * Math.cos((k * Math.PI) / 20), c[1] + r * Math.sin((k * Math.PI) / 20)]);
    voisins.forEach((v) => {
        const nx = v[0] - c[0]; const ny = v[1] - c[1];
        poly = garder(poly, nx, ny, nx * (c[0] + v[0]) / 2 + ny * (c[1] + v[1]) / 2);
    });
    extras.forEach(([a, b, k]) => { poly = garder(poly, a, b, k); });
    return poly;
};

// ───── silhouette des tissus mous, commune à la face et au dos (cou plus large, trapèzes en pente douce, deltoïdes) ─────
const MOU_G = [[31, 8], [31, 30], [33, 48], [41, 58], [62, 67], [92, 73], [118, 77], [136, 82], [145, 89], [150, 102], [152, 118], [151, 138], [148, 160], [146, 190], [144, 230], [143, 270], [143, 330]];
const MOU_I = [[126, 330], [126, 270], [127, 230], [128, 200], [127, 170], [125, 152], [123, 143]];
const MOU_C = [[123, 143], [123, 165], [121, 195], [118, 230], [113, 270], [108, 310], [107, 330]];
const MOU = (() => {
    const m = [...cr(MOU_G.map((p) => G(p[0], p[1])), false, 2), ...cr(MOU_I.map((p) => G(p[0], p[1])), false, 2), ...cr(MOU_C.map((p) => G(p[0], p[1])), false, 2)];
    return D(m.concat(mirs(m).reverse()));
})();
const flankD = courbe(MOU_C.map(([d, y]) => [y, d]));
// région axillaire : de la coupe latérale (trait) jusqu'au flanc ; marge > 0 = aire d'appui élargie vers le bras
const axillaire = (trait, sens, marge = 0) => {
    const pts = trait.slice();
    const yb = trait[trait.length - 1][1]; const yh = trait[0][1];
    const fl = (y) => AX + sens * (flankD(y) + 1 + marge);
    for (let y = yb - 12; y > yh - 6; y -= 6) pts.push([fl(y), y]);
    pts.push([fl(yh - 6), yh - 6]);
    return pts;
};
const gradMasque = (P, bas) => (
    <>
        <linearGradient id={`${P}fd`} gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="320">
            <stop offset="0" stopColor="#000" /><stop offset="0.1" stopColor="#fff" /><stop offset={bas} stopColor="#fff" /><stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${P}masque`} maskUnits="userSpaceOnUse" x="0" y="0" width="380" height="340"><rect x="0" y="0" width="380" height="340" fill={`url(#${P}fd)`} /></mask>
    </>
);

// ═════════════════════════════ VUE FACE ═════════════════════════════
// Côtes : S = extrémité sternale, J = jonction chondro-costale, L = point le plus latéral (flanc), P = point d'attache sur l'arc costal
const COTES_F = [
    { k: 1, S: [17, 103], J: [33, 111], L: [60, 95] },
    { k: 2, S: [12, 124], J: [40, 129], L: [70, 110] },
    { k: 3, S: [11, 141], J: [50, 152], L: [87, 132] },
    { k: 4, S: [11, 158], J: [55, 173], L: [99, 151] },
    { k: 5, S: [11, 175], J: [59, 194], L: [107, 172] },
    { k: 6, S: [11, 191], J: [62, 214], L: [113, 191] },
    { k: 7, S: [11, 204], J: [64, 238], L: [117, 213] },
    { k: 8, S: null, J: [80, 262], L: [117, 233], P: [64, 242] },
    { k: 9, S: null, J: [92, 277], L: [115, 250], P: [78, 258] },
    { k: 10, S: null, J: [100, 289], L: [110, 267], P: [90, 273] },
];
const tigeF = ({ J, L }) => {
    const dx = L[0] - J[0]; const dy = L[1] - J[1];
    return [J, [J[0] + dx * 0.34, J[1] + dy * 0.12], [J[0] + dx * 0.68, J[1] + dy * 0.42], [J[0] + dx * 0.9, J[1] + dy * 0.8], L, [L[0] + 2.2, L[1] - 5]];
};
const cartF = (c) => {
    const base = c.S || c.P; const m = lerp(base, c.J, 0.5);
    return [base, [m[0], m[1] + (c.S && c.k > 2 ? -1.5 - c.k * 0.3 : 0)], c.J];
};
const osseuxF = (c) => {
    const tg = tigeF(c).map(([d, y]) => G(d, y));
    const ct = cartF(c).map(([d, y]) => G(d, y));
    return { os: bande(tg, c.k <= 2 ? 3.7 : 3.2, 1.1, 1, 1), cart: bande(ct, 2.3, 2.1, 1, 1) };
};
// ordonnée de l'axe de la côte k à la distance d de la ligne médiane, et milieu de l'espace intercostal k (entre côtes k et k+1)
const AXES = COTES_F.map((c) => cr([...cartF(c), ...tigeF(c).slice(1)], false, 1));
const yCote = (k, d) => {
    const a = AXES[k - 1];
    for (let i = 0; i < a.length - 1; i += 1) {
        if ((a[i][0] - d) * (a[i + 1][0] - d) <= 0) return a[i][1] + ((d - a[i][0]) / ((a[i + 1][0] - a[i][0]) || 1)) * (a[i + 1][1] - a[i][1]);
    }
    return a[a.length - 1][1];
};
const espace = (k, d) => (yCote(k, d) + yCote(k + 1, d)) / 2;

// Contour des poumons (d = distance à la ligne médiane, côté poumon)
const POUMON_CTRL_D = [[34, 66], [46, 69], [54, 78], [57, 91], [62, 107], [74, 124], [86, 138], [94, 152], [100, 172], [106, 192], [110, 212], [113, 232], [111, 243], [100, 238], [88, 228], [74, 217], [58, 208], [44, 202], [28, 198], [14, 194], [9, 182], [7, 160], [7, 140], [9, 120], [13, 100], [19, 86], [26, 74]];
const POUMON_CTRL_G = [[34, 66], [46, 69], [54, 78], [57, 91], [62, 107], [74, 124], [86, 138], [94, 152], [100, 172], [106, 192], [110, 212], [113, 232], [112, 248], [101, 247], [88, 240], [74, 232], [60, 222], [48, 212], [38, 200], [31, 188], [24, 176], [16, 166], [10, 155], [7, 140], [9, 120], [13, 100], [19, 86], [26, 74]];
// courbes de coupe (en d) : sommet | champ moyen | base ; coupe latérale = région axillaire
const COUPE_A = courbe([[0, 124], [14, 125], [30, 129], [44, 128], [58, 120], [72, 110], [92, 98], [140, 92]]);
const COUPE_B = courbe([[0, 176], [14, 180], [34, 189], [54, 198], [74, 198], [92, 188], [108, 178], [140, 166]]);
const LAT_F = [[84, 118], [91, 142], [96, 170], [98, 200], [98, 235], [97, 268]];
const partitionFace = (ctrl, sens) => {
    const poly = cr(ctrl.map(([d, y]) => [AX + sens * d, y]), true, 2.5);
    const l = scinderPar(poly, coupeLat(LAT_F, sens), cleAbs);
    const h = scinderPar(l.p[0], coupeY(COUPE_A, sens), cleY);
    const m = scinderPar(h.p[1], coupeY(COUPE_B, sens), cleY);
    return { poly, haut: h.p[0], moy: m.p[0], base: m.p[1], trait: l.trait, lat: l.p[1] };
};
const PD = partitionFace(POUMON_CTRL_D, -1);
const PG = partitionFace(POUMON_CTRL_G, 1);

// Foyers d'auscultation : placés dans les espaces intercostaux réels du dessin ; aire = cellule de Voronoï (sans chevauchement)
const FOYERS = (() => {
    const f = {
        aortique: { x: AX - 27, y: espace(2, 27), lettre: 'A', r: 20 },
        pulmonaire: { x: AX + 27, y: espace(2, 27), lettre: 'P', r: 20 },
        erb: { x: AX + 40, y: espace(3, 40), lettre: 'E', r: 20 },
        tricuspidien: { x: AX + 24, y: espace(5, 24), lettre: 'T', r: 20 },
        mitral: { x: AX + 77, y: espace(5, 77), lettre: 'M', r: 17 },
    };
    const ids = Object.keys(f);
    ids.forEach((id) => { f[id].cell = cellule([f[id].x, f[id].y], f[id].r, ids.filter((o) => o !== id).map((o) => [f[o].x, f[o].y]), id === 'mitral' ? [[1, 0, AX + 92]] : []); });
    return f;
})();
const R_FOYER = 9.6;

const STERNUM_DEMI = [[0, 86.5], [8, 85], [14, 87.5], [19.5, 92.5], [22, 99], [21.4, 107], [19.6, 115], [16.6, 122.5], [16.2, 126.5], [16.4, 131], [15.4, 142], [14.8, 160], [15.4, 178], [16, 192], [14, 202.5], [9, 209], [4.5, 218], [0, 229]];
const STERNUM = (() => { const cote = STERNUM_DEMI.map((p) => G(p[0], p[1])); return cote.concat(mirs(cote).reverse().slice(1, -1)); })();
const X = (dx, y, w) => [AX + dx, y, w];

// Vaisseaux : le contour est tracé d'abord, le remplissage ensuite (pas de traits parasites aux jonctions)
const Vx = ({ ds, fill, trait, op = 0.92 }) => (
    <g opacity={op}>
        <g fill={trait} stroke={trait} strokeWidth="2.2">{ds.map((d, i) => <path key={i} d={d} />)}</g>
        <g fill={fill} stroke="none">{ds.map((d, i) => <path key={i} d={d} />)}</g>
    </g>
);

const decorFace = (c) => {
    const P = 'thorax-face-a-';
    const u = (s) => `url(#${P}${s})`;
    const sb = c.sombre;
    const cart = sb ? '#6a809c' : '#e4edf6';
    const cartTrait = sb ? '#9fb1c8' : '#93a6bd';
    const osTrait = sb ? '#c0cddf' : '#8798b0';
    const arteriel = sb ? '#d9707b' : '#d9535f'; const arterielT = sb ? '#f0a0a8' : '#a93a46';
    const veineux = sb ? '#6f93d1' : '#4f78c4'; const veineuxT = sb ? '#a3bcec' : '#35589f';
    const coeurT = sb ? '#e9a9b0' : '#b9505f';
    const tubeC = sb ? '#7f9bc0' : '#9fb7d6';
    const hc = (id, a, b) => (
        <radialGradient id={`${P}${id}`} cx="0.4" cy="0.3" r="0.85"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></radialGradient>
    );
    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <linearGradient id={`${P}mou`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.chairOmbre} /><stop offset="0.12" stopColor={c.chair} />
                    <stop offset="0.5" stopColor={c.chairClair} /><stop offset="0.88" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <linearGradient id={`${P}os`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.os} /><stop offset="0.35" stopColor={c.chairClair} /><stop offset="0.7" stopColor={c.os} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <linearGradient id={`${P}ster`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.chairOmbre} /><stop offset="0.3" stopColor={c.os} /><stop offset="0.5" stopColor={c.chairClair} /><stop offset="0.7" stopColor={c.os} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <radialGradient id={`${P}poumon`} cx="0.5" cy="0.45" r="0.65">
                    <stop offset="0" stopColor={c.poumon} stopOpacity="0.16" /><stop offset="1" stopColor={c.poumon} stopOpacity="0.5" />
                </radialGradient>
                {hc('ra', sb ? '#d9808a' : '#f4b6bc', sb ? '#b95a66' : '#e48f98')}
                {hc('rv', sb ? '#cd6f7b' : '#ee9ea6', sb ? '#a9505c' : '#d6727e')}
                {hc('lv', sb ? '#bf5f6b' : '#e3858f', sb ? '#8f414d' : '#c25a68')}
                {gradMasque(P, 0.74)}
                <linearGradient id={`${P}fv`} gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="94">
                    <stop offset="0" stopColor="#000" /><stop offset="1" stopColor="#fff" />
                </linearGradient>
                <mask id={`${P}masque-v`} maskUnits="userSpaceOnUse" x="0" y="0" width="380" height="340"><rect x="0" y="0" width="380" height="340" fill={u('fv')} /></mask>
            </defs>

            <g mask={u('masque')}>
                <path d={MOU} fill={u('mou')} stroke={c.traitFin} strokeWidth="1" />
                <Sym>
                    <path d={lisse([G(29, 12), G(24, 38), G(15, 64), G(9.5, 86)])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.75" />
                    <path d={lisse([G(33, 30), G(31, 52), G(26, 72), G(21, 89)])} stroke={c.traitFin} strokeWidth="0.8" opacity="0.45" />
                    <path d={lisse([G(36, 48), G(62, 62), G(98, 72), G(128, 79)])} stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" />
                    <path d={lisse([G(134, 94), G(124, 114), G(118, 134), G(121, 142)])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.6" />
                    <path d={lisse([G(141, 90), G(148, 108), G(146, 136)])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.55" />
                    <path d={bande([G(137, 122), G(138, 155), G(139, 200), G(139.6, 240)], 4.6, 3.6)} fill={u('os')} stroke={osTrait} strokeWidth="0.8" opacity="0.6" />
                    <circle cx={AX - 137} cy="114" r="9.5" fill={u('os')} stroke={osTrait} strokeWidth="1" opacity="0.92" />
                </Sym>

                <Sym>
                    {COTES_F.map((k) => <path key={`c${k.k}`} d={osseuxF(k).cart} fill={cart} stroke={cartTrait} strokeWidth="0.8" />)}
                    {COTES_F.map((k) => <path key={`o${k.k}`} d={osseuxF(k).os} fill={u('os')} stroke={osTrait} strokeWidth="0.9" />)}
                </Sym>

                <Sym>
                    <path d={bande([G(112, 88), G(115, 98), G(123, 104), G(131, 103)], 2.8, 1.8, 0, 1)} fill={u('os')} stroke={osTrait} strokeWidth="1" />
                    <path d={D(ruban([G(14, 95).concat(6), G(24, 92.6).concat(4.4), G(44, 90.4).concat(3.6), G(64, 90).concat(3.4), G(84, 88).concat(3.6), G(102, 85).concat(4), G(116, 83).concat(4.6), G(128, 84.6).concat(5), G(138, 87.6).concat(4)], 1.5, 1, 1))} fill={u('os')} stroke={osTrait} strokeWidth="1.3" />
                    <path d={lisse([G(20, 91.6), G(44, 89), G(70, 87.6), G(98, 83.6)])} stroke={c.chairClair} strokeWidth="1.1" opacity="0.9" />
                    <path d={D(cr([G(122, 87), G(130, 84.8), G(139, 86), G(143.5, 89.8), G(142, 95), G(134, 96), G(125, 93.4)], true, 1.5))} fill={u('os')} stroke={osTrait} strokeWidth="1.1" />
                </Sym>

                {[PD, PG].map((p, i) => (
                    <g key={i}>
                        <path d={D(p.poly)} fill={u('poumon')} stroke={c.poumon} strokeWidth="1.2" />
                        <path d={D(p.poly)} stroke={sb ? '#9bb0d4' : '#6f8fbd'} strokeWidth="0.6" opacity="0.7" />
                    </g>
                ))}
                <path d={lisse([G(100, 152), G(78, 176), G(60, 192), G(46, 204)])} stroke={c.poumon} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                <path d={lisse([G(100, 152), G(55, 156), G(12, 158)])} stroke={c.poumon} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
                <path d={lisse([[AX + 100, 152], [AX + 80, 178], [AX + 64, 198], [AX + 52, 212]])} stroke={c.poumon} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />

                <g opacity="0.8">
                    <path d={D(ruban([[AX, 40, 5.2], [AX, 126, 5.2]], 2, 1, 0))} fill={tubeC} fillOpacity="0.35" stroke={sb ? '#a5b4c8' : '#7f93ad'} strokeWidth="0.8" />
                    <path d={[50, 56, 62, 68, 74, 80, 86, 92, 98, 104, 110, 116, 122].map((y) => `M${AX - 4.2} ${y}L${AX + 4.2} ${y}`).join('')} stroke={sb ? '#a5b4c8' : '#7f93ad'} strokeWidth="0.7" opacity="0.5" />
                    <path d={D(ruban([[AX - 2, 126, 3.6], [AX - 16, 134, 3.6], [AX - 30, 143, 3.4], [AX - 42, 151, 3]], 2, 0, 1))} fill={tubeC} fillOpacity="0.35" stroke={sb ? '#a5b4c8' : '#7f93ad'} strokeWidth="0.7" />
                    <path d={D(ruban([[AX + 2, 126, 3.6], [AX + 18, 134, 3.6], [AX + 34, 143, 3.4], [AX + 50, 151, 3]], 2, 0, 1))} fill={tubeC} fillOpacity="0.35" stroke={sb ? '#a5b4c8' : '#7f93ad'} strokeWidth="0.7" />
                </g>

                <g mask={u('masque-v')}>
                    <Vx fill={veineux} trait={veineuxT} ds={[D(ruban([X(14, 118, 4.2), X(-2, 117, 3.8), X(-22, 121, 3.2), X(-40, 129, 1.4)], 2, 0, 1))]} />
                    <Vx fill={veineux} trait={veineuxT} ds={[D(ruban([X(-17, 136, 5), X(-17, 112, 4.8), X(-16.4, 92, 4.4), X(-17, 70, 4)], 2, 0, 0))]} />
                    <Vx fill={arteriel} trait={arterielT} ds={[
                        D(ruban([X(5, 152, 8.6), X(3.6, 138, 8.6), X(5, 124, 8.2), X(10, 111, 7.8), X(20, 103.4, 7.4), X(31, 105, 6.8), X(38, 116, 6.4), X(38.6, 132, 6.2)], 2, 0, 1)),
                        D(ruban([X(8, 106, 3.8), X(3, 92, 3.6), X(-5, 78, 3.3), X(-13, 62, 3)], 2, 0, 0)),
                        D(ruban([X(17, 104, 3.2), X(15.4, 88, 3.1), X(14.4, 66, 3), X(14, 46, 2.8)], 2, 0, 0)),
                        D(ruban([X(27, 105, 3.2), X(36, 93, 3.2), X(52, 86, 2.6), X(70, 85, 0.9)], 2, 0, 1)),
                    ]} />
                    <Vx fill={veineux} trait={veineuxT} ds={[
                        D(ruban([X(19, 146, 8), X(19, 130, 8), X(22, 118, 7.4)], 2, 0, 1)),
                        D(ruban([X(20, 120, 5.2), X(38, 111, 4.4), X(56, 114, 3.4), X(75, 125, 1)], 2, 1, 1)),
                    ]} />
                </g>
                <g stroke={coeurT} strokeWidth="1.1">
                    <path d={lisse([X(24, 138), X(40, 139), X(54, 147), X(65, 160), X(72, 176), X(71, 192), X(65, 203), X(56, 196), X(44, 178), X(32, 158)].map((p) => [AX + p[0], p[1]]), true)} fill={u('lv')} />
                    <path d={lisse([[-12, 137], [6, 133.6], [22, 137], [33, 150], [46, 170], [58, 190], [65, 203], [52, 207], [30, 209], [8, 206], [-6, 201], [-14, 194], [-13, 172], [-12, 152]].map((p) => [AX + p[0], p[1]]), true)} fill={u('rv')} />
                    <path d={lisse([[-17, 130], [-26, 138], [-32, 152], [-32, 168], [-27, 184], [-19, 195], [-13, 188], [-11, 172], [-11, 152], [-10, 138]].map((p) => [AX + p[0], p[1]]), true)} fill={u('ra')} />
                    <path d={lisse([[30, 138], [36, 131], [45, 129.6], [52, 133], [52, 141], [45, 146], [36, 146]].map((p) => [AX + p[0], p[1]]), true)} fill={u('ra')} />
                </g>
                <path d={lisse([[AX + 30, 146], [AX + 40, 164], [AX + 52, 184], [AX + 62, 200]])} stroke={arterielT} strokeWidth="1.3" opacity="0.85" />
                <path d={lisse([[AX - 12, 142], [AX - 11, 164], [AX - 14, 186], [AX - 16, 196]])} stroke={arterielT} strokeWidth="1.3" opacity="0.85" />

                <path d={lisse(STERNUM, true)} fill={u('ster')} fillOpacity="0.38" stroke={osTrait} strokeWidth="1" opacity="0.9" />
                <path d={lisse([G(16, 124.5), [AX, 127], mir(G(16, 124.5))])} stroke={osTrait} strokeWidth="0.9" opacity="0.8" />
                <path d={lisse([G(10, 90), [AX, 93], mir(G(10, 90))])} stroke={c.traitFin} strokeWidth="0.8" opacity="0.6" />
                <path d={`M${AX + 76} 120L${AX + 76} 214M${AX - 76} 120L${AX - 76} 214`} stroke={c.traitFin} strokeWidth="0.8" strokeDasharray="1.5 3.5" opacity="0.7" />
            </g>

            {[1, 2, 3, 4, 5, 6].map((k) => [-1, 1].map((s) => <circle key={`${k}${s}`} cx={AX + s * 56} cy={r1(espace(k, 56))} r="5.8" fill={c.fond} fillOpacity="0.92" stroke={c.traitFin} strokeWidth="0.8" />))}
            {Object.entries(FOYERS).map(([id, f]) => <circle key={id} cx={f.x} cy={f.y} r={R_FOYER + 0.9} fill={c.fond} stroke={c.trait} strokeWidth="1.3" />)}
        </g>
    );
};

// ───── zones de la vue face ─────
const N_COEUR = 'Bruits du cœur normaux (B1 B2)';
const SEJ = 'Souffle systolique éjectionnel';
const SIN = "Souffle systolique d'insuffisance";
const CONSTATS_FOYER = {
    aortique: [N_COEUR, SEJ, 'Souffle irradiant au cou', 'Souffle diastolique', 'Éclat de B2', 'B2 diminué ou aboli', 'Frottement péricardique', 'Bruit de galop B3', 'Bruit de galop B4'],
    pulmonaire: [N_COEUR, SEJ, 'Souffle diastolique', 'Éclat de B2', 'Dédoublement de B2', 'Dédoublement fixe de B2', 'Frottement péricardique', 'Bruit de galop B3'],
    erb: [N_COEUR, SEJ, SIN, 'Souffle diastolique', 'Dédoublement de B2', 'Frottement péricardique', 'Bruit de galop B3', 'Bruit de galop B4'],
    tricuspidien: [N_COEUR, SIN, 'Souffle diastolique', 'Roulement diastolique', 'Frottement péricardique', 'Bruit de galop B3', 'Bruit de galop B4'],
    mitral: [N_COEUR, SIN, "Souffle irradiant à l'aisselle", 'Roulement diastolique', 'Roulement présystolique', "Claquement d'ouverture mitral", 'B1 éclatant', 'Bruit de galop B3', 'Bruit de galop B4', 'Frottement péricardique'],
};
const CONSTATS_CHAMP = ['Murmure vésiculaire normal', 'Murmure vésiculaire diminué', 'Murmure vésiculaire aboli', 'Râles crépitants', 'Râles sous-crépitants', 'Râles ronflants', 'Râles sibilants', 'Frottement pleural', 'Souffle tubaire', 'Souffle pleurétique', 'Bronchophonie / égophonie', 'Matité à la percussion'];
const POULS_BASE = ['Perçu', 'Diminué', 'Faible', 'Filant', 'Aboli', 'Bondissant', 'Irrégulier'];
const OPPOSE = 'Diminué par rapport au côté opposé';
const CONSTATS_POULS = {
    carotide: [...POULS_BASE, 'Souffle', 'Frémissement'],
    humeral: [...POULS_BASE, OPPOSE],
    radial: [...POULS_BASE, OPPOSE],
    femoral: [...POULS_BASE, 'Souffle', 'Frémissement'],
    poplite: [...POULS_BASE, 'Masse pulsatile', 'Souffle'],
    tibial: [...POULS_BASE, OPPOSE],
    pedieux: [...POULS_BASE, OPPOSE],
};
const CONSTATS_AORTE = ['Battements perçus et réguliers', 'Pulsatilité augmentée', 'Masse pulsatile', 'Frémissement', 'Souffle abdominal', 'Battements non perçus'];
const CONSTATS_OEDEME = ["Pas d'œdème", 'Œdème prenant le godet', 'Œdème ne prenant pas le godet', 'Œdème mou et indolore', 'Œdème rouge chaud et douloureux', 'Peau tendue et luisante', 'Cyanose', 'Varices associées'];

const zFoyer = (id, libelle) => {
    const f = FOYERS[id];
    return zone(libelle, 'Auscultation cardiaque', CONSTATS_FOYER[id], [cercle(r1(f.x), r1(f.y), R_FOYER), aire(chemin(D(f.cell)))]);
};
const zChamp = (libelle, groupe, poly) => zone(libelle, groupe, CONSTATS_CHAMP, [chemin(D(poly))]);
const zAx = (libelle, groupe, p, sens) => zone(libelle, groupe, CONSTATS_CHAMP, [chemin(D(p.lat)), aire(chemin(D(axillaire(p.trait, sens, 7))))]);
const GP = 'Poumons (face antérieure)';

const zonesFace = {
    sommet_d: zChamp('Sommet droit', GP, PD.haut),
    sommet_g: zChamp('Sommet gauche', GP, PG.haut),
    moyen_d: zChamp('Champ moyen droit', GP, PD.moy),
    moyen_g: zChamp('Champ moyen gauche', GP, PG.moy),
    base_d: zChamp('Base droite', GP, PD.base),
    base_g: zChamp('Base gauche', GP, PG.base),
    axillaire_d: zAx('Aisselle droite', GP, PD, -1),
    axillaire_g: zAx('Aisselle gauche', GP, PG, 1),
    foyer_aortique: zFoyer('aortique', 'Foyer aortique'),
    foyer_pulmonaire: zFoyer('pulmonaire', 'Foyer pulmonaire'),
    foyer_erb: zFoyer('erb', "Foyer d'Erb"),
    foyer_tricuspidien: zFoyer('tricuspidien', 'Foyer tricuspidien'),
    foyer_mitral: zFoyer('mitral', 'Foyer mitral'),
};

const etiquettesFace = [
    { x: AX - 134, y: 52, texte: 'D', taille: 17 },
    { x: AX + 134, y: 52, texte: 'G', taille: 17 },
    ...[1, 2, 3, 4, 5, 6].flatMap((k) => [-1, 1].map((s) => ({ x: AX + s * 56, y: espace(k, 56) + 3.9, texte: String(k), taille: 11, ancre: 'middle' }))),
    ...Object.values(FOYERS).map((f) => ({ x: f.x, y: f.y + 4.6, texte: f.lettre, taille: 13, ancre: 'middle' })),
    { x: AX, y: 268, texte: 'A aortique · P pulmonaire', taille: 10 },
    { x: AX, y: 280, texte: 'E Erb · T tricuspidien', taille: 10 },
    { x: AX, y: 292, texte: 'M mitral', taille: 10 },
    { x: AX, y: 304, texte: '1 à 6 : espaces intercostaux', taille: 10 },
];


// ═════════════════════════════ VUE DOS ═════════════════════════════
const T_DOS = (k) => 84 + 17.5 * (k - 1);                    // ordonnée de la vertèbre thoracique k
const COTES_D = [
    { k: 1, dA: 36, yA: 8, dL: 58, yL: 11 },
    { k: 2, dA: 46, yA: 11, dL: 70, yL: 22 },
    { k: 3, dA: 54, yA: 14, dL: 87, yL: 30 },
    { k: 4, dA: 60, yA: 16, dL: 99, yL: 36 },
    { k: 5, dA: 64, yA: 18, dL: 107, yL: 42 },
    { k: 6, dA: 68, yA: 20, dL: 113, yL: 46 },
    { k: 7, dA: 70, yA: 22, dL: 117, yL: 50 },
    { k: 8, dA: 70, yA: 23, dL: 118, yL: 52 },
    { k: 9, dA: 66, yA: 22, dL: 112, yL: 48 },
    { k: 10, dA: 58, yA: 20, dL: 100, yL: 40 },
    { k: 11, dA: 44, yA: 14, dL: 66, yL: 20 },
    { k: 12, dA: 34, yA: 8, dL: 48, yL: 8 },
];
const coteDos = (o) => {
    const t = T_DOS(o.k);
    const A = [o.dA, t + o.yA]; const L = [o.dL, t + o.yL];
    const m = lerp(A, L, 0.55);
    return [[11, t + 3.5], [19, t + 2.4], [(11 + o.dA) / 2 + 6, t + o.yA * 0.45], A, [m[0], m[1] + 1.2], L].map((p) => G(p[0], p[1]));
};
const POUMON_DOS = [[32, 82], [42, 83], [50, 90], [55, 100], [60, 112], [72, 130], [84, 154], [95, 180], [105, 206], [111, 230], [114, 252], [112, 268], [104, 272], [92, 266], [74, 260], [52, 255], [30, 252], [12, 250], [9, 232], [9, 200], [9, 160], [10, 130], [13, 104], [19, 92], [25, 85]];
const COUPE_A_DOS = courbe([[0, 128], [26, 127], [46, 124], [66, 117], [88, 107], [110, 97], [140, 93]]);
const COUPE_B_DOS = courbe([[0, 195], [30, 197], [52, 200], [74, 194], [92, 188], [110, 182], [140, 178]]);
const LAT_D = [[84, 118], [89, 140], [94, 170], [96, 200], [96, 235], [95, 268]];
const INTER_D = 44;                                      // bord interne de l'omoplate
const partitionDos = (sens) => {
    const poly = cr(POUMON_DOS.map(([d, y]) => [AX + sens * d, y]), true, 2.5);
    const l = scinderPar(poly, coupeLat(LAT_D, sens), cleAbs);
    const h = scinderPar(l.p[0], coupeY(COUPE_A_DOS, sens), cleY);
    const m = scinderPar(h.p[1], coupeY(COUPE_B_DOS, sens), cleY);
    const i = scinderPar(m.p[0], [[AX + sens * INTER_D, 0], [AX + sens * INTER_D, 400]], cleAbs);
    return { poly, haut: h.p[0], inter: i.p[0], moy: i.p[1], base: m.p[1], trait: l.trait, lat: l.p[1] };
};
const PDOS_D = partitionDos(1);                         // côté droit du patient : droite de l'écran
const PDOS_G = partitionDos(-1);

const OMOPLATE = [[45, 100], [57, 104], [71, 106.5], [84, 105], [95, 108], [102, 116], [108, 122], [110, 131], [105, 138], [99, 150], [92, 163], [82, 177], [70, 191], [58, 200], [51, 198], [49, 188], [47, 160], [45, 130], [44, 112]];
const EPINE = [[44, 122, 2.2], [60, 118, 2.6], [78, 110, 3], [98, 100, 3.6], [118, 92, 4.6], [132, 89, 5], [141, 90.5, 3.2]];

const decorDos = (c) => {
    const P = 'thorax-dos-a-';
    const u = (s) => `url(#${P}${s})`;
    const sb = c.sombre;
    const osTrait = sb ? '#c0cddf' : '#8798b0';
    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <linearGradient id={`${P}mou`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.chairOmbre} /><stop offset="0.12" stopColor={c.chair} />
                    <stop offset="0.5" stopColor={c.chairClair} /><stop offset="0.88" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <linearGradient id={`${P}os`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.os} /><stop offset="0.35" stopColor={c.chairClair} /><stop offset="0.7" stopColor={c.os} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <linearGradient id={`${P}omoplate`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={c.chairClair} /><stop offset="0.6" stopColor={c.chairClair} stopOpacity="0.8" /><stop offset="1" stopColor={c.os} />
                </linearGradient>
                <linearGradient id={`${P}epine`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.chairOmbre} /><stop offset="0.5" stopColor={c.chairClair} /><stop offset="1" stopColor={c.os} />
                </linearGradient>
                <radialGradient id={`${P}poumon`} cx="0.5" cy="0.45" r="0.65">
                    <stop offset="0" stopColor={c.poumon} stopOpacity="0.16" /><stop offset="1" stopColor={c.poumon} stopOpacity="0.5" />
                </radialGradient>
                {gradMasque(P, 0.76)}
            </defs>
            <g mask={u('masque')}>
                <path d={MOU} fill={u('mou')} stroke={c.traitFin} strokeWidth="1" />
                <Sym>
                    <path d={lisse([G(26, 66), G(30, 120), G(26, 200), G(22, 280), G(20, 340)])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.45" />
                    <path d={lisse([G(134, 94), G(126, 116), G(120, 134), G(121, 142)])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.6" />
                    <path d={lisse([G(2, 30), G(30, 52), G(70, 66), G(112, 76)])} stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" />
                    <path d={lisse([G(141, 90), G(148, 108), G(146, 136)])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.55" />
                </Sym>

                <Sym>
                    {COTES_D.slice().reverse().map((o) => <path key={o.k} d={bande(coteDos(o), o.k >= 11 ? 2.3 : 2.7, 1.2, 1, 1)} fill={c.os} stroke={osTrait} strokeWidth="0.8" opacity="0.88" />)}
                    {COTES_D.map((o) => { const t = T_DOS(o.k); return <ellipse key={`t${o.k}`} cx={AX - 17} cy={t + 1} rx="7.4" ry="3" transform={`rotate(-8 ${AX - 17} ${t + 1})`} fill={u('os')} stroke={osTrait} strokeWidth="0.8" />; })}
                </Sym>

                <g>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].slice().reverse().map((k) => {
                        const t = T_DOS(k);
                        return (
                            <g key={k}>
                                <path d={`M${AX - 11} ${t + 4}L${AX + 11} ${t + 4}`} stroke={osTrait} strokeWidth="0.8" opacity="0.5" />
                                <path d={`M${AX - 2.6} ${t - 4}C${AX - 3.4} ${t + 3} ${AX - 3.6} ${t + 9} ${AX} ${t + 17}C${AX + 3.6} ${t + 9} ${AX + 3.4} ${t + 3} ${AX + 2.6} ${t - 4}Z`} fill={u('epine')} stroke={osTrait} strokeWidth="1" />
                            </g>
                        );
                    })}
                    {[0, 1, 2, 3].map((i) => {
                        const t = 66 - i * 14;
                        return <path key={i} d={`M${AX - 2.2} ${t - 4}C${AX - 2.8} ${t + 2} ${AX - 3} ${t + 6} ${AX} ${t + 11}C${AX + 3} ${t + 6} ${AX + 2.8} ${t + 2} ${AX + 2.2} ${t - 4}Z`} fill={u('epine')} stroke={osTrait} strokeWidth="0.9" opacity={0.95 - i * 0.2} />;
                    })}
                </g>

                <Sym>
                    <path d={lisse(OMOPLATE.map((p) => G(p[0], p[1])), true)} fill={u('omoplate')} stroke={osTrait} strokeWidth="1.6" />
                    <path d={lisse([G(46, 108), G(47, 150), G(51, 190)])} stroke={c.trait} strokeWidth="1" opacity="0.55" />
                    <path d={lisse([G(70, 150), G(82, 160), G(88, 172)])} stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" />
                    <path d={D(ruban(EPINE.map((e) => G(e[0], e[1]).concat(e[2])), 1.5, 0, 1))} fill={u('os')} stroke={osTrait} strokeWidth="1.2" />
                    <path d={D(cr([G(122, 88), G(130, 84.8), G(139, 86), G(144, 90), G(141, 95), G(133, 95), G(125, 93)], true, 1.5))} fill={u('os')} stroke={osTrait} strokeWidth="1.1" />
                    <circle cx={AX - 137} cy="116" r="10" fill={u('os')} stroke={osTrait} strokeWidth="1.1" opacity="0.9" />
                </Sym>

                {[PDOS_D, PDOS_G].map((p, i) => (
                    <g key={i}>
                        <path d={D(p.poly)} fill={u('poumon')} stroke={c.poumon} strokeWidth="1.2" />
                        <path d={D(p.poly)} stroke={sb ? '#9bb0d4' : '#6f8fbd'} strokeWidth="0.6" opacity="0.7" />
                    </g>
                ))}
                <Sym><path d={lisse([G(104, 140), G(80, 176), G(60, 214), G(44, 246)])} stroke={c.poumon} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" /></Sym>
                <path d={`M${AX - 62} ${T_DOS(7) + 12}L${AX + 62} ${T_DOS(7) + 12}`} stroke={c.trait} strokeWidth="0.9" strokeDasharray="2 3" opacity="0.6" />
            </g>
        </g>
    );
};

const GD = 'Poumons (face postérieure)';
const zonesDos = {
    sommet_d_dos: zChamp('Sommet droit (dos)', GD, PDOS_D.haut),
    sommet_g_dos: zChamp('Sommet gauche (dos)', GD, PDOS_G.haut),
    inter_d_dos: zChamp('Région interscapulaire droite', GD, PDOS_D.inter),
    inter_g_dos: zChamp('Région interscapulaire gauche', GD, PDOS_G.inter),
    moyen_d_dos: zChamp('Champ moyen droit (dos)', GD, PDOS_D.moy),
    moyen_g_dos: zChamp('Champ moyen gauche (dos)', GD, PDOS_G.moy),
    base_d_dos: zChamp('Base droite (dos)', GD, PDOS_D.base),
    base_g_dos: zChamp('Base gauche (dos)', GD, PDOS_G.base),
    axillaire_d_dos: zAx('Aisselle droite (dos)', GD, PDOS_D, 1),
    axillaire_g_dos: zAx('Aisselle gauche (dos)', GD, PDOS_G, -1),
};
const etiquettesDos = [
    { x: AX + 134, y: 52, texte: 'D', taille: 17 },
    { x: AX - 134, y: 52, texte: 'G', taille: 17 },
    { x: AX + 8, y: 60, texte: 'C7', taille: 11, ancre: 'start' },
    { x: AX + 12, y: 284, texte: 'T12', taille: 11, ancre: 'start' },
    { x: AX + 66, y: T_DOS(7) + 10, texte: 'T7', taille: 10.5, ancre: 'start' },
];


// ═════════════════════════════ VUE POULS (corps entier) ═════════════════════════════
const PX = 150;                                   // axe du corps
const Q = (d, y) => [PX - d, y];                  // côté droit du patient (gauche de l'écran)
const mirP = (p) => [2 * PX - p[0], p[1]];
const SymP = ({ children }) => (
    <>
        {children}
        <g transform={`matrix(-1 0 0 1 ${2 * PX} 0)`}>{children}</g>
    </>
);
// moitié gauche de l'écran du contour : cou, épaule, flanc (taille, hanche, trochanter), cuisse, genou, mollet, cheville, pied, périnée
const HAUT_P = [[0, 79], [15, 80], [16, 91], [21, 97], [36, 101], [54, 104], [69, 109], [77, 118], [78, 130], [72, 140], [60, 146]];
const EXT_P = [[52, 154], [51, 172], [48, 192], [43, 212], [41, 230], [43, 248], [49, 262], [52, 274], [51.6, 294], [50, 326], [47, 362], [44, 392], [43.4, 408], [48, 428], [50.2, 446], [47, 466], [41.4, 490], [38, 508], [37.6, 518]];
// pied tourné vers l'extérieur : cou-de-pied, bord externe, cinq orteils (gros orteil à l'intérieur), bord interne
const PIED_P = [[40, 529], [43.4, 540], [45.6, 550], [46, 556.6], [44.8, 560.6], [42, 562.4], [39.6, 562], [37.6, 563.8], [34.6, 565.2], [31, 565.6], [28.4, 564.4], [26.4, 565.6], [23.2, 566.8], [19.8, 565.6], [17.6, 562], [16.4, 555], [16.6, 545], [17.4, 532], [17.6, 520]];
const INT_P = [[19, 500], [16.4, 478], [12.8, 452], [12.8, 430], [13.8, 408], [12.6, 392], [10.8, 368], [8.6, 338], [5.6, 310], [2.4, 296], [0, 290]];
const CORPS_G = cr([...HAUT_P, ...EXT_P, ...PIED_P, ...INT_P].map((p) => Q(p[0], p[1])), false, 2);
const mirs2 = (pts) => pts.map(mirP);
const CORPS = CORPS_G.concat(mirs2(CORPS_G).reverse().slice(1));
const TETE_P = cr([[0, 9], [11, 10.4], [19, 16], [23.4, 27], [24.6, 40], [23.8, 52], [21.4, 62], [17, 71], [10, 78], [0, 81]].map((p) => Q(p[0], p[1])), false, 1.6);
const TETE = TETE_P.concat(mirs2(TETE_P).reverse().slice(1, -1));
// bras : deltoïde, bras, coude, avant-bras, poignet
const BRAS_EXT = cr([[64, 107], [73, 110], [78.4, 119], [80.4, 134], [81, 152], [82.4, 176], [84.6, 198], [86.8, 218], [88.4, 240], [90.4, 264], [92, 286], [92.6, 294]].map((p) => Q(p[0], p[1])), false, 2);
const BRAS_INT = cr([[78.4, 294], [77, 270], [74.2, 244], [70.6, 220], [67.4, 198], [63.8, 176], [60.4, 156], [58, 146], [55, 140]].map((p) => Q(p[0], p[1])), false, 2);
const BRAS = BRAS_EXT.concat(BRAS_INT);
// main : paume avec éminence thénar, quatre doigts de longueurs différentes légèrement fléchis, pouce court
const MAIN_ORIGINE = [85.4, 294]; const MAIN_ANGLE = 7;
const mainP = (pts) => {
    const a = (MAIN_ANGLE * Math.PI) / 180; const [ox, oy] = Q(MAIN_ORIGINE[0], MAIN_ORIGINE[1]);
    return pts.map(([x, y]) => { const lx = x * 1.12; const ly = y * 1.12; return [ox - lx * Math.cos(a) - ly * Math.sin(a), oy - lx * Math.sin(a) + ly * Math.cos(a)]; });
};
const DOIGTS_P = [{ x: 6.3, L: 22, w: 2.3, dx: -0.5 }, { x: 2.1, L: 25, w: 2.4, dx: -1.2 }, { x: -2.1, L: 22.6, w: 2.3, dx: -1.8 }, { x: -6.3, L: 17.6, w: 2.1, dx: -2.6 }];
const MAIN_FORMES = {
    paume: mainP(cr([[7.2, -1], [9.4, 6], [10.2, 15], [9.4, 24], [8, 28], [4, 30.6], [-1, 31.2], [-5.6, 30.4], [-8.4, 27.6], [-8.8, 18], [-8, 8], [-6.8, -1]], false, 1.5)),
    doigts: DOIGTS_P.map((f) => mainP(ruban([[f.x, 25, f.w], [f.x + f.dx * 0.35, 25 + f.L * 0.5, f.w * 0.96], [f.x + f.dx, 25 + f.L, f.w * 0.78]], 1.4, 0, 1))),
    pouce: mainP(ruban([[9, 6, 3.6], [12.6, 13, 3.3], [15.6, 20, 3], [17, 26.6, 2.5]], 1.2, 0, 1)),
};

// points de palpation (d = distance à l'axe, y) ; dos = point situé en arrière du corps (pointillé)
const PTS = {
    carotide: { d: 14, y: 92 },
    humeral: { d: 70, y: 214 },
    radial: { d: 88, y: 288 },
    aorte: { d: -5, y: 208 },
    femoral: { d: 24, y: 266 },
    poplite: { d: 29, y: 410, dos: true },
    tibial: { d: 21, y: 508, dos: true },
    pedieux: { d: 27, y: 541 },
};
const ptXY = (p) => [PX - p.d, p.y];
const R_PT = 7.6;
// aires d'appui : disque de rayon 19 limité par les voisins (Voronoï) et, pour les carotides, par l'axe du corps
const CELLULES_P = (() => {
    const gauche = ['carotide', 'humeral', 'radial', 'femoral', 'poplite', 'tibial', 'pedieux'];
    const o = {};
    gauche.forEach((id) => {
        const voisins = gauche.filter((a) => a !== id).map((a) => ptXY(PTS[a])).filter((q) => Math.hypot(q[0] - ptXY(PTS[id])[0], q[1] - ptXY(PTS[id])[1]) < 60);
        o[id] = cellule(ptXY(PTS[id]), 19, voisins, id === 'carotide' ? [[1, 0, PX - 0.4]] : []);
    });
    o.aorte = cellule(ptXY(PTS.aorte), 19);
    return o;
})();

const decorPouls = (c) => {
    const P = 'thorax-pouls-a-';
    const u = (s) => `url(#${P}${s})`;
    const sb = c.sombre;
    const arteriel = sb ? '#e07a85' : '#d9535f';
    const trait = { stroke: c.trait, strokeWidth: 1.5 };
    const F = { stroke: c.traitFin, strokeWidth: 1, fill: 'none' };
    const art = (pts, w = 2.2, op = 0.7, tirets) => <path d={lisse(pts)} stroke={arteriel} strokeWidth={w} opacity={op} fill="none" strokeDasharray={tirets} />;
    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <linearGradient id={`${P}corps`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.chairOmbre} /><stop offset="0.14" stopColor={c.chair} />
                    <stop offset="0.5" stopColor={c.chairClair} /><stop offset="0.86" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <linearGradient id={`${P}membre`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor={c.chairOmbre} /><stop offset="0.3" stopColor={c.chair} />
                    <stop offset="0.64" stopColor={c.chairClair} /><stop offset="1" stopColor={c.chair} />
                </linearGradient>
                <radialGradient id={`${P}tete`} cx="0.46" cy="0.4" r="0.72">
                    <stop offset="0" stopColor={c.chairClair} /><stop offset="0.62" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                </radialGradient>
                <clipPath id={`${P}clip-corps`}><path d={D(CORPS)} /></clipPath>
            </defs>
            <ellipse cx={PX} cy="568" rx="66" ry="4.5" fill={c.chairOmbre} opacity="0.5" />
            <path d={D(CORPS)} fill={u('corps')} {...trait} />
            <g clipPath={`url(#${P}clip-corps)`}>
                <SymP>
                    <path d={lisse([Q(51, 172), Q(46, 200), Q(42, 226), Q(44, 248)])} stroke={c.chairOmbre} strokeWidth="7" opacity="0.5" />
                    <ellipse cx={PX - 30} cy="348" rx="7.5" ry="36" transform={`rotate(3 ${PX - 30} 348)`} fill={c.chairClair} opacity="0.55" />
                    <path d={lisse([Q(50, 292), Q(48, 330), Q(45, 380), Q(44, 406)])} stroke={c.chairOmbre} strokeWidth="9" opacity="0.5" />
                    <path d={lisse([Q(11, 330), Q(12, 372), Q(14, 402)])} stroke={c.chairOmbre} strokeWidth="7" opacity="0.42" />
                    <ellipse cx={PX - 41} cy="450" rx="5" ry="21" fill={c.chairOmbre} opacity="0.5" />
                    <ellipse cx={PX - 31} cy="446" rx="5" ry="18" fill={c.chairClair} opacity="0.5" />
                    <ellipse cx={PX - 31} cy="548" rx="9" ry="7" fill={c.chairClair} opacity="0.5" />
                    <ellipse cx={PX} cy="150" rx="26" ry="22" fill={c.chairClair} opacity="0.35" />
                    <ellipse cx={PX} cy="262" rx="24" ry="22" fill={c.chairClair} opacity="0.3" />
                    <path d={lisse([Q(15, 84), Q(16, 96), Q(20, 102)])} stroke={c.chairOmbre} strokeWidth="6" opacity="0.5" />
                </SymP>
            </g>
            <SymP>
                {[0, 1, 2, 3, 4, 5].map((i) => <path key={`cg${i}`} d={lisse([Q(5, 122 + i * 10), Q(19, 126 + i * 10), Q(34, 129 + i * 10), Q(42.4, 121 + i * 10)])} stroke={c.traitFin} strokeWidth="1.3" opacity="0.28" fill="none" />)}
                <path d={lisse([Q(14.6, 82), Q(11, 92), Q(5, 99.6)])} {...F} opacity="0.7" />
                <path d={lisse([Q(16, 84), Q(15.6, 94), Q(12, 102)])} {...F} opacity="0.45" />
                <path d={lisse([Q(11, 100), Q(24, 102.4), Q(44, 104.6), Q(64, 110)])} {...F} opacity="0.85" />
                <path d={lisse([Q(11, 103.4), Q(24, 105.6), Q(44, 107.6), Q(63, 112.6)])} stroke={c.chairClair} strokeWidth="1.3" fill="none" opacity="0.8" />
                <path d={lisse([Q(54, 146), Q(44, 160), Q(30, 170), Q(12, 173), Q(0, 172)])} {...F} opacity="0.55" />
                <path d={lisse([Q(1, 182), Q(16, 190), Q(32, 203), Q(41, 214)])} {...F} opacity="0.55" />
                <path d={lisse([Q(1, 174), Q(3, 200), Q(1, 226)])} stroke={c.traitFin} strokeWidth="0.8" strokeDasharray="1.6 3.2" fill="none" opacity="0.5" />
                <path d={lisse([Q(46, 250), Q(34, 260), Q(20, 272), Q(7, 282), Q(0, 285)])} {...F} opacity="0.85" />
                <path d={lisse([Q(14, 272), Q(8, 282)])} stroke={c.traitFin} strokeWidth="0.8" opacity="0.4" fill="none" />
                <ellipse cx={PX - 29.6} cy="404" rx="8" ry="9.4" fill={c.chairClair} stroke={c.traitFin} strokeWidth="0.9" opacity="0.6" />
                <path d={lisse([Q(21, 417), Q(29, 421), Q(37, 417)])} {...F} opacity="0.7" />
                <path d={lisse([Q(30, 428), Q(30.6, 462), Q(29, 502)])} {...F} opacity="0.4" />
                <path d={lisse([Q(22, 504), Q(26, 510), Q(34, 508)])} {...F} opacity="0.45" />
                {[[42.6, 562], [38.4, 563.6], [33, 565], [28, 565], [23, 566]].map((o, i) => <path key={i} d={`M${PX - o[0]} ${o[1] - 0.6}L${PX - o[0] - 0.4} ${o[1] - 6}`} {...F} opacity="0.7" />)}
                <path d={lisse([Q(26, 524), Q(27.6, 534), Q(28.4, 548)])} {...F} opacity="0.4" />
                <path d={lisse([Q(36, 526), Q(38.4, 536), Q(40, 548)])} {...F} opacity="0.35" />
            </SymP>
            <ellipse cx={PX} cy="228" rx="2.5" ry="3.8" fill={c.chairOmbre} stroke={c.traitFin} strokeWidth="0.9" />
            <path d={lisse([[PX - 7, 99], [PX, 103.4], [PX + 7, 99]])} {...F} opacity="0.85" />

            <SymP>
                <g>
                    {MAIN_FORMES.doigts.map((d, i) => <path key={i} d={D(d)} fill={u('membre')} stroke={c.trait} strokeWidth="1.2" />)}
                    <path d={D(MAIN_FORMES.pouce)} fill={u('membre')} stroke={c.trait} strokeWidth="1.2" />
                    <path d={D(MAIN_FORMES.paume)} fill={u('membre')} stroke="none" />
                    <path d={D(MAIN_FORMES.paume.slice(0, 7), false)} stroke={c.trait} strokeWidth="1.2" />
                </g>
                <path d={D(BRAS)} fill={u('membre')} stroke="none" />
                <path d={D(BRAS_EXT, false)} stroke={c.trait} strokeWidth="1.5" />
                <path d={D(BRAS_INT, false)} stroke={c.trait} strokeWidth="1.5" />
                <ellipse cx={PX - 72} cy="172" rx="4.6" ry="22" transform={`rotate(-3 ${PX - 72} 172)`} fill={c.chairClair} opacity="0.6" />
                <path d={lisse([Q(66, 212), Q(72, 216), Q(79, 216)])} {...F} opacity="0.65" />
                <path d={lisse([Q(80, 291), Q(86, 294), Q(91, 293)])} {...F} opacity="0.75" />
                <path d={lisse([Q(70, 124), Q(73, 146)])} {...F} opacity="0.4" />
            </SymP>

            <SymP><path d={D(cr([Q(24.4, 44), Q(28.6, 45), Q(30.2, 51), Q(29.6, 58), Q(26.6, 62.4), Q(23.4, 60)], false, 1.2), false)} fill={u('membre')} stroke={c.trait} strokeWidth="1.2" /></SymP>
            <path d={D(TETE)} fill={u('tete')} stroke="none" />
            <SymP>
                <path d={D([...cr([Q(24.8, 41), Q(25.4, 27), Q(19.8, 15.4), Q(11, 9.4), Q(0, 8.4)], false, 1.6), ...cr([Q(0, 19.6), Q(9, 20.4), Q(16, 23.8), Q(21, 30), Q(21.8, 40)], false, 1.6)])} fill={c.chairOmbre} opacity="0.6" stroke="none" />
                <path d={lisse([Q(1.4, 46), Q(2, 56), Q(3.8, 62), Q(0.4, 63.4)])} {...F} opacity="0.4" />
                <path d={lisse([Q(14, 74), Q(8, 77.6), Q(0, 79)])} stroke={c.chairOmbre} strokeWidth="3" opacity="0.5" />
            </SymP>
            <path d={lisse([[PX - 8, 70.6], [PX, 72.6], [PX + 8, 70.6]])} {...F} opacity="0.5" />
            <path d={D(TETE)} {...trait} />

            {art([[PX + 7, 150], [PX + 7, 134], [PX + 11, 124.4], [PX + 18, 123], [PX + 22, 130], [PX + 22, 146], [PX + 17, 168], [PX + 10, 190], [PX + 5, 208], [PX + 2.4, 228]], 3.6, 0.7)}
            <path d={lisse([[PX - 6, 153], [PX, 147], [PX + 7, 149], [PX + 15, 146], [PX + 22, 150], [PX + 26, 160], [PX + 26, 173], [PX + 21, 186], [PX + 13, 196], [PX + 6, 192], [PX, 182], [PX - 5, 168]], true)} fill={c.coeur} stroke={arteriel} strokeWidth="1.2" />
            <path d={lisse([[PX + 14, 152], [PX + 18, 168], [PX + 18, 182], [PX + 13, 194]])} stroke={arteriel} strokeWidth="1.1" opacity="0.8" />
            <path d={lisse([[PX - 3, 154], [PX + 1, 168], [PX + 1, 182]])} stroke={arteriel} strokeWidth="1" opacity="0.5" />
            <SymP>
                {art([Q(0, 228), Q(7, 240), Q(17, 252), Q(24, 262)], 2.6, 0.6)}
                {art([Q(3, 132), Q(7, 116), Q(11, 103), Q(14, 92)], 2.4)}
                {art([Q(10, 122), Q(26, 112), Q(44, 111), Q(58, 118), Q(63, 130), Q(63, 150), Q(65, 176), Q(68.6, 198), Q(70, 214)], 1.8, 0.65)}
                {art([Q(70, 214), Q(77, 236), Q(84, 262), Q(88, 288)], 1.6)}
                {art([Q(70, 214), Q(74, 240), Q(78.6, 266), Q(81.6, 288)], 1.3, 0.5)}
                {art([Q(24, 262), Q(23, 300), Q(22, 340), Q(22.6, 378), Q(27, 404), Q(29, 410)], 2.4)}
                {art([Q(29, 410), Q(31, 440), Q(31.5, 470), Q(30, 500), Q(28, 522), Q(27, 541)], 1.9)}
                {art([Q(29, 410), Q(26, 440), Q(23.6, 470), Q(22, 495), Q(21, 508)], 1.6, 0.6, '3 2.4')}
            </SymP>

            {Object.entries(PTS).map(([id, p]) => {
                const dessiner = (x, y) => <g><circle cx={x} cy={y} r={R_PT + 0.8} fill={c.fond} stroke={c.trait} strokeWidth="1.3" strokeDasharray={p.dos ? '2.4 1.8' : undefined} /><circle cx={x} cy={y} r="1.8" fill={c.rouge} /></g>;
                const [x, y] = ptXY(p);
                return id === 'aorte' ? <g key={id}>{dessiner(x, y)}</g> : <g key={id}>{dessiner(x, y)}{dessiner(mirP([x, y])[0], y)}</g>;
            })}
            {LEGENDES_P.filter((l) => !l.court).map((l) => <path key={l.t} d={`M${l.m[0] + R_PT + 1.4} ${l.m[1]}L${l.x - 3} ${l.y - 3.8}`} stroke={c.texte} strokeWidth="0.8" opacity="0.6" />)}
        </g>
    );
};

const zP = (id, libelles, p) => paire(id, PX, 'face', { libelles, groupe: 'Pouls', constats: CONSTATS_POULS[id], formes: [cercle(r1(ptXY(p)[0]), p.y, R_PT), aire(chemin(D(CELLULES_P[id])))] });
const zonesPouls = {
    ...zP('carotide', ['Pouls carotidien droit', 'Pouls carotidien gauche'], PTS.carotide),
    ...zP('humeral', ['Pouls huméral droit', 'Pouls huméral gauche'], PTS.humeral),
    ...zP('radial', ['Pouls radial droit', 'Pouls radial gauche'], PTS.radial),
    aorte_abdominale: zone('Aorte abdominale', 'Pouls', CONSTATS_AORTE, [cercle(r1(ptXY(PTS.aorte)[0]), PTS.aorte.y, R_PT), aire(chemin(D(CELLULES_P.aorte)))]),
    ...zP('femoral', ['Pouls fémoral droit', 'Pouls fémoral gauche'], PTS.femoral),
    ...zP('poplite', ['Pouls poplité droit', 'Pouls poplité gauche'], PTS.poplite),
    ...zP('tibial', ['Pouls tibial postérieur droit', 'Pouls tibial postérieur gauche'], PTS.tibial),
    ...zP('pedieux', ['Pouls pédieux droit', 'Pouls pédieux gauche'], PTS.pedieux),
};
// œdèmes : repère sur la crête tibiale (zone du godet) ; l'aire d'appui couvre toute la jambe sous le genou. Rien de teinté au repos.
const zonesOedemes = paire('oedeme_jambe', PX, 'face', {
    libelles: ['Œdème de la jambe droite', 'Œdème de la jambe gauche'], groupe: 'Œdèmes', constats: CONSTATS_OEDEME,
    formes: [ellipse(PX - 31, 470, 6.6, 15), aire(chemin(D([[PX - 53, 424], [PX - 9, 424], [PX - 9, 500], [PX - 53, 500]])))],
});

const LEGENDES_P = [
    { t: 'Carotide', m: [PX + 14, 92], x: PX + 46, y: 96 },
    { t: 'Huméral', m: [PX + 70, 214], x: PX + 100, y: 218 },
    { t: 'Radial', m: [PX + 88, 288], x: PX + 106, y: 292 },
    { t: 'Aorte', m: [PX + 5, 208], x: PX + 17, y: 212, court: true },
    { t: 'Fémoral', m: [PX + 24, 266], x: PX + 100, y: 270 },
    { t: 'Poplité', t2: '(derrière le genou)', m: [PX + 29, 410], x: PX + 56, y: 408 },
    { t: 'Tibial postérieur', t2: '(derrière la malléole)', m: [PX + 21, 508], x: PX + 54, y: 507 },
    { t: 'Pédieux', m: [PX + 27, 541], x: PX + 58, y: 545 },
];
const etiquettesPouls = [
    { x: PX - 76, y: 40, texte: 'D', taille: 17 },
    { x: PX + 76, y: 40, texte: 'G', taille: 17 },
    ...LEGENDES_P.flatMap((l) => [{ x: l.x, y: l.y, texte: l.t, taille: 11, ancre: 'start' }, ...(l.t2 ? [{ x: l.x, y: l.y + 11.5, texte: l.t2, taille: 10, ancre: 'start' }] : [])]),
    { x: 6, y: 516, texte: 'Pointillé :', taille: 10.5, ancre: 'start' },
    { x: 6, y: 528, texte: 'point situé en', taille: 10.5, ancre: 'start' },
    { x: 6, y: 540, texte: 'arrière du corps', taille: 10.5, ancre: 'start' },
];


export default {
    id: 'thorax',
    titre: 'Thorax : auscultation et pouls',
    vues: [
        {
            id: 'face', titre: 'Thorax (face)', viewBox: '38 20 304 300', largeur: 440, reperes: true,
            decor: decorFace,
            etiquettes: etiquettesFace,
            zones: zonesFace,
        },
        {
            id: 'dos', titre: 'Dos', viewBox: '38 20 304 300', largeur: 440, reperes: true,
            decor: decorDos,
            etiquettes: etiquettesDos,
            zones: zonesDos,
        },
        {
            id: 'pouls', titre: 'Pouls', viewBox: '0 0 340 580', largeur: 340, reperes: true,
            decor: decorPouls,
            etiquettes: etiquettesPouls,
            zones: { ...zonesOedemes, ...zonesPouls },
        },
    ],
};
