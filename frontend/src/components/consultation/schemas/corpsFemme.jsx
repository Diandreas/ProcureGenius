import React from 'react';
import { zone, chemin, ellipse, rectangle, aire, miroirFormes } from './outils';

// Corps de femme adulte (face et dos) — planche d'atlas d'anatomie, même style que « Corps adulte ».
// Toutes les formes naissent de courbes de Bézier calculées une seule fois (voir « Bibliothèque de tracé ») ;
// les zones cliquables sont découpées dans ces mêmes courbes, donc exactement superposées au dessin.

const ID = 'corps-femme';
const AXE = 150;
const X = (a) => AXE - a;               // abscisse écran d'un point situé à « a » unités de l'axe, côté gauche de l'écran

// ============================================================ Bibliothèque de tracé
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${r1(p[0])} ${r1(p[1])}`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const rad = (d) => (d * Math.PI) / 180;

// Courbe lisse passant par les points ([x,y] ou [x,y,tx,ty] avec tangente imposée).
const courbe = (pts) => {
    const n = pts.length;
    if (n === 2) return { s: pts[0].slice(0, 2), g: [{ p: pts[1].slice(0, 2) }] };
    const ch = [], L = [], T = [];
    for (let i = 0; i < n - 1; i++) { ch.push([pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]]); L.push(Math.hypot(ch[i][0], ch[i][1])); }
    for (let i = 1; i < n - 1; i++) {
        const u1 = unit(ch[i - 1]), u2 = unit(ch[i]);
        T[i] = unit([L[i] * u1[0] + L[i - 1] * u2[0], L[i] * u1[1] + L[i - 1] * u2[1]]);
    }
    const u0 = unit(ch[0]); T[0] = unit([1.5 * u0[0] - 0.5 * T[1][0], 1.5 * u0[1] - 0.5 * T[1][1]]);
    const ue = unit(ch[n - 2]); T[n - 1] = unit([1.5 * ue[0] - 0.5 * T[n - 2][0], 1.5 * ue[1] - 0.5 * T[n - 2][1]]);
    pts.forEach((p, i) => { if (p.length >= 4) T[i] = unit([p[2], p[3]]); });
    const g = [];
    for (let i = 0; i < n - 1; i++) {
        const d = L[i] / 3;
        g.push({ c1: [pts[i][0] + T[i][0] * d, pts[i][1] + T[i][1] * d], c2: [pts[i + 1][0] - T[i + 1][0] * d, pts[i + 1][1] - T[i + 1][1] * d], p: pts[i + 1].slice(0, 2) });
    }
    return { s: pts[0].slice(0, 2), g };
};
// Même chose, mais les points sont donnés en (a, y) : « a » = distance à l'axe, côté gauche de l'écran.
const cA = (pts) => courbe(pts.map((p) => (p.length >= 4 ? [X(p[0]), p[1], -p[2], p[3]] : [X(p[0]), p[1]])));

const debut = (P, i) => (i === 0 ? P.s : P.g[i - 1].p);
const bez = (p0, c1, c2, p3, t) => { const a = lerp(p0, c1, t), b = lerp(c1, c2, t), c = lerp(c2, p3, t); return lerp(lerp(a, b, t), lerp(b, c, t), t); };
const at = (P, u) => {
    const n = P.g.length; let i = Math.min(Math.max(Math.floor(u), 0), n - 1); const t = u - i;
    const s = debut(P, i), g = P.g[i];
    return g.c1 ? bez(s, g.c1, g.c2, g.p, t) : lerp(s, g.p, t);
};
const coupe = (s, g, t) => {
    if (!g.c1) return [{ p: lerp(s, g.p, t) }, { p: g.p }];
    const a = lerp(s, g.c1, t), b = lerp(g.c1, g.c2, t), c = lerp(g.c2, g.p, t), ab = lerp(a, b, t), bc = lerp(b, c, t), m = lerp(ab, bc, t);
    return [{ c1: a, c2: ab, p: m }, { c1: bc, c2: c, p: g.p }];
};
const rev = (P) => {
    const g = [];
    for (let i = P.g.length - 1; i >= 0; i--) { const s = debut(P, i), sg = P.g[i]; g.push(sg.c1 ? { c1: sg.c2, c2: sg.c1, p: s } : { p: s }); }
    return { s: P.g[P.g.length - 1].p, g };
};
// Portion de P entre les paramètres u1 et u2 (u = indice de segment + fraction).
const tranche = (P, u1, u2) => {
    if (u1 > u2) return rev(tranche(P, u2, u1));
    const n = P.g.length;
    const seg = (u) => { let i = Math.floor(u); let t = u - i; if (i >= n) { i = n - 1; t = 1; } return [i, t]; };
    let [i1, t1] = seg(u1); let [i2, t2] = seg(u2);
    if (t2 < 1e-9 && i2 > i1) { i2--; t2 = 1; }
    const start = at(P, u1);
    if (i1 === i2) {
        if (t2 - t1 < 1e-9) return { s: start, g: [] };
        const s = debut(P, i1);
        const gauche = coupe(s, P.g[i1], t2)[0];
        return { s: start, g: [coupe(s, gauche, t1 / t2)[1]] };
    }
    const out = [coupe(debut(P, i1), P.g[i1], t1)[1]];
    for (let i = i1 + 1; i < i2; i++) out.push(P.g[i]);
    out.push(coupe(debut(P, i2), P.g[i2], t2)[0]);
    return { s: start, g: out };
};
const cat = (...Ps) => {
    const P = { s: Ps[0].s, g: [...Ps[0].g] };
    Ps.slice(1).forEach((Q) => {
        const e = P.g.length ? P.g[P.g.length - 1].p : P.s;
        if (dist(e, Q.s) > 0.05) P.g.push({ p: Q.s });
        P.g.push(...Q.g);
    });
    return P;
};
const lin = (...pts) => ({ s: pts[0], g: pts.slice(1).map((p) => ({ p })) });
const mm = (p) => [2 * AXE - p[0], p[1]];
const mir = (P) => ({ s: mm(P.s), g: P.g.map((g) => (g.c1 ? { c1: mm(g.c1), c2: mm(g.c2), p: mm(g.p) } : { p: mm(g.p) })) });
const dstr = (P, close = true) => `M${pt(P.s)}` + P.g.map((g) => (g.c1 ? `C${pt(g.c1)} ${pt(g.c2)} ${pt(g.p)}` : `L${pt(g.p)}`)).join('') + (close ? 'Z' : '');
const fin = (P) => (P.g.length ? P.g[P.g.length - 1].p : P.s);
// paramètre du point de P le plus proche de « cible »
const loc = (P, cible) => {
    const n = P.g.length; let best = 0, bd = 1e9;
    for (let i = 0; i < n; i++) for (let k = 0; k <= 24; k++) { const u = i + k / 24; const d = dist(at(P, u), cible); if (d < bd) { bd = d; best = u; } }
    let lo = Math.max(0, best - 1 / 24), hi = Math.min(n, best + 1 / 24);
    for (let r = 0; r < 3; r++) {
        let b2 = best, bd2 = bd;
        for (let k = 0; k <= 12; k++) { const u = lo + (hi - lo) * k / 12; const d = dist(at(P, u), cible); if (d < bd2) { bd2 = d; b2 = u; } }
        best = b2; bd = bd2; const w = (hi - lo) / 6; lo = Math.max(0, best - w); hi = Math.min(n, best + w);
    }
    return best;
};
// paramètre où P atteint l'ordonnée y (premier passage après « depuis »)
const locY = (P, y, depuis = 0) => {
    const n = P.g.length; const pas = 40; let prev = at(P, depuis), up = depuis;
    for (let u = depuis + 1 / pas; u <= n + 1e-9; u += 1 / pas) {
        const q = at(P, Math.min(u, n));
        if ((prev[1] - y) * (q[1] - y) <= 0) {
            let lo = up, hi = Math.min(u, n);
            for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if ((at(P, lo)[1] - y) * (at(P, m)[1] - y) <= 0) hi = m; else lo = m; }
            return (lo + hi) / 2;
        }
        prev = q; up = Math.min(u, n);
    }
    return n;
};

// ============================================================ Géométrie du corps
const TH1 = rad(11.5), TH2 = rad(13), S0 = [55, 144], SE = 104;
const axe = (s) => {
    if (s <= SE) return [S0[0] + s * Math.sin(TH1), S0[1] + s * Math.cos(TH1)];
    const E = axe(SE); return [E[0] + (s - SE) * Math.sin(TH2), E[1] + (s - SE) * Math.cos(TH2)];
};
const thS = (s) => (s <= 92 ? TH1 : s >= 116 ? TH2 : TH1 + ((TH2 - TH1) * (s - 92)) / 24);
const bord = (s, w, cote) => {
    const A = axe(s), th = thS(s);
    return [A[0] + cote * Math.cos(th) * w, A[1] - cote * Math.sin(th) * w];
};
// stations du bras : [s (abscisse le long de l'axe), demi-largeur côté externe, demi-largeur côté interne]
const GR = 0.92;       // bras et mains de femme : gabarit réduit
const ST = [[12, 19.5, 13], [30, 18.6, 13.5], [46, 17, 13.6], [60, 15.4, 13.6], [88, 14, 13.3], [94, 14.2, 13.3], [104, 15.2, 13.3],
    [112, 14.9, 13.4], [126, 15, 13.4], [146, 14.2, 12.2], [170, 11.5, 10.2], [188, 9.6, 9.2]].map(([s, a, b]) => [s, a * (s === 12 ? 0.95 : GR), b * (s === 12 ? 0.95 : GR)]);
const IDX = (s) => ST.findIndex((q) => q[0] === s);

// Main (paume vers l'avant, pouce vers l'extérieur). Repère local (u le long de l'axe, v vers le pouce).
const construireMain = () => {
    const W = axe(188), d2 = [Math.sin(TH2), Math.cos(TH2)], n2 = [Math.cos(TH2), -Math.sin(TH2)];
    const P = (u, v) => { u *= GR; v *= GR; return [AXE - (W[0] + u * d2[0] + v * n2[0]), W[1] + u * d2[1] + v * n2[1]]; };
    const F = [
        { v: 11.4, u: 34, phi: 8.5, L: 37, w: 7.8 },
        { v: 3.4, u: 35, phi: 1, L: 40, w: 8 },
        { v: -4.2, u: 33.6, phi: -6.5, L: 36.5, w: 7.6 },
        { v: -11, u: 31, phi: -16, L: 28, w: 6.6 },
    ];
    const dir = (f) => [Math.cos(rad(f.phi)), Math.sin(rad(f.phi))];
    const V = [[35, 15.2]];                       // fond de la commissure du pouce
    for (let k = 0; k < 3; k++) {
        const a = F[k], b = F[k + 1];
        const m = [(a.u + b.u) / 2, (a.v + b.v) / 2], dm = unit([dir(a)[0] + dir(b)[0], dir(a)[1] + dir(b)[1]]);
        V.push([m[0] + dm[0] * 5.5, m[1] + dm[1] * 5.5]);
    }
    const doigt = (f, Vp, Vn, queue = []) => {
        const d = dir(f), pe = [-d[1], d[0]];
        const q = (t, s) => { const h = (f.w / 2) * (1 - 0.22 * t / f.L) * s; return [f.u + d[0] * t + pe[0] * h, f.v + d[1] * t + pe[1] * h]; };
        const t0 = 7, r = f.L - t0;
        return [Vp, q(t0 + r * 0.3, 1), q(t0 + r * 0.66, 1), q(f.L - 0.3 * f.w, 0.86), q(f.L + 0.02 * f.w, 0.42), q(f.L + 0.1 * f.w, 0), q(f.L + 0.02 * f.w, -0.42), q(f.L - 0.3 * f.w, -0.86), q(t0 + r * 0.66, -1), q(t0 + r * 0.3, -1), Vn, ...queue];
    };
    const pouce = [[0, 9.6, 1, 0.1], [8, 12.8], [15, 16.6], [22.1, 20.4], [30.4, 24.6], [37.8, 28.4], [42.6, 30.2], [46, 28.6], [45.4, 24], [40.4, 19.8], [37, 17], V[0]];
    const runs = [
        pouce,
        doigt(F[0], V[0], V[1]),
        doigt(F[1], V[1], V[2]),
        doigt(F[2], V[2], V[3]),
        doigt(F[3], V[3], [29.5, -13.4], [[20, -13.4], [10, -11.4], [0, -9.2, -1, -0.1]]),
    ];
    const tr = (p) => { const q = P(p[0], p[1]); if (p.length >= 4) { const t = [p[2] * d2[0] + p[3] * n2[0], p[2] * d2[1] + p[3] * n2[1]]; return [q[0], q[1], -t[0], t[1]]; } return q; };
    return { P, F, V, dir, runs: runs.map((r) => courbe(r.map(tr))) };
};

// Pied vu de face (orteils vers l'observateur, légèrement ouverts)
const construirePiedFace = () => {
    const T = [[6.7, 624], [7.3, 628.4], [8, 631.6], [8.6, 633.6], [12.7, 635.4]];   // largeur, ordonnée du bout (de l'orteil externe au gros orteil)
    let b = 51.6; const bornes = [b];
    T.forEach((t) => { b -= t[0]; bornes.push(b); });
    const vy = (k) => (k === 0 ? 618 : k === T.length ? 626 : Math.min(T[k - 1][1], T[k][1]) - 3.2);
    const pts = [[bornes[0], vy(0)]];
    T.forEach((t, k) => {
        const cx = (bornes[k] + bornes[k + 1]) / 2, w = t[0], yt = t[1];
        pts.push([cx + 0.47 * w, yt - 0.5 * w], [cx + 0.2 * w, yt - 0.06 * w], [cx - 0.2 * w, yt - 0.06 * w], [cx - 0.47 * w, yt - 0.5 * w]);
        if (k < T.length - 1) pts.push([bornes[k + 1], vy(k + 1)]);
    });
    pts.pop(); pts.push([bornes[5] + 0.1, 628]);
    const ext = cA([[41.8, 597], [45.4, 606.5], [49.6, 613.4], [51.6, 618]]);
    const orteils = cA(pts);
    const int = cA([[bornes[5] + 0.1, 628], [13.6, 618], [14.6, 607], [16.8, 599], [19.5, 594]]);
    return { P: cat(ext, orteils, int), bornes, T, vy };
};
const construirePiedDos = () => cA([[41.8, 597], [42.8, 602.4], [43.8, 608], [45.4, 614.4], [46.8, 621], [46.2, 627], [42, 630.4], [36, 631.6], [31, 631.8], [26, 631.2], [21, 630], [17.8, 626.6], [17.6, 620.6], [18.8, 614.6], [19.8, 608], [19.7, 600], [19.5, 594]]);
const CHEVILLES = [[[24, 585.6], [20.8, 590.4], [20.8, 596.4], [24.6, 599]], [[38.4, 588.6], [41.2, 593.4], [40.4, 598.6], [36.6, 601]]];     // malléoles

// Corps complet. « zonage » : variante légèrement rentrée du tronc pour découper les zones à l'intérieur de la silhouette.
const memo = {};
const construire = (zonage = false) => {
    if (memo[zonage]) return memo[zonage];
    const cap = [[13.6, 88], [14, 102], [17.6, 111], [26.4, 118], [40, 123.6], [53, 128], [63, 131.4], [70.4, 137.4]];
    const ext = ST.map(([s, wo]) => bord(s, wo, 1));
    const K1 = cA([...cap, ...ext]);
    const nCap = cap.length;
    const int = ST.map(([s, , wi]) => bord(s, wi, -1)).slice(1).reverse();      // du poignet jusqu'à l'aisselle (s = 30)
    const K3 = cA(int);
    const main = construireMain();
    const ins = -0.9;
    const tr = [[195, 49.4], [218, 46.8], [243, 43], [264, 47.4], [288, 58.2], [312, 64.4], [338, 66.6], [354, 65.4], [372, 63.6], [400, 59.4], [425, 55.2]]
        .map(([y, a]) => [a + (zonage && y < 290 ? ins : 0), y]);
    const apex = bord(30, 13.5, -1);
    const K4 = cA([apex, ...tr, [51.2, 440], [49.8, 449], [48.6, 462], [50.2, 480], [53, 496], [50.6, 520], [44.6, 548], [41.6, 572], [40.6, 588], [41.8, 597]]);
    const face = construirePiedFace();
    const K6 = cA([[19.5, 594], [20.8, 575], [22, 555], [19.5, 530], [14.6, 508], [13.8, 486], [15.5, 462], [15.3, 449], [14.6, 436], [13.6, 425], [10.3, 400], [6.2, 375], [2.6, 357], [0, 350, -0.3, -1]]);
    const gauche = (pied) => cat(K1, ...main.runs, K3, K4, pied, K6);
    const demiFace = gauche(face.P), demiDos = gauche(construirePiedDos());
    const complet = (demi) => { const m = rev(mir(demi)); return cat(demi, m); };
    const G = { K1, K3, K4, K6, nCap, main, pied: face, silFace: complet(demiFace), silDos: complet(demiDos) };
    memo[zonage] = G;
    return G;
};

// ============================================================ Tête
const teteFace = () => cat(cA([[0, 20.5, 1, 0], [11.2, 22], [21, 27.5], [26, 37.5], [27.2, 50], [27.4, 62], [26.2, 73.6], [23.4, 84], [19.2, 92.8], [13, 99.2], [6.4, 102], [0, 102.8, -1, 0]]));
const teteDos = () => cat(cA([[0, 20.5, 1, 0], [11.2, 22], [21, 27.5], [26, 37.5], [27.2, 50], [27.4, 62], [26, 73], [23.4, 83.6], [19.6, 91.8], [13.6, 96.6], [6, 98.8], [0, 99.2, -1, 0]]));
const fermerSym = (demi) => { const m = rev(mir(demi)); return cat(demi, m); };

// ============================================================ Décor
const defsId = (vue, n) => `${ID}-${vue}-a-${n}`;

// Petit constructeur d'éléments SVG : les tracés sont écrits côté gauche de l'écran puis reflétés.
const atelier = (vue, c, G) => {
    const els = []; let n = 0;
    const k = (nom) => `url(#${defsId(vue, nom)})`;
    const add = (el) => { els.push(React.cloneElement(el, { key: n++ })); };
    const bi = (P, props, close = false) => { add(<path d={dstr(P, close)} {...props} />); add(<path d={dstr(mir(P), close)} {...props} />); };
    const lig = (pts, props) => bi(cA(pts), { fill: 'none', ...props });
    const form = (pts, props) => bi(cA(pts), props, true);
    const blob = (a, y, rx, ry, rot, id, op = 1) => {
        [1, -1].forEach((sg) => { const cx = sg > 0 ? X(a) : AXE + a; add(<ellipse cx={cx} cy={y} rx={rx} ry={ry} transform={`rotate(${sg * rot} ${cx} ${y})`} fill={k(id)} opacity={op} />); });
    };
    const blobC = (y, rx, ry, id, op = 1) => add(<ellipse cx={AXE} cy={y} rx={rx} ry={ry} fill={k(id)} opacity={op} />);
    return { els, k, add, bi, lig, form, blob, blobC, G };
};

