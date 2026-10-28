import React from 'react';
import { zone, chemin, cercle, ellipse, aire, miroirX, miroirFormes, paire } from './outils';

/* ============================================================================================
   Nourrisson 0-24 mois : devant (couché sur le dos, « grenouille »), dos (sur le ventre), crâne vu de dessus.
   Corps et zones sont construits à partir des mêmes lignes médianes (rubans) et courbes lissées : le dessin et les
   régions à toucher coïncident. L'âge (opts.ageMois) modifie le cordon, les cheveux et la rondeur des plis, jamais les zones.
   ============================================================================================ */
const AX = 150;
const r1 = (n) => Math.round(n * 10) / 10;
const P = (p) => `${r1(p[0])} ${r1(p[1])}`;
const mx = (x, ax = AX) => 2 * ax - x;

/* ---------- géométrie : courbes lissées (Catmull-Rom → Bézier) ---------- */
const cr1 = (a, b, c, d, u) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const gp = (a, i) => a[Math.min(Math.max(i, 0), a.length - 1)];
const crPt = (pts, t) => {
    const i = Math.min(Math.max(Math.floor(t), 0), pts.length - 2);
    const u = t - i;
    return [0, 1].map(k => cr1(gp(pts, i - 1)[k], gp(pts, i)[k], gp(pts, i + 1)[k], gp(pts, i + 2)[k], u));
};
const crVal = (v, t) => {
    const i = Math.min(Math.max(Math.floor(t), 0), v.length - 2);
    return cr1(gp(v, i - 1), gp(v, i), gp(v, i + 1), gp(v, i + 2), t - i);
};
const lisse = (pts) => {
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = gp(pts, i - 1), p1 = pts[i], p2 = pts[i + 1], p3 = gp(pts, i + 2);
        d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
    }
    return d;
};
const trace = (pts) => `M${P(pts[0])}${lisse(pts)}`;
const poly = (pts) => `M${pts.map(P).join('L')}Z`;
const blobD = (pts) => {
    const n = pts.length;
    let d = `M${P(pts[0])}`;
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
    }
    return `${d}Z`;
};
const blobEch = (pts, k = 14) => {
    const n = pts.length, o = [];
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        for (let j = 0; j < k; j++) o.push([0, 1].map(m => cr1(p0[m], p1[m], p2[m], p3[m], j / k)));
    }
    return o;
};
// moitié gauche d'une forme symétrique (de l'axe en haut à l'axe en bas) → liste fermée complète
const miroir = (pts, ax = AX) => pts.map(([x, y]) => [mx(x, ax), y]);
const blobSym = (moitie, ax = AX) => [...moitie, ...miroir(moitie.slice(1, -1).reverse(), ax)];
const cercleD = (cx, cy, r) => `M${r1(cx - r)} ${r1(cy)}A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx + r)} ${r1(cy)}A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx - r)} ${r1(cy)}Z`;

