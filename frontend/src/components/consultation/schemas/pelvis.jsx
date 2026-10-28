import React from 'react';
import { zone, chemin, aire } from './outils';

// ─────────────────────────────────────────────────────────────────────────────
//  PELVIS FÉMININ — TOUCHER VAGINAL — version « Illustration moderne »
//  Deux vues : coupe sagittale médiane (avant à gauche) et vue de face (droit de la patiente à gauche de l'écran).
//  Tout est construit à partir de rubans (axe + demi-largeur) : le dessin ET les zones utilisent les mêmes
//  points, donc les zones épousent exactement les organes.
// ─────────────────────────────────────────────────────────────────────────────

const r1 = (n) => Math.round(n * 10) / 10;

// Courbe lisse (Catmull-Rom → Bézier cubiques absolus)
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

// Échantillonnage Catmull-Rom uniforme de points [x, y, demi-largeur]
const crv = (a, b, c, d, s) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
const echant = (pts, n) => {
    const m = pts.length - 1; const o = [];
    for (let k = 0; k <= n; k += 1) {
        const u = (k / n) * m; const i = Math.min(Math.floor(u), m - 1); const s = u - i;
        const p0 = pts[Math.max(i - 1, 0)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(i + 2, m)];
        o.push(p1.map((_, j) => crv(p0[j], p1[j], p2[j], p3[j], s)));
    }
    return o;
};
// Ruban : pour chaque échantillon, axe c, côté « g » (gauche de la marche) et côté « d » (droite)
const ruban = (pts, n = 40) => {
    const s = echant(pts, n);
    return s.map((p, k) => {
        const a = s[Math.max(k - 1, 0)]; const b = s[Math.min(k + 1, n)];
        let tx = b[0] - a[0]; let ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const nx = -ty; const ny = tx; const w = p[2];
        return { c: [p[0], p[1]], w, t: [tx, ty], n: [nx, ny], g: [p[0] + nx * w, p[1] + ny * w], d: [p[0] - nx * w, p[1] - ny * w] };
    });
};
// point au pourcentage f de la demi-largeur (f > 0 : côté g, f < 0 : côté d)
const lat = (R, f) => R.map((q) => [q.c[0] + q.n[0] * q.w * f, q.c[1] + q.n[1] * q.w * f]);
const axe = (R) => R.map((q) => q.c);
const sideG = (R) => R.map((q) => q.g);
const sideD = (R) => R.map((q) => q.d);
const entre = (arr, a, b) => (a <= b ? arr.slice(a, b + 1) : arr.slice(b, a + 1).reverse());
const retourne = (arr) => arr.slice().reverse();
// contour fermé d'un ruban (ou d'un tronçon k0..k1), bouts plats ou arrondis (cap = fraction de la largeur)
const contour = (R, k0 = 0, k1 = R.length - 1, capDebut = 0, capFin = 0) => {
    const o = [];
    if (capDebut) { const q = R[k0]; o.push([q.c[0] - q.t[0] * q.w * capDebut, q.c[1] - q.t[1] * q.w * capDebut]); }
    for (let k = k0; k <= k1; k += 1) o.push(R[k].g);
    if (capFin) { const q = R[k1]; o.push([q.c[0] + q.t[0] * q.w * capFin, q.c[1] + q.t[1] * q.w * capFin]); }
    for (let k = k1; k >= k0; k -= 1) o.push(R[k].d);
    return o;
};
const plusProche = (arr, p) => {
    let m = 1e9; let im = 0;
    arr.forEach((q, i) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < m) { m = dd; im = i; } });
    return im;
};
const dehors = (pts, R, side, e) => pts.map((p, i) => [p[0] + R[i].n[0] * e * side, p[1] + R[i].n[1] * e * side]);

// ═════════════════════════ COULEURS ═════════════════════════
const teintes = (c) => {
    const S = c.sombre;
    return {
        blanc: S ? '#9fb0c8' : '#ffffff',
        ut: S ? ['#dc8e99', '#c46f7c', '#92475a'] : ['#f6c0c6', '#ea98a4', '#c9677a'],          // clair, base, ombre
        col: S ? ['#d4808f', '#b9606f', '#8a3f52'] : ['#f0b0bb', '#e0889a', '#bd5b72'],
        vag: S ? ['#cf8590', '#b0646f', '#7f4150'] : ['#f3b8bb', '#e69ea4', '#c46f80'],
        lum: S ? '#5c2f3c' : '#b4546d',
        endo: S ? '#e6a3ad' : '#fbd9de',
        ves: S ? ['#7d9bc7', '#5f7fae', '#3f5a85'] : ['#e8f2fc', '#c4daf1', '#8fb1da'],
        ure: S ? ['#7b97c0', '#5b7aa6', '#3b567f'] : ['#d6e6f6', '#aecbe9', '#7fa5d2'],
        rec: S ? ['#b88e6d', '#9a7354', '#6e4f38'] : ['#f1d6bb', '#e0b996', '#bf9468'],
        mus: S ? ['#a65a63', '#8c4850', '#683239'] : ['#ecb1b0', '#dc8c8f', '#b7646b'],
        peri: S ? '#d3b38c' : '#c79a62',
        sac: S ? ['#9aa9c0', '#7d8da6', '#56657e'] : ['#f7f1e4', '#e6dcc8', '#c4b69c'],
        sacTrait: S ? '#b5c2d6' : '#8a7d68',
        ov: S ? ['#d9b5a6', '#bf9588', '#8d675e'] : ['#fbe6d8', '#f1c9b4', '#d49e88'],
        foll: S ? '#e9d7cf' : '#fffaf5',
        follTrait: S ? '#8fa7c9' : '#8fb0d6',
        tube: S ? ['#d9808e', '#bf6573', '#8f4454'] : ['#f4a7b3', '#e8808f', '#c75a70'],
        fimb: S ? '#e6909c' : '#f08e9f',
        lig: S ? '#c9a9a3' : '#d9b3a8',
    };
};