const defsCommuns = (vue, c) => (
    <>
        <radialGradient id={defsId(vue, 'lum')}><stop offset="0" stopColor={c.chairClair} stopOpacity="0.95" /><stop offset="1" stopColor={c.chairClair} stopOpacity="0" /></radialGradient>
        <radialGradient id={defsId(vue, 'omb')}><stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.8" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" /></radialGradient>
    </>
);

// Détails de la main : paume (plis) ou dos (articulations, ongles) ; tracés dans le repère local de la main
const detailsMain = (A, c, paume) => {
    const { P, F, dir } = A.G.main;
    const HP = (pts) => courbe(pts.map((q) => P(q[0], q[1])));
    const fin = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.8, opacity: 0.85 };
    if (paume) {
        A.bi(HP([[27, 12.5], [19, 9.4], [11.5, 5.2], [5, 1.6]]), fin);
        A.bi(HP([[31.5, -11.2], [27.5, -3.5], [26, 4], [26.4, 12]]), { ...fin, opacity: 0.55 });
        A.bi(HP([[30.2, -10], [22, -9.4], [14, -8.4]]), { ...fin, opacity: 0.45 });
        A.bi(HP([[33.5, 13.8], [34.2, 6], [34.6, -2], [33.8, -9], [32, -13.4]]), { ...fin, opacity: 0.55 });
    } else {
        F.forEach((f) => A.bi(HP([[f.u - 0.5, f.v - 2.4], [f.u + 0.8, f.v], [f.u - 0.5, f.v + 2.4]]), { ...fin, opacity: 0.55 }));
        A.bi(HP([[24, 8], [30, 6.6]]), { ...fin, opacity: 0.45 });
        A.bi(HP([[22, 1.6], [29, 0.4]]), { ...fin, opacity: 0.45 });
        A.bi(HP([[21, -5], [28, -5.6]]), { ...fin, opacity: 0.45 });
    }
    F.forEach((f) => {
        const d = dir(f), pe = [-d[1], d[0]];
        [0.34, 0.62].forEach((t) => {
            const L = f.L * t, h = f.w * 0.34;
            A.bi(HP([[f.u + d[0] * L + pe[0] * h, f.v + d[1] * L + pe[1] * h], [f.u + d[0] * (L + 0.6) - pe[0] * h, f.v + d[1] * (L + 0.6) - pe[1] * h]]), { ...fin, opacity: 0.5 });
        });
        if (!paume) {
            const L = f.L * 0.86, q = [f.u + d[0] * L, f.v + d[1] * L];
            const p0 = [q[0] - d[0] * 3.4, q[1] - d[1] * 3.4], p1 = [q[0] + d[0] * 2.8, q[1] + d[1] * 2.8], w1 = f.w * 0.3, w2 = f.w * 0.26;
            A.bi(HP([[p0[0] + pe[0] * w1, p0[1] + pe[1] * w1], [p1[0] + pe[0] * w2, p1[1] + pe[1] * w2], [p1[0] - pe[0] * w2, p1[1] - pe[1] * w2], [p0[0] - pe[0] * w1, p0[1] - pe[1] * w1]]),
                { fill: c.chairClair, fillOpacity: 0.7, stroke: c.traitFin, strokeWidth: 0.6, opacity: 0.9 }, true);
        }
    });
};