// ruban : forme de membre le long d'une ligne médiane, de largeur variable ; supprime les boucles du côté intérieur d'un coude
const echant = (pts, ws, t0, t1) => {
    const m = Math.max(6, Math.ceil((t1 - t0) * 14));
    const Pp = [], W = [];
    for (let k = 0; k <= m; k++) { const t = t0 + (t1 - t0) * k / m; Pp.push(crPt(pts, t)); W.push(crVal(ws, t)); }
    return { Pp, W };
};
const croise = (a, b, c, d) => {
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-9) return null;
    const s = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    return s > 0 && s < 1 && u > 0 && u < 1 ? [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])] : null;
};
const sansBoucle = (Q0) => {
    let Q = Q0.slice();
    for (let passe = 0; passe < 6; passe++) {
        let coupe = false;
        for (let i = 0; i < Q.length - 3 && !coupe; i++) {
            for (let j = i + 2; j < Q.length - 1; j++) {
                const X = croise(Q[i], Q[i + 1], Q[j], Q[j + 1]);
                if (X) { Q = [...Q.slice(0, i + 1), X, ...Q.slice(j + 1)]; coupe = true; break; }
            }
        }
        if (!coupe) break;
    }
    return Q;
};
const ruban = (pts, ws, { t0 = 0, t1 = pts.length - 1, debut = 'rond', fin = 'rond' } = {}) => {
    const { Pp, W } = echant(pts, ws, t0, t1);
    const n = Pp.length;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
        const a = Pp[Math.max(i - 1, 0)], b = Pp[Math.min(i + 1, n - 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        tx /= l; ty /= l;
        L.push([Pp[i][0] - ty * W[i], Pp[i][1] + tx * W[i]]);
        R.push([Pp[i][0] + ty * W[i], Pp[i][1] - tx * W[i]]);
    }
    const Lp = sansBoucle(L), Rp = sansBoucle(R);
    let d = `M${P(Lp[0])}${lisse(Lp)}`;
    const wf = W[n - 1], wd = W[0];
    d += fin === 'rond' ? `A${r1(wf)} ${r1(wf)} 0 0 0 ${P(Rp[Rp.length - 1])}` : `L${P(Rp[Rp.length - 1])}`;
    d += lisse(Rp.slice().reverse());
    if (debut === 'rond') d += `A${r1(wd)} ${r1(wd)} 0 0 0 ${P(Lp[0])}`;
    return `${d}Z`;
};
// extrémités d'une coupe transversale d'un ruban au paramètre t : [côté gauche, côté droit]
const coupe = (pts, ws, t) => {
    const a = crPt(pts, Math.max(t - 0.01, 0)), b = crPt(pts, Math.min(t + 0.01, pts.length - 1)), p = crPt(pts, t), w = crVal(ws, t);
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty);
    tx /= l; ty /= l;
    return [[p[0] - ty * w, p[1] + tx * w], [p[0] + ty * w, p[1] - tx * w]];
};
// pli : arc posé en travers d'un membre au paramètre t, de la fraction a à b de la demi-largeur (−1 à 1), bombé de `ventre`
const pli = (pts, ws, t, a, b, ventre = 2) => {
    const p = crPt(pts, t), w = crVal(ws, t);
    const q = crPt(pts, Math.min(t + 0.01, pts.length - 1)), o = crPt(pts, Math.max(t - 0.01, 0));
    let tx = q[0] - o[0], ty = q[1] - o[1];
    const l = Math.hypot(tx, ty);
    tx /= l; ty /= l;
    const nx = -ty, ny = tx;
    const A = [p[0] + nx * w * a, p[1] + ny * w * a], B = [p[0] + nx * w * b, p[1] + ny * w * b];
    const m = [p[0] + nx * w * (a + b) / 2 + tx * ventre, p[1] + ny * w * (a + b) / 2 + ty * ventre];
    return `M${P(A)}Q${P(m)} ${P(B)}`;
};
// ligne ondulée (sutures du crâne)
const onde = (pts, amp = 1.3, lam = 9) => {
    const n = pts.length - 1, m = Math.ceil(n * 16), o = [];
    let s = 0, prev = null;
    for (let k = 0; k <= m; k++) {
        const t = n * k / m, p = crPt(pts, t), q = crPt(pts, Math.min(t + 0.02, n)), z = crPt(pts, Math.max(t - 0.02, 0));
        let tx = q[0] - z[0], ty = q[1] - z[1];
        const l = Math.hypot(tx, ty) || 1;
        tx /= l; ty /= l;
        if (prev) s += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
        const e = k === 0 || k === m ? 0 : amp * Math.sin((2 * Math.PI * s) / lam);
        o.push([p[0] - ty * e, p[1] + tx * e]);
    }
    return o;
};
const mix = (a, b, t) => {
    const h = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    const A = h(a), B = h(b);
    return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
const qpt = (p0, c, p1, t) => [(1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * c[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * c[1] + t * t * p1[1]];
const lin = (pts, n = 8) => Array.from({ length: n + 1 }, (_, i) => crPt(pts, (pts.length - 1) * i / n));

/* ---------- squelette commun devant / dos (côté gauche de l'écran) ---------- */
const TORSE_PTS = blobSym([[150, 114], [126, 115], [104, 124], [98, 146], [97, 170], [95, 196], [92, 222], [95, 250], [106, 278], [126, 298], [150, 306]]);
const D_TORSE = blobD(TORSE_PTS);
// tête : front bombé, joues, menton étroit (≈ 24 % de la hauteur du corps)
const TETE_PTS = blobSym([[150, 12], [130, 13.5], [113, 22], [104, 38], [101, 56], [103, 72], [111, 87], [127, 98.5], [150, 103.5]]);
const D_TETE = blobD(TETE_PTS);
const BRAS = { p: [[104, 137], [78, 150], [51, 168], [45, 150], [53, 131], [58, 117]], w: [16, 15, 12.5, 10, 7.5, 6.5] };
const JAMBE = { p: [[110, 270], [82, 288], [53, 304], [75, 322], [98, 334], [103, 349]], w: [22, 20, 17.5, 13.5, 10, 7.5] };
const COU = { p: [[150, 92], [150, 110], [150, 126]], w: [18, 20, 26] };
const OREILLE_PTS = [[101.5, 52], [95, 48.5], [88.5, 55], [87.5, 68], [92.5, 78.5], [102, 81.5]];
// pied (bord interne creusé, talon, bord externe) et 5 orteils décroissants en arc, tournés vers l'extérieur
const PIED_PTS = [[96, 346], [103, 345], [110, 349], [111, 356], [110.5, 363], [108, 368], [99, 369.5], [91, 367.5], [87.5, 361], [88.5, 354], [91.5, 349.5]];
const PIED_ZONE = blobD([[95, 345], [104, 343.5], [112, 348], [113.5, 357], [112.5, 365], [110.5, 372], [103, 376.5], [94, 376.5], [86, 373.5], [83, 367], [85.5, 359], [87.5, 353], [91, 348]]);
const ORTEILS = [[105.5, 370.8, 4.9], [99.4, 372.4, 3.9], [94, 372.2, 3.5], [89.6, 371, 3.1], [86.2, 368.6, 2.7]];
// poing : 4 phalanges (bosses), poignet fin
const POING = 'M51 118C48 113.5 46.6 108.5 47 104Q47 100 49.6 99.2Q51.6 98.6 52.4 100.6Q53.2 97.4 56 97.2Q58.2 97.2 58.8 99Q59.8 96.6 62.4 96.9Q64.8 97.2 64.8 99.6Q67.2 100 67.4 103.6C67.6 108.5 66 113.5 63.4 118.2Z';

const D_BRAS_G = ruban(BRAS.p, BRAS.w);
const D_BRAS_D = miroirX(D_BRAS_G, AX);
const D_JAMBE_G = ruban(JAMBE.p, JAMBE.w, { debut: 'plat' });
const D_JAMBE_D = miroirX(D_JAMBE_G, AX);
const D_COU = ruban(COU.p, COU.w, { debut: 'plat', fin: 'plat' });
const D_OREILLE_G = blobD(OREILLE_PTS);
const D_OREILLE_D = miroirX(D_OREILLE_G, AX);
const D_PIED_G = blobD(PIED_PTS);
const D_PIED_D = miroirX(D_PIED_G, AX);
const POING_D = miroirX(POING, AX);

/* bord gauche du tronc : cale les zones à l'intérieur de la silhouette */
const ECH_TORSE = blobEch(TORSE_PTS, 16).filter(p => p[0] <= AX && p[1] >= 113.5 && p[1] <= 304).sort((a, b) => a[1] - b[1]);
const xTorse = (y) => {
    for (let i = 0; i < ECH_TORSE.length - 1; i++) {
        const a = ECH_TORSE[i], b = ECH_TORSE[i + 1];
        if (a[1] <= y && y <= b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1);
    }
    return 97;
};
const bordG = (y0, y1, n = 5, dx = 1.5) => Array.from({ length: n + 1 }, (_, i) => { const y = y0 + (y1 - y0) * i / n; return [xTorse(y) + dx, y]; });
const [CREASE_L, CREASE_R] = coupe(JAMBE.p, JAMBE.w, 0);             // pli de l'aine
const XM = 132, Y1 = 222, Y2 = Math.round(CREASE_L[1]), YH = 281;     // colonnes / rangées de l'abdomen
const CM = { p0: [xTorse(193) + 1.5, 193], c: [121, 186], p1: [150, 184] };   // rebord costal
const cmPts = (t0, t1, n = 8) => Array.from({ length: n + 1 }, (_, i) => qpt(CM.p0, CM.c, CM.p1, t0 + (t1 - t0) * i / n));
const cmT = (x) => { let a = 0, b = 1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (qpt(CM.p0, CM.c, CM.p1, m)[0] < x) a = m; else b = m; } return a; };
const rebY = (x) => qpt(CM.p0, CM.c, CM.p1, cmT(x <= AX ? x : 2 * AX - x))[1];

/* épaule : la coupe de l'épaule suit le pli axillaire ; poumons, épaule et bras se raccordent sur cette ligne */
const brasC = (t) => coupe(BRAS.p, BRAS.w, t);
const [CUT_L, CUT_R] = brasC(0);
const cutAt = (y) => { const s = (y - CUT_L[1]) / (CUT_R[1] - CUT_L[1]); return [CUT_L[0] + s * (CUT_R[0] - CUT_L[0]), y]; };
const X_EP = (() => { for (let y = CUT_L[1]; y < CUT_R[1]; y += 0.25) { const p = cutAt(y); if (p[0] >= xTorse(y)) return p; } return cutAt(132); })();
const K_EP = cutAt(143);
let TAX = 0.5;
for (let t = 0; t <= 1; t += 0.02) { const q = brasC(t)[1]; if (q[0] <= xTorse(q[1]) + 1.5) { TAX = t; break; } }
const A_LOW = Array.from({ length: 7 }, (_, i) => brasC(TAX * i / 6)[1]);
const NV = [xTorse(115.8), 115.8];                                    // base du cou
const LT = lin([[150, 141], [146, 137.5], [137, 134.5], [124, 134], [113, 137], K_EP], 10);
const FLANC_H = bordG(A_LOW[6][1], 193, 4);
const REB = cmPts(0, 1, 12);
const LUNG_G = [...LT, ...A_LOW, ...FLANC_H, ...REB];
const EPAULE_G = [NV, ...ECH_TORSE.filter(p => p[1] > 115.8 && p[1] < X_EP[1]), X_EP, ...LT.slice().reverse(), [150, 129.5]];
const HB = [168, rebY(168)];
const HEART_PTS = [[147, 160], [152, 152.5], [160, 150], [167, 152.5], [171, 159], [174, 170], [175, 180], HB, [156, rebY(156) - 0.3], [148, 172]];
const HC = blobEch(HEART_PTS, 10);
const iB = HC.reduce((b, p, i) => (p[1] > HC[b][1] ? i : b), 0);
// poumon gauche (à droite de l'écran) : le cœur le creuse d'une échancrure
const LUNG_L = [...miroir(LT), ...miroir(A_LOW), ...miroir(FLANC_H), ...miroir(REB).filter(p => p[0] > HB[0]), ...HC.slice(0, iB + 1).filter(p => p[0] >= AX).reverse()];
const BAS = blobEch(TORSE_PTS, 20).filter(p => p[0] > CREASE_R[0] && p[0] < mx(CREASE_R[0]) && p[1] > 285).sort((a, b) => a[0] - b[0]).map(([x, y]) => [x, y - 2.5]);
const HYPO = Array.from({ length: 9 }, (_, i) => qpt([XM, YH], [150, YH - 6], [mx(XM), YH], i / 8));
const TH_ECH = blobEch(TETE_PTS, 20);
const MENTON = TH_ECH.filter(p => p[0] >= 128.5 && p[0] <= 171.5 && p[1] > 90).sort((a, b) => a[0] - b[0]);
const COU_Z = poly([...MENTON, [mx(NV[0]), NV[1]], [150, 129.5], NV]);
const decaler = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);

/* ---------- socle commun : dégradés, ombre portée, silhouette en un seul contour, volumes ---------- */
const socle = (c, pfx, cacherVisage) => {
    const id = (n) => `${pfx}-${n}`;
    const lum = c.sombre ? c.chairClair : '#ffffff';
    const toes = [0, 1].flatMap(k => ORTEILS.map(([x, y, r], i) => ({ id: `ot${k}${i}`, d: cercleD(k ? mx(x) : x, y, r), mini: true })));
    const ordre = [
        ...toes,
        { id: 'torse', d: D_TORSE },
        { id: 'cou', d: D_COU },
        { id: 'jg', d: D_JAMBE_G }, { id: 'jd', d: D_JAMBE_D },
        { id: 'pg', d: D_PIED_G, mini: true }, { id: 'pd', d: D_PIED_D, mini: true },
        { id: 'bg', d: D_BRAS_G }, { id: 'bd', d: D_BRAS_D },
        { id: 'fg', d: POING, mini: true }, { id: 'fd', d: POING_D, mini: true },
        { id: 'og', d: D_OREILLE_G, mini: true }, { id: 'od', d: D_OREILLE_D, mini: true },
        { id: 'tete', d: D_TETE },
    ];
    const volume = (d, nom, f = 1) => {
        const cp = id(`cp-${nom}`);
        return (
            <g key={`v-${nom}`}>
                <clipPath id={cp}><path d={d} /></clipPath>
                <g clipPath={`url(#${cp})`} fill="none" strokeLinejoin="round">
                    {[[14, 0.07], [9, 0.09], [4.5, 0.12]].map(([w, o], i) => <path key={`o${i}`} d={d} transform="translate(-4 -4)" stroke={c.chairOmbre} strokeWidth={w} opacity={o * f} />)}
                    {[[12, 0.14], [7, 0.18], [3, 0.24]].map(([w, o], i) => <path key={`l${i}`} d={d} transform="translate(4 4)" stroke={lum} strokeWidth={w} opacity={o * f} />)}
                </g>
            </g>
        );
    };
    const L = (cx, cy, rx, ry, o, rot) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id('lum')})`} opacity={o} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
    const O = (cx, cy, rx, ry, o, rot) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id('omb')})`} opacity={o} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />;
    return (
        <g>
            <defs>
                <linearGradient id={id('corps')} gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="250" y2="396">
                    <stop offset="0" stopColor={mix(c.chairClair, c.chair, 0.35)} />
                    <stop offset="0.5" stopColor={c.chair} />
                    <stop offset="1" stopColor={mix(c.chair, c.chairOmbre, 0.75)} />
                </linearGradient>
                <radialGradient id={id('lum')}><stop offset="0" stopColor={lum} stopOpacity="0.9" /><stop offset="1" stopColor={lum} stopOpacity="0" /></radialGradient>
                <radialGradient id={id('omb')}><stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.8" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" /></radialGradient>
                <radialGradient id={id('sol')}><stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.5" /><stop offset="0.7" stopColor={c.chairOmbre} stopOpacity="0.18" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" /></radialGradient>
                <linearGradient id={id('hair')} gradientUnits="userSpaceOnUse" x1="150" y1="12" x2="150" y2="58">
                    <stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.5" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" />
                </linearGradient>
                <clipPath id={id('sil')}>{ordre.map(o => <path key={o.id} d={o.d} />)}</clipPath>
                <clipPath id={id('tete')}><path d={D_TETE} /></clipPath>
            </defs>
            <ellipse cx="150" cy="232" rx="148" ry="186" fill={`url(#${id('sol')})`} />
            <g fill="none" stroke={c.trait} strokeWidth="3.2" strokeLinejoin="round">
                {ordre.map(o => <path key={o.id} d={o.d} />)}
            </g>
            {ordre.map(o => (
                <g key={o.id}>
                    <path d={o.d} fill={`url(#${id('corps')})`} />
                    {!o.mini && volume(o.d, o.id, o.id === 'torse' ? 1.25 : 1)}
                </g>
            ))}
            <g clipPath={`url(#${id('sil')})`}>
                {O(150, 113, 30, 12, 0.9)}{O(150, 300, 34, 12, 1)}{L(62, 296, 15, 13, 0.85)}{O(238, 296, 15, 13, 0.4)}
                {L(90, 274, 24, 14, 0.65)}{L(104, 348, 8, 12, 0.55)}{O(196, 348, 8, 14, 0.3)}{L(78, 148, 20, 9, 0.7, 25)}{O(226, 150, 18, 9, 0.35, -25)}
            </g>
            {/* orteils : chacun contourné */}
            {[0, 1].flatMap(k => ORTEILS.map(([x, y, r], i) => {
                const X = k ? mx(x) : x;
                return (
                    <g key={`or${k}${i}`}>
                        <circle cx={r1(X)} cy={r1(y)} r={r} fill={`url(#${id('corps')})`} stroke={c.traitFin} strokeWidth="0.9" />
                        <ellipse cx={r1(X - r * 0.25)} cy={r1(y - r * 0.3)} rx={r * 0.55} ry={r * 0.45} fill={`url(#${id('lum')})`} />
                        {!cacherVisage && <path d={`M${r1(X - r * 0.45)} ${r1(y + r * 0.35)}a${r1(r * 0.5)} ${r1(r * 0.4)} 0 0 0 ${r1(r * 0.9)} 0`} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.6" />}
                    </g>
                );
            }))}
        </g>
    );
};