// ═════════════════════════ OUTILS DE DESSIN ═════════════════════════
// Dégradé d'objet (haut-gauche → bas-droite)
const degrade = (id, [a, b, o], sens = [0, 0, 1, 1]) => (
    <linearGradient key={id} id={id} x1={sens[0]} y1={sens[1]} x2={sens[2]} y2={sens[3]}>
        <stop offset="0" stopColor={a} /><stop offset="0.42" stopColor={b} /><stop offset="1" stopColor={o} />
    </linearGradient>
);
// Pièce : remplissage dégradé + ombre intérieure douce + liseré de lumière + contour
const piece = (P, nom, d, t, g, { trait, tw = 1.3, ombre, refl = 0.55, force = 1 } = {}) => {
    const cp = `${P}cp-${nom}`;
    const om = ombre || g[2];
    return (
        <g key={nom}>
            <clipPath id={cp}><path d={d} /></clipPath>
            <path d={d} fill={`url(#${P}g-${nom})`} stroke="none" />
            <g clipPath={`url(#${cp})`} fill="none">
                <path d={d} stroke={om} strokeWidth={24 * force} opacity="0.10" />
                <path d={d} stroke={om} strokeWidth={13 * force} opacity="0.14" />
                <g transform="translate(-2.2 -2.6)"><path d={d} stroke={om} strokeWidth={6 * force} opacity="0.30" /></g>
                <g transform="translate(2.4 2.6)"><path d={d} stroke={t.blanc} strokeWidth="3.6" opacity={refl} /></g>
            </g>
            <path d={d} fill="none" stroke={trait} strokeWidth={tw} />
        </g>
    );
};

// ═════════════════════════ COUPE SAGITTALE ═════════════════════════
const SAG = 'pelvis-sagittale-b-';

// Utérus + col (de haut en bas : fond → orifice externe). côté g = face antérieure, côté d = face postérieure
const UT = ruban([[115, 234, 8], [130, 243, 24], [147, 256, 33], [168, 274, 30], [187, 291, 23], [203, 305, 17], [207, 324, 18], [202, 341, 17.5], [193, 357, 15]], 40);
const KI = 25; // isthme (orifice interne)
// Vagin (de bas en haut : vestibule → cul-de-sac) : g = paroi postérieure, d = paroi antérieure
const VG = ruban([[137, 470, 11], [148, 447, 13], [160, 421, 14.5], [173, 393, 15.5], [187, 362, 16.5], [199, 336, 15.5], [207, 317, 11]], 48);
const VL = ruban([[136, 470, 2.4], [146, 449, 2.6], [158, 424, 3], [171, 393, 3.8], [185, 363, 6], [196, 342, 10.5], [202, 328, 9.5]], 30);
// Urètre (de bas en haut)
const UR = ruban([[117, 458, 5.5], [125, 438, 6], [133, 418, 6.2], [141, 399, 6.6], [147, 384, 8.5]], 24);
// Rectum et canal anal (de haut en bas) : g = face antérieure
const RE = ruban([[262, -12, 16], [276, 56, 18], [284, 128, 20], [284, 204, 21.5], [273, 274, 22.5], [255, 330, 22], [234, 370, 19], [216, 398, 15], [210, 422, 12.5], [211, 452, 12], [214, 488, 12]], 60);

const DEB_V = 2; // premier échantillon utile
const nUT = UT.length - 1;

// Vessie : contour avant fixe, dôme et base collés à l'utérus et au vagin (par décalage de leurs bords)
const vessie = () => {
    const kA = 11; const kB = 31;
    const dome = dehors(entre(sideG(UT), kA, kB), entre(UT, kA, kB), 1, 3.2);
    const jB = plusProche(sideD(VG), [154, 396]); const jH = plusProche(sideD(VG), dome[dome.length - 1]);
    const base = dehors(entre(sideD(VG), jH, jB), entre(VG, jH, jB), -1, 2.4);
    const avant = [[142, 395], [126, 376], [110, 353], [101, 329], [98, 307], [103, 292], [115, 285]];
    return [...avant, ...dome, ...base];
};
const VES = vessie();
const VES_LUMEN = (() => {
    const cx = VES.reduce((s, p) => s + p[0], 0) / VES.length; const cy = VES.reduce((s, p) => s + p[1], 0) / VES.length;
    return VES.map((p) => [cx + (p[0] - cx) * 0.8 + 1.5, cy + (p[1] - cy) * 0.79 + 2]);
})();

