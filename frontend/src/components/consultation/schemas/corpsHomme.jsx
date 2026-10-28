import React from 'react';
import { zone, chemin, rectangle, aire, miroirFormes } from './outils';

// Corps d'homme adulte (face et dos) : même style que le corps neutre, morphologie masculine.
// Toutes les formes naissent de courbes de Bézier calculées une seule fois (voir « Bibliothèque de tracé ») ;
// les zones cliquables sont découpées dans ces mêmes courbes, donc exactement superposées au dessin.

const ID = 'corps-homme';
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
const TH1 = rad(8), TH2 = rad(10), S0 = [63.6, 144], SE = 104;
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
const ST = [[12, 21, 13.4], [30, 19.2, 14], [60, 17.2, 14.2], [88, 14.8, 13.6], [94, 14.8, 13.5], [104, 15, 13.4],
    [112, 15.6, 13.6], [126, 15.8, 13.6], [146, 15, 12.4], [170, 12.2, 10.4], [188, 10, 9.4]];
const IDX = (s) => ST.findIndex((q) => q[0] === s);

// Main (paume vers l'avant, pouce vers l'extérieur). Repère local (u le long de l'axe, v vers le pouce).
const construireMain = () => {
    const W = axe(188), d2 = [Math.sin(TH2), Math.cos(TH2)], n2 = [Math.cos(TH2), -Math.sin(TH2)];
    const P = (u, v) => [AXE - (W[0] + u * d2[0] + v * n2[0]), W[1] + u * d2[1] + v * n2[1]];
    const F = [
        { v: 10.2, u: 34.6, phi: 10, L: 32, w: 7.8 },
        { v: 2.8, u: 35.6, phi: 2, L: 35, w: 8.2 },
        { v: -4.4, u: 34.6, phi: -6, L: 32, w: 7.6 },
        { v: -10.4, u: 31.4, phi: -15, L: 26, w: 6.8 },
    ];
    const dir = (f) => [Math.cos(rad(f.phi)), Math.sin(rad(f.phi))];
    const V = [[31.2, 14.2]];
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
    const pouce = [[0, 9.6, 1, 0.1], [6.4, 12.4], [12.8, 16.4], [18.8, 20.8], [24, 24.6], [28.4, 26.8], [33.4, 28.2], [38.6, 29.2], [43, 29.6], [46.2, 29], [47.2, 26.6], [45.6, 24.4], [41.6, 22.8], [37.4, 21.2], [33.6, 19.4], [31.4, 17.2], V[0]];
    const runs = [
        pouce,
        doigt(F[0], V[0], V[1]),
        doigt(F[1], V[1], V[2]),
        doigt(F[2], V[2], V[3]),
        doigt(F[3], V[3], [27.6, -13], [[20, -12.8], [10, -11.2], [0, -9.2, -1, -0.1]]),
    ];
    const tr = (p) => { const q = P(p[0], p[1]); if (p.length >= 4) { const t = [p[2] * d2[0] + p[3] * n2[0], p[2] * d2[1] + p[3] * n2[1]]; return [q[0], q[1], -t[0], t[1]]; } return q; };
    return { P, F, V, dir, runs: runs.map((r) => courbe(r.map(tr))) };
};

// Pied vu de face (orteils vers l'observateur, légèrement ouverts)
const construirePiedFace = () => {
    const T = [[6.2, 627], [6.8, 631.5], [7.4, 635], [8, 637.6], [11.8, 639.4]];   // largeur, ordonnée du bout (de l'orteil externe au gros orteil)
    let b = 50.4; const bornes = [b];
    T.forEach((t) => { b -= t[0]; bornes.push(b); });
    const vy = (k) => (k === 0 ? 618 : k === T.length ? 629 : Math.min(T[k - 1][1], T[k][1]) - 3.2);
    const pts = [[bornes[0], vy(0)]];
    T.forEach((t, k) => {
        const cx = (bornes[k] + bornes[k + 1]) / 2, w = t[0], yt = t[1];
        pts.push([cx + 0.47 * w, yt - 0.5 * w], [cx + 0.2 * w, yt - 0.06 * w], [cx - 0.2 * w, yt - 0.06 * w], [cx - 0.47 * w, yt - 0.5 * w]);
        if (k < T.length - 1) pts.push([bornes[k + 1], vy(k + 1)]);
    });
    pts.pop(); pts.push([bornes[5] + 0.1, 631]);
    const ext = cA([[41.8, 597], [44.8, 606.5], [48.6, 613.4], [50.4, 618]]);
    const orteils = cA(pts);
    const int = cA([[bornes[5] + 0.1, 631], [13.6, 618], [14.6, 607], [16.8, 599], [19.5, 594]]);
    return { P: cat(ext, orteils, int), bornes, T, vy };
};
const construirePiedDos = () => cA([[41.8, 597], [44.6, 606], [47.2, 616], [46.6, 624], [41.4, 629], [30.6, 630.6], [20, 629], [14.8, 624], [14, 616], [15.4, 606], [19.5, 594]]);

// Corps complet pour un sexe donné (null = neutre). « zonage » : variante légèrement rentrée pour découper les zones.
const memo = {};
const construire = (sexe = 'M', zonage = false) => {
    const cle = `${sexe}|${zonage}`;
    if (memo[cle]) return memo[cle];
    const cap = [[21.6, 88], [22.6, 102], [27.4, 109.6], [37, 115.6], [49, 120.8], [62, 125], [74, 129.5], [82.5, 136]];
    const ext = ST.map(([s, wo]) => bord(s, wo, 1));
    const K1 = cA([...cap, ...ext]);
    const nCap = cap.length;
    const int = ST.map(([s, , wi]) => bord(s, wi, -1)).slice(1).reverse();      // du poignet jusqu'à l'aisselle (s = 30)
    const K3 = cA(int);
    const main = construireMain();
    const tr = [[195, 55], [218, 53.4], [243, 49.6], [262, 48.6], [284, 51.6], [306, 56.6], [322, 59.2], [345, 59.2], [372, 58], [398, 56.2], [422, 53], [440, 50.2], [452, 48.8],
        [466, 48.8], [482, 50.8], [495, 53], [517, 52.2], [540, 48.6], [563, 43.6], [588, 41.4], [597, 41.8]].map(([y, a]) => [a, y]);
    const apex = bord(30, 13.5, -1);
    const K4 = cA([apex, ...tr]);
    const face = construirePiedFace();
    const K6 = cA([[19.5, 594], [21.6, 575], [23, 556], [20.6, 532], [16.8, 512], [14.8, 494], [15.2, 476], [16, 458], [15.2, 444], [13.6, 430], [10.8, 410], [6.8, 386], [3.4, 364], [0, 350, -0.3, -1]]);
    const gauche = (pied) => cat(K1, ...main.runs, K3, K4, pied, K6);
    const piedDos = construirePiedDos(), demiFace = gauche(face.P), demiDos = gauche(piedDos);
    const complet = (demi) => { const m = rev(mir(demi)); return cat(demi, m); };
    const G = { K1, K3, K4, K6, nCap, main, pied: face, piedDos, silFace: complet(demiFace), silDos: complet(demiDos) };
    memo[cle] = G;
    return G;
};

// ============================================================ Tête
const teteFace = () => cat(cA([[0, 20.5, 1, 0], [11.5, 22], [21.5, 27.5], [26.4, 37.5], [27.8, 50], [27.4, 62], [25.6, 73], [22.8, 83.5], [18.6, 91.6], [12.6, 97.6], [6.6, 101], [0, 102, -1, 0]]));
const teteDos = () => cat(cA([[0, 20.5, 1, 0], [11.5, 22], [21.5, 27.5], [26.6, 37.5], [28.0, 50], [27.6, 62], [26.0, 73], [23.4, 83], [20.2, 91.5], [14, 95.8], [6, 97.6], [0, 98.1, -1, 0]]));
const fermerSym = (demi) => { const m = rev(mir(demi)); return cat(demi, m); };