const sym = (d) => [d, miroirX(d, AX)];
const traitFn = (c) => (d, w = 1.1, op = 0.7, col = c.traitFin, k) => <path key={k} d={d} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={op} />;

/* mains en poing : phalanges, pouce replié (devant) ou articulations (dos) */
const mains = (c, lum, dos) => {
    const t = traitFn(c);
    return [0, 1].map(k => {
        const f = (d) => (k === 0 ? d : miroirX(d, AX));
        return (
            <g key={`main${k}`}>
                <ellipse cx={k ? mx(56) : 56} cy="103" rx="6" ry="3.4" fill={lum} opacity="0.5" />
                {['M52.4 100.6C52.2 103 52.6 105.4 53.6 107', 'M58.8 99C58.6 102 59 105 60.2 107.4', 'M64.8 99.6C64.8 102 65.2 104.5 66 106.6'].map((d, i) => t(f(d), 0.9, 0.55, c.traitFin, `df${k}${i}`))}
                {dos ? [50, 55.6, 61.2, 65.6].map((x, i) => <circle key={`kn${k}${i}`} cx={k ? mx(x) : x} cy={101.6 + (i === 1 ? -2 : 0)} r="1.4" fill={lum} opacity="0.7" />)
                    : <g>{t(f('M49.4 108.6C54 106.4 60 107.6 65.6 108.8C66.2 111.6 64.4 114.2 62 115.6C57 117 52 115.4 49.8 112Z'), 0.9, 0.6, c.traitFin, `po${k}`)}{t(f('M50.5 113.6C55 115.6 60.5 115.2 65 111.6'), 0.8, 0.35, c.traitFin, `pb${k}`)}</g>}
            </g>
        );
    });
};