// Points d'attache des culs-de-sac vaginaux sur le col
const attache = (sideV, sideU, kmin, kmax) => {
    let m = 1e9; let res = [0, kmin];
    for (let j = 18; j < sideV.length; j += 1) {
        for (let k = kmin; k <= kmax; k += 1) {
            const dd = Math.hypot(sideV[j][0] - sideU[k][0], sideV[j][1] - sideU[k][1]);
            if (dd < m) { m = dd; res = [j, k]; }
        }
    }
    return res;
};
const [jAnt, kAnt] = attache(sideD(VG), sideG(UT), 31, 37);
const [jPost, kPost] = attache(sideG(VG), sideD(UT), 25, 33);

const ZONE_VAGIN = () => [...sideD(VG).slice(0, jAnt + 1), ...entre(sideG(UT), kAnt, nUT), ...entre(sideD(UT), nUT, kPost), ...retourne(sideG(VG).slice(0, jPost + 1))];
const ZONE_COL = () => contour(UT, KI, nUT, 0, 0.9);
const ZONE_UTERUS = () => contour(UT, 0, KI, 0.9, 0);

// cul-de-sac de Douglas : de la face postérieure de l'utérus à la face antérieure du rectum
const DOUGLAS = (() => {
    const k0 = 19;
    const haut = RE.findIndex((q) => q.g[1] > 270);
    const bas = RE.findIndex((q) => q.g[1] > 378);
    const jb = plusProche(sideG(VG), [188, 372]);
    const ut = entre(sideD(UT), k0, kPost);
    const vag = retourne(entre(sideG(VG), jb, jPost));
    const rec = entre(sideG(RE), bas, haut);
    return [...ut, ...vag, ...rec];
})();

// Sacrum et coccyx
const SAC_AV = [[300, -8], [313, 56], [325, 128], [331, 200], [325, 270], [309, 330], [289, 378], [270, 414]];
const SAC_AR = [[394, -8], [408, 56], [418, 128], [422, 200], [414, 270], [396, 332], [366, 384], [322, 430]];
const CL = ruban([[86, 414, 4], [93, 428, 4.6], [100, 441, 5.2], [105, 449, 4.2]], 14);
const SACRUM = [...SAC_AV, [262, 428], [276, 436], [300, 438], ...retourne(SAC_AR)];

const CORPS = [[34, -14], [31, 90], [31, 190], [37, 270], [48, 338], [62, 390], [80, 421], [93, 439], [105, 450], [116, 459], [127, 467], [146, 474], [162, 487], [190, 495], [213, 499], [246, 495], [296, 488], [352, 476], [420, 440], [462, 382], [476, 290], [478, 150], [472, -14]];