const OREILLE = [[25.4, 60.2], [28.6, 58.8], [31.4, 62.4], [32.1, 69.6], [30.8, 76.6], [28.2, 81.6], [25.6, 80.2]];
const oreilles = (E, c) => {
    E.form(OREILLE, { fill: c.chair, stroke: c.trait, strokeWidth: 1.3 });
    E.lig([[27.8, 63.4], [30, 67], [29.4, 73.6], [27, 78.2]], { fill: 'none', stroke: c.traitFin, strokeWidth: 0.8, opacity: 0.8 });
};
const teteDetails = (H, c, face) => {
    const fin = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.85, strokeLinecap: 'round' };
    H.blobC(100, 18, 6, 'omb', 0.4);
    if (face) {
        H.blob(24, 74, 5, 16, 6, 'omb', 0.5);             // joues et mâchoire dans l'ombre
        H.blob(11, 62, 7, 7, 0, 'lum', 0.7);              // pommettes
        H.blob(9.5, 55.6, 8.5, 3.4, -4, 'omb', 0.4);     // arcades sourcilières
        H.lig([[4.6, 55.8], [9.6, 52.8], [15.6, 53.6], [20.6, 56.6]], { ...fin, strokeWidth: 1.5, opacity: 0.7 });     // sourcils
        H.lig([[5.6, 60.6], [10, 62.8], [15, 60.8]], { ...fin, strokeWidth: 1, opacity: 0.55 });                        // paupières closes (traits discrets)
        H.blobC(70, 3.4, 10, 'lum', 0.55);                // arête du nez
        H.lig([[6.4, 58.2], [4.2, 66], [3.6, 73]], { ...fin, opacity: 0.5 });
        H.add(<path d={`M${X(5.8)} 77.6 Q${X(3.6)} 80 ${AXE} 79.4 Q${X(-3.6)} 80 ${X(-5.8)} 77.6`} {...fin} strokeWidth="1.1" opacity="0.9" />);     // base du nez
        H.add(<path d={`M${X(8.6)} 86.6 Q${X(4)} 88.6 ${AXE} 88 Q${X(-4)} 88.6 ${X(-8.6)} 86.6`} {...fin} strokeWidth="1.1" opacity="0.9" />);        // fente buccale
        H.add(<path d={`M${X(5.2)} 91.6 Q${AXE} 93.4 ${X(-5.2)} 91.6`} {...fin} opacity="0.35" />);                                  // pli sous la lèvre
        H.blobC(88, 8, 2.6, 'omb', 0.35);
        H.add(<ellipse cx={AXE} cy="88.6" rx="7.8" ry="2.9" fill={c.rouge} fillOpacity="0.32" />);     // lèvres
    } else {
        H.blobC(40, 18, 14, 'lum', 0.5);
        H.add(<path d={`M${X(5)} 92.4 Q${AXE} 95 ${X(-5)} 92.4`} {...fin} opacity="0.5" />);
    }
};

// Sein (moitié gauche de l'écran) : un seul tracé sert au dessin et à la zone cliquable
const SEIN = cA([[7.4, 177, 0, -1], [10.4, 169.4], [17, 164.2], [26, 163.4], [34.4, 166.8], [40, 173.6], [41.6, 182.4], [39.4, 191], [33.6, 197.2], [25, 199.6], [16.6, 197.8], [10.4, 192], [7.4, 185], [7.4, 177, 0, -1]]);
const AL = 16, AB = 22;                                // limite interne des régions abdominales latérales ; extrémité interne du pli inguinal
const PLI = [[46, 297], [34, 306], [AB, 312.8]];       // pli inguinal
const SC = [[AB, 312.8], [15.4, 321.4], [9.6, 331.4], [6, 341], [0, 350, -0.4, 1]];    // pli génito-crural : borne la région vulvaire
const CRETE = [[38, 267.4], [29.6, 273.6]];            // crête iliaque vue de dos
const PLF = [[0, 350], [10, 355.6], [24, 360.6], [40, 359.6], [54, 354.6]];        // pli sous-fessier : un seul tracé, partagé par le décor et la limite de zone
const plf = (K4) => { const s = at(K4, locY(K4, 347.8)); return cA([...PLF, [AXE - s[0], s[1]]]); };