// ============================================================ Région génitale (schéma sobre) et cheveux
const HCPTS = [[2, 153], [10, 150.6], [18, 155], [25, 165], [29.4, 179], [30.6, 194], [26, 203], [18, 202.4], [9, 196], [2, 184], [-1, 170], [-1.6, 160]].map(([a, y]) => [AXE + a, y]);
// Courbes partagées par le dessin et par les zones « Verge » et « Scrotum et testicules ».
const genital = () => {
    const { K6 } = construire('M');
    const Kp = at(K6, locY(K6, 359));
    const Bas = cA([[22, 312.8], [12, 308.2], [0, 306.4, -1, 0]]);
    const uB = loc(Bas, [X(7), 307.4]);
    const B0 = at(Bas, uB);
    const Pn = cA([[AXE - B0[0], B0[1]], [5, 314], [4.5, 322], [4.4, 329], [4.9, 334], [6, 337.2], [5.9, 340.4], [4.2, 343.4], [0, 344.4, -1, 0]]);
    const Sm = cA([[22, 312.8], [17, 322], [13.6, 331], [12.2, 339.4], [11.8, 346]]);        // pli de l'aine puis bord du scrotum
    const uS = locY(Sm, 330), S0p = at(Sm, uS);
    const u327 = locY(Pn, 327.4), P327 = at(Pn, u327);
    const top = cA([[AXE - S0p[0], S0p[1]], [9.2, 326.4], [AXE - P327[0], P327[1]]]);
    const SmLow = tranche(Sm, uS, Sm.g.length), E = fin(Sm);
    const Sc = cA([[AXE - E[0], E[1]], [11.4, 351.6], [8.6, 356.2], [AXE - Kp[0], Kp[1]], [0, Kp[1] + 1, -1, 0]]);
    return { Bas, uB, B0, Pn, Sm, uS, S0p, u327, P327, top, SmLow, E, Sc, Kp };
};
const genitaux = (c) => {
    const Gn = genital(), k = (n) => `${ID}-face-a-${n}`;
    const H = cat(lin([AXE, 326.7], Gn.P327), rev(Gn.top), Gn.SmLow, Gn.Sc);
    const Dsc = dstr(cat(H, rev(mir(H)))), Dpe = dstr(cat(Gn.Pn, rev(mir(Gn.Pn))));
    const bordSc = dstr(cat(Gn.SmLow, Gn.Sc, rev(mir(Gn.Sc)), rev(mir(Gn.SmLow))), false);
    const bordPe = dstr(cat(Gn.Pn, rev(mir(Gn.Pn))), false);
    return (
        <g strokeLinejoin="round" strokeLinecap="round">
            <defs>
                <clipPath id={k('csc')}><path d={Dsc} /></clipPath>
                <clipPath id={k('cpe')}><path d={Dpe} /></clipPath>
            </defs>
            <path d={Dsc} fill={c.chair} />
            <g clipPath={`url(#${k('csc')})`}>
                {[[8, 0.1], [3.6, 0.14]].map(([w, o]) => <path key={w} d={Dsc} fill="none" stroke={c.chairOmbre} strokeWidth={w} opacity={o} />)}
                <ellipse cx={X(5.6)} cy="340" rx="4.6" ry="9" fill={`url(#${k('lum')})`} opacity="0.75" />
                <ellipse cx={AXE + 5.6} cy="340" rx="4.6" ry="9" fill={`url(#${k('lum')})`} opacity="0.4" />
                <ellipse cx={AXE} cy="357" rx="10" ry="4" fill={`url(#${k('omb')})`} opacity="0.9" />
                <path d={`M${AXE} 336 L${AXE} ${r1(Gn.Kp[1] + 1)}`} stroke={c.traitFin} strokeWidth="0.7" opacity="0.5" fill="none" />
                {[345, 350].map((y) => <path key={y} d={`M${X(9)} ${y} Q${X(4)} ${y + 2} ${AXE} ${y + 0.6} Q${X(-4)} ${y + 2} ${X(-9)} ${y}`} stroke={c.traitFin} strokeWidth="0.55" opacity="0.28" fill="none" />)}
            </g>
            <path d={bordSc} fill="none" stroke={c.traitFin} strokeWidth="0.95" />
            <path d={Dpe} fill={c.chair} />
            <g clipPath={`url(#${k('cpe')})`}>
                {[[5, 0.1], [2.6, 0.14]].map(([w, o]) => <path key={w} d={Dpe} fill="none" stroke={c.chairOmbre} strokeWidth={w} opacity={o} />)}
                <ellipse cx={X(1.4)} cy="328" rx="2.2" ry="14" fill={`url(#${k('lum')})`} opacity="0.7" />
                <ellipse cx={AXE} cy="341" rx="5.4" ry="4" fill={c.chairOmbre} opacity="0.16" />
                <path d={`M${X(4.6)} 334.6 Q${AXE} 337.4 ${X(-4.6)} 334.6`} stroke={c.traitFin} strokeWidth="0.6" opacity="0.6" fill="none" />
            </g>
            <path d={bordPe} fill="none" stroke={c.traitFin} strokeWidth="0.95" />
        </g>
    );
};
// Cheveux courts : calotte bornée par la ligne d'implantation, recadrée par le contour de la tête
const cheveux = (face, c, vue) => {
    const hl = face ? cA([[26.6, 63], [25, 53], [21.6, 44.2], [16.6, 40.4], [10.4, 38.2], [4.4, 35.4], [0, 34.2, -1, 0]]) : cA([[26.2, 75], [20.6, 80.6], [11.5, 84], [0, 85, -1, 0]]);
    const y0 = face ? 63 : 75;
    const d = dstr(cat(lin([X(40), -4], [X(40), y0]), hl, rev(mir(hl)), lin([AXE + 40, y0], [AXE + 40, -4])));
    const fil = (pts, o) => [cA(pts), mir(cA(pts))].map((P, i) => <path key={`${pts[0][0]}-${i}`} d={dstr(P, false)} fill="none" stroke={c.traitFin} strokeWidth="0.7" strokeLinecap="round" opacity={o} />);
    return (
        <g>
            <path d={d} fill={c.chairOmbre} />
            <path d={d} fill={c.trait} fillOpacity={c.sombre ? 0 : 0.07} />
            <ellipse cx={X(10)} cy={face ? 30 : 42} rx="10" ry="5" transform={`rotate(-14 ${X(10)} ${face ? 30 : 42})`} fill={`url(#${defsId(vue, 'lum')})`} opacity="0.5" />
            {face ? <>{fil([[2, 27.4], [4, 31], [5.6, 34.2]], 0.5)}{fil([[8, 24.6], [12.6, 28.6], [16.4, 34]], 0.5)}{fil([[16, 26.6], [21.4, 31.6], [24.6, 38.6]], 0.45)}</>
                : <>{fil([[1.4, 44], [2.6, 60], [3, 76]], 0.55)}{fil([[6.6, 38], [8.8, 56], [9.2, 78]], 0.55)}{fil([[13, 36], [16, 54], [16.4, 78]], 0.55)}{fil([[20, 38], [23, 54], [23.4, 72]], 0.5)}</>}
            {[[7, 0.1], [3.6, 0.12]].map(([w, o]) => [hl, mir(hl)].map((P, i) => <path key={`${w}${i}`} d={dstr(P, false)} fill="none" stroke={c.chair} strokeWidth={w} opacity={o * 4} />))}
            <path d={dstr(hl, false)} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.45" />
            <path d={dstr(mir(hl), false)} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.45" />
        </g>
    );
};

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
    const bs = (st, rx, ry, id, op) => { const [a, y] = axe(st); blob(a, y, rx, ry, (thS(st) * 180) / Math.PI, id, op); };
    const blobC = (y, rx, ry, id, op = 1) => add(<ellipse cx={AXE} cy={y} rx={rx} ry={ry} fill={k(id)} opacity={op} />);
    return { els, k, add, bi, lig, form, blob, bs, blobC, G };
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
        A.bi(HP([[32.5, 13.2], [33.2, 6], [33.6, -2], [32.8, -8.4], [30.6, -12.4]]), { ...fin, opacity: 0.55 });
        A.bi(HP([[34.2, 19.6], [34.8, 23], [35.6, 26.6]]), { ...fin, opacity: 0.55 });
        A.bi(HP([[24.6, 17], [25.6, 21], [27.4, 24.4]]), { ...fin, opacity: 0.4 });
    } else {
        F.forEach((f) => A.bi(HP([[f.u - 0.5, f.v - 2.4], [f.u + 0.8, f.v], [f.u - 0.5, f.v + 2.4]]), { ...fin, opacity: 0.55 }));
        F.forEach((f) => A.bi(HP([[4, f.v * 0.5], [f.u * 0.5, f.v * 0.85], [f.u - 2, f.v]]), { ...fin, opacity: 0.38 }));
        A.bi(HP([[40.6, 29.4], [43.6, 29.8], [45.4, 28.4], [43.8, 26.2], [40.8, 26.6]]), { fill: c.chairClair, fillOpacity: 0.7, stroke: c.traitFin, strokeWidth: 0.6, opacity: 0.9 }, true);
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

const OREILLE = [[27, 64.4], [29.8, 63], [32, 65.8], [32.4, 72], [31.2, 78], [29, 82], [26.8, 80.6]];
const oreilles = (E, c) => {
    E.form(OREILLE, { fill: c.chair, stroke: c.trait, strokeWidth: 1.3 });
    E.lig([[29.2, 67], [30.8, 70.4], [30.2, 75.6], [28.4, 79.2]], { fill: 'none', stroke: c.traitFin, strokeWidth: 0.8, opacity: 0.8 });
};
const teteDetails = (H, c, face) => {
    const fin = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.85, strokeLinecap: 'round' };
    H.blobC(98, 20, 6, 'omb', 0.5);
    if (face) {
        H.blob(24, 74, 5, 16, 6, 'omb', 0.5);             // joues et mâchoire dans l'ombre
        H.blob(11, 62, 7, 7, 0, 'lum', 0.7);
        H.blob(9.5, 55.6, 8.5, 3.4, -4, 'omb', 0.8);
        H.blob(10, 60.4, 5.6, 3.8, 0, 'omb', 0.7);
        H.blobC(70, 3.4, 10, 'lum', 0.55);
        H.lig([[22.4, 80], [18.6, 90.4], [11, 97.6]], { ...fin, opacity: 0.4 });
        H.add(<path d={`M${X(5.8)} 77.6 Q${X(3.6)} 80 ${AXE} 79.4 Q${X(-3.6)} 80 ${X(-5.8)} 77.6`} {...fin} opacity="0.65" />);
        H.lig([[13.6, 54.2], [9.6, 52.4], [4.6, 54]], { ...fin, strokeWidth: 1.05, opacity: 0.55 });
        H.lig([[2.4, 56], [3.6, 66], [5.4, 73], [6.8, 76], [6.2, 78.4]], { ...fin, opacity: 0.5 });
        H.blob(4.2, 76, 2.6, 3, 0, 'omb', 0.55);
        H.blobC(80, 5.6, 2, 'omb', 0.4);
        H.add(<path d={`M${X(8.6)} 86.6 Q${X(4)} 88.6 ${AXE} 88 Q${X(-4)} 88.6 ${X(-8.6)} 86.6`} {...fin} opacity="0.7" />);
        H.add(<path d={`M${X(5.2)} 91.6 Q${AXE} 93.4 ${X(-5.2)} 91.6`} {...fin} opacity="0.35" />);
        H.blobC(88, 8, 2.6, 'omb', 0.35);
        H.add(<path d={`M${X(8.4)} 86.8 Q${X(4)} 85 ${X(1.4)} 84.4 Q${AXE} 85.6 ${X(-1.4)} 84.4 Q${X(-4)} 85 ${X(-8.4)} 86.8 Q${X(-4)} 90.4 ${AXE} 90.6 Q${X(4)} 90.4 ${X(8.4)} 86.8Z`} fill={c.chairOmbre} fillOpacity="0.3" stroke="none" />);
    } else {
        H.blobC(40, 18, 14, 'lum', 0.5);
        H.add(<path d={`M${X(5)} 92.4 Q${AXE} 95 ${X(-5)} 92.4`} {...fin} opacity="0.5" />);
    }
};

