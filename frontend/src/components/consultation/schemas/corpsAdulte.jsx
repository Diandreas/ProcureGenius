import React from 'react';
import { zone, chemin, ellipse, aire, miroirFormes } from './outils';

// Corps adulte (face et dos) — version « A » : planche d'atlas d'anatomie.
// Toutes les formes naissent de courbes de Bézier calculées une seule fois (voir « Bibliothèque de tracé ») ;
// les zones cliquables sont découpées dans ces mêmes courbes, donc exactement superposées au dessin.

const ID = 'corps-adulte';
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
// sens (aire signée) d'une suite de points : pour orienter un trou
const aireSignee = (P) => {
    let s = 0; const pts = [P.s, ...P.g.map((g) => g.p)];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; }
    return s;
};

// ============================================================ Géométrie du corps
const TH1 = rad(11), TH2 = rad(13), S0 = [61, 144], SE = 104;
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
const ST = [[12, 19.5, 13], [30, 17.5, 13.5], [60, 15.5, 13.6], [88, 14, 13.3], [94, 14.1, 13.3], [104, 14.4, 13.3],
    [112, 14.9, 13.4], [126, 15, 13.4], [146, 14.2, 12.2], [170, 11.5, 10.2], [188, 9.6, 9.2]];
const IDX = (s) => ST.findIndex((q) => q[0] === s);

// Main (paume vers l'avant, pouce vers l'extérieur). Repère local (u le long de l'axe, v vers le pouce).
const construireMain = () => {
    const W = axe(188), d2 = [Math.sin(TH2), Math.cos(TH2)], n2 = [Math.cos(TH2), -Math.sin(TH2)];
    const P = (u, v) => [AXE - (W[0] + u * d2[0] + v * n2[0]), W[1] + u * d2[1] + v * n2[1]];
    const F = [
        { v: 11.2, u: 34, phi: 7, L: 33, w: 9 },
        { v: 3.4, u: 35, phi: 1, L: 36, w: 9.2 },
        { v: -4.0, u: 34, phi: -5, L: 33, w: 8.6 },
        { v: -10.6, u: 31.5, phi: -12, L: 26, w: 7.4 },
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
        const q = (t, s) => { const h = (f.w / 2) * (1 - 0.1 * t / f.L) * s; return [f.u + d[0] * t + pe[0] * h, f.v + d[1] * t + pe[1] * h]; };
        const t0 = 7, r = f.L - t0;
        return [Vp, q(t0 + r * 0.3, 1), q(t0 + r * 0.66, 1), q(f.L - 0.3 * f.w, 0.86), q(f.L + 0.02 * f.w, 0.42), q(f.L + 0.1 * f.w, 0), q(f.L + 0.02 * f.w, -0.42), q(f.L - 0.3 * f.w, -0.86), q(t0 + r * 0.66, -1), q(t0 + r * 0.3, -1), Vn, ...queue];
    };
    const pouce = [[0, 9.6, 1, 0.1], [8, 12.8], [15, 16.6], [22.1, 20.4], [30.9, 25], [39.9, 29.4], [45, 31.4], [49.4, 29.6], [48.6, 24.8], [42.3, 20], [37.5, 17], V[0]];
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
    const T = [[6.2, 624], [6.8, 628], [7.4, 631], [8, 633], [11.8, 634.4]];   // largeur, ordonnée du bout (de l'orteil externe au gros orteil)
    let b = 50.4; const bornes = [b];
    T.forEach((t) => { b -= t[0]; bornes.push(b); });
    const vy = (k) => (k === 0 ? 618 : k === T.length ? 626 : Math.min(T[k - 1][1], T[k][1]) - 3.2);
    const pts = [[bornes[0], vy(0)]];
    T.forEach((t, k) => {
        const cx = (bornes[k] + bornes[k + 1]) / 2, w = t[0], yt = t[1];
        pts.push([cx + 0.47 * w, yt - 0.5 * w], [cx + 0.2 * w, yt - 0.06 * w], [cx - 0.2 * w, yt - 0.06 * w], [cx - 0.47 * w, yt - 0.5 * w]);
        if (k < T.length - 1) pts.push([bornes[k + 1], vy(k + 1)]);
    });
    pts.pop(); pts.push([bornes[5] + 0.1, 628]);
    const ext = cA([[41.8, 597], [44.8, 606.5], [48.6, 613.4], [50.4, 618]]);
    const orteils = cA(pts);
    const int = cA([[bornes[5] + 0.1, 628], [13.6, 618], [14.6, 607], [16.8, 599], [19.5, 594]]);
    return { P: cat(ext, orteils, int), bornes, T, vy };
};
const construirePiedDos = () => cA([[41.8, 597], [42.7, 608], [41.8, 617], [37.6, 622.4], [30.6, 624.4], [23.4, 622.4], [19.6, 617], [18.8, 608], [19.5, 594]]);