// Éléments communs aux deux vues, puis détails propres à chaque vue
const detailsFace = (A, c) => {
    const G = A.G;
    const FIN = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.95, strokeLinecap: 'round' };
    const FIN2 = { ...FIN, opacity: 0.6 };
    // côtes suggérées (sous les seins)
    [186, 195.4, 204.6].forEach((y0) => A.lig([[9.6, y0], [24, y0 + 3.8], [38, y0 + 10], [49.6, y0 + 20.4]], { ...FIN, opacity: 0.4 }));
    A.bi(SEIN, { fill: c.chair, stroke: 'none' }, true);        // masque : les seins cachent les côtes
    // volumes
    A.blobC(262, 28, 46, 'lum', 0.55);
    A.blob(24, 160, 20, 12, 0, 'lum', 0.9);
    A.blob(23.5, 176, 11, 9, 0, 'lum', 1);
    A.blob(25, 194, 14, 6, 0, 'omb', 0.45);
    A.blob(41, 183, 4, 13, 0, 'omb', 0.5);
    A.blob(25, 203, 20, 4, 0, 'omb', 0.6);
    A.blob(5.4, 182, 3.6, 16, 0, 'omb', 0.7);
    A.blob(68, 150, 8, 15, 8, 'lum', 0.85);
    A.blob(64, 205, 6.4, 24, 11, 'lum', 0.8);
    A.blob(80, 284, 6, 24, 13, 'lum', 0.7);
    A.blob(40, 384, 12, 40, -3, 'lum', 0.85);
    A.blob(33, 449, 11, 10.5, 0, 'lum', 0.8);
    A.blob(34, 525, 8, 30, -2, 'lum', 0.55);
    A.blob(40, 238, 4.6, 24, 0, 'omb', 0.7);
    A.blob(52, 172, 4, 10, 0, 'omb', 0.85);
    A.blob(58, 324, 9, 22, -4, 'lum', 0.8);
    A.blob(24, 314, 20, 6, 24, 'omb', 0.7);
    A.blob(22, 402, 4, 40, 4, 'omb', 0.5);
    A.blobC(106, 13, 6, 'omb', 0.75);
    A.blobC(112, 8, 9, 'lum', 0.6);
    // cou : sterno-cléido-mastoïdiens, larynx, fourchette sternale
    A.lig([[13.2, 96], [11.6, 106], [9.2, 116], [7, 124.4]], FIN);
    A.lig([[8.4, 99], [6.6, 108], [4.6, 117], [2.8, 124.8]], FIN2);
    A.add(<path d={`M${X(-2.6)} 104.4 Q${X(0)} 108.4 ${X(2.6)} 104.4`} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.4" />);
    A.add(<path d={`M${X(-4.2)} 125 Q${X(0)} 129 ${X(4.2)} 125`} fill={c.chairOmbre} fillOpacity="0.55" stroke={c.traitFin} strokeWidth="0.9" />);
    // clavicules fines, bords du sternum très discrets
    A.bi(cA([[6.6, 125.6], [15, 122.8], [26, 124.2], [40, 129], [54, 134.4], [65, 138.8]]), { ...FIN, strokeWidth: 1.1, opacity: 0.7 });
    // rebord costal
    A.lig([[0.4, 207.4], [10, 213], [22, 221.4], [34, 230.6], [44, 238.6], [49, 242]], { ...FIN, strokeWidth: 1.15, opacity: 0.8 });
    // seins : pli sous-mammaire, contour externe, aréoles et mamelons discrets
    A.bi(tranche(SEIN, 7, 12), { ...FIN, strokeWidth: 1.1, opacity: 0.8 });
    A.bi(tranche(SEIN, 4.6, 7), { ...FIN, strokeWidth: 1.1, opacity: 0.5 });
    A.bi(tranche(SEIN, 12, 13.3), { ...FIN, opacity: 0.45 });
    [1, -1].forEach((sg) => {
        const cx = sg > 0 ? X(25.4) : AXE + 25.4;
        A.add(<ellipse cx={cx} cy={185} rx="6.2" ry="6" fill={c.chairOmbre} fillOpacity="0.4" stroke={c.traitFin} strokeWidth="0.6" strokeOpacity="0.7" />);
        A.add(<ellipse cx={cx} cy={185} rx="2.3" ry="2.2" fill={c.traitFin} fillOpacity="0.75" />);
        A.add(<ellipse cx={cx - sg * 0.7} cy={184.2} rx="0.8" ry="0.6" fill={c.chairClair} fillOpacity="0.8" />);
    });
    // abdomen (légèrement arrondi en bas), nombril, crête iliaque, plis inguinaux
    A.blobC(298, 26, 15, 'lum', 0.7);
    A.add(<path d={`M${AXE} 207.6 L${AXE} 300`} stroke={c.traitFin} strokeWidth="0.8" opacity="0.4" fill="none" />);
    A.lig([[17.5, 213], [20.5, 236], [20.4, 262], [18.8, 286], [12.4, 306.4]], { ...FIN, opacity: 0.3 });
    [[228.6, 20.6], [247, 22.4], [280.6, 19.6]].forEach(([y, a]) => A.lig([[1.6, y - 0.4], [10, y + 1.2], [a - 1.4, y - 0.2]], { ...FIN, opacity: 0.2 }));
    A.add(<ellipse cx={AXE} cy="263.4" rx="2.7" ry="4.5" fill={c.chairOmbre} fillOpacity="0.85" stroke={c.traitFin} strokeWidth="0.95" />);
    A.add(<path d={`M${X(-1.6)} 261.4 Q${X(0)} 258.8 ${X(1.6)} 261.4`} fill="none" stroke={c.chairClair} strokeWidth="0.9" opacity="0.9" />);
    A.lig([[48, 268.6], [53.6, 278.4], [57, 288.6]], { ...FIN, opacity: 0.5 });
    A.bi(cA([[57.4, 288], ...PLI]), { ...FIN, strokeWidth: 1.15, opacity: 0.95 });
    A.lig([[AB, 312.8], [12, 308.2], [0, 306.6]], { ...FIN, opacity: 0.32 });
    A.bi(cA(SC), { ...FIN, strokeWidth: 1, opacity: 0.6 });
    // vulve : représentation schématique, sobre (relief du mont du pubis, fente et grandes lèvres)
    A.blobC(318, 12, 8, 'lum', 0.75);
    A.blobC(338, 4.4, 10, 'omb', 0.55);
    A.lig([[1.4, 327], [3.6, 334], [3.8, 341], [1.6, 347.6]], { ...FIN, opacity: 0.55 });
    A.add(<path d={`M${AXE} 331 L${AXE} 347.4`} stroke={c.traitFin} strokeWidth="0.85" opacity="0.85" fill="none" />);
    // bras
    A.lig([[51.4, 134], [54.6, 147], [60.6, 159], [69, 170]], { ...FIN, opacity: 0.6 });
    [104, 112].forEach((s, i) => {
        const o = bord(s, 11.8 - i, 1), m = axe(s), inn = bord(s, 11.4 - i, -1);
        A.add(<path d={`M${X(o[0])} ${r1(o[1])} Q${X(m[0])} ${r1(m[1] + 4 - i * 0.8)} ${X(inn[0])} ${r1(inn[1])}`} fill="none" stroke={c.traitFin} strokeWidth="0.95" opacity={0.85 - i * 0.25} />);
    });
    A.lig([bord(116, 8.4, 1), bord(140, 8.2, 1), bord(168, 6.2, 1)], { ...FIN, opacity: 0.45 });
    A.lig([bord(116, 4, -1), bord(146, 4.4, -1), bord(172, 3.4, -1)], { ...FIN, opacity: 0.4 });
    [184.6, 180].forEach((s, i) => { const o = bord(s, 8.2, 1), inn = bord(s, 8, -1), m = axe(s); A.add(<path d={`M${X(o[0])} ${r1(o[1])} Q${X(m[0])} ${r1(m[1] + 2.4)} ${X(inn[0])} ${r1(inn[1])}`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity={0.7 - i * 0.2} />); });
    // cuisses, genoux, jambes
    A.lig([[54, 296], [45, 330], [33.4, 372], [23.6, 406], [17.6, 436]], { ...FIN, opacity: 0.4 });
    A.lig([[53, 344], [49.6, 390], [46, 426]], { ...FIN, opacity: 0.38 });
    A.lig([[8.6, 340], [10, 372], [11.6, 400]], { ...FIN, opacity: 0.35 });
    A.lig([[21, 410], [19.4, 424], [22.6, 436.6]], { ...FIN, opacity: 0.35 });
    A.form([[27.2, 439.6], [38.8, 439.6], [42.4, 446.8], [40.2, 458], [33, 463], [26, 458], [23.6, 446.8]], { fill: c.chairClair, fillOpacity: 0.4, stroke: c.traitFin, strokeWidth: 0.95 });
    A.lig([[42.6, 440.6], [47.6, 449], [45.6, 460]], { ...FIN, opacity: 0.4 });
    A.lig([[23.2, 441], [18.6, 450], [20.6, 460]], { ...FIN, opacity: 0.4 });
    A.lig([[29.6, 463.2], [30.4, 473], [32.4, 475]], { ...FIN, opacity: 0.5 });
    A.lig([[36.4, 463.2], [35.8, 473], [33.6, 475]], { ...FIN, opacity: 0.5 });
    A.lig([[31.8, 476], [30.4, 520], [27.2, 566], [24.4, 588]], { ...FIN, opacity: 0.5 });
    // chevilles et pieds
    CHEVILLES.forEach((q) => A.lig(q, { ...FIN, opacity: 0.85 }));
    const pd = G.pied;
    pd.T.forEach((t, kk) => {
        const cx = (pd.bornes[kk] + pd.bornes[kk + 1]) / 2, w = t[0], yt = t[1];
        if (kk > 0) A.lig([[pd.bornes[kk], pd.vy(kk) + 0.4], [pd.bornes[kk] + 0.1, pd.vy(kk) - 5.6]], { ...FIN, opacity: 0.6 });
        [X(cx), AXE + cx].forEach((px) => A.add(<ellipse cx={px} cy={yt - 0.46 * w - 1.2} rx={0.3 * w + 0.5} ry={0.22 * w + 0.8} fill={c.chairClair} fillOpacity="0.7" stroke={c.traitFin} strokeWidth="0.55" strokeOpacity="0.8" />));
    });
    detailsMain(A, c, true);
};

const detailsDos = (A, c) => {
    const FIN = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.95, strokeLinecap: 'round' };
    // volumes
    A.blob(24, 150, 20, 30, 0, 'lum', 0.7);
    A.blob(68, 150, 8, 15, 8, 'lum', 0.8);
    A.blob(64, 205, 6.4, 24, 11, 'lum', 0.8);
    A.blob(80, 284, 6, 24, 13, 'lum', 0.7);
    A.blob(28, 236, 14, 28, 0, 'lum', 0.5);
    A.blob(7.4, 205, 3.4, 36, 0, 'omb', 0.55);
    A.blob(7.4, 258, 3.4, 18, 0, 'omb', 0.55);
    A.blob(36, 326, 27, 27, 0, 'lum', 1);
    A.blobC(336, 2.6, 20, 'omb', 0.8);
    A.blob(30, 361, 26, 5, 0, 'omb', 0.8);
    A.blob(37, 395, 13, 36, -3, 'lum', 0.8);
    A.blob(33.5, 449, 10, 9, 0, 'omb', 0.55);
    A.blob(34, 507, 10, 27, -1, 'lum', 0.75);
    A.blob(40, 238, 4.6, 24, 0, 'omb', 0.7);
    A.blob(52, 172, 4, 10, 0, 'omb', 0.85);
    A.blob(22, 402, 4, 40, 4, 'omb', 0.45);
    A.blobC(106, 13, 6, 'omb', 0.6);
    A.blobC(110, 8, 9, 'lum', 0.5);
    // nuque et trapèzes
    A.add(<path d={`M${AXE} 99 L${AXE} 114`} stroke={c.traitFin} strokeWidth="0.9" opacity="0.5" fill="none" />);
    [109.6].forEach((y) => A.add(<ellipse cx={AXE} cy={y} rx="1.2" ry="1.6" fill={c.chairOmbre} fillOpacity="0.8" stroke={c.traitFin} strokeWidth="0.5" />));
    A.lig([[64, 134.4], [53, 160], [38, 196], [20, 226], [2.6, 238.6]], { ...FIN, opacity: 0.5 });
    // omoplates et épine de l'omoplate
    const scap = cA([[18.2, 134.6], [28, 138], [38, 142], [45.8, 147], [46, 157], [41.4, 171], [32.2, 184], [24.6, 191.4], [20.8, 185.4], [18.2, 168], [17.2, 150]]);
    A.bi(scap, { fill: c.chairClair, fillOpacity: 0.5, stroke: c.traitFin, strokeWidth: 0.6, strokeOpacity: 0.45 }, true);
    A.blob(36, 182, 7, 9, -30, 'omb', 0.45);
    A.blob(28, 152, 9, 9, 0, 'lum', 0.8);
    A.bi(cA([[17.6, 146.4], [32, 142.8], [48, 139], [61, 135], [65.4, 136.4], [63, 139.2], [48, 143.4], [32, 147.2], [18, 150.2]]), { fill: c.chairClair, fillOpacity: 0.55, stroke: c.traitFin, strokeWidth: 0.9 }, true);
    A.lig([[44, 170], [54, 167.6], [62.4, 170]], { ...FIN, opacity: 0.4 });
    A.lig([[51.4, 134.6], [54.6, 148], [60.6, 160], [68.6, 170]], { ...FIN, opacity: 0.4 });
    // rachis : apophyses épineuses
    for (let i = 0; i < 12; i++) {
        const y = 122 + i * 9.7;
        A.add(<ellipse cx={AXE} cy={y} rx={1.1 + i * 0.06} ry={1.6 + i * 0.05} fill={c.chairOmbre} fillOpacity="0.7" />);
        A.add(<path d={`M${AXE - 5.4} ${y + 0.4} L${AXE - 2.2} ${y}  M${AXE + 2.2} ${y} L${AXE + 5.4} ${y + 0.4}`} stroke={c.traitFin} strokeWidth="0.6" opacity="0.22" fill="none" />);
    }
    A.add(<ellipse cx={AXE} cy="113.4" rx="2.6" ry="3.2" fill={c.chairOmbre} fillOpacity="0.95" stroke={c.traitFin} strokeWidth="0.8" />);
    for (let j = 0; j < 5; j++) {
        const y = 237 + j * 8.8;
        A.add(<ellipse cx={AXE} cy={y} rx={1.8 + j * 0.12} ry={2.2 + j * 0.1} fill={c.chairOmbre} fillOpacity="0.7" />);
    }
    // 12e côte, crêtes iliaques, losange de Michaelis, sacrum
    A.lig([[7, 232], [26, 242], [41, 250]], { ...FIN, opacity: 0.35 });
    A.lig([[46.4, 262.4], ...CRETE, [22, 282.4]], { ...FIN, strokeWidth: 1.1, opacity: 0.8 });
    A.lig([[0.6, 274], [11, 278.4], [22, 283.6], [12, 301], [0.6, 320]], { ...FIN, opacity: 0.45 });
    A.blob(22, 283.4, 3.2, 2.6, 0, 'omb', 0.9);      // fossettes de Michaelis
    // fesses, pli fessier, sillon interfessier
    A.lig([[22, 286], [38, 293], [54, 306], [63, 323]], { ...FIN, opacity: 0.3 });
    A.add(<path d={`M${AXE} 302 C${AXE - 1.6} 316 ${AXE + 1.4} 334 ${AXE} 350`} stroke={c.trait} strokeWidth="1.1" opacity="0.75" fill="none" />);     // sillon interfessier, depuis le coccyx
    A.bi(plf(A.G.K4), { ...FIN, strokeWidth: 1.15, opacity: 0.95 });
    // bras : triceps, olécrâne
    A.lig([[57.6, 176], [61, 202], [65.8, 226]], { ...FIN, opacity: 0.4 });
    A.blob(76, 250, 4.6, 6, 0, 'lum', 0.9);      // olécrâne en relief doux
    A.blob(78.6, 253, 4, 6, 0, 'omb', 0.35);
    // cuisses et creux poplité
    A.lig([[45, 382], [43, 410], [42, 432]], { ...FIN, opacity: 0.38 });
    A.lig([[22, 390], [20.6, 420], [23, 436]], { ...FIN, opacity: 0.38 });
    A.form([[33.5, 428], [42.4, 447.6], [33.5, 466], [24.6, 447.6]], { fill: c.chairOmbre, fillOpacity: 0.25, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.55 });
    // mollets : jumeaux, tendon d'Achille, talons
    A.form([[33.8, 466], [24, 486], [19.8, 510], [21.8, 536], [30, 551], [33.8, 548]], { fill: c.chairClair, fillOpacity: 0.28, stroke: c.traitFin, strokeWidth: 0.85, strokeOpacity: 0.7 });
    A.form([[33.8, 466], [43, 484], [47.4, 506], [44.8, 532], [37, 549], [33.8, 548]], { fill: c.chairClair, fillOpacity: 0.2, stroke: c.traitFin, strokeWidth: 0.85, strokeOpacity: 0.7 });
    A.lig([[29.8, 556], [30.2, 576], [29.2, 592], [27, 603.6]], { ...FIN, strokeWidth: 1.2, opacity: 0.85 });
    A.lig([[36.4, 556], [36.2, 576], [36.6, 592], [38.6, 603.6]], { ...FIN, strokeWidth: 1.2, opacity: 0.85 });
    CHEVILLES.forEach((q) => A.lig(q, { ...FIN, opacity: 0.7 }));
    A.blob(40, 596, 3, 4, 0, 'lum', 0.7);
    A.blob(22.6, 591, 2.6, 3.6, 0, 'lum', 0.7);
    A.form([[24.2, 606], [27.8, 602.4], [31.6, 602], [35.4, 602.4], [38.8, 606], [40.2, 613.4], [37.4, 620.2], [31.6, 622], [26, 620.2], [23, 613.4]], { fill: c.chairClair, fillOpacity: 0.3, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.6 });
    A.lig([[43.6, 610], [45, 617], [44.2, 624]], { ...FIN, opacity: 0.4 });
    A.lig([[22, 626.6], [26, 627.8], [31.4, 628.2], [37, 627.8], [42, 626.4]], { ...FIN, opacity: 0.5 });
    [24.4, 29.4, 34.4, 39.4].forEach((a) => A.lig([[a, 627.4], [a + 0.2, 631.2]], { ...FIN, opacity: 0.55 }));
    detailsMain(A, c, false);
};