const decorSagittale = (c) => {
    const P = SAG; const u = (s) => `url(#${P}${s})`;
    const t = teintes(c); const S = c.sombre;
    const tr = c.trait; const fin = c.traitFin;
    const mus = (d, nom) => piece(P, nom, d, t, t.mus, { trait: S ? '#c98b8f' : '#b97a7f', tw: 1 });

    const dUT = lisse(contour(UT, 0, nUT, 0.9, 0.9), true);
    const dCOL = lisse(contour(UT, KI, nUT, 0, 0.9), true);
    const dVG = lisse(contour(VG, 0, VG.length - 1, 0.7, 0.9), true);
    const dVL = lisse(contour(VL, 0, VL.length - 1, 0.9, 1), true);
    const dUR = lisse(contour(UR, 0, UR.length - 1, 0.9, 0.9), true);
    const dRE = lisse(contour(RE, 0, RE.length - 1, 0, 0.9), true);
    const dVES = lisse(VES, true);
    const dVESL = lisse(VES_LUMEN, true);
    const dSAC = lisse(SACRUM, true);
    const dCORPS = lisse(CORPS.concat([[34, -14]]), false) + 'Z';

    // cavité endométriale et canal cervical
    const cavite = ruban([[128, 245, 1.6], [146, 259, 5], [166, 276, 5.2], [186, 292, 3.4], [203, 305, 1.7]], 24);
    const canal = ruban([[203, 305, 1.7], [207, 324, 2.2], [202, 341, 2.2], [193, 358, 2.6]], 20);
    const endo = ruban([[127, 244, 3], [146, 258, 9], [166, 275, 9], [186, 291, 6], [203, 305, 3.4]], 24);

    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <linearGradient id={`${P}fondu-g`} gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="0" y2="520">
                    <stop offset="0" stopColor="#000" /><stop offset="0.1" stopColor="#fff" /><stop offset="1" stopColor="#fff" />
                </linearGradient>
                <mask id={`${P}fondu`} maskUnits="userSpaceOnUse" x="-80" y="150" width="640" height="400"><rect x="-80" y="150" width="640" height="400" fill={u('fondu-g')} /></mask>
                <linearGradient id={`${P}g-corps`} x1="0" y1="0" x2="1" y2="0.6">
                    <stop offset="0" stopColor={c.chairClair} /><stop offset="0.5" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <clipPath id={`${P}cp-corps`}><path d={dCORPS} /></clipPath>
                {degrade(`${P}g-ut`, t.ut)}{degrade(`${P}g-col`, t.col)}{degrade(`${P}g-vag`, t.vag, [0, 1, 1, 0])}
                {degrade(`${P}g-ves`, t.ves)}{degrade(`${P}g-ure`, t.ure)}{degrade(`${P}g-rec`, t.rec, [0, 0, 1, 0.3])}
                {degrade(`${P}g-sac`, t.sac, [0, 0, 1, 0])}{degrade(`${P}g-mus`, t.mus)}
                {degrade(`${P}g-vesl`, [t.ves[0], t.ves[0], t.ves[1]])}
                {degrade(`${P}g-os`, t.sac, [0, 0, 1, 1])}
                <linearGradient id={`${P}douglas`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={S ? '#cdb892' : '#fff3d6'} stopOpacity="0" /><stop offset="0.35" stopColor={S ? '#cdb892' : '#fff3d6'} stopOpacity={S ? 0.3 : 0.85} /><stop offset="1" stopColor={S ? '#cdb892' : '#f3dcae'} stopOpacity={S ? 0.4 : 0.95} />
                </linearGradient>
            </defs>

            <g mask={u('fondu')}>
                {/* silhouette du bassin en coupe */}
                <path d={dCORPS} fill={u('g-corps')} stroke="none" />
                <g clipPath={u('cp-corps')}>
                    <path d={dCORPS} stroke={c.chairOmbre} strokeWidth="40" opacity="0.10" />
                    <path d={dCORPS} stroke={c.chairOmbre} strokeWidth="22" opacity="0.14" />
                    <path d={dCORPS} stroke={c.chairOmbre} strokeWidth="9" opacity="0.22" />
                </g>
                <path d={dCORPS} stroke={tr} strokeWidth="1.5" />

                {/* paroi abdominale : muscle droit et péritoine */}
                <path d={poly([[45, -14], [64, -14], [66, 300], [71, 324], [60, 330], [50, 302]])} fill={u('g-mus')} stroke={S ? '#c98b8f' : '#b97a7f'} strokeWidth="1" opacity="0.85" />
                <path d={lisse([[66, 150], [67, 236], [70, 268], [82, 281], [99, 286]])} stroke={t.peri} strokeWidth="1.3" opacity="0.9" />

                {/* sacrum, coccyx */}
                <path d={dSAC} fill={u('g-sac')} stroke="none" />
                <clipPath id={`${P}cp-sac`}><path d={dSAC} /></clipPath>
                <g clipPath={u('cp-sac')}>
                    <path d={dSAC} stroke={t.sac[2]} strokeWidth="14" opacity="0.28" />
                    <path d={lisse([[352, -8], [366, 56], [376, 128], [380, 200], [372, 270], [354, 330], [330, 372]])} stroke={t.sac[2]} strokeWidth="10" opacity="0.22" />
                    {[[308, 38, 373, 34], [320, 104, 384, 100], [329, 168, 392, 166], [330, 232, 392, 232], [322, 292, 386, 298]].map((s, i) => (
                        <path key={i} d={`M${s[0]} ${s[1]}L${s[2]} ${s[3]}`} stroke={t.sacTrait} strokeWidth="1.1" opacity="0.7" />
                    ))}
                </g>
                <path d={dSAC} stroke={t.sacTrait} strokeWidth="1.4" />
                <path d={lisse([[356, 8], [368, 66], [377, 130], [379, 200], [372, 266], [356, 322], [336, 360]])} stroke={t.sacTrait} strokeWidth="1" opacity="0.6" strokeDasharray="2 3" />

                {/* symphyse pubienne */}
                {piece(P, 'pubis', lisse([[50, 330], [66, 318], [86, 326], [93, 350], [91, 378], [82, 402], [68, 412], [55, 400], [49, 370]], true), t, t.sac, { trait: t.sacTrait, tw: 1.4 })}
                <path d={lisse([[62, 336], [66, 352], [68, 372], [66, 392]])} stroke={t.sacTrait} strokeWidth="0.9" opacity="0.5" />
                <ellipse cx="72" cy="367" rx="4.2" ry="26" fill={S ? '#46566d' : '#cfc4aa'} opacity="0.8" transform="rotate(5 72 367)" />
                {piece(P, 'clit', lisse(contour(CL, 0, CL.length - 1, 0.9, 1), true), t, t.tube, { trait: S ? '#e3a2ac' : '#c45e77', tw: 1 })}

                {/* plancher pelvien : élévateur de l'anus, sphincter externe */}
                <path d={lisse([[230, 392], [246, 402], [262, 416], [270, 424]])} stroke={t.mus[1]} strokeWidth="9" opacity="0.9" />
                <path d={lisse([[230, 392], [246, 402], [262, 416], [270, 424]])} stroke={t.mus[0]} strokeWidth="3" opacity="0.6" />
                {[1, -1].map((sd) => (
                    <g key={sd}>
                        <path d={lisse(lat(RE, sd * 1.7).slice(46))} stroke={t.mus[1]} strokeWidth="7" opacity="0.95" />
                        <path d={lisse(lat(RE, sd * 1.7).slice(46))} stroke={t.mus[0]} strokeWidth="2" opacity="0.5" />
                    </g>
                ))}

                {/* douglas : espace péritonéal entre l'utérus et le rectum */}
                <path d={poly(DOUGLAS)} fill={u('douglas')} stroke="none" />

                {/* vessie */}
                {piece(P, 'ves', dVES, t, t.ves, { trait: S ? '#9fb7da' : '#6f94c4' })}
                <path d={dVESL} fill={u('g-vesl')} stroke={S ? '#a8c0e2' : '#a9c6e8'} strokeWidth="1" opacity="0.95" />
                <ellipse cx="124" cy="318" rx="14" ry="8" fill={t.blanc} opacity={S ? 0.18 : 0.6} transform="rotate(-24 124 318)" />

                {/* urètre */}
                {piece(P, 'ure', dUR, t, t.ure, { trait: S ? '#9fb7da' : '#6f94c4', tw: 1.1 })}
                <path d={lisse(axe(UR))} stroke={t.ves[2]} strokeWidth="1" opacity="0.7" />

                {/* rectum et canal anal */}
                {piece(P, 'rec', dRE, t, t.rec, { trait: S ? '#cfa985' : '#a97d52' })}
                <path d={lisse(lat(RE, 0.35).slice(0, 56))} stroke={t.rec[2]} strokeWidth="1.1" opacity="0.5" />
                <path d={lisse(lat(RE, -0.35).slice(0, 56))} stroke={t.rec[2]} strokeWidth="1.1" opacity="0.5" />

                {/* vagin */}
                {piece(P, 'vag', dVG, t, t.vag, { trait: S ? '#d79aa4' : '#b95f74' })}
                <path d={dVL} fill={t.lum} opacity="0.85" stroke="none" />

                {/* utérus : myomètre, endomètre, cavité */}
                {piece(P, 'ut', dUT, t, t.ut, { trait: S ? '#e3a2ac' : '#b7506a', tw: 1.5 })}
                <path d={dCOL} fill={u('g-col')} opacity="0.55" stroke="none" />
                <path d={lisse(contour(endo, 0, endo.length - 1, 1, 0.5), true)} fill={t.endo} opacity={S ? 0.4 : 0.8} stroke="none" />
                <path d={lisse(contour(cavite, 0, cavite.length - 1, 1, 0.6), true)} fill={t.lum} opacity="0.95" stroke="none" />
                <path d={lisse(contour(canal, 0, canal.length - 1, 0.4, 1), true)} fill={t.lum} opacity="0.9" stroke="none" />
                <ellipse cx="140" cy="251" rx="22" ry="7" fill={t.blanc} opacity={S ? 0.16 : 0.5} transform="rotate(38 140 251)" />
                <path d={lisse(contour(UT, 0, nUT, 0.9, 0.9), true)} stroke={S ? '#e3a2ac' : '#b7506a'} strokeWidth="1.5" />
            </g>
        </g>
    );
};