// Corps complet pour un sexe donné (null = neutre). « zonage » : variante légèrement rentrée pour découper les zones.
const memo = {};
const construire = (sexe, zonage = false) => {
    const cle = `${sexe}|${zonage}`;
    if (memo[cle]) return memo[cle];
    const dl = (m, f) => (sexe === 'M' ? m : sexe === 'F' ? f : 0);
    const dc = (m, f) => (zonage ? f : dl(m, f));        // épaules : le découpage des zones suit la silhouette la plus étroite
    const cap = [[16.2, 88], [16.8, 102], [20.5, 111], [30, 118], [44, 123.4 + dc(-0.5, 1)], [58, 127.2 + dc(-0.8, 1.2)], [69.5 + dc(1, -2.5), 130.4 + dc(-0.3, 1)], [77.6 + dc(0.5, -1.5), 135.6 + dc(-0.3, 1)]];
    const ext = ST.map(([s, wo]) => bord(s, wo, 1));
    const K1 = cA([...cap, ...ext]);
    const nCap = cap.length;
    const int = ST.map(([s, , wi]) => bord(s, wi, -1)).slice(1).reverse();      // du poignet jusqu'à l'aisselle (s = 30)
    const K3 = cA(int);
    const main = construireMain();
    const ins = -2.4;
    const tr = [[195, 52.4, 0.8, -1.5], [218, 51.2, 1.2, -2.5], [243, 47.6, 1.5, -3.0], [264, 50, 0.5, -1.0], [288, 56.5, -1, 2], [312, 60.5, -1.5, 3], [338, 60.4, -1.5, 3], [370, 59.6, -1, 2.5], [400, 57.8, -0.5, 1.5], [425, 54.6, 0, 0.5]]
        .map(([y, a, m, f]) => [a + (zonage ? (y < 290 ? ins : m) : dl(m, f)), y]);
    const apex = bord(30, 13.5, -1);
    const K4 = cA([apex, ...tr, [51.4, 440], [50, 449], [50, 462], [51, 482], [50.6, 502], [48.4, 530], [44.2, 560], [41.6, 588], [41.8, 597]]);
    const face = construirePiedFace();
    const K6 = cA([[19.5, 594], [20.8, 575], [22, 555], [19.5, 530], [15.5, 508], [15, 485], [15.5, 462], [15.3, 449], [14.6, 436], [13.6, 425], [10.3, 400], [6.2, 375], [2.6, 357], [0, 350, -0.3, -1]]);
    const gauche = (pied) => cat(K1, ...main.runs, K3, K4, pied, K6);
    const demiFace = gauche(face.P), demiDos = gauche(construirePiedDos());
    const complet = (demi) => { const m = rev(mir(demi)); return cat(demi, m); };
    const G = { K1, K3, K4, K6, nCap, main, pied: face, silFace: complet(demiFace), silDos: complet(demiDos) };
    memo[cle] = G;
    return G;
};

// ============================================================ Tête
const teteFace = () => cat(cA([[0, 20.5, 1, 0], [11.5, 22], [21.5, 27.5], [26.6, 37.5], [28.0, 50], [27.6, 62], [26.0, 73], [22.8, 82.5], [18.6, 91.5], [12.8, 97.8], [6.6, 100.7], [0, 101.4, -1, 0]]));
const teteDos = () => cat(cA([[0, 20.5, 1, 0], [11.5, 22], [21.5, 27.5], [26.6, 37.5], [28.0, 50], [27.6, 62], [26.0, 73], [23.4, 83], [20.2, 91.5], [14, 95.8], [6, 97.6], [0, 98.1, -1, 0]]));
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

const oreilles = (E, c) => {
    E.form([[27.2, 60.2], [30.4, 58.8], [33.2, 62.4], [33.9, 69.6], [32.6, 76.6], [30, 81.6], [27.4, 80.2]], { fill: c.chair, stroke: c.trait, strokeWidth: 1.3 });
    E.lig([[29.6, 63.4], [31.8, 67], [31.2, 73.6], [28.8, 78.2]], { fill: 'none', stroke: c.traitFin, strokeWidth: 0.8, opacity: 0.8 });
};
const teteDetails = (H, c, face) => {
    const fin = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.85, strokeLinecap: 'round' };
    H.blobC(98, 20, 6, 'omb', 0.5);
    if (face) {
        H.blob(24, 74, 5, 16, 6, 'omb', 0.5);             // joues et mâchoire dans l'ombre
        H.blob(11, 62, 7, 7, 0, 'lum', 0.7);              // pommettes
        H.blob(9.5, 55.6, 8.5, 3.4, -4, 'omb', 0.8);     // arcades sourcilières
        H.blob(10, 60.4, 5.6, 3.8, 0, 'omb', 0.7);        // orbites (sans yeux)
        H.blobC(70, 3.4, 10, 'lum', 0.55);                // arête du nez
        H.lig([[6.4, 58.2], [4.2, 66], [3.6, 73]], { ...fin, opacity: 0.4 });
        H.add(<path d={`M${X(5.8)} 77.6 Q${X(3.6)} 80 ${AXE} 79.4 Q${X(-3.6)} 80 ${X(-5.8)} 77.6`} {...fin} opacity="0.65" />);     // base du nez
        H.add(<path d={`M${X(8.6)} 86.6 Q${X(4)} 88.6 ${AXE} 88 Q${X(-4)} 88.6 ${X(-8.6)} 86.6`} {...fin} opacity="0.7" />);        // fente buccale
        H.add(<path d={`M${X(5.2)} 91.6 Q${AXE} 93.4 ${X(-5.2)} 91.6`} {...fin} opacity="0.35" />);                                  // pli sous la lèvre
        H.blobC(88, 8, 2.6, 'omb', 0.35);
    } else {
        H.blobC(40, 18, 14, 'lum', 0.5);
        H.add(<path d={`M${X(5)} 92.4 Q${AXE} 95 ${X(-5)} 92.4`} {...fin} opacity="0.5" />);
    }
};