// ============================================================ Cheveux (carré s'arrêtant au menton, nuque dégagée)
// Nuances de gris-bleu un peu plus soutenues que la chair (le schéma ne suppose aucune couleur de cheveux).
const teintes = (c) => ({ fond: c.sombre ? '#2c3747' : '#a3b1c5', ombre: c.sombre ? '#1d2531' : '#8394ab', clair: c.sombre ? '#43526a' : '#cfd9e6' });
const OUV = [[0, 17.2, 1, 0], [11, 18.2], [22.6, 23.4], [29.8, 33.6]];            // sommet de la tête, commun aux trois tracés
const masseFace = () => fermerSym(cat(cA([...OUV, [31.6, 46], [32.6, 60], [33.6, 76], [34.4, 90], [34, 103], [32, 110.6], [27.6, 114]]), lin([X(14), 114], [AXE, 114])));
const masseDos = () => fermerSym(cA([...OUV, [31.6, 46], [32.8, 62], [32.4, 78], [31.2, 92], [29.4, 101.6], [25.8, 107], [19.6, 106.4], [12, 104.4], [6, 102.8], [0, 102.2, -1, 0]]));
// frange : la raie est décalée (inner gauche plus haut que inner droit), le bord n'est pas une calotte symétrique
const calotte = () => {
    const e = cat(cA([...OUV, [31.4, 45.6], [30.2, 56.4], [27.4, 61]]), cA([[27.4, 61], [26.8, 67], [25.8, 72.6], [24.4, 75.4, -0.3, -1]]));
    const mk = (h) => cA([[24.4, 75.4, -0.3, -1], [23.9, 66], [23.6, 55], [20.4, 44], [14.6, 36.4], [7.4, 31.4], [0, h, -1, 0]]);
    const i = mk(27.4), j = mk(33.4);
    return { forme: cat(e, i, rev(mir(j)), rev(mir(e))), ext: cat(rev(e), mir(e)), int: cat(i, rev(mir(j))) };
};
const meches = (E, T, pts, o = 0.7) => E.lig(pts, { stroke: T.ombre, strokeWidth: 0.9, opacity: o, strokeLinecap: 'round' });
// forme : tracé fermé ; contours : [[tracé, épaisseur, opacité]] ; lum / omb : ellipses [a, y, rx, ry, rotation] ; mechesFn(E, T) : mèches
const cheveux = (vue, c, forme, contours, lum, omb, mechesFn) => {
    const T = teintes(c), E = atelier(vue, c, null);
    mechesFn(E, T);
    const d = dstr(forme), id = defsId(vue, 'cheveux');
    const ell = (q, k, f, o) => <ellipse key={k} cx={X(q[0])} cy={q[1]} rx={q[2]} ry={q[3]} transform={`rotate(${q[4]} ${X(q[0])} ${q[1]})`} fill={f} opacity={o} />;
    return (
        <g>
            <path d={d} fill={T.fond} />
            <clipPath id={id}><path d={d} /></clipPath>
            <g clipPath={`url(#${id})`}>
                <path d={d} fill="none" stroke={T.ombre} strokeWidth="8" opacity="0.4" />
                {omb.map((q, k) => ell(q, 'o' + k, T.ombre, 0.5))}
                {lum.map((q, k) => ell(q, 'l' + k, T.clair, k ? 0.5 : 0.8))}
                {E.els}
            </g>
            {contours.map(([P, w, o], k) => <path key={k} d={dstr(P, false)} fill="none" stroke={c.trait} strokeWidth={w} opacity={o} />)}
        </g>
    );
};