// Éléments communs aux deux vues, puis détails propres à chaque vue
const detailsFace = (A, c, sexe) => {
    const G = A.G;
    const FIN = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.95, strokeLinecap: 'round' };
    const FIN2 = { ...FIN, opacity: 0.6 };
    [177, 186, 195.4, 204.6, 213.2].forEach((y0) => A.lig([[9.6, y0], [24, y0 + 3.8], [38, y0 + 10], [49.6, y0 + 20.4]], { ...FIN, opacity: 0.42 }));
    const PB = [[61, 150], [57, 165], [48, 178.6], [33, 187.4], [18, 190.6], [7.5, 189.6]];
    A.bi(cat(lin([X(0), 128], [X(59), 128], [X(59), 150]), cA(PB), lin([X(0), PB[PB.length - 1][1]])), { fill: c.chair, stroke: 'none' }, true);
    const poum = (pts, m) => A.add(<path d={dstr(m ? mir(cA(pts)) : cA(pts))} fill={c.poumon} fillOpacity="0.16" stroke={c.traitFin} strokeWidth="0.7" strokeOpacity="0.4" />);
    poum([[12, 126.6], [22, 125.4], [33, 130], [42, 142], [47, 160], [47.4, 182], [44, 204], [36, 219], [26, 224.4], [14, 222.6], [8.6, 208], [7.6, 180], [8.8, 150]], false);
    poum([[12, 126.6], [22, 125.4], [33, 130], [42, 142], [47, 160], [47.4, 182], [44, 204], [36, 219], [26, 224.4], [14, 222.6], [9.4, 214], [15.4, 202], [19.4, 190], [14, 176], [8.8, 160], [8.8, 150]], true);
    A.lig([[44, 158], [32, 176], [18, 206]], { ...FIN, opacity: 0.22 });
    A.add(<path d={dstr(courbe(HCPTS))} fill={c.coeur} fillOpacity="0.18" stroke={c.traitFin} strokeWidth="0.6" strokeOpacity="0.35" />);
    A.blobC(262, 30, 46, 'lum', 0.55);
    A.blob(27, 163, 22, 16, 0, 'lum', 0.95);
    A.blob(27, 192, 21, 5.5, 0, 'omb', 0.75);
    A.blob(31, 190, 20, 3.4, 14, 'omb', 0.7);
    A.blob(10, 172, 4, 16, 0, 'omb', 0.5);
    A.blob(46, 150, 6, 12, 30, 'omb', 0.45);
    [[238, 9], [256, 9], [272, 8]].forEach(([y, r]) => A.blob(11.5, y, r, 6.6, 0, 'lum', 0.6));
    [[246, 9.6], [264.6, 9.6]].forEach(([y, r]) => A.blob(11.5, y, r, 1.6, 0, 'omb', 0.5));
    A.bs(44, 9, 17, 'lum', 0.85);
    A.bs(78, 7.2, 24, 'lum', 0.8);
    A.bs(150, 6.5, 24, 'lum', 0.7);
    A.blob(38, 380, 12, 38, -3, 'lum', 0.85);
    A.blob(33, 457, 11, 10.5, 0, 'lum', 0.8);
    A.blob(34, 525, 8, 30, -2, 'lum', 0.55);
    A.blob(50, 252, 5, 28, 0, 'omb', 0.75);
    A.blob(54, 172, 5, 11, 0, 'omb', 0.85);
    A.blob(24, 314, 20, 6, 24, 'omb', 0.7);
    A.blob(15, 400, 5, 38, 6, 'omb', 0.7);
    A.blob(53, 335, 6, 22, 0, 'lum', 0.6);
    A.blobC(106, 15, 6, 'omb', 0.75);
    A.blobC(112, 9, 9, 'lum', 0.6);
    A.lig([[17, 96], [15, 106], [11.4, 116], [7.6, 124.4]], FIN);
    A.lig([[9.4, 99], [7.4, 108], [5, 117], [3, 124.8]], FIN2);
    A.add(<path d={`M${X(-3.6)} 103.2 Q${X(0)} 108 ${X(3.6)} 103.2`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" />);
    A.blobC(104.4, 3.6, 5, 'lum', 0.7);
    A.add(<path d={`M${X(2.6)} 100.4 L${X(0)} 105.6 L${X(-2.6)} 100.4`} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.5" />);
    A.add(<path d={`M${X(-4.5)} 125 Q${X(0)} 129.4 ${X(4.5)} 125`} fill={c.chairOmbre} fillOpacity="0.55" stroke={c.traitFin} strokeWidth="0.9" />);
    A.bi(cA([[7.4, 124.2], [15, 121.4], [26, 122.6], [40, 127.4], [56, 133.4], [63, 135.4], [65.6, 136.8], [63, 138.4], [56, 136], [40, 130.4], [26, 125.8], [15, 124.4], [7.4, 127], [5.8, 125.6], [7.4, 124.2]]),
        { fill: c.os, fillOpacity: c.sombre ? 0.3 : 0.55, stroke: c.traitFin, strokeWidth: 0.9 }, true);
    A.bi(cA([[0, 125.8], [6.6, 127.4], [7.4, 137], [6.4, 147.5], [5.8, 152], [6.2, 172], [5, 194], [2.8, 200], [0, 207.6]]), { fill: c.os, fillOpacity: c.sombre ? 0.14 : 0.18, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.7 }, true);
    A.add(<path d={`M${X(6.4)} 147.6 Q${X(0)} 150 ${X(-6.4)} 147.6`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity="0.8" />);
    A.add(<path d={`M${X(6.2)} 170 Q${X(0)} 171.4 ${X(-6.2)} 170`} fill="none" stroke={c.traitFin} strokeWidth="0.7" opacity="0.5" />);
    A.lig([[0.4, 207.4], [10, 213], [22, 221.4], [34, 230.6], [46, 240.6], [52, 245]], { ...FIN, strokeWidth: 1.15, opacity: 0.9 });
    A.lig(PB, { ...FIN, strokeWidth: 1.25, opacity: 0.95 });
    A.lig([[58.4, 153], [48, 158.6], [34, 162]], { ...FIN, opacity: 0.3 });
    [0, 1, 2].forEach((k) => A.lig([[52.4 - k * 0.5, 194.6 + k * 8.6], [47.2 - k * 0.5, 199.8 + k * 8.6]], { ...FIN, opacity: 0.45 }));
    [1, -1].forEach((sg) => {
        const cx = sg > 0 ? X(32) : AXE + 32;
        A.add(<circle cx={cx} cy={181.4} r="5.2" fill={c.chairOmbre} fillOpacity="0.35" stroke={c.traitFin} strokeWidth="0.6" strokeOpacity="0.7" />);
        A.add(<circle cx={cx} cy={181.4} r="2.1" fill={c.traitFin} fillOpacity="0.8" />);
    });
    A.add(<path d={`M${AXE} 207.6 L${AXE} 304`} stroke={c.traitFin} strokeWidth="0.8" opacity="0.5" fill="none" />);
    A.lig([[17.5, 213], [21.5, 236], [22.4, 262], [19.8, 286], [12.4, 306.4]], { ...FIN, opacity: 0.7 });
    [[228.6, 20.6], [247, 22.4], [280.6, 19.6]].forEach(([y, a]) => A.lig([[1.6, y - 0.4], [10, y + 1.2], [a - 1.4, y - 0.2]], { ...FIN, opacity: 0.55 }));
    A.add(<ellipse cx={AXE} cy="263.4" rx="2.9" ry="4.7" fill={c.chairOmbre} fillOpacity="0.85" stroke={c.traitFin} strokeWidth="0.95" />);
    A.add(<path d={`M${X(-1.7)} 261.4 Q${X(0)} 258.6 ${X(1.7)} 261.4`} fill="none" stroke={c.chairClair} strokeWidth="0.9" opacity="0.9" />);
    A.lig([[48, 268.6], [53.6, 278.4], [56.2, 288.6]], { ...FIN, opacity: 0.55 });
    A.lig([[53.8, 288.6], [46, 297], [34, 306], [22.4, 313.4]], { ...FIN, strokeWidth: 1.05, opacity: 0.7 });
    A.lig([[22.4, 313.4], [12, 308], [0, 306.6]], { ...FIN, opacity: 0.16 });
    const Gn = genital();
    A.bi(tranche(Gn.Sm, 0, Gn.uS), { fill: 'none', ...FIN, opacity: 0.6 });
    A.lig([[60.4, 129.6], [63.4, 146], [70, 159], [79.6, 170.4]], { ...FIN, opacity: 0.8 });
    A.lig([[76, 142], [80.6, 152], [83.4, 164]], { ...FIN, opacity: 0.3 });
    [104, 112].forEach((s, i) => {
        const o = bord(s, 11.8 - i, 1), m = axe(s), inn = bord(s, 11.4 - i, -1);
        A.add(<path d={`M${X(o[0])} ${r1(o[1])} Q${X(m[0])} ${r1(m[1] + 4 - i * 0.8)} ${X(inn[0])} ${r1(inn[1])}`} fill="none" stroke={c.traitFin} strokeWidth="0.95" opacity={0.85 - i * 0.25} />);
    });
    A.lig([bord(116, 8.4, 1), bord(140, 8.2, 1), bord(168, 6.2, 1)], { ...FIN, opacity: 0.45 });
    A.lig([bord(116, 4, -1), bord(146, 4.4, -1), bord(172, 3.4, -1)], { ...FIN, opacity: 0.4 });
    [184.6, 180].forEach((s, i) => { const o = bord(s, 8.2, 1), inn = bord(s, 8, -1), m = axe(s); A.add(<path d={`M${X(o[0])} ${r1(o[1])} Q${X(m[0])} ${r1(m[1] + 2.4)} ${X(inn[0])} ${r1(inn[1])}`} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity={0.7 - i * 0.2} />); });
    A.lig([[54, 296], [45, 330], [33.4, 372], [23.6, 410], [18, 442]], { ...FIN, opacity: 0.4 });
    A.lig([[37, 332], [35, 378], [33.6, 420]], { ...FIN, opacity: 0.3 });
    A.lig([[53, 344], [49.6, 390], [46, 426]], { ...FIN, opacity: 0.38 });
    A.lig([[6, 362], [8.6, 380], [11.6, 400]], { ...FIN, opacity: 0.35 });
    A.blob(21.6, 434, 5.6, 11, 8, 'lum', 0.75);
    A.lig([[15.6, 420], [18.4, 434], [23.8, 445]], { ...FIN, opacity: 0.38 });
    A.blob(47, 372, 4.6, 34, -5, 'omb', 0.5);
    A.blob(40, 410, 5, 20, -4, 'lum', 0.5);
    A.form([[33, 446.2], [38.8, 448], [42, 455.2], [40.8, 465.4], [33, 470], [25.4, 465.4], [24.2, 455.2], [27.4, 448]], { fill: c.chairClair, fillOpacity: 0.4, stroke: c.traitFin, strokeWidth: 0.95 });
    A.lig([[42.6, 448.6], [47.2, 457], [45.4, 468]], { ...FIN, opacity: 0.4 });
    A.lig([[23.2, 449], [18.6, 458], [20.6, 468]], { ...FIN, opacity: 0.4 });
    A.lig([[29.6, 471.2], [30.4, 481], [32.4, 483]], { ...FIN, opacity: 0.5 });
    A.lig([[36.4, 471.2], [35.8, 481], [33.6, 483]], { ...FIN, opacity: 0.5 });
    A.lig([[31.8, 484], [30.4, 520], [27.2, 566], [24.4, 588]], { ...FIN, opacity: 0.5 });
    A.lig([[39, 488], [37.4, 522], [34, 566]], { ...FIN, opacity: 0.32 });
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
    const FIN = { fill: 'none', stroke: c.traitFin, strokeWidth: 0.95, strokeLinecap: 'round' };
    A.blob(24, 150, 22, 30, 0, 'lum', 0.7);
    A.bs(44, 9, 17, 'lum', 0.8);
    A.bs(78, 7.4, 24, 'lum', 0.8);
    A.bs(150, 6.5, 24, 'lum', 0.7);
    A.blob(30, 236, 18, 28, 0, 'lum', 0.5);
    A.blob(7.4, 205, 3.4, 36, 0, 'omb', 0.55);
    A.blob(7.4, 258, 3.4, 18, 0, 'omb', 0.55);
    A.blob(32, 322, 25, 25, 0, 'lum', 0.85);
    A.blobC(336, 2.6, 20, 'omb', 0.8);
    A.blob(30, 361, 26, 5, 0, 'omb', 0.8);
    A.blob(37, 395, 13, 36, -3, 'lum', 0.8);
    A.blob(33.5, 457, 10, 9, 0, 'omb', 0.55);
    A.blob(34, 507, 10, 27, -1, 'lum', 0.75);
    A.blob(50, 232, 5, 26, 0, 'omb', 0.7);
    A.blob(54, 172, 5, 11, 0, 'omb', 0.85);
    A.blob(15, 400, 5, 38, 6, 'omb', 0.6);
    A.blobC(106, 15, 6, 'omb', 0.6);
    A.blobC(110, 9, 9, 'lum', 0.5);
    A.add(<path d={`M${AXE} 95 L${AXE} 114`} stroke={c.traitFin} strokeWidth="0.9" opacity="0.6" fill="none" />);
    A.lig([[70, 133.4], [58, 160], [40, 196], [20, 226], [2.6, 238.6]], { ...FIN, opacity: 0.5 });
    A.lig([[60.4, 130.4], [63.4, 146], [70, 160], [79.6, 171]], { ...FIN, opacity: 0.55 });
    A.lig([[76, 142], [80.6, 152], [83.4, 164]], { ...FIN, opacity: 0.3 });
    A.lig([[53, 190], [51.6, 214], [43, 238], [27, 258]], { ...FIN, opacity: 0.5 });
    A.lig([[57, 176], [53.4, 184], [51.4, 194]], { ...FIN, opacity: 0.4 });
    A.lig([[11.6, 196], [10.6, 232], [11.8, 268]], { ...FIN, opacity: 0.45 });
    A.blob(56, 172, 5, 8, 14, 'lum', 0.6);
    const scap = cA([[19.6, 134.6], [30, 138], [41, 142], [49.4, 147], [49.6, 157], [44.4, 171], [34.4, 184], [26, 191.4], [22, 185.4], [19.4, 168], [18.4, 150]]);
    A.bi(scap, { fill: c.os, fillOpacity: 0.28, stroke: c.traitFin, strokeWidth: 0.95, strokeOpacity: 0.95 }, true);
    A.bi(cA([[18.2, 146.4], [34, 142.6], [52, 138.4], [68, 133.8], [70.4, 135.4], [68, 138.2], [52, 143], [34, 147.2], [18.6, 150.2]]), { fill: c.chairClair, fillOpacity: 0.55, stroke: c.traitFin, strokeWidth: 0.9 }, true);
    A.lig([[47, 170], [58, 167.6], [68.4, 170]], { ...FIN, opacity: 0.4 });
    A.lig([[57.2, 133.6], [60.2, 148], [66.6, 160], [75, 170]], { ...FIN, opacity: 0.4 });
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
    A.lig([[7, 232], [28, 244], [48, 253]], { ...FIN, opacity: 0.35 });
    A.lig([[50.6, 262.4], [40, 265.6], [30, 272.4], [22, 282.4]], { ...FIN, strokeWidth: 1.1, opacity: 0.8 });
    A.lig([[22, 283.6], [13, 300], [5, 313]], { ...FIN, opacity: 0.2 });
    A.add(<circle cx={X(22)} cy="283.4" r="1.9" fill={c.chairOmbre} fillOpacity="0.8" stroke={c.traitFin} strokeWidth="0.6" />);
    A.add(<circle cx={AXE + 22} cy="283.4" r="1.9" fill={c.chairOmbre} fillOpacity="0.8" stroke={c.traitFin} strokeWidth="0.6" />);
    A.lig([[28, 289], [38, 295], [48, 304], [55.6, 320]], { ...FIN, opacity: 0.24 });
    A.add(<path d={`M${AXE} 318 L${AXE} 350`} stroke={c.trait} strokeWidth="1.1" opacity="0.85" fill="none" />);
    A.lig([[0.4, 350], [10, 355.6], [24, 360.4], [40, 358.8], [52, 353], [60, 347.6]], { ...FIN, strokeWidth: 1.15, opacity: 0.95 });
    A.lig([[63.4, 176], [66.8, 202], [71.4, 226]], { ...FIN, opacity: 0.4 });
    A.lig([[83.6, 180], [86, 206], [89, 228]], { ...FIN, opacity: 0.3 });
    A.form([[84.4, 246.4], [80.2, 243.6], [75.6, 246.6], [76.4, 254.6], [80.8, 257], [84.6, 253]], { fill: c.chairClair, fillOpacity: 0.3, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.7 });
    A.lig([bord(116, 6, 1), bord(144, 6.2, 1), bord(170, 4.6, 1)], { ...FIN, opacity: 0.35 });
    A.lig([[34, 372], [35, 420], [33.6, 444]], { ...FIN, opacity: 0.3 });
    A.lig([[45, 382], [43, 410], [42, 440]], { ...FIN, opacity: 0.38 });
    A.lig([[22, 390], [20.6, 420], [23, 444]], { ...FIN, opacity: 0.38 });
    A.form([[33.5, 436], [42.4, 455.6], [33.5, 474], [24.6, 455.6]], { fill: c.chairOmbre, fillOpacity: 0.25, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.55 });
    A.form([[33.8, 474], [24, 492], [19.8, 514], [21.8, 536], [30, 551], [33.8, 548]], { fill: c.chairClair, fillOpacity: 0.28, stroke: c.traitFin, strokeWidth: 0.85, strokeOpacity: 0.7 });
    A.form([[33.8, 474], [43, 490], [47.4, 510], [44.8, 532], [37, 549], [33.8, 548]], { fill: c.chairClair, fillOpacity: 0.2, stroke: c.traitFin, strokeWidth: 0.85, strokeOpacity: 0.7 });
    A.lig([[29.4, 556], [29.2, 576], [28.4, 594]], { ...FIN, opacity: 0.6 });
    A.lig([[36.6, 556], [35.8, 576], [33, 594]], { ...FIN, opacity: 0.6 });
    A.blob(31, 580, 2.6, 14, 0, 'lum', 0.7);
    A.form([[17.6, 612], [22, 603.6], [30.6, 600.6], [39.4, 603.6], [43.4, 612], [43.6, 620], [38, 626.8], [30.6, 628.4], [23.2, 626.8], [17.8, 620]], { fill: c.chairClair, fillOpacity: 0.3, stroke: c.traitFin, strokeWidth: 0.8, strokeOpacity: 0.55 });
    A.lig([[15.6, 622.6], [22, 628.6], [30.6, 630], [39, 628.6], [45.6, 622.6]], { ...FIN, opacity: 0.35 });
    A.lig([[18, 611], [30.6, 614.6], [43.2, 611]], { ...FIN, opacity: 0.3 });
    [[23.4, 589.6], [38.4, 594.4]].forEach(([a, y]) => A.form([[a - 3, y], [a, y - 4.4], [a + 3, y], [a, y + 4.6]], { fill: c.chairClair, fillOpacity: 0.55, stroke: c.traitFin, strokeWidth: 0.7 }));
    detailsMain(A, c, false);
};

const rendre = (vue) => (c0) => {
    const sexe = 'M';
    const c = c0.sombre ? { ...c0, traitFin: '#8394ad', chairClair: '#566882', chair: '#3a4a61' } : c0;
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
            {face && genitaux(c)}
            {E.els}
            <path d={Dtete} fill={c.chair} />
            <g clipPath={`url(#${defsId(vue, 'clipt')})`}>
                {[[14, 0.12], [7, 0.16], [3.4, 0.2]].map(([w, o]) => <path key={w} d={Dtete} fill="none" stroke={c.chairOmbre} strokeWidth={w} opacity={o} />)}
                <ellipse cx={X(10)} cy="50" rx="9" ry="20" fill={`url(#${defsId(vue, 'lum')})`} opacity="0.8" />
                <ellipse cx={AXE + 10} cy="50" rx="9" ry="20" fill={`url(#${defsId(vue, 'lum')})`} opacity="0.4" />
                {H.els}
                {cheveux(face, c, vue)}
            </g>
            <path d={Dtete} fill="none" stroke={c.trait} strokeWidth="1.5" />
        </g>
    );
};

// ============================================================ Zones cliquables
const D = (P) => chemin(dstr(P));
// zone d'appui invisible : rectangle centré sur la zone, d'au moins m unités dans chaque sens
const ai = (P, m = 40) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i <= P.g.length * 8; i++) { const p = at(P, i / 8); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const w = Math.max(x1 - x0, m), h = Math.max(y1 - y0, m);
    return aire(rectangle(r1((x0 + x1 - w) / 2), r1((y0 + y1 - h) / 2), r1(w), r1(h)));
};
const ZA = (P, m) => [D(P), ai(P, m)];
const ar = (cx, cy, w, h) => aire(rectangle(r1(cx - w / 2), r1(cy - h / 2), w, h));      // aire d'appui centrée
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

// repères de l'épaule : T1 = base du trapèze, apex = creux de l'aisselle, smHaut = trait épaule-aisselle à l'ordonnée 138
const epa = (G) => {
    const T1 = G.K1.g[4].p, apex = fin(G.K3);
    return { T1, apex, smHaut: [T1[0] + (apex[0] - T1[0]) * ((138 - T1[1]) / (apex[1] - T1[1])), 138] };
};
// tranche de jambe entre deux ordonnées ; pied = de la cheville jusqu'au bout du pied
const jambeSeg = (G, y1, y2) => {
    const { K4, K6 } = G, c = (y) => locY(K4, y);
    return cat(tranche(K4, c(y1), c(y2)), lin(at(K6, locY(K6, y2))), tranche(K6, locY(K6, y2), locY(K6, y1)), lin(at(K4, c(y1))));
};
const piedSeg = (G, P) => {
    const { K4, K6 } = G, c = locY(K4, 578);
    return cat(tranche(K4, c, K4.g.length), P, tranche(K6, 0, locY(K6, 578)), lin(at(K4, c)));
};
// épaule, bras, coude, avant-bras, main : mêmes contours en face et en dos (les zones du dos portent « (dos) »)
const membresSup = (vue, G, plus = []) => {
    const { K1, K3, nCap, main } = G, { T1, apex } = epa(G);
    const sx = vue === 'dos' ? '_dos' : '', sl = vue === 'dos' ? ' (dos)' : '';
    const iOut = (s) => nCap + ST.findIndex((q) => q[0] === s);
    const sInt = ST.slice(1).map((q) => q[0]).reverse();
    const seg = (s1, s2) => cat(tranche(K1, iOut(s1), iOut(s2)), lin(at(K3, sInt.indexOf(s2))), tranche(K3, sInt.indexOf(s2), sInt.indexOf(s1)));
    const m = (id, noms, cst, formes) => deux(vue, id + sx, noms.map((n) => n + sl), MS, cst, formes);
    return {
        ...m('epaule', ['Épaule droite', 'Épaule gauche'], [NORMAL_MEMBRE, 'Douleur articulaire', 'Limitation de mobilité', 'Tuméfaction', 'Plaie', 'Déformation', 'Œdème'], [D(cat(lin(T1), tranche(K1, 5, iOut(30)), lin(apex), lin(T1))), ...plus, ar(X(75), 150, 38, 46)]),
        ...m('bras', ['Bras droit', 'Bras gauche'], [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Atrophie musculaire'], ZA(seg(30, 94), 42)),
        ...m('coude', ['Coude droit', 'Coude gauche'], CST_MEMBRE, ZA(seg(94, 126))),
        ...m('avantbras', ['Avant-bras droit', 'Avant-bras gauche'], [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Déformation'], ZA(seg(126, 188))),
        ...m('main', ['Main droite', 'Main gauche'], CST_MEMBRE, ZA(cat(...main.runs), 44)),
    };
};

const zonesFace = () => {
    const G = construire();
    const { K1, K4, K6, pied } = G;
    const cote = (y) => locY(K4, y);
    const ptK4 = (y) => at(K4, cote(y));
    const { apex, smHaut } = epa(G);
    const Y1 = 246, Y2 = 281, AL = 22;

    const CM = cA([[0, 207.4], [10, 213], [22, 221.4], [34, 230.6], [46, 240.6], [52, 245]]);
    const arcHaut = cA([[0, 128.6, 1, 0], [12, 126.4], [22, 125.8], [32, 128.2], [41, 132.6], [49, 138]]);
    const AM = cA([[49, 138], [46.4, 148], [45, 158], [46, 167.6], [50, 174.2], [52.9, 175.9]]);
    AM.g[AM.g.length - 1].p = apex;
    const uCa = loc(CM, [X(AL), 222.2]), Q = at(CM, uCa);
    const Bc2 = courbe([Q, [X(34), 226.8], ptK4(234)]);
    const poumonD = cat(arcHaut, AM, tranche(K4, 0, cote(234)), rev(cat(tranche(CM, 0, uCa), Bc2)), lin([X(0), 128.6]));
    const HC = courbe(HCPTS);
    const poumons = {
        poumon_d: zone('Poumon droit', 'Thorax', CST_POUMON, [D(poumonD)]),
        poumon_g: zone('Poumon gauche', 'Thorax', CST_POUMON, [D(mir(poumonD))]),
        coeur: zone('Cœur', 'Thorax', ['Bruits du cœur normaux', 'Souffle systolique', 'Souffle diastolique', 'Tachycardie', 'Bradycardie', 'Arythmie', 'Bruits du cœur assourdis', 'Frottement péricardique'], ZA(HC, 40)),
    };

    const Hc = teteFace(), nH = Hc.g.length;
    const uJ = loc(Hc, at(K1, locY(K1, 94.2)));
    const demiCou = cat(rev(tranche(Hc, uJ, nH)), tranche(K1, locY(K1, 94.2), 3), lin([X(32), 128.2]), rev(tranche(arcHaut, 0, 3)));
    const trapP = cat(tranche(K1, 3, 5), lin(smHaut, [X(49), 138]), rev(tranche(arcHaut, 3, 5)), lin(at(K1, 3)));
    const tete = {
        cou: zone('Cou', 'Tête et cou', ['Souple, sans adénopathie', 'Adénopathie cervicale', 'Goitre', 'Raideur de nuque', 'Turgescence jugulaire', 'Douleur à la palpation', 'Masse cervicale'],
            [D(cat(demiCou, rev(mir(demiCou)))), ar(AXE, 113, 40, 38)]),
        tete: zone('Tête / ORL', 'Tête et cou', ['Normal', 'Gorge rouge', 'Amygdales hypertrophiées', 'Otite', 'Conjonctives pâles', 'Ictère conjonctival', 'Douleur sinusienne', 'Plaie du cuir chevelu'],
            [D(fermerSym(Hc)), D(cA(OREILLE)), D(mir(cA(OREILLE)))]),
    };
    const aiss = deux('face', 'aisselle', ['Aisselle droite', 'Aisselle gauche'], ['Thorax', 'Thorax'],
        ['Normale, sans adénopathie', 'Adénopathie axillaire', 'Masse', 'Douleur', 'Lésion cutanée', 'Abcès'], [D(cat(AM, lin(smHaut), lin([X(49), 138]))), aire(rectangle(74, 136, 34, 46))]);

    const hypoD = cat(Bc2, tranche(K4, cote(234), cote(Y1)), lin([X(AL), Y1]), lin(Q));
    const hypoCh = deux('face', 'hypochondre', ['Hypochondre droit', 'Hypochondre gauche'], ['Abdomen', 'Abdomen'], [], ZA(hypoD, 36));
    hypoCh.hypochondre_d = { ...hypoCh.hypochondre_d, constats: [...CST_ABDO, 'Signe de Murphy', 'Hépatomégalie'] };
    hypoCh.hypochondre_g = { ...hypoCh.hypochondre_g, constats: [...CST_ABDO, 'Splénomégalie'] };
    const epiL = tranche(CM, uCa, 0);
    const epig = cat(epiL, rev(mir(epiL)), lin([300 - X(AL), Y1]), lin([X(AL), Y1]));
    const flancP = cat(lin([X(AL), Y1]), tranche(K4, cote(Y1), cote(Y2)), lin([X(AL), Y2]));
    const flancs = deux('face', 'flanc', ['Flanc droit', 'Flanc gauche'], ['Abdomen', 'Abdomen'], [...CST_ABDO, 'Météorisme'], ZA(flancP, 36));
    const ombi = cat(lin([X(AL), Y1], [300 - X(AL), Y1], [300 - X(AL), Y2], [X(AL), Y2]));
    const sF = ptK4(288);
    const Fold = cA([[AXE - sF[0], sF[1]], [46, 297], [34, 306], [AL, 312.8], [11, 321.6]]);
    const fosseP = cat(lin([X(AL), Y2]), lin(ptK4(Y2)), tranche(K4, cote(Y2), cote(288)), tranche(Fold, 0, 3), lin([X(AL), Y2]));
    const fosses = deux('face', 'fosse_iliaque', ['Fosse iliaque droite', 'Fosse iliaque gauche'], ['Abdomen', 'Abdomen'], [], ZA(fosseP, 36));
    fosses.fosse_iliaque_d = { ...fosses.fosse_iliaque_d, constats: [...CST_ABDO, 'Point de McBurney douloureux', 'Signe de Blumberg'] };
    fosses.fosse_iliaque_g = { ...fosses.fosse_iliaque_g, constats: [...CST_ABDO, 'Corde colique sigmoïdienne'] };
    const Bas = cA([[AL, 312.8], [12, 308.2], [0, 306.4, -1, 0]]);
    const bas = cat(Bas, rev(mir(Bas)));
    const hypog = cat(lin([X(AL), Y2], [300 - X(AL), Y2]), lin(at(mir(Bas), 0)), rev(bas), lin([X(AL), Y2]));
    const Gn = genital(), { Pn, top, SmLow, Sc } = Gn, nB = Gn.Bas.g.length, trPn = tranche(Pn, Gn.u327, Pn.g.length);
    const O = ptK4(324);
    const ingu = deux('face', 'inguinale', ['Région inguinale droite', 'Région inguinale gauche'], ['Pelvis', 'Pelvis'],
        ['Normal', 'Hernie inguinale', 'Adénopathie', 'Douleur'],
        [D(cat(tranche(Fold, 0, 3), tranche(Gn.Bas, 0, Gn.uB), tranche(Pn, 0, Gn.u327), rev(top), SmLow, lin(O), tranche(K4, cote(324), cote(288)), lin(Fold.s)))]);
    const Tb = tranche(Gn.Bas, Gn.uB, nB);
    const verge = cat(Tb, rev(mir(Tb)), mir(Pn), rev(Pn));
    const scrotum = cat(top, trPn, rev(mir(trPn)), rev(mir(top)), mir(SmLow), mir(Sc), rev(Sc), rev(SmLow));
    const pelvis = {
        scrotum: zone('Scrotum et testicules', 'Pelvis', ['Normal', 'Hydrocèle', 'Varicocèle', 'Masse testiculaire', 'Testicule non palpable', 'Douleur testiculaire'], ZA(scrotum, 40)),
        verge: zone('Verge', 'Pelvis', ['Normale', 'Phimosis', 'Balanite', 'Écoulement urétral', 'Lésion ulcérée', 'Condylomes'], [D(verge), aire(rectangle(X(18), 303, 36, 34))]),
    };

    const cuisse = cat(lin(O), lin(Gn.E), tranche(Sc, 0, 3), tranche(K6, locY(K6, 359), locY(K6, 428)), lin(ptK4(428)), tranche(K4, cote(428), cote(324)));
    const mi = {
        ...deux('face', 'cuisse', ['Cuisse droite', 'Cuisse gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Limitation de mobilité', 'Atrophie musculaire'], [D(cuisse)]),
        ...deux('face', 'genou', ['Genou droit', 'Genou gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Choc rotulien'], ZA(jambeSeg(G, 428, 486), 42)),
        ...deux('face', 'jambe', ['Jambe droite', 'Jambe gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Plaie', 'Tuméfaction', 'Ulcère', 'Varices'], [D(jambeSeg(G, 486, 578))]),
        ...deux('face', 'pied', ['Cheville et pied droit', 'Cheville et pied gauche'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur articulaire', 'Limitation de mobilité', 'Plaie', 'Tuméfaction', 'Ulcération'], ZA(piedSeg(G, pied.P), 42)),
    };
    return {
        ...tete, ...mi, ...membresSup('face', G, [D(trapP)]), ...poumons,
        epigastre: zone('Épigastre', 'Abdomen', [...CST_ABDO, 'Pulsations anormales'], [D(epig)]),
        hypogastre: zone('Hypogastre', 'Abdomen', ['Souple, indolore', 'Douleur', 'Défense', 'Masse', 'Globe vésical'], [D(hypog), ar(AXE, 298, 44, 40)]),
        ombilicale: zone('Région ombilicale', 'Abdomen', [...CST_ABDO, 'Hernie ombilicale', 'Masse pulsatile'], [D(ombi), ar(AXE, 263.5, 44, 38)]),
        ...hypoCh, ...flancs, ...fosses, ...aiss, ...ingu, ...pelvis,
    };
};

const zonesDos = () => {
    const G = construire(), { K1, K4, K6, piedDos } = G;
    const cote = (y) => locY(K4, y);
    const ptK4 = (y) => at(K4, cote(y));
    const { apex, smHaut } = epa(G);
    const CST_RACHIS = ['Normal', 'Douleur à la palpation', 'Contracture paravertébrale', 'Limitation de mobilité', 'Déformation'];
    const bande = (a, y1, y2) => cat(lin([X(a), y1], [AXE + a, y1], [AXE + a, y2], [X(a), y2], [X(a), y1]));
    const Yc = 117.5, Yd = 235.4, Yl = 276, SP = 9;
    const rach = (lib, cst, y1, y2, a1, a2) => zone(lib, 'Rachis', cst, [D(bande(SP, y1, y2)), aire(D(bande(20, a1, a2)))]);
    const rachis = {
        rachis_dorsal: rach('Rachis dorsal', [...CST_RACHIS.slice(0, 3), 'Cyphose', 'Scoliose', 'Douleur à la percussion'], Yc, Yd, Yc, Yd),
        rachis_lombaire: rach('Rachis lombaire', [...CST_RACHIS.slice(0, 4), 'Hyperlordose', 'Douleur à la percussion'], Yd, Yl, Yd, Yl),
        rachis_cervical: rach('Rachis cervical', ['Normal', 'Douleur à la palpation', 'Raideur', 'Contracture paravertébrale', 'Limitation de mobilité', 'Déformation'], 99.5, Yc, 90, 128),
    };
    const PSIS = [22, 283.4];
    const SE = cA([[PSIS[0], PSIS[1]], [19.4, 295], [12.6, 308], [5.6, 318], [0, 322.4, -1, 0.6]]);
    const demiSac = cat(lin([X(0), Yl], [X(14), Yl], [X(PSIS[0]), PSIS[1]]), SE);
    const sB = ptK4(262.4);
    const B = cA([[AXE - sB[0], sB[1]], [40, 265.6], [30, 272.4], [PSIS[0], PSIS[1]]]);
    const base = courbe([ptK4(226), [X(44), 235.4], [X(28), 238.2], [X(SP), Yd]]);
    const fosse = cat(lin([X(SP), Yd], [X(SP), Yl], [X(14), Yl], [X(PSIS[0]), PSIS[1]]), rev(B), tranche(K4, cote(262.4), cote(226)), base);
    const sF = ptK4(347.8);
    const GF = cA([[0, 350], [10, 355.6], [24, 360.4], [40, 358.8], [52, 353], [AXE - sF[0], sF[1]]]);
    const fesse = cat(B, SE, lin([X(0), 350]), GF, tranche(K4, cote(347.8), cote(262.4)));
    const ctop = courbe([[X(SP), Yc], [X(20), 120.2], [X(34), 125], [X(46), 131.8], smHaut]);
    const ext = cat(ctop, lin(apex), tranche(K4, 0, cote(226)), base, lin([X(SP), Yc]));
    const trou = cat(cA([[17.6, 134.4], [30, 136.8], [42, 140.4], [49.6, 146], [49.8, 157], [44.6, 172], [35.4, 185.6], [26.4, 193], [21, 186.4], [18.6, 168], [17.4, 148], [17.6, 134.4]]));
    const trouOriente = Math.sign(aireSignee(trou)) === Math.sign(aireSignee(ext)) ? rev(trou) : trou;
    const uN = locY(K1, 99.5);
    const trapeze = cat(lin([X(SP), 99.5], at(K1, uN)), tranche(K1, uN, 5), lin(smHaut), rev(ctop), lin([X(SP), 99.5]));
    const GR = ['Épaules et omoplates', 'Épaules et omoplates'], GL = ['Lombes et fesses', 'Lombes et fesses'];
    const FESS = ['Normale', 'Douleur', 'Abcès', 'Escarre', 'Masse', 'Plaie', 'Induration post-injection'];
    const tete = {
        tete_dos: zone('Occiput', 'Tête et cou', ['Normal', 'Plaie du cuir chevelu', 'Tuméfaction', 'Lésion cutanée', 'Adénopathie occipitale'], [D(fermerSym(teteDos()))]),
    };
    const mi = {
        ...deux('dos', 'cuisse_post', ['Cuisse postérieure droite', 'Cuisse postérieure gauche'], MI, [NORMAL_MEMBRE, 'Douleur', 'Contracture', 'Escarre', 'Tuméfaction', 'Plaie', 'Abcès'],
            [D(cat(GF, tranche(K4, cote(347.8), cote(436)), lin(at(K6, locY(K6, 436))), tranche(K6, locY(K6, 436), K6.g.length)))]),
        ...deux('dos', 'poplite', ['Creux poplité droit', 'Creux poplité gauche'], MI, ['Normal', 'Tuméfaction', 'Kyste poplité', 'Douleur', 'Masse pulsatile', 'Plaie'], ZA(jambeSeg(G, 436, 478), 40)),
        ...deux('dos', 'mollet', ['Mollet droit', 'Mollet gauche'], MI, ['Normal', 'Œdème', 'Douleur', 'Crampe', 'Signe de Homans positif', 'Varices', 'Plaie', 'Chaleur et rougeur'], [D(jambeSeg(G, 478, 578))]),
        ...deux('dos', 'pied_dos', ['Cheville et pied droit (dos)', 'Cheville et pied gauche (dos)'], MI, [NORMAL_MEMBRE, 'Œdème', 'Douleur', 'Limitation de mobilité', 'Plaie', 'Escarre du talon', 'Ulcération'], ZA(piedSeg(G, piedDos), 44)),
    };
    return {
        ...tete, ...mi, ...membresSup('dos', G),
        ...deux('dos', 'champ_post', ['Champ pulmonaire postérieur droit', 'Champ pulmonaire postérieur gauche'], GR, CST_POUMON, [chemin(dstr(ext) + dstr(trouOriente))]),
        ...deux('dos', 'omoplate', ['Omoplate droite', 'Omoplate gauche'], GR, ['Normale', 'Douleur', 'Omoplate décollée', 'Asymétrie', 'Tuméfaction', 'Plaie'], ZA(trou, 42)),
        ...deux('dos', 'fosse_lombaire', ['Fosse lombaire droite', 'Fosse lombaire gauche'], GL, ['Indolore', 'Ébranlement lombaire douloureux', 'Contact lombaire', 'Douleur à la palpation', 'Tuméfaction', 'Plaie'], [D(fosse)]),
        ...deux('dos', 'fesse', ['Fesse droite', 'Fesse gauche'], GL, FESS, [D(fesse)]),
        sacree: zone('Région sacrée', 'Lombes et fesses', ['Normale', 'Douleur à la palpation', 'Escarre', 'Tuméfaction', 'Fossette pilonidale', 'Plaie'], ZA(cat(demiSac, rev(mir(demiSac))), 42)),
        ...deux('dos', 'trapeze', ['Trapèze droit', 'Trapèze gauche'], GR, ['Normal', 'Douleur', 'Contracture', 'Tuméfaction', 'Plaie', 'Atrophie musculaire'], [D(trapeze), aire(rectangle(X(56), 100, 44, 29))]),
        ...rachis,
    };
};

export default {
    id: ID,
    titre: "Corps d'homme adulte",
    vues: [
        {
            id: 'face', titre: 'Face', viewBox: '0 0 300 650', largeur: 280, reperes: true, decor: rendre('face'),
            etiquettes: [{ x: 26, y: 40, texte: 'D', taille: 15 }, { x: 274, y: 40, texte: 'G', taille: 15 }],
            zones: zonesFace(),
        },
        {
            id: 'dos', titre: 'Dos', viewBox: '0 0 300 650', largeur: 280, reperes: true, decor: rendre('dos'),
            etiquettes: [{ x: 26, y: 40, texte: 'G', taille: 15 }, { x: 274, y: 40, texte: 'D', taille: 15 }],
            zones: zonesDos(),
        },
    ],
};
