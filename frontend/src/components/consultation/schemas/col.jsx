import React from 'react';
import { zone, chemin, ellipse, aire, miroirX } from './outils';

// ─────────────────────────────────────────────────────────────────────────────
//  COL DE L'UTÉRUS (vue au spéculum) — version « Illustration moderne », tour 3
//  Champ circulaire centré en (CX, CY). Antérieur en haut (12 h), postérieur en bas (6 h).
//  D / G = droite / gauche de la PATIENTE : la droite de la patiente est à GAUCHE de l'écran (vue de l'examinateur).
//  Tout est décrit en coordonnées polaires autour du centre du champ (l'orifice externe) : les mêmes fonctions de rayon
//  (col, fond de vagin, orifice) servent au dessin ET aux zones, qui coïncident donc exactement.
//  Deux valves étroites (haute et basse, différentes : vis moletée en haut, crémaillère en bas) encadrent le champ ;
//  entre elles, deux parois latérales larges. Le cul-de-sac postérieur est plus profond que l'antérieur, le col est
//  légèrement dissymétrique (lèvre antérieure plus bombée) et son orifice est entouré d'une dépression avec jonction.
// ─────────────────────────────────────────────────────────────────────────────

const CX = 252; const CY = 238; const RV = 198;   // champ de vision
const AV = 54;                                     // les valves occupent ]AV, 180-AV[ en haut et en bas
const AZ = 30;                                     // lèvres du col : ]AZ, 180-AZ[ ; faces latérales : ±AZ (cibles tactiles généreuses)
const FL = 9;                                      // évasement des bords des valves
const r1 = (n) => Math.round(n * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const pol = (t, r) => [CX + r * Math.cos(rad(t)), CY - r * Math.sin(rad(t))];
const ell = (a, b, t) => (a * b) / Math.hypot(b * Math.cos(rad(t)), a * Math.sin(rad(t)));
const mx = (p) => [2 * CX - p[0], p[1]];

// col : lèvre antérieure plus bombée que la postérieure, contour légèrement irrégulier
const Rc = (t) => ell(96, 82, t) * (1 + 0.055 * Math.sin(rad(t)) + 0.018 * Math.cos(rad(t)) + 0.02 * Math.sin(rad(2 * t) + 0.6) + 0.015 * Math.sin(rad(3 * t) + 1) + 0.01 * Math.sin(rad(5 * t) + 2));
// fond de vagin : bord des valves presque droit ; cul-de-sac postérieur (bas) plus profond que l'antérieur (haut)
const Ro = (t) => {
    const s = Math.sin(rad(t));
    const B = 140 - 12 * Math.tanh(4 * s);
    return Math.pow(Math.pow(Math.abs(Math.cos(rad(t))) / 140, 2.15) + Math.pow(Math.abs(s) / B, 2.15), -1 / 2.15);
};
const Rz = (t) => ell(33, 19, t);                                                                            // zone de l'orifice (un peu plus large que la fente dessinée)
// jonction pavimento-cylindrique : contour net, un peu plus étendu vers la lèvre postérieure
const Rj = (t) => ell(50, 35, t) * (1 - 0.07 * Math.sin(rad(t)) + 0.035 * Math.sin(rad(3 * t) + 0.5) + 0.012 * Math.sin(rad(5 * t) + 1.2));

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
const poly = (pts) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`;
const arc = (f, a, b, pas = 3) => {
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / pas));
    return Array.from({ length: n + 1 }, (_, i) => { const t = a + ((b - a) * i) / n; return pol(t, f(t)); });
};
const rond = (f, pas = 6) => arc(f, 0, 360 - pas, pas);
const secteur = (fIn, fOut, a, b) => poly(arc(fOut, a, b, 2).concat(arc(fIn, b, a, 2)));

// — valves : décrites « en haut » (angle t entre AV et 180-AV) ; la valve basse (bas = true) est la même description à l'angle opposé,
//   avec son propre fond de vagin (plus profond)
const sg = (bas) => (bas ? -1 : 1);
const roV = (bas) => (t) => Ro(sg(bas) * t);
const arcV = (f, a, b, bas, pas = 3) => {
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / pas));
    return Array.from({ length: n + 1 }, (_, i) => { const t = a + ((b - a) * i) / n; return pol(sg(bas) * t, f(t)); });
};
const bordV = (t0, s, bas, n = 20) => Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n; const t = t0 + s * FL * u;
    return pol(sg(bas) * t, roV(bas)(t) * (1 - u) + RV * u);
});
const valveChemin = (bas) => poly([...arcV(roV(bas), AV, 180 - AV, bas, 2), ...bordV(180 - AV, 1, bas), ...arcV(() => RV, 180 - AV + FL, AV - FL, bas), ...bordV(AV, -1, bas).reverse()]);

// ═════════════════ GÉOMÉTRIE ═════════════════
const COL = lisse(rond(Rc, 5), true);
const OVALE = lisse(rond(Ro, 4), true);
const VALVE_HAUT = valveChemin(false);
const VALVE_BAS = valveChemin(true);

const murD = [...bordV(AV, -1, false), ...arc(() => RV, AV - FL, -(AV - FL)), ...bordV(AV, -1, true).slice().reverse(), ...arc(Ro, -AV, AV, 2)];
const PAROI_ECRAN_D = poly(murD);                    // côté droit de l'écran = gauche de la patiente
const PAROI_ECRAN_G = poly(murD.map(mx));            // côté gauche de l'écran = droite de la patiente
const PAROI_ENSEMBLE = `${PAROI_ECRAN_D}${PAROI_ECRAN_G}`;
// zones d'appui : la paroi déborde à peine vers l'extérieur du champ (elle est déjà large : près de 60 unités)
const AIRE_PAROI_ECRAN_D = secteur(Ro, () => RV + 6, -(AV + 4), AV + 4);
const AIRE_PAROI_ECRAN_G = miroirX(AIRE_PAROI_ECRAN_D, CX);
// appui des culs-de-sac antérieur et postérieur : déborde sur la lame (non cliquable) pour garantir ~36 px d'épaisseur sur téléphone
const AIRE_CDS_HAUT = secteur(Ro, (t) => Ro(t) + 24, AV, 180 - AV);
const AIRE_CDS_BAS = secteur(Ro, (t) => Ro(t) + 20, 180 + AV, 360 - AV);
// culs-de-sac latéraux (étroits : ~44 unités) : appui élargi de part et d'autre, posé AU-DESSUS de la paroi dans l'ordre des zones
const AIRE_CDS_D = secteur((t) => Rc(t) - 5, (t) => Ro(t) + 10, 180 - AZ, 180 + AZ);
const AIRE_CDS_G = secteur((t) => Rc(t) - 5, (t) => Ro(t) + 10, -AZ, AZ);
// faces latérales du col : coin étroit près de l'orifice, appui un peu plus large (orifice posé au-dessus)
const AIRE_FACE_D = secteur(() => 10, Rc, 180 - AZ - 4, 180 + AZ + 4);
const AIRE_FACE_G = secteur(() => 10, Rc, -AZ - 4, AZ + 4);

// ═════════════════ DÉCOR ═════════════════
const decor = (c) => {
    const P = 'col-speculum-c-';
    const u = (s) => `url(#${P}${s})`;
    const S = c.sombre;
    const K = S ? {
        p0: '#b3909e', p1: '#9a7587', p2: '#74515f', p3: '#3c2431',
        cHi: '#e8bcc0', cMid: '#d08e98', cLo: '#aa6674', cBord: '#7a4656',
        fo0: '#45293a', fo1: '#6e4d60',
        ligne: '#3a1c26', vais: '#e48a98', rouge: '#d4687a', os: '#2a0f19', osBord: '#d27d8b',
        crete: '#ffffff', ombre: '#1a0b13', glint: '#ffffff', ridge: '#d4bccb', jlig: '#f0a0ae', reman: '#e8905a',
        m0: '#cfd7e2', m1: '#a1acbb', m2: '#6c7888', m3: '#3d4654', mLis: '#e9eef5', mTrait: '#2c333f',
    } : {
        p0: '#eddde1', p1: '#dabdc8', p2: '#b78c9d', p3: '#684560',
        cHi: '#fbe3e0', cMid: '#f2c0c2', cLo: '#e09aa3', cBord: '#c4727f',
        fo0: '#98687f', fo1: '#bd93a6',
        ligne: '#8f4755', vais: '#c24f60', rouge: '#d65f72', os: '#6d2a39', osBord: '#c8626f',
        crete: '#ffffff', ombre: '#4d2a42', glint: '#ffffff', ridge: '#f7eaee', jlig: '#b94a5d', reman: '#e0764f',
        m0: '#f6eef1', m1: '#c9d0da', m2: '#97a2b1', m3: '#6e7a8b', mLis: '#ffffff', mTrait: '#4f5a6a',
    };
    const alphaCrete = S ? 0.26 : 0.4;

    // — plis des parois latérales : crêtes irrégulières (longueur, épaisseur et espacement variables), ombre sous la crête
    const crete = (cote, [uu, a, b, h, ph]) => {
        const n = Math.max(4, Math.ceil((b - a) / 2.5));
        const T = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
        const R = (t) => Ro(t) + uu * (RV - Ro(t)) + 1.9 * Math.sin(t * 0.13 + ph) + 0.9 * Math.sin(t * 0.31 + 2 * ph);
        const H = (t) => 0.4 + h * Math.pow(Math.max(0, Math.sin((Math.PI * (t - a)) / (b - a))), 0.75);
        const Pt = (t, k) => { const p = pol(t, R(t) + k * H(t)); return cote > 0 ? p : mx(p); };
        const bande = (k0, k1) => poly([...T.map((t) => Pt(t, k0)), ...T.slice().reverse().map((t) => Pt(t, k1))]);
        const ligne = (k) => lisse(T.map((t) => Pt(t, k)));
        return (
            <g key={`${uu}${cote}`}>
                <path d={bande(0.9, 2.6)} fill={K.ombre} fillOpacity={S ? 0.34 : 0.2} stroke="none" />
                <path d={bande(-0.9, 0.9)} fill={K.ridge} fillOpacity={S ? 0.16 : 0.34} stroke="none" />
                <path d={ligne(0.9)} stroke={K.ombre} strokeWidth="1.2" opacity={S ? 0.55 : 0.3} />
                <path d={ligne(-0.35)} stroke={K.crete} strokeWidth="2.2" opacity={alphaCrete * 0.55} transform={`translate(${cote * -0.8} -1.1)`} />
            </g>
        );
    };
    const cretesD = [[0.14, -48, 44, 6.2, 0.4], [0.4, -50, 48, 7.0, 1.9], [0.66, -46, 48, 6.6, 4.6], [0.88, -34, 38, 5.0, 2.7]];
    const cretesG = [[0.17, -50, 46, 6.4, 2.1], [0.43, -42, 50, 7.0, 3.7], [0.69, -50, 44, 6.6, 1.2], [0.9, -30, 40, 4.8, 0.2]];

    // — plis radiaires du fond de vagin (culs-de-sac) : convergent vers le col
    const plisCds = Array.from({ length: 24 }, (_, i) => {
        const t0 = 7 + i * 15 + 3 * Math.sin(i * 2.3);
        const fin = [1, 0.8, 0.92][i % 3];
        return lisse(Array.from({ length: 8 }, (__, j) => {
            const v = j / 7; const t = t0 + 3.2 * Math.sin(v * 3.1 + i * 1.3);
            return pol(t, Rc(t) + 2 + (Ro(t) - Rc(t) - 8) * fin * v);
        }));
    });

    // — petits vaisseaux de l'exocol (radiaires, fins, ramifiés), en dehors de la jonction
    const vaisseaux = [24, 63, 101, 143, 182, 221, 257, 298, 336].map((t0, i) => lisse(Array.from({ length: 7 }, (_, j) => {
        const v = j / 6;
        const t = t0 + 7 * Math.sin(v * 4.2 + i * 1.7);
        return pol(t, 42 + (Rc(t) - 48) * v);
    })));
    const branches = [[24, 0.55], [101, 0.62], [182, 0.5], [257, 0.6], [143, 0.7], [336, 0.66]].map(([t0, v], i) => {
        const t = t0 + 7 * Math.sin(v * 4.2 + [0, 2, 4, 7, 3, 8][i] * 1.7);
        const base = pol(t, 42 + (Rc(t) - 48) * v);
        const fin = pol(t + (i % 2 ? 15 : -15), 42 + (Rc(t) - 48) * (v + 0.28));
        const mid = pol(t + (i % 2 ? 6 : -6), 42 + (Rc(t) - 48) * (v + 0.14));
        return lisse([base, mid, fin]);
    });
    const JONCTION = lisse(rond(Rj, 8), true);
    const REMANIEMENT = lisse(arc((t) => Rj(t) + 5, 200, 340, 5));
    const REMANIEMENT_B = lisse(arc((t) => Rj(t) + 9, 215, 325, 5));

    // commissures : traits très courts et très discrets, loin de la jonction (ils ne la touchent pas)
    const commG = lisse([[CX - 62, CY + 2], [CX - 72, CY + 3], [CX - 82, CY + 3]]);
    const commD = lisse([[CX + 62, CY + 2], [CX + 72, CY + 3], [CX + 82, CY + 3]]);

    const ticks = [90, 0, 270, 180].map((t) => {
        const [x0, y0] = pol(t, RV + 3.5); const [x1, y1] = pol(t, RV + 8);
        return <path key={t} d={`M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}`} stroke={c.traitFin} strokeWidth="1.6" />;
    });

    // — valve du spéculum (haute ou basse) : lame étroite, bord libre roulé à deux tons, quincaillerie différente
    const reflets = [[11, 62, 118, 2.4, 0.5], [11, 122, 126, 1.3, 0.35], [24, 66, 110, 1.2, 0.3], [24, 116, 124, 2, 0.25]];
    const brosse = [20, 31, 44, 58];
    const valve = (bas) => {
        const cle = bas ? 'bas' : 'haut';
        const d = bas ? VALVE_BAS : VALVE_HAUT;
        const ro = roV(bas);
        const dec = (dy) => `translate(0 ${bas ? dy : -dy})`;
        const rimTout = lisse(arcV(ro, AV + 1, 180 - AV - 1, bas, 2));
        const rimPart = (a, b) => lisse(arcV(ro, a, b, bas, 2));
        const bordD = lisse(bordV(AV, -1, bas)); const bordG = lisse(bordV(180 - AV, 1, bas));
        return (
            <g key={cle}>
                <defs><clipPath id={`${P}cv-${cle}`}><path d={d} /></clipPath></defs>
                <path d={d} fill={u(`metal-${cle}`)} />
                <g clipPath={u(`cv-${cle}`)}>
                    <rect x={CX - 170} y={bas ? CY + 90 : CY - 210} width="340" height="120" fill={u('lustre')} />
                    {bas && <rect x={CX - 170} y={CY + 90} width="340" height="120" fill={K.mTrait} opacity="0.1" stroke="none" />}
                    {/* stries de métal brossé, parallèles au bord de la lame */}
                    <g fill="none" strokeLinecap="round">
                        {brosse.map((dd, i) => (
                            <path key={i} d={lisse(arcV((t) => ro(t) + dd, 50 - (i % 2) * 4, 130 + (i % 2) * 4, bas, 4))} stroke={K.m3} strokeWidth="0.6" opacity={0.18 - i * 0.02} />
                        ))}
                        {reflets.map(([dd, a, b, w, o], i) => (
                            <path key={`r${i}`} d={lisse(arcV((t) => ro(t) + dd, a, b, bas, 3))} stroke="#ffffff" strokeWidth={w} opacity={o} />
                        ))}
                    </g>
                    {/* vis papillon de réglage, centrée sur l'axe de la valve haute (la valve basse reste lisse) */}
                    {!bas && (
                        <g transform={`translate(${CX} ${CY - 170})`}>
                            <path d="M-26 -1C-26 -9 -17 -11 -11 -5L-9 0L-11 5C-17 11 -26 9 -26 1Z" fill={K.m1} stroke={K.mTrait} strokeWidth="1" />
                            <path d="M26 -1C26 -9 17 -11 11 -5L9 0L11 5C17 11 26 9 26 1Z" fill={K.m1} stroke={K.mTrait} strokeWidth="1" />
                            <path d="M-23 -3C-20 -6.4 -15 -6 -12.4 -3" stroke={K.mLis} strokeWidth="0.9" opacity="0.8" />
                            <path d="M23 -3C20 -6.4 15 -6 12.4 -3" stroke={K.mLis} strokeWidth="0.9" opacity="0.8" />
                            <circle r="9.6" fill={K.m2} stroke={K.mTrait} strokeWidth="1.1" />
                            {Array.from({ length: 14 }, (_, i) => {
                                const a = (i * Math.PI) / 7;
                                return <path key={i} d={`M${r1(6.8 * Math.cos(a))} ${r1(6.8 * Math.sin(a))}L${r1(9.4 * Math.cos(a))} ${r1(9.4 * Math.sin(a))}`} stroke={K.mTrait} strokeWidth="0.8" opacity="0.7" />;
                            })}
                            <circle r="5.2" fill={K.m0} stroke={K.m3} strokeWidth="0.8" />
                            <path d="M-3 -1.6A3.4 3.4 0 0 1 1.4 -3.4" stroke={K.mLis} strokeWidth="0.9" opacity="0.9" />
                        </g>
                    )}
                </g>
                {/* arêtes latérales de la lame */}
                {[bordG, bordD].map((b, i) => (
                    <g key={i} fill="none" strokeLinecap="round">
                        <path d={b} stroke={K.mTrait} strokeWidth="1.3" opacity="0.75" />
                        <path d={b} stroke={K.mLis} strokeWidth="1" opacity="0.5" transform={`translate(${i ? 2 : -2} ${bas ? -1.4 : 1.4})`} />
                    </g>
                ))}
                {/* bord libre roulé, à deux tons : face supérieure claire, biseau sombre côté champ, filet d'ombre sur le dessous */}
                <g fill="none" strokeLinecap="round">
                    <path d={rimTout} stroke={K.m3} strokeWidth="3" opacity="0.4" transform={dec(10.5)} />
                    <path d={rimTout} stroke={K.m0} strokeWidth="6" opacity="1" transform={dec(6.6)} />
                    <path d={rimPart(AV + 12, 180 - AV - 8)} stroke={K.mLis} strokeWidth="1.3" opacity="0.95" transform={dec(7.6)} />
                    <path d={rimTout} stroke={K.m2} strokeWidth="3.6" opacity="1" transform={dec(2)} />
                    <path d={rimPart(AV + 12, 180 - AV - 8)} stroke={K.m3} strokeWidth="0.9" opacity="0.5" transform={dec(3.6)} />
                    <path d={rimTout} stroke={K.mTrait} strokeWidth="1.3" opacity="0.9" />
                </g>
            </g>
        );
    };

    // — ombre portée d'une valve : dégradé radial continu clippé sur le fond de vagin, estompé sur les côtés par un masque
    //   (la fin de l'ombre tombe sur les arêtes de la valve, sans « pilule » ni palier)
    const ombreValve = (bas) => {
        const cle = bas ? 'ob' : 'oh';
        const s = bas ? -1 : 1;
        return (
            <g key={cle}>
                <g clipPath={u('ovale')}>
                    <g mask={u(`masque-${cle}`)}>
                        <rect x={CX - 150} y={bas ? CY + 20 : CY - 170} width="300" height="150" fill={u(`ombre-${cle}`)} stroke="none" />
                    </g>
                </g>
                <g clipPath={u('parois')} strokeLinecap="butt" fill="none">
                    {[bordV(AV, -1, bas), bordV(180 - AV, 1, bas)].map((b, i) => (
                        <g key={i}>
                            {[[18, 0.04], [13, 0.05], [8.5, 0.06], [4.5, 0.07]].map(([w, o], k) => (
                                <path key={k} d={lisse(b)} stroke={K.ombre} strokeWidth={w} opacity={S ? o + 0.03 : o} transform={`translate(${i ? 5 : -5} ${s * 7})`} />
                            ))}
                        </g>
                    ))}
                </g>
            </g>
        );
    };

    const FENTE = `M${CX - 27} ${CY}C${CX - 15} ${CY - 11.4} ${CX + 15} ${CY - 11.4} ${CX + 27} ${CY}C${CX + 15} ${CY + 11.4} ${CX - 15} ${CY + 11.4} ${CX - 27} ${CY}Z`;

    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <clipPath id={`${P}champ`}><circle cx={CX} cy={CY} r={RV} /></clipPath>
                <clipPath id={`${P}ovale`}><path d={OVALE} /></clipPath>
                <clipPath id={`${P}col`}><path d={COL} /></clipPath>
                <clipPath id={`${P}parois`}><path d={PAROI_ENSEMBLE} /></clipPath>
                <radialGradient id={`${P}paroi`} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={RV}>
                    <stop offset="0.55" stopColor={K.p0} /><stop offset="0.8" stopColor={K.p1} />
                    <stop offset="0.93" stopColor={K.p2} /><stop offset="1" stopColor={K.p3} />
                </radialGradient>
                <radialGradient id={`${P}fond`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0.38" stopColor={K.fo0} stopOpacity="0.95" /><stop offset="0.74" stopColor={K.fo1} stopOpacity="0.8" />
                    <stop offset="1" stopColor={K.fo1} stopOpacity="0.1" />
                </radialGradient>
                <radialGradient id={`${P}recoin`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={K.ombre} stopOpacity="0.62" /><stop offset="1" stopColor={K.ombre} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${P}chair`} cx="0.4" cy="0.34" r="0.8">
                    <stop offset="0" stopColor={K.cHi} /><stop offset="0.42" stopColor={K.cMid} />
                    <stop offset="0.84" stopColor={K.cLo} /><stop offset="1" stopColor={K.cBord} />
                </radialGradient>
                <radialGradient id={`${P}jonction`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={K.rouge} stopOpacity="0.4" /><stop offset="0.62" stopColor={K.rouge} stopOpacity="0.24" />
                    <stop offset="1" stopColor={K.rouge} stopOpacity="0.03" />
                </radialGradient>
                <radialGradient id={`${P}contact`} gradientUnits="userSpaceOnUse" cx={CX + 4} cy={CY + 7} r="132">
                    <stop offset="0.6" stopColor={K.ombre} stopOpacity="0.5" /><stop offset="0.74" stopColor={K.ombre} stopOpacity="0.36" />
                    <stop offset="0.88" stopColor={K.ombre} stopOpacity="0.14" /><stop offset="1" stopColor={K.ombre} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${P}bombe`} gradientUnits="userSpaceOnUse" cx={CX - 18} cy={CY - 24} r="124">
                    <stop offset="0.38" stopColor={K.ombre} stopOpacity="0" /><stop offset="0.74" stopColor={K.ombre} stopOpacity="0.16" />
                    <stop offset="1" stopColor={K.ombre} stopOpacity="0.46" />
                </radialGradient>
                <radialGradient id={`${P}ombre-oh`} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r="150">
                    <stop offset="0.5" stopColor={K.ombre} stopOpacity="0" /><stop offset="0.7" stopColor={K.ombre} stopOpacity={S ? 0.2 : 0.12} />
                    <stop offset="0.82" stopColor={K.ombre} stopOpacity={S ? 0.42 : 0.3} /><stop offset="0.9" stopColor={K.ombre} stopOpacity={S ? 0.6 : 0.46} />
                    <stop offset="1" stopColor={K.ombre} stopOpacity={S ? 0.66 : 0.52} />
                </radialGradient>
                <radialGradient id={`${P}ombre-ob`} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r="176">
                    <stop offset="0.48" stopColor={K.ombre} stopOpacity="0" /><stop offset="0.68" stopColor={K.ombre} stopOpacity={S ? 0.2 : 0.12} />
                    <stop offset="0.8" stopColor={K.ombre} stopOpacity={S ? 0.42 : 0.3} /><stop offset="0.88" stopColor={K.ombre} stopOpacity={S ? 0.6 : 0.46} />
                    <stop offset="1" stopColor={K.ombre} stopOpacity={S ? 0.66 : 0.52} />
                </radialGradient>
                <linearGradient id={`${P}fondu`} gradientUnits="userSpaceOnUse" x1={CX - 96} y1="0" x2={CX + 96} y2="0">
                    <stop offset="0" stopColor="#000" /><stop offset="0.27" stopColor="#fff" /><stop offset="0.73" stopColor="#fff" /><stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={`${P}masque-oh`} maskUnits="userSpaceOnUse" x={CX - 200} y={CY - 200} width="400" height="400">
                    <rect x={CX - 200} y={CY - 200} width="400" height="400" fill={u('fondu')} stroke="none" />
                </mask>
                <mask id={`${P}masque-ob`} maskUnits="userSpaceOnUse" x={CX - 200} y={CY - 200} width="400" height="400">
                    <rect x={CX - 200} y={CY - 200} width="400" height="400" fill={u('fondu')} stroke="none" />
                </mask>
                <radialGradient id={`${P}ombrecol`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={K.ombre} stopOpacity="0.3" /><stop offset="0.6" stopColor={K.ombre} stopOpacity="0.16" />
                    <stop offset="1" stopColor={K.ombre} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${P}reflet`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={K.glint} stopOpacity={S ? 0.4 : 0.8} /><stop offset="1" stopColor={K.glint} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${P}orifice`} cx="0.5" cy="0.45" r="0.55">
                    <stop offset="0" stopColor={K.os} /><stop offset="0.7" stopColor={K.os} stopOpacity="0.95" /><stop offset="1" stopColor={K.osBord} />
                </radialGradient>
                <linearGradient id={`${P}metal-haut`} gradientUnits="userSpaceOnUse" x1="0" y1={CY - 120} x2="0" y2={CY - 198}>
                    <stop offset="0" stopColor={K.m2} /><stop offset="0.12" stopColor={K.m0} /><stop offset="0.42" stopColor={K.m0} />
                    <stop offset="0.75" stopColor={K.m1} /><stop offset="1" stopColor={K.m2} />
                </linearGradient>
                <linearGradient id={`${P}metal-bas`} gradientUnits="userSpaceOnUse" x1="0" y1={CY + 144} x2="0" y2={CY + 198}>
                    <stop offset="0" stopColor={K.m2} /><stop offset="0.14" stopColor={K.m0} /><stop offset="0.5" stopColor={K.m1} />
                    <stop offset="1" stopColor={K.m2} />
                </linearGradient>
                <linearGradient id={`${P}lustre`} gradientUnits="userSpaceOnUse" x1={CX - 160} y1="0" x2={CX + 160} y2="0">
                    <stop offset="0" stopColor={K.m3} stopOpacity="0.5" /><stop offset="0.2" stopColor={K.m3} stopOpacity="0" />
                    <stop offset="0.34" stopColor="#ffffff" stopOpacity={S ? 0.28 : 0.5} /><stop offset="0.48" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="0.82" stopColor={K.m3} stopOpacity="0.1" /><stop offset="1" stopColor={K.m3} stopOpacity="0.55" />
                </linearGradient>
                <radialGradient id={`${P}vignette`} gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={RV}>
                    <stop offset="0.8" stopColor={K.ombre} stopOpacity="0" /><stop offset="1" stopColor={K.ombre} stopOpacity={S ? 0.36 : 0.4} />
                </radialGradient>
            </defs>

            <g clipPath={u('champ')}>
                {/* paroi vaginale : plus claire près du fond, plus sombre vers l'observateur (tons mauve-gris, pour que le vert / rouge ressorte) */}
                <rect x={CX - RV} y={CY - RV} width={2 * RV} height={2 * RV} fill={u('paroi')} stroke="none" />
                <g clipPath={u('parois')}>
                    {cretesD.map((k) => crete(1, k))}
                    {cretesG.map((k) => crete(-1, k))}
                </g>

                {/* fond de vagin : le col y est enchâssé, les culs-de-sac forment une gouttière sombre (le postérieur est le plus profond) */}
                <path d={OVALE} fill={u('fond')} stroke="none" />
                <g clipPath={u('ovale')}>
                    <ellipse cx={CX + 4} cy={CY + 110} rx="112" ry="38" fill={u('recoin')} stroke="none" />
                    <ellipse cx={CX} cy={CY + 134} rx="86" ry="20" fill={u('recoin')} opacity="0.85" stroke="none" />
                    <ellipse cx={CX - 6} cy={CY - 98} rx="88" ry="22" fill={u('recoin')} opacity="0.4" stroke="none" />
                    {/* plis radiaires des culs-de-sac */}
                    {plisCds.map((d, i) => (
                        <g key={i}>
                            <path d={d} stroke={K.ombre} strokeWidth="2.6" opacity={S ? 0.12 : 0.08} transform="translate(1.2 1.4)" />
                            <path d={d} stroke={K.ridge} strokeWidth="0.9" opacity={S ? 0.2 : 0.4} transform="translate(-0.6 -0.8)" />
                        </g>
                    ))}
                    {/* le col plonge dans le fond de vagin : halo d'ombre continu à son pied, plus marqué en bas à droite (lumière en haut à gauche) */}
                    <ellipse cx={CX + 4} cy={CY + 7} rx="140" ry="124" fill={u('contact')} stroke="none" />
                    <ellipse cx={CX - 84} cy={CY - 88} rx="28" ry="10" transform={`rotate(-20 ${CX - 84} ${CY - 88})`} fill={u('reflet')} opacity="0.4" stroke="none" />
                </g>

                {/* col de l'utérus : exocol bombé vers l'observateur */}
                <path d={COL} fill={u('chair')} stroke="none" />
                <g clipPath={u('col')}>
                    <path d={COL} stroke={K.cBord} strokeWidth="20" opacity="0.26" />
                    <path d={COL} stroke={K.ombre} strokeWidth="8" opacity="0.14" />
                    {/* bombement : éclairé en haut à gauche, il s'assombrit vers le bord bas-droite où le col plonge dans le fond de vagin */}
                    <rect x={CX - 130} y={CY - 130} width="260" height="260" fill={u('bombe')} stroke="none" />
                    <path d={COL} stroke={K.glint} strokeWidth="2.2" opacity={S ? 0.26 : 0.42} transform="translate(2.5 3.5)" />
                    <ellipse cx={CX + 44} cy={CY + 52} rx="96" ry="64" fill={u('ombrecol')} stroke="none" />
                    {/* lèvre antérieure : bombement éclairé ; lèvre postérieure : plus plate, plus ombrée */}
                    <ellipse cx={CX - 8} cy={CY - 58} rx="62" ry="17" fill={u('reflet')} opacity="0.34" stroke="none" />
                    <g fill="none" strokeWidth="0.8" stroke={K.vais} opacity={S ? 0.4 : 0.34}>
                        {vaisseaux.map((d, i) => <path key={i} d={d} />)}
                        {branches.map((d, i) => <path key={`b${i}`} d={d} strokeWidth="0.6" />)}
                    </g>
                    {/* commissures : l'ombre fine entre les deux lèvres */}
                    <g fill="none">
                        {[commG, commD].map((d, i) => (
                            <g key={i}>
                                <path d={d} stroke={K.ombre} strokeWidth="1.8" opacity={S ? 0.5 : 0.34} />
                                <path d={d} stroke={K.glint} strokeWidth="1" opacity={S ? 0.22 : 0.42} transform="translate(0 1.8)" />
                            </g>
                        ))}
                    </g>
                    {/* jonction pavimento-cylindrique : transition douce, sans anneau net (le col ne doit pas ressembler à un œil) */}
                    <path d={JONCTION} stroke={K.ombre} strokeWidth="8" opacity={S ? 0.14 : 0.08} transform="translate(-1.2 -1.8)" />
                    <path d={JONCTION} fill={u('jonction')} stroke="none" />
                    <path d={JONCTION} stroke={K.jlig} strokeWidth="1.1" opacity="0.22" />
                    {/* zone de remaniement : lisière rouge-orangé discrète, côté postérieur */}
                    <path d={REMANIEMENT} stroke={K.reman} strokeWidth="6" opacity={S ? 0.3 : 0.26} />
                    <path d={REMANIEMENT_B} stroke={K.reman} strokeWidth="2.4" opacity={S ? 0.24 : 0.2} />
                </g>
                <path d={COL} stroke={K.ligne} strokeWidth="1.5" opacity="0.85" />
                {/* reflets humides */}
                <ellipse cx={CX - 44} cy={CY - 46} rx="26" ry="12" transform={`rotate(-28 ${CX - 44} ${CY - 46})`} fill={u('reflet')} stroke="none" />
                <path d={lisse(arc(Rc, 118, 156, 6).map(([x, y]) => [x + 3.5, y + 3.5]))} stroke={K.glint} strokeWidth="2.4" opacity={S ? 0.4 : 0.7} />
                <path d={lisse(arc(Rc, 104, 114, 5).map(([x, y]) => [x + 3.5, y + 4]))} stroke={K.glint} strokeWidth="1.5" opacity={S ? 0.3 : 0.55} />
                <ellipse cx={CX + 54} cy={CY + 44} rx="6" ry="3.2" transform={`rotate(-30 ${CX + 54} ${CY + 44})`} fill={K.glint} opacity={S ? 0.2 : 0.4} stroke="none" />

                {/* orifice externe : fente transversale (col de multipare), lèvres légèrement rougies, glaire brillante */}
                <ellipse cx={CX} cy={CY + 2.5} rx="30" ry="13" fill={K.ombre} opacity="0.18" stroke="none" />
                <path d={FENTE} fill={u('orifice')} stroke={K.osBord} strokeWidth="2.4" />
                <path d={FENTE} stroke={K.ligne} strokeWidth="0.8" opacity="0.7" />
                <path d={`M${CX - 15} ${CY - 7.4}C${CX - 6} ${CY - 10.4} ${CX + 7} ${CY - 10.4} ${CX + 16} ${CY - 6.6}`} stroke={K.glint} strokeWidth="1.3" opacity={S ? 0.34 : 0.55} />
                <ellipse cx={CX - 1} cy={CY + 0.4} rx="14" ry="2.6" fill="#000" opacity="0.38" stroke="none" />
                {/* glaire : brillance translucide au bord inférieur de la fente */}
                <path d={`M${CX - 12} ${CY + 5.2}C${CX - 5} ${CY + 8.4} ${CX + 7} ${CY + 8.4} ${CX + 15} ${CY + 4.4}`} stroke={K.glint} strokeWidth="2.2" opacity={S ? 0.34 : 0.62} />
                <ellipse cx={CX + 9} cy={CY + 13.4} rx="6.4" ry="2.4" fill={K.glint} opacity={S ? 0.2 : 0.48} stroke="none" />
                <circle cx={CX + 17} cy={CY + 13} r="1.6" fill={K.glint} opacity={S ? 0.4 : 0.78} stroke="none" />

                {/* ombres portées des valves, puis les valves elles-mêmes */}
                {ombreValve(false)}
                {ombreValve(true)}
                {valve(false)}
                {valve(true)}

                {/* assombrissement vers la périphérie */}
                <rect x={CX - RV} y={CY - RV} width={2 * RV} height={2 * RV} fill={u('vignette')} stroke="none" />
            </g>
            <circle cx={CX} cy={CY} r={RV} stroke={c.trait} strokeWidth="2.4" />
            <circle cx={CX} cy={CY} r={RV + 1.6} stroke={c.traitFin} strokeWidth="0.8" opacity="0.6" />
            {ticks}
        </g>
    );
};

// ═════════════════ ZONES ═════════════════
// Constats du col : lèvres (antérieure, postérieure) et faces latérales (où se voient les déchirures des commissures)
const CST_LEVRE = ['Col sain', 'Col inflammatoire', 'Cervicite mucopurulente', 'Ectropion', 'Zone de remaniement', 'Kystes de Naboth', 'Polype',
    'Col en fraise', 'Ulcération', 'Leucoplasie', 'Acidoblanc après acide acétique', 'Lugol négatif', 'Saignement au contact', 'Lésion bourgeonnante',
    'Lésion suspecte'];
const CST_FACE = ['Col sain', 'Col inflammatoire', 'Cervicite mucopurulente', 'Col déchiré (cicatrice)', 'Col hypertrophique', 'Col friable',
    'Kystes de Naboth', 'Col en fraise', 'Ulcération', 'Condylome du col', 'Acidoblanc après acide acétique', 'Lugol négatif',
    'Lésion bourgeonnante', 'Vaisseaux atypiques', 'Lésion suspecte'];
// le dessin montre une fente transversale (col de multipare) : c'est un aspect normal, qui doit rester vert
const CST_ORIFICE = ['Fermé ou fente transversale', 'Entrouvert (col de multipare)', 'Orifice béant', 'Sténose', "Glaire de l'ovulation (physiologique)",
    'Glaire abondante', 'Écoulement purulent', 'Ectropion péri-orificiel', 'Saignement', 'Fil de DIU visible'];
const CST_VAGIN = ['Muqueuse normale', 'Leucorrhées blanches', 'Leucorrhées jaunâtres', 'Leucorrhées malodorantes',
    'Leucorrhées caillebottées (candidose)', 'Érythème', 'Lésions vésiculeuses', 'Condylomes'];
// cystocèle / rectocèle = prolapsus des parois antérieure et postérieure, masquées par les valves : on ne note ici que le bombement visible
const CST_CDS_ANT = [...CST_VAGIN, 'Bombement de la paroi (valve en place)', 'Ulcération'];
const CST_CDS_POST = [...CST_VAGIN, 'Bombement de la paroi (valve en place)', 'Ulcération'];
const CST_CDS_LAT = [...CST_VAGIN, 'Ulcération', 'Saignement'];
// parois latérales (les seules visibles entre les valves) : ni cystocèle ni rectocèle (parois masquées), ni cicatrice d'épisiotomie (hors champ)
const CST_PAROI = ['Muqueuse normale', 'Muqueuse atrophique', 'Érythème', 'Colpite (aspect pétéchial)', 'Leucorrhées', 'Lésions vésiculeuses',
    'Condylomes', 'Ulcération', 'Relâchement de la paroi', 'Cicatrice de déchirure'];

// frontières entre zones voisines : simples pointillés fins au repos (le dessin reste propre), pleines à la sélection par le composant
// (strokeOpacity très bas : le dessin reste celui d'une planche d'atlas ; la sélection se voit par le remplissage)
const POINTILLE = { strokeDasharray: '1.5 5', strokeLinecap: 'round', strokeOpacity: 0.22 };
const col = (lib, csts, a, b, extra = []) => zone(lib, 'Col', csts, [chemin(secteur(Rz, Rc, a, b), POINTILLE), ...extra]);
const cds = (lib, a, b, csts, extra = []) => zone(lib, 'Culs-de-sac vaginaux', csts, [chemin(secteur(Rc, Ro, a, b), POINTILLE), ...extra]);

export default {
    id: 'col',
    titre: "Col de l'utérus (vue au spéculum)",
    vues: [
        {
            id: 'speculum', titre: 'Spéculum', viewBox: '-36 0 576 474', largeur: 440, reperes: true,
            decor,
            // D / G = droite / gauche de la PATIENTE (à l'opposé de l'examinateur), précisé sous la lettre ; grandes lettres pour rester lisibles sur téléphone
            etiquettes: [
                { x: CX, y: 26, texte: 'Antérieur', taille: 22 },
                { x: CX, y: 468, texte: 'Postérieur', taille: 22 },
                { x: 10, y: CY + 4, texte: 'D', ancre: 'middle', taille: 34 },
                { x: 10, y: CY + 26, texte: 'patiente', ancre: 'middle', taille: 18 },
                { x: 494, y: CY + 4, texte: 'G', ancre: 'middle', taille: 34 },
                { x: 494, y: CY + 26, texte: 'patiente', ancre: 'middle', taille: 18 },
            ],
            // ordre = ordre d'empilement (le dernier est au-dessus) et ordre des groupes dans le panneau : col, culs-de-sac, vagin
            zones: {
                lev_ant: col('Lèvre antérieure du col', CST_LEVRE, AZ, 180 - AZ),
                lev_post: col('Lèvre postérieure du col', CST_LEVRE, 180 + AZ, 360 - AZ),
                face_d: col('Face latérale droite du col', CST_FACE, 180 - AZ, 180 + AZ, [aire(chemin(AIRE_FACE_D))]),
                face_g: col('Face latérale gauche du col', CST_FACE, -AZ, AZ, [aire(chemin(AIRE_FACE_G))]),
                cds_ant: cds('Cul-de-sac antérieur', AZ, 180 - AZ, CST_CDS_ANT, [aire(chemin(AIRE_CDS_HAUT))]),
                cds_post: cds('Cul-de-sac postérieur', 180 + AZ, 360 - AZ, CST_CDS_POST, [aire(chemin(AIRE_CDS_BAS))]),
                paroi_d: zone('Paroi vaginale droite', 'Vagin', CST_PAROI, [chemin(PAROI_ECRAN_G), aire(chemin(AIRE_PAROI_ECRAN_G))]),
                paroi_g: zone('Paroi vaginale gauche', 'Vagin', CST_PAROI, [chemin(PAROI_ECRAN_D), aire(chemin(AIRE_PAROI_ECRAN_D))]),
                // les culs-de-sac latéraux sont posés après les parois : leur appui élargi passe par-dessus le bord interne des parois
                cds_d: cds('Cul-de-sac latéral droit', 180 - AZ, 180 + AZ, CST_CDS_LAT, [aire(chemin(AIRE_CDS_D))]),
                cds_g: cds('Cul-de-sac latéral gauche', -AZ, AZ, CST_CDS_LAT, [aire(chemin(AIRE_CDS_G))]),
                orifice: zone('Orifice externe du col', 'Col', CST_ORIFICE, [
                    chemin(poly(arc(Rz, 0, 354, 6)), POINTILLE),
                    aire(ellipse(CX, CY, 38, 30)),
                ]),
            },
        },
    ],
};