// cheveux : mèches fines rayonnant depuis le sommet, plus nombreuses avec l'âge
const meches = (c, n) => Array.from({ length: n }, (_, i) => {
    const a = -2.75 + 2.3 * i / (n - 1), x0 = 150 + 30 * Math.cos(a), y0 = 56 + 27 * Math.sin(a), x1 = 150 + 50 * Math.cos(a + 0.12), y1 = 56 + 46 * Math.sin(a);
    return <path key={`h${i}`} d={`M${r1(x0)} ${r1(y0)}Q${r1((x0 + x1) / 2 + 2)} ${r1((y0 + y1) / 2 - 2)} ${r1(x1)} ${r1(y1)}`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity="0.34" strokeLinecap="round" />;
});

const ageDe = (opts) => (opts && opts.ageMois != null ? opts.ageMois : 3);
// rondeur des plis de la cuisse et du bras : maximale chez le petit, qui s'estompe vers 2 ans
const grasDe = (age) => Math.max(0.45, Math.min(1, 1 - (age - 4) / 30));
const plisJambes = (t, gras, dos) => [
    pli(JAMBE.p, JAMBE.w, 0.65, -0.95, -0.1, 2.5),
    pli(JAMBE.p, JAMBE.w, 1.1, -0.95, 0.05, 2.5),
    ...(dos ? [pli(JAMBE.p, JAMBE.w, 1.85, -0.95, -0.05, 2.5), pli(JAMBE.p, JAMBE.w, 2.1, -0.95, 0.2, 2.5)] : [pli(JAMBE.p, JAMBE.w, 1.6, -0.9, 0.2, 2), pli(JAMBE.p, JAMBE.w, 2.05, -0.55, 0.5, 3)]),
    pli(JAMBE.p, JAMBE.w, 3.85, -0.95, 0.95, 1.2),
].flatMap(sym).map((d, i) => t(d, 0.95, 0.5 * gras, undefined, `jp${i}`));
const plisBras = (t, gras, dos) => [
    pli(BRAS.p, BRAS.w, 0.9, -0.9, 0.5, 2),
    pli(BRAS.p, BRAS.w, 2.1, dos ? -0.2 : -0.4, dos ? 0.95 : 0.9, 2.5),
    pli(BRAS.p, BRAS.w, 3.55, -0.9, 0.9, 1.2),
].flatMap(sym).map((d, i) => t(d, 0.95, 0.5 * gras, undefined, `bp${i}`));

/* ============================== VUE DEVANT ============================== */
const D_LUNG_G = poly(LUNG_G);
const D_LUNG_L = poly(LUNG_L);
const D_COEUR = blobD(HEART_PTS);
const decorFace = (c, opts) => {
    const pfx = 'nourrisson-face-d';
    const lum = c.sombre ? c.chairClair : '#ffffff';
    const sexe = opts && opts.sexe;
    const age = ageDe(opts), gras = grasDe(age);
    const t = traitFn(c);
    const lo = c.sombre ? 1.5 : 1;
    return (
        <g>
            {socle(c, pfx, false)}
            <g clipPath={`url(#${pfx}-sil)`}>
                <ellipse cx="138" cy="232" rx="40" ry="42" fill={`url(#${pfx}-lum)`} />
                <ellipse cx="126" cy="152" rx="26" ry="20" fill={`url(#${pfx}-lum)`} opacity="0.7" />
                <ellipse cx="174" cy="152" rx="26" ry="20" fill={`url(#${pfx}-lum)`} opacity="0.4" />
                <ellipse cx="206" cy="236" rx="14" ry="36" fill={`url(#${pfx}-omb)`} opacity="0.4" />
                <ellipse cx="150" cy="186" rx="42" ry="9" fill={`url(#${pfx}-omb)`} opacity="0.35" />
                <ellipse cx="150" cy="266" rx="36" ry="13" fill={`url(#${pfx}-omb)`} opacity={0.16 + 0.22 * gras} />
            </g>

            {/* tête : cheveux fins en dégradé, joues, relief */}
            <g clipPath={`url(#${pfx}-tete)`}>
                <rect x="90" y="0" width="120" height="60" fill={`url(#${pfx}-hair)`} />
                {meches(c, age < 6 ? 9 : age < 15 ? 13 : 17)}
                <ellipse cx="124" cy="85" rx="15" ry="11" fill={`url(#${pfx}-lum)`} />
                <ellipse cx="176" cy="85" rx="15" ry="11" fill={`url(#${pfx}-lum)`} opacity="0.65" />
                <ellipse cx="132" cy="44" rx="24" ry="11" fill={`url(#${pfx}-lum)`} opacity="0.6" />
                <ellipse cx="150" cy="104" rx="28" ry="8" fill={`url(#${pfx}-omb)`} opacity="0.6" />
                <ellipse cx="196" cy="62" rx="9" ry="28" fill={`url(#${pfx}-omb)`} opacity="0.45" />
            </g>
            <path d={D_TETE} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            {sym('M101 55C94 50 89 57 89 67C89 75 94 80 102 79').map((d, i) => t(d, 1, 0.7, c.traitFin, `oe${i}`))}
            {sym('M97.5 60C94 61 93 67 95 72').map((d, i) => t(d, 0.9, 0.55, c.traitFin, `oi${i}`))}
            {/* visage endormi, traits discrets */}
            {sym('M117 62C121 67.5 134 69 139 62').map((d, i) => t(d, 1.4, 0.9, c.trait, `ye${i}`))}
            {sym('M119 65L117.5 67M124.5 68L123.8 70').map((d, i) => t(d, 0.7, 0.4, c.trait, `ci${i}`))}
            {sym('M117 51C124 46.5 133 47 139 50.5').map((d, i) => t(d, 1, 0.4, c.traitFin, `so${i}`))}
            {t('M147.5 63Q148.5 71 146.5 75', 0.9, 0.35, c.traitFin, 'nezp')}
            {t('M144.5 76.5C146.5 79 153.5 79 155.5 76.5', 1.2, 0.8, c.trait, 'nez')}
            {t('M149 80Q150 83 150 85.5', 0.8, 0.35, c.traitFin, 'phi')}
            {t('M140 88C145 90 155 90 160 88', 1.3, 0.85, c.trait, 'bou')}
            {t('M143.5 92C147 94.6 153 94.6 156.5 92', 0.9, 0.45, c.trait, 'bas')}

            {/* thorax : poumons, cœur, clavicules, côtes, mamelons */}
            <path d={D_LUNG_G} fill={c.poumon} opacity={0.1 * lo} />
            <path d={D_LUNG_L} fill={c.poumon} opacity={0.1 * lo} />
            <path d={D_COEUR} fill={c.coeur} opacity={c.sombre ? 0.4 : 0.28} stroke={c.traitFin} strokeWidth="0.8" strokeOpacity="0.55" />
            <path d="M158 151C157 145 162 141 169 143M163 150.5C165 146 169 145 172 147" fill="none" stroke={c.coeur} strokeWidth="2" strokeLinecap="round" opacity="0.4" />
            {sym('M143 126C134 122 120 123 108 131').map((d, i) => t(d, 1.1, 0.7, c.traitFin, `cl${i}`))}
            {t('M144.5 126Q150 131 155.5 126', 1, 0.55, c.traitFin, 'four')}
            {sym('M146 148C132 147 116 151 101 160').map((d, i) => t(d, 0.9, 0.3, c.traitFin, `c1${i}`))}
            {sym('M146 160C132 159 114 164 99 175').map((d, i) => t(d, 0.9, 0.3, c.traitFin, `c2${i}`))}
            {sym('M146 172C131 171 113 177 97 189').map((d, i) => t(d, 0.9, 0.28, c.traitFin, `c3${i}`))}
            {t('M150 134L150 190', 1, 0.16, c.traitFin, 'ster')}
            {sym('M101 148C104 154 107 160 109 167').map((d, i) => t(d, 0.9, 0.4, c.traitFin, `ax${i}`))}
            {sym(`M150 ${CM.p1[1]}Q${CM.c[0]} ${CM.c[1]} ${CM.p0[0]} ${CM.p0[1]}`).map((d, i) => t(d, 1.3, 0.6, c.traitFin, `cm${i}`))}
            {sym(cercleD(119, 166, 5.4)).map((d, i) => <path key={`ar${i}`} d={d} fill={c.chairOmbre} opacity="0.45" />)}
            {sym(cercleD(119, 166, 2.1)).map((d, i) => <path key={`mm${i}`} d={d} fill={c.traitFin} opacity="0.8" />)}
            <path d="M150 190L150 228M150 247L150 276" stroke={c.traitFin} strokeWidth="0.9" opacity="0.16" fill="none" />

            {/* abdomen : ombilic (cordon seulement les premiers jours), plis de l'aine */}
            <ellipse cx="150" cy="237" rx="8" ry="6.5" fill={`url(#${pfx}-omb)`} />
            {age < 0.7 ? (
                <g>
                    <path d="M147.8 238L148.6 228.5Q150 226.5 151.4 228.5L152.2 238Z" fill={c.os} stroke={c.traitFin} strokeWidth="0.9" />
                    <path d="M147.2 229.5H152.8" stroke={c.trait} strokeWidth="1.6" strokeLinecap="round" />
                </g>
            ) : (
                <g>
                    {t('M145.5 235Q150 231 154.5 235', 1.1, 0.75, c.traitFin, 'om1')}
                    {t('M146.5 238.5Q150 241.5 153.5 238.5', 1.3, 0.85, c.trait, 'om2')}
                    <circle cx="150" cy="236.8" r="1.6" fill={c.traitFin} opacity="0.55" />
                </g>
            )}
            {sym(`M${P(CREASE_L)}Q${r1((CREASE_L[0] + CREASE_R[0]) / 2 + 4)} ${r1((CREASE_L[1] + CREASE_R[1]) / 2 - 2)} ${P(CREASE_R)}`).map((d, i) => t(d, 1, 0.5, c.traitFin, `ai${i}`))}
            {t('M136 276Q150 282 164 276', 0.9, 0.25, c.traitFin, 'pub')}

            {/* organes génitaux externes (selon le sexe connu) */}
            <g transform="translate(0 8)">
                {sexe === 'M' ? (
                    <g>
                        <path d="M144.5 272Q150 268 155.5 272L154 286Q150 289 146 286Z" fill={`url(#${pfx}-corps)`} stroke={c.traitFin} strokeWidth="1" />
                        <ellipse cx="150" cy="291" rx="13" ry="7.5" fill={`url(#${pfx}-corps)`} stroke={c.traitFin} strokeWidth="1" />
                        <path d="M150 285V298" stroke={c.traitFin} strokeWidth="0.8" fill="none" opacity="0.7" />
                    </g>
                ) : sexe === 'F' ? (
                    <g>
                        <path d="M147.5 273C142 277 142 288 148 294C149.5 295 150.5 295 152 294C158 288 158 277 152.5 273Z" fill={c.chairOmbre} opacity="0.35" />
                        <path d="M148 274C144 280 145 288 149 293" fill="none" stroke={c.traitFin} strokeWidth="1.1" strokeLinecap="round" />
                        <path d="M152 274C156 280 155 288 151 293" fill="none" stroke={c.traitFin} strokeWidth="1.1" strokeLinecap="round" />
                        <path d="M150 277V291" stroke={c.traitFin} strokeWidth="0.7" opacity="0.6" />
                    </g>
                ) : (
                    <g>
                        <ellipse cx="150" cy="284" rx="12" ry="11" fill={`url(#${pfx}-omb)`} opacity="0.6" />
                        <path d="M145 276Q150 272 155 276" fill="none" stroke={c.traitFin} strokeWidth="1" opacity="0.6" strokeLinecap="round" />
                        <path d="M146 281Q150 289 154 281" fill="none" stroke={c.traitFin} strokeWidth="1.1" opacity="0.8" strokeLinecap="round" />
                        <path d="M150 285V294" stroke={c.traitFin} strokeWidth="0.8" opacity="0.55" strokeLinecap="round" />
                    </g>
                )}
            </g>

            {/* membres : plis, mains, pieds (cou-de-pied, tendons, malléole, bord externe) */}
            {plisJambes(t, gras, false)}
            {plisBras(t, gras, false)}
            {mains(c, lum, false)}
            {sym('M97 349.5Q103.5 352.5 110 350.5').map((d, i) => t(d, 0.9, 0.5, c.traitFin, `cp${i}`))}
            {sym('M101.5 354C101 358 100.5 362 100 365.5M106 353C106.5 357 106.5 361 106 365').map((d, i) => t(d, 0.8, 0.35, c.traitFin, `td${i}`))}
            {sym('M108.5 346.5C111.5 348.5 111.8 352 110.6 354.5').map((d, i) => t(d, 0.8, 0.4, c.traitFin, `ml${i}`))}
            {sym('M90.5 354C89 358 89.2 362 91 365').map((d, i) => t(d, 0.8, 0.4, c.traitFin, `be${i}`))}
        </g>
    );
};

/* ============================== VUE DOS ============================== */
const LOBE = [[147, 262], [126, 259], [105.5, 262], [113.5, 275], [121.3, 287.6], [133, 299], [147, 304]];
const SCAP = 'M139.5 142C131 138.5 119 139.5 110.5 143C111 156 115 172 124 184C132 176 137.5 160 139.5 142Z';
const decorDos = (c, opts) => {
    const pfx = 'nourrisson-dos-d';
    const lum = c.sombre ? c.chairClair : '#ffffff';
    const age = ageDe(opts), gras = grasDe(age);
    const t = traitFn(c);
    const lobeG = blobD(LOBE);
    const lobeD = miroirX(lobeG, AX);
    return (
        <g>
            {socle(c, pfx, true)}
            <defs>
                <clipPath id={`${pfx}-lobeg`}><path d={lobeG} /></clipPath>
                <clipPath id={`${pfx}-lobed`}><path d={lobeD} /></clipPath>
            </defs>
            {/* cheveux et épi */}
            <g clipPath={`url(#${pfx}-tete)`}>
                <rect x="90" y="0" width="120" height="62" fill={`url(#${pfx}-hair)`} opacity="0.8" />
                {Array.from({ length: age < 6 ? 12 : 16 }, (_, i) => {
                    const ang = (i / (age < 6 ? 12 : 16)) * Math.PI * 2, x0 = 150 + 7 * Math.cos(ang), y0 = 40 + 7 * Math.sin(ang);
                    const x1 = 150 + (26 + (i % 3) * 7) * Math.cos(ang + 0.35), y1 = 40 + (22 + (i % 3) * 7) * Math.sin(ang + 0.35) * 1.15;
                    return <path key={`h${i}`} d={`M${r1(x0)} ${r1(y0)}Q${r1((x0 + x1) / 2 + 2)} ${r1((y0 + y1) / 2 - 2)} ${r1(x1)} ${r1(y1)}`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity="0.38" strokeLinecap="round" />;
                })}
                <ellipse cx="128" cy="40" rx="26" ry="20" fill={`url(#${pfx}-lum)`} opacity="0.7" />
                <ellipse cx="150" cy="104" rx="30" ry="9" fill={`url(#${pfx}-omb)`} opacity="0.7" />
                <ellipse cx="196" cy="60" rx="9" ry="32" fill={`url(#${pfx}-omb)`} opacity="0.5" />
            </g>
            <path d={D_TETE} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            {t('M148 41C143 41 142 36 146 34.5C151 33 155 37 153 42C151 47 144 48 141 43', 1, 0.5, c.traitFin, 'epi')}
            {sym('M101 55C94 50 89 57 89 67C89 75 94 80 102 79').map((d, i) => t(d, 1, 0.7, c.traitFin, `oe${i}`))}
            {sym('M97.5 60C94 61 93 67 95 72').map((d, i) => t(d, 0.9, 0.55, c.traitFin, `oi${i}`))}
            {t('M134 111Q150 116 166 111', 0.9, 0.4, c.traitFin, 'nuque')}
            <ellipse cx="150" cy="112" rx="22" ry="7" fill={`url(#${pfx}-omb)`} opacity="0.5" clipPath={`url(#${pfx}-sil)`} />

            {/* dos : rachis, omoplates, côtes */}
            <g clipPath={`url(#${pfx}-sil)`}>
                <ellipse cx="124" cy="160" rx="22" ry="30" fill={`url(#${pfx}-lum)`} opacity="0.6" />
                <ellipse cx="176" cy="160" rx="22" ry="30" fill={`url(#${pfx}-lum)`} opacity="0.4" />
                <ellipse cx="150" cy="200" rx="9" ry="70" fill={`url(#${pfx}-omb)`} opacity="0.5" />
                <ellipse cx="208" cy="220" rx="14" ry="48" fill={`url(#${pfx}-omb)`} opacity="0.4" />
            </g>
            {t('M150 122C149 150 151 190 150 228C149.5 242 150 256 150 268', 1.5, 0.55, c.trait, 'rachis')}
            {Array.from({ length: 14 }, (_, i) => <ellipse key={`vt${i}`} cx={150 + (i % 2 ? 0.3 : -0.2)} cy={130 + i * 10.3} rx="1.7" ry="1.3" fill={c.traitFin} opacity="0.55" />)}
            {sym(SCAP).map((d, i) => (
                <g key={`om${i}`}>
                    <path d={d} fill={`url(#${pfx}-lum)`} opacity="0.5" />
                    <path d={d} fill="none" stroke={c.traitFin} strokeWidth="1" opacity="0.55" strokeLinejoin="round" />
                </g>
            ))}
            {sym('M139 148C129 146 119 144.6 111.5 144').map((d, i) => t(d, 1.1, 0.55, c.traitFin, `epo${i}`))}
            {sym('M100 150C103 156 106 162 108 168').map((d, i) => t(d, 0.9, 0.4, c.traitFin, `ax${i}`))}
            {sym('M102 196C113 192 126 193 138 198').map((d, i) => t(d, 0.9, 0.28, c.traitFin, `cd1${i}`))}
            {sym('M99 208C112 204 127 205 140 210').map((d, i) => t(d, 0.9, 0.26, c.traitFin, `cd2${i}`))}
            {sym('M97 222C110 220 124 222 137 227').map((d, i) => t(d, 0.9, 0.24, c.traitFin, `cd3${i}`))}
            {sym('M96 238C108 237 120 240 132 245').map((d, i) => t(d, 0.9, 0.24, c.traitFin, `cd4${i}`))}
            {[131, 169].map((x, i) => <ellipse key={`fl${i}`} cx={x} cy="251" rx="2.6" ry="2" fill={c.chairOmbre} opacity="0.55" />)}

            {/* fesses */}
            {[[lobeG, 'lobeg', 0], [lobeD, 'lobed', 1]].map(([d, cp, k]) => (
                <g key={cp}>
                    <g clipPath={`url(#${pfx}-${cp})`}>
                        <ellipse cx={k ? 175 : 125} cy={278} rx="24" ry="22" fill={`url(#${pfx}-lum)`} opacity={k ? 0.5 : 0.85} />
                        <ellipse cx={k ? 144 : 156} cy={288} rx="9" ry="20" fill={`url(#${pfx}-omb)`} opacity="0.7" />
                        <ellipse cx={k ? 190 : 110} cy={298} rx="26" ry="9" fill={`url(#${pfx}-omb)`} opacity="0.35" />
                    </g>
                    <path d={d} fill="none" stroke={c.traitFin} strokeWidth="1" opacity="0.4" />
                </g>
            ))}
            {sym('M113 276C121 289 134 297 147 300').map((d, i) => t(d, 1.2, 0.6, c.traitFin, `gl${i}`))}
            {sym('M118 284C125 293 135 298 146 301').map((d, i) => t(d, 0.8, 0.3, c.traitFin, `gl2${i}`))}
            {t('M150 268C149 280 151 292 150 305', 1.5, 0.85, c.trait, 'sillon')}
            <ellipse cx="150" cy="271" rx="2.8" ry="2.2" fill={c.chairOmbre} opacity="0.9" />
            {t('M147.6 270.6Q150 274 152.4 270.6', 0.9, 0.7, c.trait, 'fossette')}

            {/* membres : plis, mains (dos), plantes des pieds (talon, voûte, plis) */}
            {plisJambes(t, gras, true)}
            {plisBras(t, gras, true)}
            {mains(c, lum, true)}
            {sym('M96 352C96 347 101 345.5 105 347C108.5 348.5 108.5 355 105 358C101 360 96 358 96 352Z').map((d, i) => <path key={`tal${i}`} d={d} fill={c.chairOmbre} opacity="0.35" />)}
            {sym('M97.5 357C101 361 106 361 109.5 358').map((d, i) => t(d, 0.9, 0.5, c.traitFin, `vo${i}`))}
            {sym('M91 364.5Q99.5 368.5 109 366.5').map((d, i) => t(d, 0.9, 0.5, c.traitFin, `pl${i}`))}
            {sym('M90.5 353C89 358 89.4 362 91.2 365').map((d, i) => t(d, 0.8, 0.4, c.traitFin, `be${i}`))}
        </g>
    );
};

/* ============================== VUE CRÂNE (de dessus) ============================== */
const CX = 130;
const CRANE_PTS = blobSym([[130, 24], [104, 29], [77, 46], [55, 78], [41, 118], [32, 160], [32, 200], [43, 234], [66, 257], [98, 270], [130, 274]], CX);
const D_CRANE = blobD(CRANE_PTS);
const OREILLE_C = blobD([[34, 152], [24, 154], [17, 166], [18, 182], [26, 192], [36, 190]]);
const NEZ = 'M118 26C119 12 125 4 130 4C135 4 141 12 142 26Z';
// fontanelles : losange à côtés à peine bombés (antérieure), petit triangle au lambda (postérieure)
const AF = 'M130 64Q145.2 79.2 155 99Q144.6 120.8 130 140Q115.4 120.8 105 99Q114.8 79.2 130 64Z';
const PF = 'M130 206Q131.5 216 139 224Q130 221 121 224Q128.5 216 130 206Z';
const SUT = {
    sagittale: [[130, 140], [129, 168], [131, 196], [130, 206]],
    metopique: [[130, 64], [130, 44], [130, 26]],
    coronaleG: [[105, 99], [84, 104], [60, 118], [44, 138], [33.5, 160]],
    lambdoideG: [[121, 224], [102, 228], [82, 234], [64, 240], [49, 243]],       // divergent obliquement depuis le lambda
};
const miroirPts = (pts) => miroir(pts, CX);

const decorTete = (c) => {
    const pfx = 'nourrisson-tete-d';
    const id = (n) => `${pfx}-${n}`;
    const lum = c.sombre ? c.chairClair : '#ffffff';
    const os = mix(c.os, c.chairClair, c.sombre ? 0.1 : 0.55);
    const membrane = mix(c.chairOmbre, c.poumon, c.sombre ? 0.35 : 0.5);
    const t = traitFn(c);
    const volume = (d, nom, f = 1) => {
        const cp = id(`cp-${nom}`);
        return (
            <g key={`v-${nom}`}>
                <clipPath id={cp}><path d={d} /></clipPath>
                <g clipPath={`url(#${cp})`} fill="none" strokeLinejoin="round">
                    {[[16, 0.08], [10, 0.1], [5, 0.13]].map(([w, o], i) => <path key={`o${i}`} d={d} transform="translate(-5 -5)" stroke={c.chairOmbre} strokeWidth={w} opacity={o * f} />)}
                    {[[14, 0.14], [8, 0.18], [3.5, 0.24]].map(([w, o], i) => <path key={`l${i}`} d={d} transform="translate(5 5)" stroke={lum} strokeWidth={w} opacity={o * f} />)}
                </g>
            </g>
        );
    };
    const lignesSut = [SUT.sagittale, SUT.metopique, SUT.coronaleG, miroirPts(SUT.coronaleG), SUT.lambdoideG, miroirPts(SUT.lambdoideG)];
    // stries d'ossification rayonnant depuis les bosses pariétales et frontales
    const stries = (cx, cy, n, r0, r1_, a0, a1) => Array.from({ length: n }, (_, i) => {
        const a = a0 + (a1 - a0) * i / (n - 1);
        return `M${r1(cx + r0 * Math.cos(a))} ${r1(cy + r0 * Math.sin(a))}L${r1(cx + r1_ * Math.cos(a))} ${r1(cy + r1_ * Math.sin(a))}`;
    });
    return (
        <g>
            <defs>
                <radialGradient id={id('os')} cx="0.42" cy="0.38" r="0.75">
                    <stop offset="0" stopColor={os} />
                    <stop offset="0.6" stopColor={c.os} />
                    <stop offset="1" stopColor={mix(c.os, c.chairOmbre, 0.55)} />
                </radialGradient>
                <radialGradient id={id('lum')}><stop offset="0" stopColor={lum} stopOpacity="0.9" /><stop offset="1" stopColor={lum} stopOpacity="0" /></radialGradient>
                <radialGradient id={id('omb')}><stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.8" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" /></radialGradient>
                <radialGradient id={id('mem')} cx="0.45" cy="0.4"><stop offset="0" stopColor={mix(membrane, lum, 0.25)} /><stop offset="1" stopColor={membrane} /></radialGradient>
                <radialGradient id={id('sol')}><stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.5" /><stop offset="0.7" stopColor={c.chairOmbre} stopOpacity="0.15" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" /></radialGradient>
                <clipPath id={id('crane')}><path d={D_CRANE} /></clipPath>
            </defs>
            <ellipse cx="130" cy="150" rx="128" ry="150" fill={`url(#${id('sol')})`} />
            {/* nez et oreilles (repères d'orientation) */}
            {[NEZ, OREILLE_C, miroirX(OREILLE_C, CX)].map((d, i) => (
                <g key={`rep${i}`}>
                    <path d={d} fill={mix(c.chair, c.chairClair, 0.4)} stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
                    {volume(d, `rep${i}`, 0.8)}
                </g>
            ))}
            {t('M24 160C20 166 20 178 25 187', 0.9, 0.55, c.traitFin, 'oeg')}
            {t('M236 160C240 166 240 178 235 187', 0.9, 0.55, c.traitFin, 'oed')}
            {t('M124 22C126 17 134 17 136 22', 0.9, 0.5, c.traitFin, 'nezl')}
            {/* boîte crânienne */}
            <path d={D_CRANE} fill={`url(#${id('os')})`} stroke={c.trait} strokeWidth="1.8" strokeLinejoin="round" />
            {volume(D_CRANE, 'crane', 1.3)}
            <g clipPath={`url(#${id('crane')})`}>
                <ellipse cx="96" cy="62" rx="24" ry="22" fill={`url(#${id('lum')})`} opacity="0.7" />
                <ellipse cx="164" cy="62" rx="24" ry="22" fill={`url(#${id('lum')})`} opacity="0.45" />
                <ellipse cx="76" cy="164" rx="34" ry="44" fill={`url(#${id('lum')})`} opacity="0.8" />
                <ellipse cx="184" cy="164" rx="34" ry="44" fill={`url(#${id('lum')})`} opacity="0.5" />
                <ellipse cx="130" cy="262" rx="52" ry="14" fill={`url(#${id('omb')})`} opacity="0.5" />
                <ellipse cx="222" cy="170" rx="14" ry="70" fill={`url(#${id('omb')})`} opacity="0.35" />
                {[...stries(72, 168, 12, 10, 52, -2.6, 0.7), ...stries(188, 168, 12, 10, 52, 2.4, -0.55)].map((d, i) => <path key={`st${i}`} d={d} stroke={c.traitFin} strokeWidth="0.7" opacity="0.22" fill="none" />)}
                {[...stries(94, 66, 9, 6, 34, -0.6, 2.6), ...stries(166, 66, 9, 6, 34, 0.6, -2.6 + 6.283)].map((d, i) => <path key={`sf${i}`} d={d} stroke={c.traitFin} strokeWidth="0.7" opacity="0.2" fill="none" />)}
                {/* sutures : sillon + trait + reflet */}
                {lignesSut.map((l, i) => <path key={`su${i}`} d={trace(onde(l, 1.3, 9))} fill="none" stroke={c.chairOmbre} strokeWidth="5" opacity="0.5" strokeLinecap="round" />)}
                {lignesSut.map((l, i) => <path key={`sv${i}`} d={trace(onde(l, 1.3, 9))} fill="none" stroke={c.trait} strokeWidth="1.2" opacity={i === 1 ? 0.45 : 0.8} strokeLinecap="round" strokeLinejoin="round" />)}
                {lignesSut.map((l, i) => <path key={`sw${i}`} d={trace(onde(l, 1.3, 9))} transform="translate(1.6 1.6)" fill="none" stroke={lum} strokeWidth="0.9" opacity="0.55" strokeLinecap="round" />)}
                {[AF, PF].map((d, i) => (
                    <g key={`fo${i}`}>
                        <path d={d} fill={`url(#${id('mem')})`} stroke={c.trait} strokeWidth="1.3" strokeLinejoin="round" />
                        <path d={d} fill="none" stroke={lum} strokeWidth="0.9" opacity="0.5" strokeLinejoin="round" />
                    </g>
                ))}
            </g>
        </g>
    );
};

/* ============================== ZONES ============================== */
const C_POUM = ['Murmure vésiculaire normal', 'Râles crépitants', 'Râles sous-crépitants', 'Sibilants', 'Ronchi', 'Diminution du murmure vésiculaire', 'Tirage intercostal', 'Matité'];
const C_BRAS = ['Normal', 'Tonus diminué', 'Mouvements asymétriques', 'Paralysie obstétricale du plexus brachial', 'Œdème', 'Lésion cutanée'];
const C_JAMBE = ['Normal', 'Tonus diminué', 'Mouvements asymétriques', 'Œdème', 'Raccourcissement', 'Lésion cutanée'];
const C_PIED = ['Normal', 'Pied bot varus équin', 'Pied plat', 'Métatarsus varus', 'Polydactylie'];
const C_OS = ['Normal', 'Bosse sérosanguine', 'Céphalhématome', 'Craniotabès', 'Aplatissement', 'Dépression osseuse'];
const C_OREILLE = ['Normal', 'Otite moyenne', 'Écoulement de l\'oreille', 'Malformation du pavillon', 'Appendice préauriculaire', 'Fistule préauriculaire'];
const C_SUT = (extra) => ['Normale', 'Chevauchement', 'Diastasis', 'Crête osseuse', extra];
const ab = (...c) => ['Souple, indolore', ...c, 'Douleur provoquée', 'Masse palpable'];

const zonesFace = () => {
    const Z = {};
    const poum = (g, l) => zone(l, 'Thorax', C_POUM, [chemin(poly(g))]);
    // tête, puis ses sous-régions (posées par-dessus)
    Z.tete = zone('Tête / ORL', 'Tête et cou', ['Normal', 'Angiome du visage', 'Asymétrie faciale', 'Croûtes de lait', 'Eczéma des joues', 'Ictère cutané'], [chemin(D_TETE)]);
    Z.yeux = zone('Yeux', 'Tête et cou', ['Normal', 'Conjonctivite', 'Larmoiement', 'Strabisme', 'Œdème palpébral'],
        [ellipse(128, 63, 12, 6), ellipse(172, 63, 12, 6), aire(ellipse(128, 63, 16, 14)), aire(ellipse(172, 63, 16, 14))]);
    Z.nez = zone('Nez', 'Tête et cou', ['Normal', 'Rhinorrhée', 'Obstruction nasale', 'Battement des ailes du nez'], [ellipse(150, 75, 7, 8), aire(ellipse(150, 73.5, 11, 8))]);
    Z.bouche = zone('Bouche', 'Tête et cou', ['Normal', 'Muguet buccal', 'Cyanose péribuccale', 'Fente labiale', 'Frein de langue court'], [ellipse(150, 89, 12, 6), aire(ellipse(150, 89, 16, 8))]);
    Object.assign(Z, paire('oreille', AX, 'face', { libelles: ['Oreille droite', 'Oreille gauche'], groupe: 'Tête et cou', constats: C_OREILLE, formes: [chemin(D_OREILLE_G), aire(ellipse(94.5, 65, 13, 19))] }));
    Object.assign(Z, paire('epaule', AX, 'face', {
        libelles: ['Épaule et clavicule droite', 'Épaule et clavicule gauche'], groupe: 'Thorax',
        constats: ['Normal', 'Fracture de la clavicule', 'Crépitation claviculaire', 'Tuméfaction claviculaire', 'Mobilité limitée', 'Lésion cutanée'],
        formes: [chemin(poly(EPAULE_G)), aire(chemin(poly(decaler(EPAULE_G, -9))))],
    }));
    Z.cou = zone('Cou', 'Tête et cou', ['Normal', 'Adénopathies cervicales', 'Torticolis', 'Tuméfaction du sterno-cléido-mastoïdien', 'Raideur de nuque'], [chemin(COU_Z)]);
    // membres : l'épaule appartient au membre supérieur jusqu'au pli axillaire
    Object.assign(Z, paire('bras', AX, 'face', {
        libelles: ['Membre supérieur droit', 'Membre supérieur gauche'], groupe: 'Membres', constats: C_BRAS,
        formes: [chemin(ruban(BRAS.p, BRAS.w, { debut: 'plat', fin: 'plat' })), chemin(POING), aire(chemin(ruban(BRAS.p, BRAS.w.map(w => w + 6), { t0: 0.6, debut: 'plat' })))],
    }));
    Object.assign(Z, paire('jambe', AX, 'face', {
        libelles: ['Membre inférieur droit', 'Membre inférieur gauche'], groupe: 'Membres', constats: C_JAMBE,
        formes: [chemin(ruban(JAMBE.p, JAMBE.w, { t0: 0.85, t1: 4.5, debut: 'plat', fin: 'plat' }))],
    }));
    Object.assign(Z, paire('pied', AX, 'face', {
        libelles: ['Pied droit', 'Pied gauche'], groupe: 'Membres', constats: C_PIED,
        formes: [chemin(ruban(JAMBE.p, JAMBE.w, { t0: 4.5, debut: 'plat', fin: 'plat' })), chemin(PIED_ZONE), aire(ellipse(98, 360, 19, 20))],
    }));
    Object.assign(Z, paire('hanche', AX, 'face', {
        libelles: ['Hanche droite', 'Hanche gauche'], groupe: 'Bassin',
        constats: ['Stable', 'Ortolani positif', 'Barlow positif', 'Abduction limitée', 'Asymétrie des plis de la cuisse', 'Pouls fémoral aboli'],
        formes: [chemin(ruban(JAMBE.p, JAMBE.w, { t0: 0, t1: 0.85, debut: 'plat', fin: 'plat' }))],
    }));
    // thorax
    Z.poumon_d = poum(LUNG_G, 'Poumon droit');
    Z.poumon_g = poum(LUNG_L, 'Poumon gauche');
    Z.coeur = zone('Cœur', 'Thorax', ['Bruits du cœur normaux', 'Souffle systolique', 'Souffle diastolique', 'Tachycardie', 'Bradycardie', 'Bruits assourdis', 'Bruit de galop'], [chemin(D_COEUR), aire(ellipse(161, 168, 17, 21))]);
    // abdomen en 9 régions jointives
    const tx = cmT(XM);
    const hypoG = poly([...cmPts(0, tx, 6), [XM, Y1], ...bordG(CM.p0[1], Y1, 3).reverse()]);
    const epig = poly([...cmPts(tx, 1, 5), ...miroir(cmPts(tx, 1, 5)).reverse(), [mx(XM), Y1], [XM, Y1]]);
    const flancG = poly([[XM, Y1], [XM, Y2], CREASE_L, ...bordG(Y1, Y2, 3).reverse()]);
    const fosseG = poly([CREASE_L, [XM, Y2], [XM, YH], CREASE_R]);
    Z.hypochondre_d = zone('Hypochondre droit', 'Abdomen', ab('Hépatomégalie', 'Distension'), [chemin(hypoG)]);
    Z.epigastre = zone('Épigastre', 'Abdomen', ab('Distension', 'Olive pylorique palpable'), [chemin(epig)]);
    Z.hypochondre_g = zone('Hypochondre gauche', 'Abdomen', ab('Splénomégalie', 'Distension'), miroirFormes([chemin(hypoG)], AX));
    Z.flanc_d = zone('Flanc droit', 'Abdomen', ab('Masse du flanc', 'Défense'), [chemin(flancG)]);
    Z.ombilic = zone('Région ombilicale', 'Abdomen', ['Normal (ombilic cicatrisé)', 'Cordon propre et sec', 'Cordon humide', 'Omphalite', 'Hernie ombilicale', 'Granulome ombilical', 'Saignement du cordon'],
        [chemin(poly([[XM, Y1], [mx(XM), Y1], [mx(XM), Y2], [XM, Y2]]))]);
    Z.flanc_g = zone('Flanc gauche', 'Abdomen', ab('Masse du flanc', 'Défense'), miroirFormes([chemin(flancG)], AX));
    Z.fosse_d = zone('Fosse iliaque droite', 'Abdomen', ab('Défense', 'Hernie inguinale'), [chemin(fosseG)]);
    Z.hypogastre = zone('Hypogastre', 'Abdomen', ab('Globe vésical', 'Distension'), [chemin(poly([[XM, Y2], [mx(XM), Y2], ...HYPO.slice().reverse()]))]);
    Z.fosse_g = zone('Fosse iliaque gauche', 'Abdomen', ab('Défense', 'Hernie inguinale'), miroirFormes([chemin(fosseG)], AX));
    Z.genitaux = zone('Organes génitaux externes', 'Bassin', ['Normal', 'Hydrocèle', 'Cryptorchidie', 'Synéchie des petites lèvres', 'Hypospadias', 'Phimosis'],
        [chemin(poly([CREASE_R, ...HYPO, [mx(CREASE_R[0]), CREASE_R[1]], ...BAS.slice().reverse()]))]);
    return Z;
};

const zonesDos = () => {
    const Z = {};
    const SPX = 143, YL = 216;
    const FA = lin([CREASE_L, [112, 246.5], [128, 247], [138, 252], [143, 257]], 8);     // crête iliaque / pli lombo-fessier
    const topV = [SPX, NV[1] + (SPX - NV[0]) * (129.5 - NV[1]) / (AX - NV[0])];
    // tête vue de derrière : pariétal (moitié haute, de part et d'autre de la ligne médiane) et occiput (moitié basse)
    const TL = TH_ECH.filter(p => p[0] <= AX).sort((a, b) => a[1] - b[1]);
    const haut = TL.filter(p => p[1] <= 50), bas = TL.filter(p => p[1] > 50);
    const ligne = [haut[haut.length - 1], [135, 47], [150, 45]];
    const OCC = poly([...ligne, ...miroir(ligne).reverse().slice(1), ...miroir(bas), ...bas.slice().reverse()]);
    Z.occiput = zone('Occiput', 'Tête et cou', ['Normal', 'Plagiocéphalie', 'Bosse sérosanguine', 'Céphalhématome', 'Alopécie de frottement', 'Croûtes de lait'], [chemin(OCC)]);
    Object.assign(Z, paire('parietal_dos', AX, 'dos', {
        libelles: ['Région pariétale droite', 'Région pariétale gauche'], groupe: 'Tête et cou',
        constats: ['Normal', 'Bosse sérosanguine', 'Céphalhématome', 'Croûtes de lait', 'Angiome', 'Aplatissement'], formes: [chemin(poly([[AX, 12], ...haut, ...ligne.slice(1)]))],
    }));
    Object.assign(Z, paire('oreille_dos', AX, 'dos', {
        libelles: ['Oreille droite (dos)', 'Oreille gauche (dos)'], groupe: 'Tête et cou',
        constats: ['Normal', 'Pavillon décollé', 'Eczéma rétro-auriculaire', 'Adénopathie rétro-auriculaire', 'Lésion cutanée'], formes: [chemin(D_OREILLE_G), aire(ellipse(94.5, 65, 13, 19))],
    }));
    Z.nuque = zone('Nuque', 'Tête et cou', ['Normal', 'Adénopathies occipitales', 'Raideur de nuque', 'Torticolis', 'Kyste ou fistule cervicale', 'Angiome plan de la nuque'], [chemin(COU_Z)]);
    Object.assign(Z, paire('bras_dos', AX, 'dos', {
        libelles: ['Membre supérieur droit (dos)', 'Membre supérieur gauche (dos)'], groupe: 'Membres (dos)', constats: C_BRAS,
        formes: [chemin(ruban(BRAS.p, BRAS.w, { debut: 'plat', fin: 'plat' })), chemin(POING), aire(chemin(ruban(BRAS.p, BRAS.w.map(w => w + 6), { t0: 0.6, debut: 'plat' })))],
    }));
    Object.assign(Z, paire('jambe_dos', AX, 'dos', {
        libelles: ['Membre inférieur droit (dos)', 'Membre inférieur gauche (dos)'], groupe: 'Membres (dos)', constats: C_JAMBE,
        formes: [chemin(ruban(JAMBE.p, JAMBE.w, { t0: 0, t1: 4.5, debut: 'plat', fin: 'plat' }))],
    }));
    Object.assign(Z, paire('plante', AX, 'dos', {
        libelles: ['Plante du pied droit', 'Plante du pied gauche'], groupe: 'Membres (dos)',
        constats: ['Normale', 'Pied bot varus équin', 'Pli plantaire anormal', 'Lésion cutanée', 'Éruption'],
        formes: [chemin(ruban(JAMBE.p, JAMBE.w, { t0: 4.5, debut: 'plat', fin: 'plat' })), chemin(PIED_ZONE), aire(ellipse(98, 360, 19, 20))],
    }));
    // thorax postérieur (jusqu'à l'épaule), puis omoplate posée par-dessus
    Object.assign(Z, paire('poumon_post', AX, 'dos', {
        libelles: ['Poumon postérieur droit', 'Poumon postérieur gauche'], groupe: 'Dos', constats: C_POUM,
        formes: [chemin(poly([topV, NV, ...ECH_TORSE.filter(p => p[1] > 115.8 && p[1] < X_EP[1]), X_EP, ...A_LOW, ...bordG(A_LOW[6][1], YL, 4), [SPX, YL]]))],
    }));
    Object.assign(Z, paire('omoplate', AX, 'dos', {
        libelles: ['Omoplate droite', 'Omoplate gauche'], groupe: 'Dos',
        constats: ['Normal', 'Asymétrie', 'Omoplate surélevée', 'Omoplate décollée', 'Lésion cutanée'],
        formes: [chemin(SCAP), aire(chemin(blobD([[142, 136], [122, 133], [108, 140], [107, 160], [112, 184], [126, 192], [142, 188]])))],
    }));
    Object.assign(Z, paire('lombaire', AX, 'dos', {
        libelles: ['Région lombaire droite', 'Région lombaire gauche'], groupe: 'Dos',
        constats: ['Normal', 'Tuméfaction lombaire', 'Naevus', 'Angiome', 'Lésion cutanée', 'Sinus dermique'],
        formes: [chemin(poly([[SPX, YL], ...bordG(YL, CREASE_L[1], 4), ...FA]))],
    }));
    Object.assign(Z, paire('fesse', AX, 'dos', {
        libelles: ['Fesse droite', 'Fesse gauche'], groupe: 'Dos',
        constats: ['Normal', 'Érythème fessier', 'Mycose', 'Plis fessiers asymétriques', 'Dermite d\'irritation', 'Tache mongoloïde'],
        formes: [chemin(poly([...FA, [SPX, 272], [AX, 272], [AX, 303.5], ...BAS.filter(p => p[0] <= AX).reverse(), CREASE_R]))],
    }));
    const rach = [[150, 127], [150, 200], [150, 272]];
    Z.rachis = zone('Rachis', 'Dos', ['Normal', 'Fossette sacro-coccygienne', 'Touffe de poils lombo-sacrée', 'Masse lombaire', 'Angiome lombo-sacré', 'Scoliose', 'Gibbosité'],
        [chemin(ruban(rach, [7, 7, 7], { debut: 'plat', fin: 'plat' })), aire(chemin(ruban(rach, [14, 14, 14], { debut: 'plat', fin: 'plat' })))]);
    return Z;
};

const zonesTete = () => {
    const CE = blobEch(CRANE_PTS, 14);
    const near = (p) => CE.reduce((b, q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); return d < b[0] ? [d, i] : b; }, [1e9, 0])[1];
    // arc du contour du crâne de a à b, dans le sens haut → gauche → bas → droite
    const arc = (a, b) => { const j = near(b), o = []; for (let k = near(a); ; k = (k + 1) % CE.length) { o.push(CE[k]); if (k === j) break; } return o; };
    const cG = SUT.coronaleG, lG = SUT.lambdoideG;
    const cE = cG[cG.length - 1], lE = lG[lG.length - 1];
    const cED = [mx(cE[0], CX), cE[1]], lED = [mx(lE[0], CX), lE[1]];
    const court = (l, k = 0.66) => { const n = l.length, a = l[n - 2], b = l[n - 1]; return [...l.slice(0, -1), [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]]; };
    const bande = (pts, w) => ruban(pts, pts.map(() => w), { debut: 'plat', fin: 'plat' });
    const FRONTAL = [...arc(cED, cE), ...lin(cG, 8).reverse(), [130, 64], ...lin(miroirPts(cG), 8)];
    const PARIETAL = [...arc(cE, lE), ...lin(lG, 8).reverse(), ...lin(SUT.sagittale, 6).reverse(), ...lin(cG, 8)];
    const OCCIPITAL = [...lin(lG, 8).reverse(), [139, 224], ...lin(miroirPts(lG), 8), ...arc(lE, lED).reverse()];
    const Z = {};
    Z.frontal = zone('Os frontal', 'Crâne', ['Normal', 'Bosse frontale proéminente', 'Bosse sérosanguine', 'Céphalhématome', 'Craniotabès', 'Dépression osseuse'], [chemin(poly(FRONTAL))]);
    Object.assign(Z, paire('parietal', CX, 'dos', { libelles: ['Os pariétal droit', 'Os pariétal gauche'], groupe: 'Crâne', constats: C_OS, formes: [chemin(poly(PARIETAL))] }));
    Z.occipital = zone('Os occipital', 'Crâne', ['Normal', 'Aplatissement occipital', 'Bosse sérosanguine', 'Céphalhématome', 'Craniotabès', 'Dépression osseuse'], [chemin(poly(OCCIPITAL))]);
    const sut = (lib, extra, l, w = 4) => zone(lib, 'Sutures du crâne', C_SUT(extra), [chemin(bande(court(l), w)), aire(chemin(bande(court(l), 14)))]);
    Z.sut_sagittale = sut('Suture sagittale', 'Soudure précoce (scaphocéphalie)', SUT.sagittale);
    Z.sut_metopique = sut('Suture métopique', 'Soudure précoce (trigonocéphalie)', SUT.metopique);
    Object.assign(Z, paire('sut_coronale', CX, 'dos', { libelles: ['Suture coronale droite', 'Suture coronale gauche'], groupe: 'Sutures du crâne', constats: C_SUT('Soudure précoce (plagiocéphalie antérieure)'), formes: sut('', '', cG).formes }));
    Object.assign(Z, paire('sut_lambdoide', CX, 'dos', { libelles: ['Suture lambdoïde droite', 'Suture lambdoïde gauche'], groupe: 'Sutures du crâne', constats: C_SUT('Soudure précoce (plagiocéphalie postérieure)'), formes: sut('', '', lG).formes }));
    Z.fontanelle_ant = zone('Fontanelle antérieure', 'Crâne', ['Normale (plane, souple)', 'Bombante', 'Déprimée', 'Large', 'Fermeture précoce'], [chemin(AF)]);
    Z.fontanelle_post = zone('Fontanelle postérieure', 'Crâne', ['Normale (fermée ou punctiforme)', 'Large', 'Bombante', 'Déprimée'], [chemin(PF), aire(cercle(130, 218, 22))]);
    return Z;
};

export default {
    id: 'nourrisson',
    titre: 'Nourrisson 0-24 mois',
    vues: [
        {
            id: 'face', titre: 'Devant', viewBox: '24 0 252 396', largeur: 340, reperes: true,
            decor: decorFace,
            etiquettes: [{ x: 35, y: 108, texte: 'D', taille: 13 }, { x: 265, y: 108, texte: 'G', taille: 13 }],
            zones: zonesFace(),
        },
        {
            id: 'dos', titre: 'Dos', viewBox: '24 0 252 396', largeur: 340, reperes: true,
            decor: decorDos,
            etiquettes: [{ x: 35, y: 108, texte: 'G', taille: 13 }, { x: 265, y: 108, texte: 'D', taille: 13 }],
            zones: zonesDos(),
        },
        {
            id: 'tete', titre: 'Crâne', viewBox: '0 0 260 300', largeur: 280, reperes: true,
            decor: decorTete,
            etiquettes: [{ x: 14, y: 20, texte: 'G', taille: 12 }, { x: 246, y: 20, texte: 'D', taille: 12 }, { x: 130, y: 296, texte: 'Arrière', ancre: 'middle', taille: 10 }],
            zones: zonesTete(),
        },
    ],
};