const rendre = (vue) => (c) => {
    const G = construire();
    const A = atelier(vue, c, G);
    const face = vue === 'face';
    const Dsil = dstr(face ? G.silFace : G.silDos);
    const Dtete = dstr(fermerSym(face ? teteFace() : teteDos()));
    if (face) detailsFace(A, c); else detailsDos(A, c);
    const H = atelier(vue, c, G);
    const E = atelier(vue, c, G);
    if (face) oreilles(E, c);
    teteDetails(H, c, face);
    const sil = `#${defsId(vue, 'sil')}`;
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            <defs>
                {defsCommuns(vue, c)}
                <path id={defsId(vue, 'sil')} d={Dsil} />
                <clipPath id={defsId(vue, 'clip')}><use href={sil} /></clipPath>
                <clipPath id={defsId(vue, 'clipt')}><path d={Dtete} /></clipPath>
            </defs>
            {face && cheveux(vue + 'b', c, masseFace(), [[masseFace(), 1.4, 1]], [[35, 84, 2.6, 22, 3]], [[22, 104, 9, 26, 0]],
                (E2, T) => [[[33.4, 70], [34.2, 90], [33.4, 108]], [[30, 56], [31.6, 84], [30.4, 110]], [[34.2, 96], [32.6, 112]]].forEach((m) => meches(E2, T, m, 0.6)))}
            <use href={sil} fill={c.chair} />
            <g clipPath={`url(#${defsId(vue, 'clip')})`}>
                {[[17, 0.12], [9, 0.16], [4.4, 0.22]].map(([w, o]) => <use key={w} href={sil} fill="none" stroke={c.chairOmbre} strokeWidth={w} opacity={o} />)}
                {A.els}
            </g>
            <use href={sil} fill="none" stroke={c.trait} strokeWidth="1.5" />
            {E.els}
            <path d={Dtete} fill={c.chair} />
            <g clipPath={`url(#${defsId(vue, 'clipt')})`}>
                {[[14, 0.12], [7, 0.16], [3.4, 0.2]].map(([w, o]) => <path key={w} d={Dtete} fill="none" stroke={c.chairOmbre} strokeWidth={w} opacity={o} />)}
                <ellipse cx={X(10)} cy="50" rx="9" ry="20" fill={`url(#${defsId(vue, 'lum')})`} opacity="0.8" />
                <ellipse cx={AXE + 10} cy="50" rx="9" ry="20" fill={`url(#${defsId(vue, 'lum')})`} opacity="0.4" />
                {H.els}
            </g>
            <path d={Dtete} fill="none" stroke={c.trait} strokeWidth="1.5" />
            {face ? (() => {
                const K = calotte();
                return cheveux(vue + 'f', c, K.forme, [[K.ext, 1.4, 1], [K.int, 0.9, 0.7]], [[16, 24, 10, 3.4, -16], [27, 48, 2.2, 8, 8]], [[4, 28, 9, 4, 0]],
                    (E2, T) => [[[1.6, 29], [8, 23], [17, 22], [25, 27.6], [29.4, 38]], [[2.4, 30], [10, 26.6], [19, 28], [25.8, 37], [28.6, 48]], [[4, 31], [12.4, 31], [19.4, 37.6], [23, 49], [23.8, 64]]].forEach((m) => meches(E2, T, m, 0.6)));
            })() : cheveux(vue + 'd', c, masseDos(), [[masseDos(), 1.4, 1]], [[17, 34, 9, 3.6, -22], [13, 78, 8, 34, 0]], [[0, 100, 14, 6, 0]],
                (E2, T) => {
                    [[[0.6, 21], [5, 36], [8, 62], [9, 86], [7.6, 103]], [[1.4, 20.6], [9, 34], [14, 60], [16, 86], [15.6, 104]], [[2.6, 20.4], [13, 30], [19.6, 52], [22.4, 80], [22.6, 106]], [[3.4, 20.4], [18, 27], [26, 44], [29, 68], [29.4, 96], [27, 106]]].forEach((m, i) => meches(E2, T, m, 0.42 + i * 0.07));
                })}
        </g>
    );
};

// ============================================================ Zones cliquables
const D = (P) => chemin(dstr(P));
const croise = (P, Q, indice) => {
    let uQ = loc(Q, indice), uP = loc(P, at(Q, uQ));
    for (let i = 0; i < 8; i++) { uQ = loc(Q, at(P, uP)); uP = loc(P, at(Q, uQ)); }
    return [uP, uQ];
};
// deux zones symétriques : formes dessinées côté gauche de l'écran (= côté droit du patient en vue de face, gauche en vue de dos)
const deux = (vue, id, libelles, groupes, constats, formes) => {
    const miroir = miroirFormes(formes, AXE);
    const ecG = zone(vue === 'face' ? libelles[0] : libelles[1], vue === 'face' ? groupes[0] : groupes[1], constats, formes);
    const ecD = zone(vue === 'face' ? libelles[1] : libelles[0], vue === 'face' ? groupes[1] : groupes[0], constats, miroir);
    return vue === 'face' ? { [`${id}_d`]: ecG, [`${id}_g`]: ecD } : { [`${id}_d`]: ecD, [`${id}_g`]: ecG };
};