// ═════════════════════════ VUE DE FACE (coupe frontale) ═════════════════════════
const FRO = 'pelvis-frontale-b-';
const AX = 245;
const mir = (p) => [2 * AX - p[0], ...p.slice(1)];
const sym = (half) => [...half, ...half.slice(1, -1).reverse().map(mir)];
const mirAll = (pts) => pts.map(mir);

// Utérus (de haut en bas : fond → orifice externe) ; vagin ; trompe et ovaire du côté droit de la patiente (gauche de l'écran)
const UF = ruban([[245, 118, 26], [245, 136, 52], [245, 168, 48], [245, 203, 33], [245, 232, 23], [245, 262, 21.5], [245, 290, 18]], 40);
const KF = 27; const nF = UF.length - 1;
const VF = ruban([[245, 256, 42], [245, 290, 40], [245, 330, 28], [245, 386, 23], [245, 436, 25]], 48);
const VFL = ruban([[245, 296, 30], [245, 320, 24], [245, 350, 11], [245, 396, 9], [245, 434, 10]], 40);
const TUBE = ruban([[196, 141, 4.6], [176, 127, 4.8], [148, 117, 5.4], [120, 118, 6.2], [96, 132, 6.6], [82, 156, 6.8], [80, 180, 5.4], [88, 198, 3.6]], 44);
const OVF = ruban([[98, 206, 9], [112, 201, 16], [130, 197, 19], [148, 193, 15], [160, 190, 8]], 30);
const LIGUS = ruban([[214, 266, 5], [190, 280, 5.2], [160, 291, 5.6], [128, 290, 6], [102, 276, 6]], 30);
const kU0 = UF.findIndex((q) => q.c[1] >= 262); const kV0 = VF.findIndex((q) => q.c[1] >= 262);
const tipUF = (() => { const q = UF[nF]; return [q.c[0] + q.t[0] * q.w * 0.9, q.c[1] + q.t[1] * q.w * 0.9]; })();

const ZF_CORPS = () => contour(UF, 0, KF, 0.55, 0);
const ZF_COL = () => contour(UF, KF, nF, 0, 0.9);
const ZF_VAGIN = () => [...contour(VF, kV0, VF.length - 1, 0, 0.6), ...sideD(UF).slice(kU0), tipUF, ...retourne(sideG(UF).slice(kU0))];
const ZF_TUBE = () => contour(TUBE, 0, TUBE.length - 1, 0, 0.9);
const ZF_OV = () => contour(OVF, 0, OVF.length - 1, 0.9, 0.9);
const AIRE_ANN = [[196, 150], [170, 108], [120, 100], [78, 120], [56, 165], [62, 215], [100, 228], [150, 224], [190, 192]];
const ZF_LIG = () => contour(LIGUS, 0, LIGUS.length - 1, 0, 0.9);
const AIRE_LIG = [[200, 254], [150, 262], [96, 258], [88, 300], [150, 314], [200, 306]];