// Éléments communs aux deux vues, puis détails propres à chaque vue
const detailsFace = (A, c, sexe) => {
    const G = A.G, F = sexe === 'F';
    const FIN = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.95, strokeLinecap: 'round' };
    const FIN2 = { ...FIN, opacity: 0.6 };
    // côtes suggérées (sous les pectoraux)
    [186, 195.4, 204.6].forEach((y0) => A.lig([[9.6, y0], [24, y0 + 3.8], [38, y0 + 10], [49.6, y0 + 20.4]], { ...FIN, opacity: 0.4 }));
    // masque des pectoraux / seins : cache les côtes en haut
    const PB = F ? [[58, 154], [54, 172], [45, 190], [29, 199], [14, 196], [7, 190]] : [[58, 152], [54, 166], [45, 178], [31, 186.5], [17, 189.6], [7.5, 189]];
    A.bi(cat(lin([X(0), 128], [X(59), 128], [X(59), 150]), cA(PB), lin([X(0), PB[PB.length - 1][1]])), { fill: c.chair, stroke: 'none' }, true);
    // volumes
    A.blobC(262, 30, 46, 'lum', 0.55);
    A.blob(27, 163, 22, 16, 0, 'lum', 0.95);
    A.blob(27, 192, 21, 5.5, 0, 'omb', 0.75);
    A.blob(72, 152, 9, 17, 8, 'lum', 0.85);
    A.blob(70, 205, 7.2, 24, 11, 'lum', 0.8);
    A.blob(88, 284, 6.5, 24, 13, 'lum', 0.7);
    A.blob(38, 380, 12, 38, -3, 'lum', 0.85);
    A.blob(33, 449, 11, 10.5, 0, 'lum', 0.8);
    A.blob(34, 525, 8, 30, -2, 'lum', 0.55);
    A.blob(50, 232, 5, 26, 0, 'omb', 0.7);
    A.blob(54, 172, 5, 11, 0, 'omb', 0.85);
    A.blob(24, 314, 20, 6, 24, 'omb', 0.7);
    A.blob(22, 402, 4, 40, 4, 'omb', 0.5);
    A.blobC(106, 15, 6, 'omb', 0.75);
    A.blobC(112, 9, 9, 'lum', 0.6);
    // cou : sterno-cléido-mastoïdiens, larynx, fourchette sternale
    A.lig([[15.4, 96], [13.4, 106], [10.4, 116], [7.6, 124.4]], FIN);
    A.lig([[9.4, 99], [7.4, 108], [5, 117], [3, 124.8]], FIN2);
    A.add(<path d={`M${X(-3.6)} 103.2 Q${X(0)} 108 ${X(3.6)} 103.2`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" />);
    A.add(<path d={`M${X(-4.5)} 125 Q${X(0)} 129.4 ${X(4.5)} 125`} fill={c.chairOmbre} fillOpacity="0.55" stroke={c.traitFin} strokeWidth="0.9" />);
    // clavicules
    A.bi(cA([[7.4, 124.2], [15, 121.4], [26, 122.6], [40, 127.4], [56, 133.4], [69, 137.6], [72.4, 139], [69, 140.6], [56, 136], [40, 130.4], [26, 125.8], [15, 124.4], [7.4, 127], [5.8, 125.6], [7.4, 124.2]]),
        { fill: c.os, fillOpacity: c.sombre ? 0.3 : 0.55, stroke: c.traitFin, strokeWidth: 0.9 }, true);
    // sternum
    A.bi(cA([[0, 125.8], [9.4, 127.4], [10.6, 137], [8.6, 147.5], [7.6, 152], [8, 172], [6.6, 194], [3.6, 200], [0, 207.6]]), { fill: c.os, fillOpacity: c.sombre ? 0.22 : 0.32, stroke: c.traitFin, strokeWidth: 0.9 }, true);
    A.add(<path d={`M${X(8.6)} 147.6 Q${X(0)} 150 ${X(-8.6)} 147.6`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity="0.8" />);
    A.add(<path d={`M${X(7.6)} 170 Q${X(0)} 171.4 ${X(-7.6)} 170`} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.5" />);
    // rebord costal
    A.lig([[0.4, 207.4], [10, 213], [22, 221.4], [34, 230.6], [46, 240.6], [52, 245]], { ...FIN, strokeWidth: 1.15, opacity: 0.9 });
    // bord inférieur des pectoraux / seins
    if (F) {
        A.lig(PB, { ...FIN, strokeWidth: 1.1, opacity: 0.9 });
        A.blob(30, 181, 17, 15, 0, 'lum', 0.7);
        A.blob(29, 196, 20, 4, 0, 'omb', 0.7);
        A.lig([[54, 170], [47, 178], [38, 183]], { ...FIN, opacity: 0.4 });
    } else {
        A.lig(PB, { ...FIN, strokeWidth: sexe === 'M' ? 1.2 : 1.05, opacity: sexe === 'M' ? 0.95 : 0.8 });
    }
    // mamelons
    [1, -1].forEach((sg) => {
        const cx = sg > 0 ? X(32) : AXE + 32;
        A.add(<circle cx={cx} cy={181.4} r="5.2" fill={c.chairOmbre} fillOpacity="0.35" stroke={c.traitFin} strokeWidth="0.6" strokeOpacity="0.7" />);
        A.add(<circle cx={cx} cy={181.4} r="2.1" fill={c.traitFin} fillOpacity="0.8" />);
    });
    // abdomen
    A.add(<path d={`M${AXE} 207.6 L${AXE} 304`} stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" fill="none" />);
    A.lig([[17.5, 213], [21.5, 236], [22.4, 262], [19.8, 286], [12.4, 306.4]], { ...FIN, opacity: F ? 0.35 : 0.65 });
    [[228.6, 20.6], [247, 22.4], [280.6, 19.6]].forEach(([y, a]) => A.lig([[1.6, y - 0.4], [10, y + 1.2], [a - 1.4, y - 0.2]], { ...FIN, opacity: F ? 0.22 : 0.5 }));
    A.add(<ellipse cx={AXE} cy="263.4" rx="2.9" ry="4.7" fill={c.chairOmbre} fillOpacity="0.85" stroke={c.traitFin} strokeWidth="0.95" />);
    A.add(<path d={`M${X(-1.7)} 261.4 Q${X(0)} 258.6 ${X(1.7)} 261.4`} fill="none" stroke={c.chairClair} strokeWidth="0.9" opacity="0.9" />);
    // crête iliaque, épine iliaque antéro-supérieure, plis inguinaux
    A.lig([[48, 268.6], [53.6, 278.4], [56.2, 288.6]], { ...FIN, opacity: 0.55 });
    A.lig([[55.8, 289], [46, 297], [34, 306], [22.4, 313.4], [11, 321.6]], { ...FIN, strokeWidth: 1.15, opacity: 0.95 });
    A.lig([[22.4, 313.4], [12, 308], [0, 306.6]], { ...FIN, opacity: 0.35 });
    A.lig([[11, 321.6], [6.4, 332], [3, 343], [0.4, 350]], { ...FIN, opacity: 0.5 });
    // bras
    A.lig([[57.4, 132.6], [60.6, 146], [66.6, 158], [75, 169.4]], { ...FIN, opacity: 0.6 });
    [104, 112].forEach((s, i) => {
        const o = bord(s, 11.8 - i, 1), m = axe(s), inn = bord(s, 11.4 - i, -1);
        A.add(<path d={`M${X(o[0])} ${r1(o[1])} Q${X(m[0])} ${r1(m[1] + 4 - i * 0.8)} ${X(inn[0])} ${r1(inn[1])}`} fill="none" stroke={c.traitFin} strokeWidth="0.95" opacity={0.85 - i * 0.25} />);
    });
    A.lig([bord(116, 8.4, 1), bord(140, 8.2, 1), bord(168, 6.2, 1)], { ...FIN, opacity: 0.45 });
    A.lig([bord(116, 4, -1), bord(146, 4.4, -1), bord(172, 3.4, -1)], { ...FIN, opacity: 0.4 });
    [184.6, 180].forEach((s, i) => { const o = bord(s, 8.2, 1), inn = bord(s, 8, -1), m = axe(s); A.add(<path d={`M${X(o[0])} ${r1(o[1])} Q${X(m[0])} ${r1(m[1] + 2.4)} ${X(inn[0])} ${r1(inn[1])}`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity={0.7 - i * 0.2} />); });
    // cuisses, genoux, jambes
    A.lig([[54, 296], [45, 330], [33.4, 372], [23.6, 406], [17.6, 436]], { ...FIN, opacity: 0.4 });
    A.lig([[37, 332], [35, 378], [33.6, 420]], { ...FIN, opacity: 0.3 });
    A.lig([[53, 344], [49.6, 390], [46, 426]], { ...FIN, opacity: 0.38 });
    A.lig([[8.6, 340], [10, 372], [11.6, 400]], { ...FIN, opacity: 0.35 });
    A.form([[18.4, 408], [14.8, 424], [17, 438.4], [26.4, 442.6], [27.6, 424]], { fill: c.chairClair, fillOpacity: 0.25, stroke: c.traitFin, strokeWidth: 0.7, strokeOpacity: 0.55 });
    A.form([[33, 438.2], [38.8, 440], [42, 447.2], [40.8, 457.4], [33, 462], [25.4, 457.4], [24.2, 447.2], [27.4, 440]], { fill: c.chairClair, fillOpacity: 0.4, stroke: c.traitFin, strokeWidth: 0.95 });
    A.lig([[42.6, 440.6], [47.6, 449], [45.6, 460]], { ...FIN, opacity: 0.4 });
    A.lig([[23.2, 441], [18.6, 450], [20.6, 460]], { ...FIN, opacity: 0.4 });
    A.lig([[29.6, 463.2], [30.4, 473], [32.4, 475]], { ...FIN, opacity: 0.5 });
    A.lig([[36.4, 463.2], [35.8, 473], [33.6, 475]], { ...FIN, opacity: 0.5 });
    A.lig([[31.8, 476], [30.4, 520], [27.2, 566], [24.4, 588]], { ...FIN, opacity: 0.5 });
    A.lig([[39, 480], [37.4, 522], [34, 566]], { ...FIN, opacity: 0.32 });
    // chevilles et pieds
    A.lig([[24, 585.6], [20.8, 590.4], [20.8, 596.4], [24.6, 599]], { ...FIN, opacity: 0.85 });
    A.lig([[38.4, 588.6], [41.2, 593.4], [40.4, 598.6], [36.6, 601]], { ...FIN, opacity: 0.85 });
    A.lig([[30, 600], [29.4, 610], [28.4, 620]], { ...FIN, opacity: 0.35 });
    A.lig([[34.4, 600], [34.8, 610], [35, 620]], { ...FIN, opacity: 0.35 });
    const pd = G.pied;
    pd.T.forEach((t, kk) => {
        const cx = (pd.bornes[kk] + pd.bornes[kk + 1]) / 2, w = t[0], yt = t[1];
        if (kk > 0) A.lig([[pd.bornes[kk], pd.vy(kk) + 0.4], [pd.bornes[kk] + 0.1, pd.vy(kk) - 5.6]], { ...FIN, opacity: 0.6 });
        [X(cx), AXE + cx].forEach((px) => A.add(<ellipse cx={px} cy={yt - 0.46 * w - 1.2} rx={0.27 * w + 0.4} ry={0.2 * w + 0.7} fill={c.chairClair} fillOpacity="0.7" stroke={c.traitFin} strokeWidth="0.55" strokeOpacity="0.8" />));
    });
    detailsMain(A, c, true);
};

const detailsDos = (A, c, sexe) => {
    const F = sexe === 'F';
    const FIN = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.95, strokeLinecap: 'round' };
    // volumes
    A.blob(24, 150, 22, 30, 0, 'lum', 0.7);
    A.blob(72, 152, 9, 17, 8, 'lum', 0.8);
    A.blob(71, 205, 7.4, 24, 11, 'lum', 0.8);
    A.blob(88, 284, 6.5, 24, 13, 'lum', 0.7);
    A.blob(30, 236, 18, 28, 0, 'lum', 0.5);
    A.blob(7.4, 205, 3.4, 36, 0, 'omb', 0.55);
    A.blob(7.4, 258, 3.4, 18, 0, 'omb', 0.55);
    A.blob(32, 322, 25, 25, 0, 'lum', F ? 1 : 0.85);
    A.blobC(336, 2.6, 20, 'omb', 0.8);
    A.blob(30, 361, 26, 5, 0, 'omb', 0.8);
    A.blob(37, 395, 13, 36, -3, 'lum', 0.8);
    A.blob(33.5, 449, 10, 9, 0, 'omb', 0.55);
    A.blob(34, 507, 10, 27, -1, 'lum', 0.75);
    A.blob(50, 232, 5, 26, 0, 'omb', 0.7);
    A.blob(54, 172, 5, 11, 0, 'omb', 0.85);
    A.blob(22, 402, 4, 40, 4, 'omb', 0.45);
    A.blobC(106, 15, 6, 'omb', 0.6);
    A.blobC(110, 9, 9, 'lum', 0.5);
    // nuque et trapèzes
    A.add(<path d={`M${AXE} 95 L${AXE} 114`} stroke={c.traitFin} strokeWidth="0.9" opacity="0.6" fill="none" />);
    A.lig([[70, 133.4], [58, 160], [40, 196], [20, 226], [2.6, 238.6]], { ...FIN, opacity: 0.5 });
    // omoplates et épine de l'omoplate
    const scap = cA([[19.6, 134.6], [30, 138], [41, 142], [49.4, 147], [49.6, 157], [44.4, 171], [34.4, 184], [26, 191.4], [22, 185.4], [19.4, 168], [18.4, 150]]);
    A.bi(scap, { fill: c.os, fillOpacity: 0.28, stroke: c.traitFin, strokeWidth: 0.95, strokeOpacity: 0.95 }, true);
    A.bi(cA([[18.2, 146.4], [34, 142.6], [52, 138.4], [68, 133.8], [70.4, 135.4], [68, 138.2], [52, 143], [34, 147.2], [18.6, 150.2]]), { fill: c.chairClair, fillOpacity: 0.55, stroke: c.traitFin, strokeWidth: 0.9 }, true);
    A.lig([[47, 170], [58, 167.6], [68.4, 170]], { ...FIN, opacity: 0.4 });
    A.lig([[57.2, 133.6], [60.2, 148], [66.6, 160], [75, 170]], { ...FIN, opacity: 0.4 });
    // rachis : apophyses épineuses
    for (let i = 0; i < 12; i++) {
        const y = 122 + i * 9.7;
        A.add(<ellipse cx={AXE} cy={y} rx="1.6" ry="2.1" fill={c.chairOmbre} fillOpacity="0.9" stroke={c.traitFin} strokeWidth="0.55" />);
        A.add(<path d={`M${AXE - 5.4} ${y + 0.4} L${AXE - 2.2} ${y}  M${AXE + 2.2} ${y} L${AXE + 5.4} ${y + 0.4}`} stroke={c.traitFin} strokeWidth="0.6" opacity="0.28" fill="none" />);
    }
    A.add(<ellipse cx={AXE} cy="113.4" rx="2.6" ry="3.2" fill={c.chairOmbre} fillOpacity="0.95" stroke={c.traitFin} strokeWidth="0.8" />);
    for (let j = 0; j < 5; j++) {
        const y = 237 + j * 8.8;
        A.add(<ellipse cx={AXE} cy={y} rx="1.9" ry="2.3" fill={c.chairOmbre} fillOpacity="0.9" stroke={c.traitFin} strokeWidth="0.55" />);
    }
    // 12e côte, crêtes iliaques, losange de Michaelis, sacrum
    A.lig([[7, 232], [28, 244], [48, 253]], { ...FIN, opacity: 0.35 });
    A.lig([[50.6, 262.4], [40, 265.6], [30, 272.4], [22, 282.4]], { ...FIN, strokeWidth: 1.1, opacity: 0.8 });
    A.lig([[0.6, 274], [11, 278.4], [22, 283.6], [12, 301], [0.6, 320]], { ...FIN, opacity: 0.45 });
    A.add(<circle cx={X(22)} cy="283.4" r="1.9" fill={c.chairOmbre} fillOpacity="0.8" stroke={c.traitFin} strokeWidth="0.6" />);
    A.add(<circle cx={AXE + 22} cy="283.4" r="1.9" fill={c.chairOmbre} fillOpacity="0.8" stroke={c.traitFin} strokeWidth="0.6" />);
    // fesses, pli fessier, sillon interfessier
    A.lig([[22, 286], [36, 293], [50, 305], [58.6, 322]], { ...FIN, opacity: 0.3 });
    A.add(<path d={`M${AXE} 318 L${AXE} 350`} stroke={c.trait} strokeWidth="1.1" opacity="0.85" fill="none" />);
    A.lig([[0.4, 350], [10, 355.6], [24, 360.4], [40, 358.8], [52, 353], [60, 347.6]], { ...FIN, strokeWidth: 1.15, opacity: 0.95 });
    // bras : triceps, olécrâne
    A.lig([[63.4, 176], [66.8, 202], [71.4, 226]], { ...FIN, opacity: 0.4 });
    A.lig([[83.6, 180], [86, 206], [89, 228]], { ...FIN, opacity: 0.3 });
    A.form([[84.4, 246.4], [80.2, 243.6], [75.6, 246.6], [76.4, 254.6], [80.8, 257], [84.6, 253]], { fill: c.chairClair, fillOpacity: 0.3, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.7 });
    A.lig([bord(116, 6, 1), bord(144, 6.2, 1), bord(170, 4.6, 1)], { ...FIN, opacity: 0.35 });
    // cuisses et creux poplité
    A.lig([[34, 372], [35, 420], [33.6, 436]], { ...FIN, opacity: 0.3 });
    A.lig([[45, 382], [43, 410], [42, 432]], { ...FIN, opacity: 0.38 });
    A.lig([[22, 390], [20.6, 420], [23, 436]], { ...FIN, opacity: 0.38 });
    A.form([[33.5, 428], [42.4, 447.6], [33.5, 466], [24.6, 447.6]], { fill: c.chairOmbre, fillOpacity: 0.25, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.55 });
    // mollets : jumeaux, tendon d'Achille, talons
    A.form([[33.8, 466], [24, 486], [19.8, 510], [21.8, 536], [30, 551], [33.8, 548]], { fill: c.chairClair, fillOpacity: 0.28, stroke: c.traitFin, strokeWidth: 0.85, strokeOpacity: 0.7 });
    A.form([[33.8, 466], [43, 484], [47.4, 506], [44.8, 532], [37, 549], [33.8, 548]], { fill: c.chairClair, fillOpacity: 0.2, stroke: c.traitFin, strokeWidth: 0.85, strokeOpacity: 0.7 });
    A.lig([[29.8, 556], [30.2, 576], [29.6, 592]], { ...FIN, opacity: 0.55 });
    A.lig([[36.4, 556], [36.2, 576], [35.8, 592]], { ...FIN, opacity: 0.55 });
    A.form([[21.4, 606], [26, 603.4], [30.4, 603], [34.8, 603.4], [39.4, 606], [41, 614], [36.4, 621.2], [30.6, 622.6], [24.8, 621.2], [20.2, 614]], { fill: c.chairClair, fillOpacity: 0.28, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.55 });
    detailsMain(A, c, false);
};

const rendre = (vue) => (c, opts = {}) => {
    const sexe = opts.sexe === 'F' || opts.sexe === 'M' ? opts.sexe : null;
    const G = construire(sexe);
    const A = atelier(vue, c, G);
    const face = vue === 'face';
    const Dsil = dstr(face ? G.silFace : G.silDos);
    const Dtete = dstr(fermerSym(face ? teteFace() : teteDos()));
    if (face) detailsFace(A, c, sexe); else detailsDos(A, c, sexe);
    const H = atelier(vue + 't', c, G);
    const E = atelier(vue + 'o', c, G);
    oreilles(E, c);
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
const CST_POUMON = ['Murmure vésiculaire normal', 'Murmure vésiculaire diminué', 'Murmure vésiculaire aboli', 'Râles crépitants', 'Sibilants', 'Ronchi', 'Frottement pleural', 'Matité à la percussion'];
const MS = ['Membre supérieur droit', 'Membre supérieur gauche'];
const MI = ['Membre inférieur droit', 'Membre inférieur gauche'];

const zonesFace = () => {
    const G = construire(null, true);
    const { K1, K3, K4, K6, nCap, main, pied } = G;
    const Z = {};
    const iOut = (s) => nCap + ST.findIndex((q) => q[0] === s);
    const sInt = ST.slice(1).map((q) => q[0]).reverse();
    const iInt = (s) => sInt.indexOf(s);
    const cote = (y) => locY(K4, y);
    const ptK4 = (y) => at(K4, cote(y));
    const apex = fin(K3);

    // ---- tête et cou
    const Hc = teteFace();
    const nH = Hc.g.length;
    const uJ = loc(Hc, [X(16.4), 94.2]);
    const oreille = cat(cA([[27.2, 60.2], [30.4, 58.8], [33.2, 62.4], [33.9, 69.6], [32.6, 76.6], [30, 81.6], [27.4, 80.2]]));
    Z.tete = zone('Tête / ORL', 'Tête et cou', ['Normal', 'Gorge rouge', 'Amygdales hypertrophiées', 'Otite', 'Conjonctives pâles', 'Ictère conjonctival', 'Douleur sinusienne', 'Plaie du cuir chevelu'],
        [D(fermerSym(Hc)), D(oreille), D(mir(oreille))]);
    const demiCou = cat(rev(tranche(Hc, uJ, nH)), tranche(K1, locY(K1, 94.2), locY(K1, 111)), cA([[20.5, 111], [14, 118.4], [7, 122.8], [0, 124.4, -1, 0]]));
    Z.cou = zone('Cou', 'Tête et cou', ['Souple, sans adénopathie', 'Adénopathie cervicale', 'Goitre', 'Raideur de nuque', 'Turgescence jugulaire', 'Douleur à la palpation', 'Masse cervicale'],
        [D(cat(demiCou, rev(mir(demiCou))))]);

    // ---- thorax
    const CM = cA([[0, 207.4], [10, 213], [22, 221.4], [34, 230.6], [46, 240.6], [52, 245]]);
    const [uCs, uKs] = croise(CM, K4, [X(45.8), 240]);
    const arcHaut = cA([[5.6, 129.4], [12, 126.6], [22, 125.8], [32, 128.2], [41, 132.6], [49, 138]]);
    const AM = cA([[49, 138], [42, 146], [37.5, 158], [38, 168], [44, 175.6], [52.9, 175.9]]);
    AM.g[AM.g.length - 1].p = apex;
    const cote1 = tranche(K4, 0, uKs);
    const u56 = loc(CM, [X(5.6), 210.6]);
    const poumonD = cat(arcHaut, AM, cote1, tranche(CM, uCs, u56), lin([X(5.6), 129.4]));
    Z.poumon_d = zone('Poumon droit', 'Thorax', CST_POUMON, [D(poumonD)]);
    // cœur
    const Q = at(CM, loc(CM, [X(25), 223.4]));
    const uQ = loc(CM, Q);
    const HC = courbe([...[[5.6, 150.4], [12, 148.8], [22, 151.8], [31, 160], [36.2, 173], [38.4, 190], [36.8, 203], [31.8, 214]].map(([a, y]) => [X(a), y]), Q]);
    const coeur = cat(HC, tranche(CM, uQ, u56), lin([X(5.6), 150.4]));
    Z.coeur = zone('Cœur', 'Thorax', ['Bruits du cœur normaux', 'Souffle systolique', 'Souffle diastolique', 'Tachycardie', 'Bradycardie', 'Arythmie', 'Bruits du cœur assourdis', 'Frottement péricardique'], [D(mir(coeur))]);
    Z.poumon_g = zone('Poumon gauche', 'Thorax', CST_POUMON,
        [D(mir(cat(arcHaut, AM, cote1, tranche(CM, uCs, uQ), rev(HC), lin([X(5.6), 129.4]))))]);
    // aisselles
    const T1 = K1.g[4].p;       // point K1 d'indice 5 (a = 58)
    const smHaut = [T1[0] + (apex[0] - T1[0]) * ((138 - T1[1]) / (apex[1] - T1[1])), 138];
    const axilla = cat(AM, lin(smHaut), lin([X(49), 138]));
    const aiss = deux('face', 'aisselle', ['Aisselle droite', 'Aisselle gauche'], ['Thorax', 'Thorax'],
        ['Normale, sans adénopathie', 'Adénopathie axillaire', 'Masse', 'Douleur', 'Lésion cutanée', 'Abcès'], [D(axilla)]);

    // ---- membres supérieurs
    const bras = (s1, s2) => cat(tranche(K1, iOut(s1), iOut(s2)), lin(at(K3, iInt(s2))), tranche(K3, iInt(s2), iInt(s1)));
    const epaule = cat(lin(T1), tranche(K1, 5, iOut(30)), lin(apex), lin(T1));
    const msE = deux('face', 'epaule', ['Épaule droite', 'Épaule gauche'], MS, [NORMAL_MEMBRE, 'Douleur articulaire', 'Limitation de mobilité', 'Tuméfaction', 'Plaie', 'Déformation', 'Œdème'], [D(epaule)]);
    const msB = deux('face', 'bras', ['Bras droit', 'Bras gauche'], MS, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Atrophie musculaire'], [D(bras(30, 94))]);
    const msC = deux('face', 'coude', ['Coude droit', 'Coude gauche'], MS, CST_MEMBRE, [D(bras(94, 126))]);
    const msA = deux('face', 'avantbras', ['Avant-bras droit', 'Avant-bras gauche'], MS, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Déformation'], [D(bras(126, 188))]);
    const msM = deux('face', 'main', ['Main droite', 'Main gauche'], MS, CST_MEMBRE, [D(cat(...main.runs))]);

    // ---- abdomen en 9 régions
    const Y1 = 251, Y2 = 281, AL = 22;
    const [uCa] = [loc(CM, [X(AL), 222.2])];
    const hypoD = cat(tranche(CM, uCa, uCs), tranche(K4, uKs, cote(Y1)), lin([X(AL), Y1]), lin(at(CM, uCa)));
    const hypoCh = deux('face', 'hypochondre', ['Hypochondre droit', 'Hypochondre gauche'], ['Abdomen', 'Abdomen'], [], [D(hypoD)]);
    hypoCh.hypochondre_d = { ...hypoCh.hypochondre_d, constats: [...CST_ABDO, 'Signe de Murphy', 'Hépatomégalie'] };
    hypoCh.hypochondre_g = { ...hypoCh.hypochondre_g, constats: [...CST_ABDO, 'Splénomégalie'] };
    const epiL = tranche(CM, uCa, 0);
    const epig = cat(epiL, rev(mir(epiL)), lin([300 - X(AL), Y1]), lin([X(AL), Y1]));
    const flancs = deux('face', 'flanc', ['Flanc droit', 'Flanc gauche'], ['Abdomen', 'Abdomen'], [...CST_ABDO, 'Météorisme'],
        [D(cat(lin([X(AL), Y1]), tranche(K4, cote(Y1), cote(Y2)), lin([X(AL), Y2])))]);
    const ombi = cat(lin([X(AL), Y1], [300 - X(AL), Y1], [300 - X(AL), Y2], [X(AL), Y2]));
    // pli inguinal : part du flanc, passe par (23 ; 312,8)
    const sF = ptK4(288);
    const Fold = cA([[AXE - sF[0], sF[1]], [46, 297], [34, 306], [AL, 312.8], [11, 321.6]]);
    const fosses = deux('face', 'fosse_iliaque', ['Fosse iliaque droite', 'Fosse iliaque gauche'], ['Abdomen', 'Abdomen'], [], [D(cat(lin([X(AL), Y2]), lin(ptK4(Y2)), tranche(K4, cote(Y2), cote(288)), tranche(Fold, 0, 3), lin([X(AL), Y2])))]);
    fosses.fosse_iliaque_d = { ...fosses.fosse_iliaque_d, constats: [...CST_ABDO, 'Point de McBurney douloureux', 'Signe de Blumberg'] };
    fosses.fosse_iliaque_g = { ...fosses.fosse_iliaque_g, constats: [...CST_ABDO, 'Corde colique sigmoïdienne'] };
    const Bas = cA([[AL, 312.8], [12, 308.2], [0, 306.4, -1, 0]]);
    const bas = cat(Bas, rev(mir(Bas)));
    const hypog = cat(lin([X(AL), Y2], [300 - X(AL), Y2]), lin(at(mir(Bas), 0)), rev(bas), lin([X(AL), Y2]));
    const S = cA([[AL, 312.8], [16, 320.6], [9, 331], [4, 341.6], [0, 350, -0.4, 1]]);
    const oge = cat(bas, mir(S), rev(S));
    const O = ptK4(332);
    const ingu = deux('face', 'inguinale', ['Région inguinale droite', 'Région inguinale gauche'], ['Pelvis', 'Pelvis'],
        ['Normale', 'Adénopathie inguinale', 'Hernie inguinale', 'Hernie crurale', 'Douleur', 'Tuméfaction'],
        [D(cat(tranche(Fold, 0, 3), S, lin(O), tranche(K4, cote(332), cote(288)), lin(Fold.s)))]);

    // ---- membres inférieurs
    const jambe = (y1, y2) => cat(tranche(K4, cote(y1), cote(y2)), lin(at(K6, locY(K6, y2))), tranche(K6, locY(K6, y2), locY(K6, y1)), lin(ptK4(y1)));
    const cuisse = cat(lin(O), lin(fin(K6)), tranche(K6, K6.g.length, locY(K6, 420)), lin(ptK4(420)), tranche(K4, cote(420), cote(332)));
    const pieds = cat(tranche(K4, cote(578), K4.g.length), pied.P, tranche(K6, 0, locY(K6, 578)), lin(ptK4(578)));
    const miCu = deux('face', 'cuisse', ['Cuisse droite', 'Cuisse gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Limitation de mobilité', 'Atrophie musculaire'], [D(cuisse)]);
    const miGe = deux('face', 'genou', ['Genou droit', 'Genou gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Choc rotulien'], [D(jambe(420, 478))]);
    const miJa = deux('face', 'jambe', ['Jambe droite', 'Jambe gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Ulcère', 'Varices'], [D(jambe(478, 578))]);
    const miPi = deux('face', 'pied', ['Cheville et pied droit', 'Cheville et pied gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Ulcération'], [D(pieds)]);

    const abdo = {
        ...hypoCh, epigastre: zone('Épigastre', 'Abdomen', [...CST_ABDO, 'Pulsations anormales'], [D(epig)]),
        ...flancs, ombilicale: zone('Région ombilicale', 'Abdomen', [...CST_ABDO, 'Hernie ombilicale', 'Masse pulsatile'], [D(ombi)]),
        ...fosses, hypogastre: zone('Hypogastre', 'Abdomen', ['Souple, indolore', 'Douleur', 'Défense', 'Masse', 'Globe vésical', 'Fond utérin palpable'], [D(hypog)]),
    };
    Object.assign(Z, aiss, abdo, ingu, {
        oge: zone('Organes génitaux externes', 'Pelvis', ['Normaux', 'Écoulement', 'Lésion ulcérée', 'Végétations', 'Tuméfaction', 'Douleur', 'Prurit'], [D(oge)]),
    }, msE, msB, msC, msA, msM, miCu, miGe, miJa, miPi);
    return Z;
};

const zonesDos = () => {
    const G = construire(null, true);
    const { K4, K6 } = G;
    const cote = (y) => locY(K4, y);
    const ptK4 = (y) => at(K4, cote(y));
    const apex = at(K4, 0);
    const Z = {};
    const CST_RACHIS = ['Normal', 'Douleur à la palpation', 'Contracture paravertébrale', 'Limitation de mobilité', 'Déformation'];
    const bande = (a, y1, y2) => cat(lin([X(a), y1], [AXE + a, y1], [AXE + a, y2], [X(a), y2], [X(a), y1]));
    const Yc = 117.5, Yd = 235.4, Yl = 276, SP = 9;
    const cerv = cat(lin([X(SP), 99.5], [AXE + SP, 99.5], [AXE + SP, Yc], [X(SP), Yc]));
    Z.rachis_cervical = zone('Rachis cervical', 'Dos', ['Normal', 'Douleur à la palpation', 'Raideur', 'Contracture paravertébrale', 'Limitation de mobilité', 'Déformation'], [D(cerv), aire(D(bande(15, 96.5, 119.5)))]);
    Z.rachis_dorsal = zone('Rachis dorsal', 'Dos', [...CST_RACHIS.slice(0, 3), 'Cyphose', 'Scoliose', 'Douleur à la percussion'], [D(bande(SP, Yc, Yd)), aire(D(bande(14, Yc, Yd)))]);
    Z.rachis_lombaire = zone('Rachis lombaire', 'Dos', [...CST_RACHIS.slice(0, 4), 'Hyperlordose', 'Douleur à la percussion'], [D(bande(SP, Yd, Yl)), aire(D(bande(14, Yd, Yl)))]);
    // sacrum
    const PSIS = [22, 283.4];
    const SE = cA([[PSIS[0], PSIS[1]], [19.4, 295], [12.6, 308], [5.6, 318], [0, 322.4, -1, 0.6]]);
    const demiSac = cat(lin([X(0), Yl], [X(14), Yl], [X(PSIS[0]), PSIS[1]]), SE);
    Z.sacree = zone('Région sacrée', 'Dos', ['Normale', 'Douleur à la palpation', 'Escarre', 'Tuméfaction', 'Fossette pilonidale', 'Plaie'], [D(cat(demiSac, rev(mir(demiSac))))]);
    // zones latérales
    const sB = ptK4(262.4);
    const B = cA([[AXE - sB[0], sB[1]], [40, 265.6], [30, 272.4], [PSIS[0], PSIS[1]]]);
    const sT = ptK4(251);
    const fosse = cat(lin([X(SP), Yd], [X(SP), Yl], [X(14), Yl], [X(PSIS[0]), PSIS[1]]), rev(B), tranche(K4, cote(262.4), cote(251)), lin([X(SP), Yd]));
    const sF = ptK4(347.8);
    const GF = cA([[0, 350], [10, 355.6], [24, 360.4], [40, 358.8], [52, 353], [AXE - sF[0], sF[1]]]);
    const fesse = cat(B, SE, lin([X(0), 350]), GF, tranche(K4, cote(347.8), cote(262.4)));
    // champ pulmonaire postérieur : contour extérieur et trou de l'omoplate
    const ext = cat(cA([[SP, 120], [24, 121.6], [36, 125.8], [46, 131.6]]), cA([[46, 131.6], [53, 141], [56, 158], [54, 170], [AXE - apex[0], apex[1]]]),
        tranche(K4, 0, cote(251)), lin([X(SP), Yd]), lin([X(SP), 120]));
    const trou = cat(cA([[17.6, 134.4], [30, 136.8], [42, 140.4], [49.6, 146], [49.8, 157], [44.6, 172], [35.4, 185.6], [26.4, 193], [21, 186.4], [18.6, 168], [17.4, 148], [17.6, 134.4]]));
    const trouOriente = Math.sign(aireSignee(trou)) === Math.sign(aireSignee(ext)) ? rev(trou) : trou;
    const ombres = deux('dos', 'omoplate', ['Omoplate droite', 'Omoplate gauche'], ['Dos', 'Dos'], ['Normale', 'Douleur', 'Omoplate décollée', 'Asymétrie', 'Tuméfaction', 'Plaie'], [D(trou)]);
    const champs = deux('dos', 'champ_post', ['Champ pulmonaire postérieur droit', 'Champ pulmonaire postérieur gauche'], ['Dos', 'Dos'], CST_POUMON,
        [chemin(dstr(ext) + dstr(trouOriente))]);
    const fosL = deux('dos', 'fosse_lombaire', ['Fosse lombaire droite', 'Fosse lombaire gauche'], ['Dos', 'Dos'], ['Indolore', 'Ébranlement lombaire douloureux', 'Contact lombaire', 'Douleur à la palpation', 'Tuméfaction', 'Plaie'], [D(fosse)]);
    const fess = deux('dos', 'fesse', ['Fesse droite', 'Fesse gauche'], ['Dos', 'Dos'], ['Normale', 'Douleur', 'Abcès', 'Escarre', 'Masse', 'Plaie', 'Induration post-injection'], [D(fesse)]);
    // creux poplités et mollets
    const diam = cA([[33.5, 425.4], [40.2, 432], [43.6, 447.6], [39.6, 461], [33.5, 467], [27.4, 461], [23.4, 447.6], [26.8, 432], [33.5, 425.4]]);
    const pop = deux('dos', 'poplite', ['Creux poplité droit', 'Creux poplité gauche'], MI, ['Normal', 'Tuméfaction', 'Kyste poplité', 'Douleur', 'Masse pulsatile', 'Plaie'],
        [D(diam), aire(ellipse(X(33.5), 446, 17, 17.5))]);
    const mol = cat(tranche(K4, cote(470), cote(566)), lin(at(K6, locY(K6, 566))), tranche(K6, locY(K6, 566), locY(K6, 470)), lin(ptK4(470)));
    const mo = deux('dos', 'mollet', ['Mollet droit', 'Mollet gauche'], MI, ['Normal', 'Œdème', 'Douleur', 'Crampe', 'Signe de Homans positif', 'Varices', 'Plaie', 'Chaleur et rougeur'], [D(mol)]);
    void K6;
    Object.assign(Z, ombres, champs, fosL, fess, pop, mo);
    return Z;
};

export default {
    id: ID,
    titre: 'Corps adulte',
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