const NORMAL_MEMBRE = 'Normal';
const CST_MEMBRE = [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Déformation'];
const CST_ABDO = ['Souple, indolore', 'Douleur', 'Défense', 'Contracture', 'Masse'];
const CST_POUMON = ['Murmure vésiculaire normal', 'Murmure vésiculaire diminué', 'Murmure vésiculaire aboli', 'Râles crépitants', 'Sibilants', 'Ronchi', 'Frottement pleural', 'Souffle tubaire', 'Matité à la percussion'];
const MS = ['Membre supérieur droit', 'Membre supérieur gauche'];
const MI = ['Membre inférieur droit', 'Membre inférieur gauche'];
const dosDe = (G) => G.map((g) => g + ' — dos');      // un groupe par vue : les chips de la face et du dos ne se mélangent plus

const YG1 = 428, YG2 = 472;      // genou : bornes de part et d'autre de la rotule (y 438-463)
const EXTC = (ap) => cA([[42, 131.6], [47.6, 141], [50, 158], [49.4, 170], [AXE - ap[0], ap[1]]]);
const tronconJambe = (K4, K6, y1, y2) => {
    const co = (y) => locY(K4, y);
    return cat(tranche(K4, co(y1), co(y2)), lin(at(K6, locY(K6, y2))), tranche(K6, locY(K6, y2), locY(K6, y1)), lin(at(K4, co(y1))));
};
const gaine = (s1, s2, w) => lin(...[bord(s1, w, 1), bord(s2, w, 1), bord(s2, w, -1), bord(s1, w, -1)].map(([a, y]) => [X(a), y]));

// Membres supérieurs : mêmes tracés en face et en dos, libellés propres à chaque vue
const membres = (vue) => {
    const { K1, K3, main, nCap } = construire(true);
    const dos = vue === 'dos';
    const iOut = (s) => nCap + IDX(s);
    const iInt = (s) => ST.length - 1 - IDX(s);
    const apex = fin(K3), T1 = K1.g[4].p;
    const bras = (s1, s2) => cat(tranche(K1, iOut(s1), iOut(s2)), lin(at(K3, iInt(s2))), tranche(K3, iInt(s2), iInt(s1)));
    const nom = (f, p, fem) => { const t = dos ? p : f; return [t + (fem ? ' droite' : ' droit'), t + ' gauche']; };
    const P = (n, libs, constats, formes) => deux(vue, dos ? n + '_post' : n, libs, dos ? dosDe(MS) : MS, constats, formes);
    const epaule = cat(lin(T1), tranche(K1, 5, iOut(30)), lin(apex), ...(dos ? [rev(EXTC(apex))] : []), lin(T1));
    return [
        P('epaule', nom('Épaule', 'Épaule postérieure', true), [NORMAL_MEMBRE, 'Douleur articulaire', 'Limitation de mobilité', 'Tuméfaction', 'Plaie', 'Déformation', 'Œdème'], [D(epaule), aire(ellipse(X(62), 150, 18, 26))]),
        P('bras', nom('Bras', 'Bras postérieur'), [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Atrophie musculaire'], [D(bras(30, 94)), aire(D(gaine(36, 90, 19)))]),
        P('coude', nom('Coude', 'Coude postérieur'), CST_MEMBRE, [D(bras(94, 126)), aire(ellipse(X(77), 252, 21, 22))]),
        P('avantbras', nom('Avant-bras', 'Avant-bras postérieur'), [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Déformation'], [D(bras(126, 188)), aire(D(gaine(130, 184, 18)))]),
        P('main', nom('Main', 'Dos de la main', true), CST_MEMBRE, [D(cat(...main.runs))]),
    ];
};

const zonesFace = () => {
    const G = construire(true);
    const { K1, K3, K4, K6, pied } = G;
    const Z = {};
    const cote = (y) => locY(K4, y);
    const ptK4 = (y) => at(K4, cote(y));
    const apex = fin(K3), T1 = K1.g[4].p;

    // ---- tête
    const Hc = teteFace();
    const nH = Hc.g.length;
    const uJ = loc(Hc, [X(13.6), 97.6]);
    const oreille = cA(OREILLE);
    Z.tete = zone('Tête / ORL', 'Tête et cou', ['Normal', 'Gorge rouge', 'Amygdales hypertrophiées', 'Otite', 'Conjonctives pâles', 'Ictère conjonctival', 'Douleur sinusienne', 'Plaie du cuir chevelu'],
        [D(fermerSym(Hc)), D(oreille), D(mir(oreille)), aire(D(calotte().forme))]);
    const neck = cA([[17.6, 111], [12.6, 118.4], [7, 122.8], [0, 124.4, -1, 0]]);

    // ---- thorax : poumons, sternum, seins, puis cœur par-dessus (organe superposé)
    const CM = cA([[0, 207.4], [10, 213], [22, 221.4], [34, 230.6], [46, 240.6], [52, 245]]);
    const [uCs, uKs] = croise(CM, K4, [X(45.8), 240]);
    const arcHaut = cA([[5.6, 129.4], [12, 126.6], [22, 125.8], [32, 128.2], [41, 132.6], [49, 138]]);
    const AM = cA([[49, 138], [42, 146], [37.5, 158], [38, 168], [42.4, 175.2], [AXE - apex[0], apex[1]]]);
    const u56 = loc(CM, [X(5.6), 210.6]);
    const quadrant = cat(arcHaut, AM, tranche(K4, 0, uKs), tranche(CM, uCs, u56), lin([X(5.6), 129.4]));
    const sommet = cA([[5.6, 137, 0, -1], [8.4, 129.8], [15, 126.2], [24, 126.4], [34, 130], [42, 134.6], [49, 138]]);       // apex arrondi sous la clavicule
    const hautL = cat(sommet, AM, cA([[AXE - apex[0], apex[1]], [46, 192], [45.4, 206], [43, 219], [38.6, 226.6], [30, 218.4], [20, 214.4], [11, 213], [5.6, 214.6]]));
    const poumonD = cat(hautL, lin([X(5.6), 137]));
    const poumonG = cat(hautL, cA([[5.6, 214.6], [8.4, 206], [15, 198.4], [17.6, 188], [14.6, 174], [8.4, 163.4], [5.6, 152], [5.6, 137]]));       // échancrure cardiaque
    Z.poumon_d = zone('Poumon droit', 'Thorax', CST_POUMON, [D(poumonD), aire(D(quadrant))]);
    Z.poumon_g = zone('Poumon gauche', 'Thorax', CST_POUMON, [D(mir(poumonG)), aire(D(mir(quadrant)))]);
    const uN = loc(neck, [X(5.6), 123.4]);
    const demiSt = cat(rev(tranche(neck, uN, neck.g.length)), lin([X(5.6), 129.4]), lin(at(CM, u56)), rev(tranche(CM, 0, u56)));
    Z.sternum = zone('Sternum', 'Thorax', ['Normal', 'Douleur à la palpation', 'Douleur costochondrale', 'Tuméfaction', 'Déformation', 'Plaie'],
        [D(cat(demiSt, rev(mir(demiSt)))), aire(rectangle(X(18), 126, 36, 82))]);
    Object.assign(Z, deux('face', 'sein', ['Sein droit', 'Sein gauche'], ['Thorax', 'Thorax'], ['Normal', 'Nodule', 'Douleur', 'Écoulement mamelonnaire', 'Rétraction du mamelon', 'Asymétrie', "Peau d'orange", 'Adénopathie axillaire'], [D(SEIN)]));
    // cœur : bord sternal, base au 3e espace, pointe au 5e ; l'aire reste à moins de 21 de l'axe (mamelon, à 25,4, intact)
    const coeur = cA([[3, 156, 1, -0.15], [10, 153.4], [15.4, 155.6], [17.6, 162], [17.8, 172], [17, 182], [15.4, 190.4], [11, 194.4], [6.4, 191], [3.6, 183], [3.2, 170], [3, 156, 1, -0.15]]);
    Z.coeur = zone('Cœur', 'Thorax', ['Bruits du cœur normaux', 'Souffle systolique', 'Souffle diastolique', 'Tachycardie', 'Bradycardie', 'Arythmie', 'Bruits du cœur assourdis', 'Frottement péricardique'],
        [D(mir(coeur)), aire(ellipse(AXE + 9.5, 175, 11, 21))]);

    // ---- membres supérieurs
    Object.assign(Z, ...membres('face'));

    // ---- abdomen en 9 régions (régions centrales d'abord, puis latérales avec leur aire d'appui)
    const Y1 = 251, Y2 = 281;
    const uCa = loc(CM, [X(AL), 222.2]);
    const epiL = tranche(CM, uCa, 0);
    const epig = cat(epiL, rev(mir(epiL)), lin([300 - X(AL), Y1]), lin([X(AL), Y1]));
    const ombi = lin([X(AL), Y1], [300 - X(AL), Y1], [300 - X(AL), Y2], [X(AL), Y2]);
    const Bas = cA([[AB, 312.8], [12, 308.2], [0, 306.4, -1, 0]]);
    const bas = cat(Bas, rev(mir(Bas)));
    const hypog = cat(lin([X(AL), Y2], [300 - X(AL), Y2]), lin(at(mir(Bas), 0)), rev(bas), lin([X(AL), Y2]));
    Z.epigastre = zone('Épigastre', 'Abdomen', [...CST_ABDO, 'Pulsations anormales'], [D(epig)]);
    Z.ombilicale = zone('Région ombilicale', 'Abdomen', [...CST_ABDO, 'Hernie ombilicale', 'Masse pulsatile'], [D(ombi), aire(rectangle(X(19), 247, 38, 38))]);
    Z.hypogastre = zone('Hypogastre', 'Abdomen', ['Souple, indolore', 'Douleur', 'Défense', 'Masse', 'Globe vésical', 'Fond utérin palpable'], [D(hypog), aire(ellipse(AXE, 296, 17, 17))]);
    const hypoD = cat(tranche(CM, uCa, uCs), tranche(K4, uKs, cote(Y1)), lin([X(AL), Y1]), lin(at(CM, uCa)));
    const hypoCh = deux('face', 'hypochondre', ['Hypochondre droit', 'Hypochondre gauche'], ['Abdomen', 'Abdomen'], [], [D(hypoD), aire(ellipse(X(31), 236, 19, 20))]);
    hypoCh.hypochondre_d = { ...hypoCh.hypochondre_d, constats: [...CST_ABDO, 'Signe de Murphy', 'Hépatomégalie'] };
    hypoCh.hypochondre_g = { ...hypoCh.hypochondre_g, constats: [...CST_ABDO, 'Splénomégalie', "Douleur à l'inspiration profonde"] };
    const flancs = deux('face', 'flanc', ['Flanc droit', 'Flanc gauche'], ['Abdomen', 'Abdomen'], [...CST_ABDO, 'Météorisme'],
        [D(cat(lin([X(AL), Y1]), tranche(K4, cote(Y1), cote(Y2)), lin([X(AL), Y2]))), aire(ellipse(X(31), 266, 19, 20))]);
    const sF = ptK4(288);
    const Fold = cA([[AXE - sF[0], sF[1]], ...PLI]);
    const fosses = deux('face', 'fosse_iliaque', ['Fosse iliaque droite', 'Fosse iliaque gauche'], ['Abdomen', 'Abdomen'], [],
        [D(cat(lin([X(AL), Y2]), lin(ptK4(Y2)), tranche(K4, cote(Y2), cote(288)), tranche(Fold, 0, 3), lin([X(AL), Y2]))), aire(ellipse(X(38), 298, 22, 17))]);
    fosses.fosse_iliaque_d = { ...fosses.fosse_iliaque_d, constats: [...CST_ABDO, 'Point de McBurney douloureux', 'Signe de Blumberg'] };
    fosses.fosse_iliaque_g = { ...fosses.fosse_iliaque_g, constats: [...CST_ABDO, 'Corde colique sigmoïdienne'] };
    Object.assign(Z, hypoCh, flancs, fosses);

    // ---- membres inférieurs : la cuisse commence sous le pli de l'aine (région inguinale = bande le long du pli)
    const S = cA(SC), uS = loc(S, [X(9.6), 331.4]);
    const Low = courbe([at(S, uS), [X(28), 327.4], [X(48), 318.4], ptK4(310)]);
    const cuisse = cat(tranche(S, uS, S.g.length), tranche(K6, K6.g.length, locY(K6, YG1)), lin(ptK4(YG1)), tranche(K4, cote(YG1), cote(310)), rev(Low));
    const pieds = cat(tranche(K4, cote(578), K4.g.length), pied.P, tranche(K6, 0, locY(K6, 578)), lin(ptK4(578)));
    Object.assign(Z,
        deux('face', 'cuisse', ['Cuisse droite', 'Cuisse gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Limitation de mobilité', 'Atrophie musculaire'], [D(cuisse)]),
        deux('face', 'genou', ['Genou droit', 'Genou gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Choc rotulien'], [D(tronconJambe(K4, K6, YG1, YG2))]),
        deux('face', 'jambe', ['Jambe droite', 'Jambe gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Ulcère', 'Varices'], [D(tronconJambe(K4, K6, YG2, 578))]),
        deux('face', 'pied', ['Cheville et pied droit', 'Cheville et pied gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Ulcération'], [D(pieds), aire(ellipse(X(32), 602, 17, 26))]));

    // ---- petites régions déclarées en dernier, avec une aire d'appui qui prime sur leurs voisines
    const ingu = deux('face', 'inguinale', ['Région inguinale droite', 'Région inguinale gauche'], ['Pelvis', 'Pelvis'], ['Normal', 'Hernie', 'Adénopathie', 'Douleur'],
        [D(cat(tranche(Fold, 0, 3), tranche(S, 0, uS), Low, tranche(K4, cote(310), cote(288)))), aire(D(lin([X(41.6), 290.3], [X(19.6), 304.8], [X(32.8), 324.9], [X(54.8), 310.4])))]);
    const smHaut = [T1[0] + (apex[0] - T1[0]) * ((138 - T1[1]) / (apex[1] - T1[1])), 138];
    const sus = cat(tranche(K1, locY(K1, 111), 5), lin(smHaut), lin([X(49), 138]), rev(arcHaut), lin(at(neck, uN)), rev(tranche(neck, 0, uN)));
    const susCl = deux('face', 'sus_claviculaire', ['Région sus-claviculaire droite', 'Région sus-claviculaire gauche'], ['Thorax', 'Thorax'],
        ['Normale', 'Adénopathie sus-claviculaire', 'Masse', 'Douleur', 'Tuméfaction'], [D(sus), aire(ellipse(X(28), 128, 22, 17))]);
    const demiCou = cat(rev(tranche(Hc, uJ, nH)), tranche(K1, locY(K1, 97.6), locY(K1, 111)), neck);
    const cou = zone('Cou', 'Tête et cou', ['Souple, sans adénopathie', 'Adénopathie cervicale', 'Goitre', 'Raideur de nuque', 'Turgescence jugulaire', 'Douleur à la palpation', 'Masse cervicale'],
        [D(cat(demiCou, rev(mir(demiCou)))), aire(ellipse(AXE, 111, 21, 15))]);
    const axilla = cat(AM, lin(smHaut), lin([X(49), 138]));
    const aiss = deux('face', 'aisselle', ['Aisselle droite', 'Aisselle gauche'], ['Thorax', 'Thorax'],
        ['Normale, sans adénopathie', 'Adénopathie axillaire', 'Masse', 'Douleur', 'Lésion cutanée', 'Abcès'], [D(axilla), aire(ellipse(X(46), 158, 11, 21))]);
    const oge = cat(bas, mir(S), rev(S));
    Object.assign(Z, ingu, susCl, { cou }, aiss, {
        vulve: zone('Vulve', 'Pelvis', ['Normale', 'Prurit', 'Écoulement', 'Lésion ulcérée', 'Condylomes', 'Bartholinite'], [D(oge), aire(ellipse(AXE, 331, 17, 19))]),
    });
    return Z;
};

const zonesDos = () => {
    const G = construire(true);
    const { K1, K3, K4, K6 } = G;
    const cote = (y) => locY(K4, y);
    const ptK4 = (y) => at(K4, cote(y));
    const apexK = fin(K3);
    const Z = {};
    const CST_RACHIS = ['Normal', 'Douleur à la palpation', 'Contracture paravertébrale', 'Limitation de mobilité', 'Déformation'];
    const bande = (a, y1, y2) => lin([X(a), y1], [AXE + a, y1], [AXE + a, y2], [X(a), y2]);
    const Yc = 117.5, Yd = 235.4, Yl = 276, SP = 12;
    Z.tete_dos = zone('Occiput et cuir chevelu', 'Tête et cou — dos', ['Normal', 'Plaie du cuir chevelu', 'Tuméfaction', 'Douleur à la palpation', 'Lésion cutanée'], [D(fermerSym(teteDos()))]);
    Object.assign(Z, ...membres('dos'));
    // omoplates et champs pulmonaires postérieurs
    const topC = cA([[SP, 120], [24, 121.6], [34, 125.8], [42, 131.6]]);
    const ext = cat(topC, EXTC(apexK), tranche(K4, 0, cote(251)), lin([X(SP), Yd]), lin([X(SP), 120]));      // ancienne forme : sert d'aire d'appui
    const k243 = ptK4(243);
    const poum = cat(topC, EXTC(apexK), tranche(K4, 0, cote(243)), cA([[AXE - k243[0], 243], [34, 241.2], [24, 237.2], [SP, 232.4]]), lin([X(SP), 120]));
    const omoplate = cat(cA([[17.2, 134.4], [28, 137.4], [38.4, 141.4], [46.4, 146.6], [46.6, 157], [41.8, 171.4], [32.6, 184.6], [24.8, 192.2], [20.2, 186], [17.6, 168], [16.6, 148], [17.2, 134.4]]));
    Object.assign(Z,
        deux('dos', 'champ_post', ['Champ pulmonaire postérieur droit', 'Champ pulmonaire postérieur gauche'], ['Dos', 'Dos'], CST_POUMON, [D(poum), aire(D(ext))]),
        deux('dos', 'omoplate', ['Omoplate droite', 'Omoplate gauche'], ['Dos', 'Dos'], ['Normale', 'Douleur', 'Omoplate décollée', 'Asymétrie', 'Tuméfaction', 'Plaie'], [D(omoplate), aire(ellipse(X(31.5), 163, 20, 31))]));
    // sacrum, fosses lombaires, fesses
    const PSIS = [22, 283.4];
    const SE = cA([[PSIS[0], PSIS[1]], [19.4, 295], [12.6, 308], [5.6, 318], [0, 322.4, -1, 0.6]]);
    const demiSac = cat(lin([X(0), Yl], [X(14), Yl], [X(PSIS[0]), PSIS[1]]), SE);
    const sB = ptK4(262.4);
    const B = cA([[AXE - sB[0], sB[1]], [40, 265.6], [30, 272.4], [PSIS[0], PSIS[1]]]);
    const fosse = cat(lin([X(SP), Yd], [X(SP), Yl], [X(14), Yl], [X(PSIS[0]), PSIS[1]]), rev(B), tranche(K4, cote(262.4), cote(251)), lin([X(SP), Yd]));
    const GF = plf(K4);
    const fesse = cat(B, SE, lin([X(0), 350]), GF, tranche(K4, cote(347.8), cote(262.4)));
    const cuisse = cat(GF, tranche(K4, cote(347.8), cote(YG1)), lin(at(K6, locY(K6, YG1))), tranche(K6, locY(K6, YG1), K6.g.length));
    const ankle = cat(tranche(K4, cote(566), K4.g.length), construirePiedDos(), tranche(K6, 0, locY(K6, 566)), lin(ptK4(566)));
    // trapèzes : entre la nuque, l'épaule et le champ pulmonaire
    const trap = cat(tranche(K1, locY(K1, 111), 5), lin([X(42), 131.6]), rev(topC), lin([X(SP), Yc], [X(17.6), 111]));
    Object.assign(Z,
        deux('dos', 'trapeze', ['Trapèze droit', 'Trapèze gauche'], ['Dos', 'Dos'], ['Normal', 'Contracture', 'Douleur à la palpation', 'Point douloureux', 'Tuméfaction'], [D(trap), aire(ellipse(X(32), 124, 22, 17))]),
        deux('dos', 'fosse_lombaire', ['Fosse lombaire droite', 'Fosse lombaire gauche'], ['Dos', 'Dos'], ['Indolore', "Douleur à l'ébranlement lombaire", 'Douleur à la palpation', 'Tuméfaction', 'Plaie'], [D(fosse), aire(ellipse(X(28), 256, 18, 23))]),
        deux('dos', 'fesse', ['Fesse droite', 'Fesse gauche'], ['Fesses', 'Fesses'], ['Normale', 'Douleur', 'Abcès', 'Escarre', 'Masse', 'Plaie', 'Induration post-injection'], [D(fesse)]),
        deux('dos', 'cuisse_post', ['Cuisse postérieure droite', 'Cuisse postérieure gauche'], dosDe(MI), [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Limitation de mobilité', 'Atrophie musculaire'], [D(cuisse)]),
        deux('dos', 'poplite', ['Creux poplité droit', 'Creux poplité gauche'], dosDe(MI), ['Normal', 'Tuméfaction', 'Kyste poplité', 'Douleur', 'Masse pulsatile', 'Plaie'], [D(tronconJambe(K4, K6, YG1, YG2))]),
        deux('dos', 'mollet', ['Mollet droit', 'Mollet gauche'], dosDe(MI), ['Normal', 'Œdème', 'Douleur', 'Crampe', 'Signe de Homans positif', 'Varices', 'Plaie', 'Chaleur et rougeur'], [D(tronconJambe(K4, K6, YG2, 566))]),
        deux('dos', 'talon', ['Talon droit', 'Talon gauche'], dosDe(MI), [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Escarre', 'Plaie', 'Tendinite achilléenne', 'Ulcération'], [D(ankle), aire(ellipse(X(31), 602, 17, 26))]));
    // rachis et sacrum en dernier (le cervical après le dorsal, car son aire monte jusqu'à 124) : leur aire d'appui (±19) prime sur les voisines
    const aireR = (y1, y2) => aire(D(bande(19, y1, y2)));
    Z.rachis_dorsal = zone('Rachis dorsal', 'Rachis et sacrum', [...CST_RACHIS.slice(0, 3), 'Cyphose', 'Scoliose', 'Douleur à la percussion'], [D(bande(SP, Yc, Yd)), aireR(Yc, Yd)]);
    Z.rachis_lombaire = zone('Rachis lombaire', 'Rachis et sacrum', [...CST_RACHIS.slice(0, 4), 'Hyperlordose', 'Douleur à la percussion'], [D(bande(SP, Yd, Yl)), aireR(Yd, Yl)]);
    Z.sacree = zone('Région sacrée', 'Rachis et sacrum', ['Normale', 'Douleur à la palpation', 'Escarre', 'Tuméfaction', 'Fossette pilonidale', 'Plaie'], [D(cat(demiSac, rev(mir(demiSac))))]);
    Z.rachis_cervical = zone('Rachis cervical', 'Rachis et sacrum', ['Normal', 'Douleur à la palpation', 'Raideur', 'Contracture paravertébrale', 'Limitation de mobilité', 'Déformation'],
        [D(lin([X(14), 99.5], [AXE + 14, 99.5], [AXE + 17.6, 111], [AXE + 12, Yc], [X(12), Yc], [X(17.6), 111])), aireR(94, 124)]);
    return Z;
};

export default {
    id: ID,
    titre: 'Corps de femme adulte',
    vues: [
        {
            id: 'face', titre: 'Face', viewBox: '0 0 300 640', largeur: 280, reperes: true, decor: rendre('face'),
            etiquettes: [{ x: 26, y: 40, texte: 'D', taille: 15 }, { x: 274, y: 40, texte: 'G', taille: 15 }],
            zones: zonesFace(),
        },
        {
            id: 'dos', titre: 'Dos', viewBox: '0 0 300 640', largeur: 280, reperes: true, decor: rendre('dos'),
            etiquettes: [{ x: 26, y: 40, texte: 'G', taille: 15 }, { x: 274, y: 40, texte: 'D', taille: 15 }],
            zones: zonesDos(),
        },
    ],
};