const BONE_EXT = [[245, 8], [180, 4], [110, 14], [56, 44], [26, 96], [20, 150], [34, 205], [52, 250], [58, 306], [68, 368], [98, 424], [150, 462], [205, 484], [245, 490]];
const BONE_INT = [[245, 50], [190, 52], [130, 64], [88, 100], [72, 156], [76, 212], [86, 262], [102, 312], [126, 358], [160, 402], [205, 440], [245, 462]];
const CORPS_F = [[245, -10], [22, -10], [6, 100], [8, 200], [26, 290], [46, 370], [86, 440], [150, 492], [245, 506]];
const CAVITE_F = [[245, 228], [233, 202], [221, 176], [212, 152], [219, 146], [232, 150], [245, 158]];
const VESSIE_F = [[245, 318], [216, 323], [192, 338], [186, 358], [198, 376], [222, 386], [245, 389]];

const decorFrontale = (c) => {
    const P = FRO; const u = (s) => `url(#${P}${s})`;
    const t = teintes(c); const S = c.sombre;
    const tr = c.trait;
    const traitMus = S ? '#c98b8f' : '#b97a7f';
    const dBone = lisse(sym(BONE_EXT), true) + lisse(sym(BONE_INT), true);
    const dCorps = lisse(sym(CORPS_F), true);
    const dUT = lisse(contour(UF, 0, nF, 0.55, 0.9), true);
    const dCOL = lisse(contour(UF, KF, nF, 0, 0.9), true);
    const dVG = lisse(contour(VF, 0, VF.length - 1, 0.35, 0.6), true);
    const dVGL = lisse(contour(VFL, 0, VFL.length - 1, 0.6, 0.6), true);
    const dCAV = lisse(sym(CAVITE_F), true);
    const canal = ruban([[245, 232, 2.2], [245, 262, 2.6], [245, 292, 3]], 16);
    const dVES = lisse(sym(VESSIE_F), true);
    const cx = AX; const cy = 353;
    const dVESL = lisse(sym(VESSIE_F).map((p) => [cx + (p[0] - cx) * 0.78, cy + (p[1] - cy) * 0.74 + 1]), true);
    const dURE = lisse(contour(ruban([[245, 392, 6], [245, 426, 5.5]], 8), 0, 8, 0, 0.9), true);

    const cote = (Q, mirrored) => {
        const k = (s) => `${s}${mirrored ? 'm' : ''}`;
        const dTUBE = lisse(contour(TUBE, 0, TUBE.length - 1, 0, 0.9), true);
        const dOV = lisse(contour(OVF, 0, OVF.length - 1, 0.9, 0.9), true);
        const dLIGUS = lisse(contour(LIGUS, 0, LIGUS.length - 1, 0, 0.9), true);
        return (
            <g transform={mirrored ? `translate(${2 * AX} 0) scale(-1 1)` : undefined}>
                {/* anatomie osseuse discrète : acétabulum et trou obturateur */}
                <circle cx="58" cy="236" r="15" fill={t.sac[1]} opacity="0.45" stroke={t.sacTrait} strokeWidth="1" />
                <ellipse cx="104" cy="372" rx="14" ry="27" transform="rotate(12 104 372)" fill={c.chair} stroke={t.sacTrait} strokeWidth="1.2" />
                {/* releveur de l'anus */}
                {piece(Q, k('lev'), lisse([[100, 330], [126, 372], [162, 408], [205, 436], [222, 446], [222, 428], [192, 402], [154, 368], [128, 334], [110, 318]], true), t, t.mus, { trait: traitMus, tw: 1, force: 0.3 })}
                {/* ligament large : feuillet péritonéal entre l'utérus et la paroi pelvienne */}
                <path d={lisse([[203, 138], [176, 122], [148, 114], [120, 115], [96, 128], [84, 152], [82, 200], [84, 244], [96, 272], [130, 286], [170, 292], [205, 292]], true)} fill={t.lig} opacity={S ? 0.32 : 0.5} stroke={t.lig} strokeWidth="1.1" />
                <path d={lisse([[190, 160], [150, 150], [112, 150], [90, 168]])} stroke={t.lig} strokeWidth="1" opacity="0.7" />
                <path d={lisse([[196, 240], [150, 236], [110, 244], [92, 260]])} stroke={t.lig} strokeWidth="1" opacity="0.7" />
                {/* ligament rond et ligament utéro-ovarien */}
                <path d={lisse([[205, 168], [185, 215], [150, 248], [110, 268], [92, 292]])} stroke={t.lig} strokeWidth="3" opacity="0.95" />
                <path d={lisse([[158, 190], [182, 188], [204, 178]])} stroke={t.lig} strokeWidth="4.5" opacity="0.95" />
                {/* ligament utéro-sacré */}
                {piece(Q, k('lus'), dLIGUS, t, [t.lig, t.lig, S ? '#8f6f6a' : '#b88f84'], { trait: S ? '#d3b3ad' : '#b08275', tw: 1, force: 0.4 })}
                {/* ovaire */}
                {piece(Q, k('ov'), dOV, t, t.ov, { trait: S ? '#d4a898' : '#c08a74', tw: 1.2 })}
                {[[120, 202, 5], [134, 192, 6.2], [146, 200, 4.4], [108, 207, 3.6]].map((f, i) => (
                    <g key={i}><circle cx={f[0]} cy={f[1]} r={f[2]} fill={t.foll} stroke={t.follTrait} strokeWidth="0.9" /><circle cx={f[0] - f[2] * 0.3} cy={f[1] - f[2] * 0.3} r={f[2] * 0.28} fill={t.blanc} opacity="0.8" /></g>
                ))}
                {/* trompe : portion interstitielle, isthme, ampoule, pavillon et franges */}
                {piece(Q, k('tub'), dTUBE, t, t.tube, { trait: S ? '#e3a2ac' : '#c45e77', tw: 1.1, force: 0.45 })}
                <path d={lisse(axe(TUBE).slice(4))} stroke={t.lum} strokeWidth="1" opacity="0.5" />
                {[[[88, 198], [74, 204], [70, 214]], [[88, 198], [82, 210], [86, 220]], [[88, 198], [96, 212], [102, 218]], [[88, 198], [72, 196], [66, 190]]].map((f, i) => (
                    <path key={i} d={`M${f[0][0]} ${f[0][1]}Q${f[1][0]} ${f[1][1]} ${f[2][0]} ${f[2][1]}`} stroke={t.fimb} strokeWidth="2.6" />
                ))}
            </g>
        );
    };

    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <linearGradient id={`${P}g-corps`} x1="0" y1="0" x2="1" y2="0.7">
                    <stop offset="0" stopColor={c.chairClair} /><stop offset="0.5" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                </linearGradient>
                <clipPath id={`${P}cp-corps`}><path d={dCorps} /></clipPath>
                <clipPath id={`${P}cp-bone`}><path d={dBone} clipRule="evenodd" /></clipPath>
                {[P, `${P}m-`].map((Z) => (
                    <React.Fragment key={Z}>
                        {degrade(`${Z}g-ov`, t.ov)}{degrade(`${Z}g-tub`, t.tube)}{degrade(`${Z}g-lev`, t.mus)}
                        {degrade(`${Z}g-lus`, [t.lig, t.lig, S ? '#8f6f6a' : '#b88f84'])}
                    </React.Fragment>
                ))}
                {degrade(`${P}g-ut`, t.ut)}{degrade(`${P}g-col`, t.col)}{degrade(`${P}g-vag`, t.vag, [0, 1, 1, 0])}
                {degrade(`${P}g-ves`, t.ves)}{degrade(`${P}g-ure`, t.ure)}{degrade(`${P}g-os`, t.sac)}
                {degrade(`${P}g-vesl`, [t.ves[0], t.ves[0], t.ves[1]])}
            </defs>

            {/* silhouette du bassin */}
            <path d={dCorps} fill={u('g-corps')} stroke="none" />
            <g clipPath={u('cp-corps')}>
                <path d={dCorps} stroke={c.chairOmbre} strokeWidth="40" opacity="0.10" />
                <path d={dCorps} stroke={c.chairOmbre} strokeWidth="20" opacity="0.14" />
            </g>
            <path d={dCorps} stroke={tr} strokeWidth="1.5" />

            {/* ceinture pelvienne : os iliaques, sacrum, pubis (discret) */}
            <path d={dBone} fillRule="evenodd" fill={u('g-os')} opacity="0.78" stroke="none" />
            <g clipPath={u('cp-bone')}>
                <path d={lisse(sym(BONE_INT), true)} stroke={t.sac[2]} strokeWidth="14" opacity="0.22" />
                <path d={lisse(sym(BONE_EXT), true)} stroke={t.sac[2]} strokeWidth="12" opacity="0.2" />
            </g>
            <path d={lisse(sym(BONE_EXT), true)} stroke={t.sacTrait} strokeWidth="1.3" />
            <path d={lisse(sym(BONE_INT), true)} stroke={t.sacTrait} strokeWidth="1.3" />
            <path d={lisse([[245, 462], [245, 490]])} stroke={t.sacTrait} strokeWidth="1" opacity="0.7" />
            <ellipse cx="245" cy="476" rx="5" ry="13" fill={S ? '#46566d' : '#cfc4aa'} opacity="0.75" />

            {cote(P, false)}
            {cote(`${P}m-`, true)}

            {/* vagin */}
            {piece(P, 'vag', dVG, t, t.vag, { trait: S ? '#d79aa4' : '#b95f74' })}
            <path d={dVGL} fill={t.lum} opacity="0.6" stroke="none" />

            {/* utérus : myomètre, endomètre, cavité triangulaire, col */}
            {piece(P, 'ut', dUT, t, t.ut, { trait: S ? '#e3a2ac' : '#b7506a', tw: 1.5 })}
            <path d={dCOL} fill={u('g-col')} opacity="0.6" stroke="none" />
            <path d={lisse([[222, 232], [245, 236], [268, 232]])} stroke={S ? '#e3a2ac' : '#b7506a'} strokeWidth="1" opacity="0.5" />
            <path d={dCAV} fill={t.endo} opacity={S ? 0.4 : 0.85} stroke={t.endo} strokeWidth="5" />
            <path d={dCAV} fill={t.lum} opacity="0.92" stroke="none" />
            <path d={lisse(contour(canal, 0, canal.length - 1, 0.4, 0.8), true)} fill={t.lum} opacity="0.9" stroke="none" />
            <ellipse cx="222" cy="150" rx="24" ry="7" fill={t.blanc} opacity={S ? 0.16 : 0.5} transform="rotate(-24 222 150)" />
            <path d={dUT} stroke={S ? '#e3a2ac' : '#b7506a'} strokeWidth="1.5" />

            {/* vessie en avant (vue par transparence) et urètre */}
            <g opacity="0.62">
                {piece(P, 'ure', dURE, t, t.ure, { trait: S ? '#9fb7da' : '#6f94c4', tw: 1 })}
                {piece(P, 'ves', dVES, t, t.ves, { trait: S ? '#9fb7da' : '#6f94c4' })}
                <path d={dVESL} fill={u('g-vesl')} stroke={S ? '#a8c0e2' : '#a9c6e8'} strokeWidth="1" opacity="0.95" />
            </g>
        </g>
    );
};

// ═════════════════════════ ZONES ═════════════════════════
const CST_UTERUS = ['Antéversé, mobile, indolore, de taille normale', 'Rétroversé', 'Augmenté de volume', 'Irrégulier (fibromes)', 'Gravide (volume en rapport avec le terme)', 'Fixé, immobile', 'Douloureux à la mobilisation'];
const CST_COL = ['Normal, long et fermé', 'Court / ouvert', 'Douloureux à la mobilisation', 'Saignant'];
const CST_ANNEXE = ['Libres, indolores', 'Masse annexielle palpable', 'Empâtement douloureux', 'Ovaire augmenté de volume'];
const CST_DOUGLAS = ['Libre, indolore', 'Comblé', 'Bombant', 'Douloureux (cri du Douglas)'];
const CST_VESSIE = ['Non palpable', 'Globe vésical', 'Douleur sus-pubienne'];
const CST_VAGIN = ['Souple, indolore', 'Leucorrhées', 'Saignement', 'Cystocèle', 'Rectocèle', 'Masse ou lésion palpable', 'Douloureux'];
const CST_RECTUM = ['Libre, indolore', 'Masse palpable', 'Douloureux', 'Sang sur le doigtier'];
const CST_LIG = ['Souples, indolores', 'Douloureux', 'Nodulaires', 'Épaissis, rétractés'];

export default {
    id: 'pelvis',
    titre: 'Pelvis féminin : toucher vaginal',
    vues: [
        {
            id: 'sagittale', titre: 'Coupe sagittale', viewBox: '-40 180 530 325', largeur: 460,
            decor: decorSagittale,
            etiquettes: [{ x: 40, y: 200, texte: 'Avant', ancre: 'start', taille: 12 }, { x: 476, y: 200, texte: 'Arrière', ancre: 'end', taille: 12 }],
            zones: {
                s_vessie: zone('Vessie', 'Pelvis', CST_VESSIE, [chemin(lisse(VES, true))]),
                s_uterus: zone('Utérus', 'Pelvis', CST_UTERUS, [chemin(poly(ZONE_UTERUS()))]),
                s_col: zone('Col utérin', 'Pelvis', CST_COL, [chemin(poly(ZONE_COL()))]),
                s_douglas: zone('Cul-de-sac de Douglas', 'Pelvis', CST_DOUGLAS, [chemin(poly(DOUGLAS)), aire(chemin(poly(DOUGLAS)))]),
                s_vagin: zone('Vagin', 'Pelvis', CST_VAGIN, [chemin(poly(ZONE_VAGIN()))]),
                s_rectum: zone('Rectum', 'Pelvis', CST_RECTUM, [chemin(poly(contour(RE, 0, RE.length - 1, 0, 0.9)))]),
            },
        },
        {
            id: 'frontale', titre: 'Vue de face', viewBox: '0 0 490 510', largeur: 430,
            decor: decorFrontale,
            etiquettes: [{ x: 14, y: 24, texte: 'Droite', ancre: 'start', taille: 12 }, { x: 476, y: 24, texte: 'Gauche', ancre: 'end', taille: 12 }],
            zones: {
                f_corps: zone('Utérus (corps)', 'Pelvis', CST_UTERUS, [chemin(lisse(ZF_CORPS(), true))]),
                f_col: zone('Col utérin', 'Pelvis', CST_COL, [chemin(lisse(ZF_COL(), true))]),
                f_annexe_d: zone('Annexe droite', 'Pelvis', CST_ANNEXE, [chemin(lisse(ZF_TUBE(), true)), chemin(lisse(ZF_OV(), true)), aire(chemin(poly(AIRE_ANN)))]),
                f_annexe_g: zone('Annexe gauche', 'Pelvis', CST_ANNEXE, [chemin(lisse(mirAll(ZF_TUBE()), true)), chemin(lisse(mirAll(ZF_OV()), true)), aire(chemin(poly(mirAll(AIRE_ANN))))]),
                f_lig: zone('Ligaments utéro-sacrés', 'Pelvis', CST_LIG, [chemin(lisse(ZF_LIG(), true)), chemin(lisse(mirAll(ZF_LIG()), true)), aire(chemin(poly(AIRE_LIG))), aire(chemin(poly(mirAll(AIRE_LIG))))]),
                f_vagin: zone('Vagin', 'Pelvis', CST_VAGIN, [chemin(poly(ZF_VAGIN()))]),
            },
        },
    ],
};
