import React from 'react';
import { zone, chemin, cercle, aire } from './outils';

// ─────────────────────────────────────────────────────────────────────────────
//  SEINS ET AIRES GANGLIONNAIRES — version « Illustration moderne »
//  Thorax antérieur d'une femme, bras légèrement écartés (les aisselles restent ouvertes).
//  Axe de symétrie x = 210 ; échelle ≈ 8 unités par centimètre.
//  Droit de la patiente = GAUCHE de l'écran.
//  Les seins sont décrits en coordonnées polaires autour du mamelon : une même fonction
//  rayon(θ) sert à dessiner le sein ET à découper les quadrants (donc zones et dessin coïncident).
// ─────────────────────────────────────────────────────────────────────────────

const AX = 210;
const r1 = (n) => Math.round(n * 10) / 10;
const mir = (p) => [2 * AX - p[0], p[1]];
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
const L = (p) => `L${r1(p[0])} ${r1(p[1])}`;
const miroir = (pts) => pts.map(mir);

// ═════════════════════════ SILHOUETTE (moitié gauche de l'écran, puis reflet) ═════════════════════════
// A = ligne extérieure (cou, trapèze, épaule, deltoïde, bras) ; B = face interne du bras jusqu'au creux axillaire (arrondi), puis flanc.
// L'aisselle est « fermée » au-dessus du point F (pli axillaire antérieur) : le creux axillaire est donc entièrement DANS la silhouette.
const A = [[166, -24], [166, 8], [163, 28], [151, 42], [127, 51], [103, 59], [81, 65], [64, 75], [48, 92], [37, 114], [29, 140], [21, 166], [9, 194], [-14, 236]];
const B = [[-10, 338], [4, 330], [18, 298], [36, 264], [54, 234], [69, 213], [81, 201], [88, 195], [92, 194], [93, 200], [91, 212], [88, 230], [87, 250], [90, 274], [96, 302], [102, 332], [105, 384]];
const FLANC = B.slice(8);
const CORPS = `M${r1(A[0][0])} ${r1(A[0][1])}${cmds(A)}${L(B[0])}${cmds(B)}${L(mir(B[B.length - 1]))}${cmds(miroir(B).reverse())}${L(mir(A[A.length - 1]))}${cmds(miroir(A).reverse())}Z`;

// ═════════════════════════ SEINS ═════════════════════════
// u = vers l'extérieur (côté aisselle), v = vers le bas, origine = mamelon.
// Les deux seins sont strictement symétriques (même échelle, même hauteur) : l'asymétrie clinique se note par les constats.
const COTES = {
    d: { dir: -1, nx: AX - 68, ny: 240, s: 1 },
    g: { dir: 1, nx: AX + 68, ny: 240, s: 1 },
};
const loc = (k, t, r) => [COTES[k].nx + COTES[k].dir * Math.cos(rad(t)) * r * COTES[k].s, COTES[k].ny + Math.sin(rad(t)) * r * COTES[k].s];
const pl = (k, u, v) => [COTES[k].nx + COTES[k].dir * u * COTES[k].s, COTES[k].ny + v * COTES[k].s];

// Rayon du sein (en unités locales) selon la direction θ (degrés, 0 = vers l'extérieur, 90 = vers le bas, -90 = vers le haut)
const ANCRES = [[-180, 56], [-160, 56], [-135, 56], [-110, 57], [-90, 58], [-70, 60], [-55, 62], [-43, 63], [-30, 58], [-15, 54], [0, 51],
    [25, 54], [50, 63], [70, 68], [90, 68], [110, 66], [130, 62], [150, 58], [170, 56], [180, 56]];
const EXT = [[ANCRES[ANCRES.length - 2][0] - 360, ANCRES[ANCRES.length - 2][1]], ...ANCRES, [ANCRES[1][0] + 360, ANCRES[1][1]]];
const pente = (i) => (EXT[i + 1][1] - EXT[i - 1][1]) / (EXT[i + 1][0] - EXT[i - 1][0]);
const rayon = (t) => {
    const a = ((((t + 180) % 360) + 360) % 360) - 180;
    let i = 1;
    while (i < EXT.length - 2 && EXT[i + 1][0] < a) i += 1;
    const [t0, r0] = EXT[i]; const [t1, r1_] = EXT[i + 1];
    const h = t1 - t0; const s = (a - t0) / h; const s2 = s * s; const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * r0 + (s3 - 2 * s2 + s) * h * pente(i) + (-2 * s3 + 3 * s2) * r1_ + (s3 - s2) * h * pente(i + 1);
};
const R_RA = 28; // rayon de la région rétro-aréolaire
const R_MAM = 8; // rayon du mamelon
// Prolongement axillaire : fuseau qui part du quadrant supéro-externe vers le creux axillaire (de -70° à -20°), épaisseur max 11 u
const PA_A = -70; const PA_B = -20;
const W_PA = (t) => (t > PA_A && t < PA_B ? 11 * Math.sin((Math.PI * (t - PA_A)) / (PA_B - PA_A)) : 0);
const rayonSE = (t) => rayon(t) - W_PA(t);

const suite = (k, a, b, pas) => { const o = []; const n = Math.max(2, Math.ceil(Math.abs(b - a) / pas)); for (let i = 0; i <= n; i += 1) { const t = a + ((b - a) * i) / n; o.push(loc(k, t, rayon(t))); } return o; };
const contour = (k) => lisse(suite(k, -180, 180 - 3, 3), true);
const arc = (k, a, b, f, pas = 4) => { const o = []; const n = Math.max(2, Math.ceil(Math.abs(b - a) / pas)); for (let i = 0; i <= n; i += 1) { const t = a + ((b - a) * i) / n; o.push(loc(k, t, f(t))); } return o; };
const secteur = (k, a, b, f1, f2) => poly(arc(k, a, b, f2).concat(arc(k, b, a, f1)));
const cercleLoc = (k, r, sens = 1, pas = 10) => { const o = []; for (let t = 0; t < 360; t += pas) o.push(loc(k, sens * t, r)); return o; };
const anneau = (k, r0, r1_) => `${poly(cercleLoc(k, r1_, 1))}${poly(cercleLoc(k, r0, -1))}`;

const CST_SEIN = ['Normal', 'Nodule', 'Masse dure fixée', 'Placard induré', 'Sensible à la palpation', 'Rétraction cutanée', 'Peau d\'orange', 'Érythème', 'Épaississement cutané', 'Ulcération'];
const CST_RETRO = ['Normal', 'Nodule', 'Masse dure fixée', 'Sensible à la palpation', 'Écoulement', 'Rétraction cutanée', 'Peau d\'orange', 'Érythème', 'Épaississement cutané', 'Asymétrie'];
const CST_MAMELON = ['Normal', 'Écoulement', 'Écoulement sanglant', 'Rétraction', 'Ombilication', 'Eczéma', 'Érythème', 'Ulcération'];
// tracé de repos des zones du sein volontairement discret (le trait ne sert qu'à guider ; l'état se lit au remplissage)
const DISCRET = { strokeOpacity: 0.5 };

const zonesSein = (k, nomCote, prefixe) => {
    const g = `Sein ${nomCote}`;
    const z = (lib, cst, d, aires = []) => zone(`Sein ${nomCote} — ${lib}`, g, cst, [chemin(d, DISCRET), ...aires.map(aire)]);
    const [mx0, my0] = [COTES[k].nx, COTES[k].ny];
    const quadrant = (a, b, f) => [chemin(secteur(k, a, b, () => R_RA - 3, (t) => f(t) + 8))];
    const [cx, cy] = loc(k, -45, 56);
    return {
        // aire d'appui = quadrant élargi vers le centre (+3) et vers l'extérieur (+8) pour atteindre ≥ 28 u d'épaisseur utile
        [`${prefixe}_se`]: z('quadrant supéro-externe', CST_SEIN, secteur(k, -90, 0, () => R_RA, rayonSE), quadrant(-90, 0, rayonSE)),
        [`${prefixe}_si`]: z('quadrant supéro-interne', CST_SEIN, secteur(k, -180, -90, () => R_RA, rayon), quadrant(-180, -90, rayon)),
        [`${prefixe}_ie`]: z('quadrant inféro-externe', CST_SEIN, secteur(k, 0, 90, () => R_RA, rayon), quadrant(0, 90, rayon)),
        [`${prefixe}_ii`]: z('quadrant inféro-interne', CST_SEIN, secteur(k, 90, 180, () => R_RA, rayon), quadrant(90, 180, rayon)),
        [`${prefixe}_ra`]: z('région rétro-aréolaire', CST_RETRO, anneau(k, R_MAM, R_RA), [cercle(r1(mx0), r1(my0), 31)]),
        [`${prefixe}_pa`]: z('prolongement axillaire', CST_SEIN, secteur(k, PA_A, PA_B, rayonSE, rayon), [cercle(r1(cx), r1(cy), 22)]),
        [`${prefixe}_ma`]: zone(`Mamelon ${nomCote}`, g, CST_MAMELON,
            [chemin(poly(cercleLoc(k, R_MAM, 1)), DISCRET), aire(cercle(r1(mx0), r1(my0), 16))]),
    };
};

// ═════════════════════════ AIRES GANGLIONNAIRES (moitié gauche de l'écran = côté droit de la patiente) ═════════════════════════
// Aisselle : pyramide à sommet supérieur (sous la clavicule), entre le bord du grand pectoral (pli axillaire antérieur) et la face interne du bras ;
// elle reste au-dessus du point où le bras se sépare du flanc (donc entièrement dans la silhouette).
const GANG = {
    sus: [[184, 42], [162, 47], [142, 54], [124, 59], [108, 65], [118, 74], [140, 77], [162, 80], [184, 84], [191, 62]],
    sous: [[162, 96], [146, 87], [124, 82], [114, 92], [114, 114], [122, 133], [146, 138], [160, 126]],
    axil: [[98, 108], [105, 122], [111, 140], [115, 158], [116, 174], [110, 187], [96, 190], [80, 190], [68, 186], [68, 172], [75, 152], [85, 132], [92, 118]],
    mamm: [[177, 110], [191, 105], [205, 110], [205, 152], [205, 196], [191, 214], [177, 198], [176, 152]],
};
// aires d'appui (polygones droits, invisibles)
const AIRE = {
    sus: [[188, 40], [160, 46], [134, 52], [110, 62], [100, 68], [110, 76], [150, 78], [190, 78], [196, 60]],
    mamm: [[160, 102], [192, 98], [207, 104], [207, 202], [192, 222], [160, 202]],
};
const noeuds = {
    sus: [[172, 64, 6.4, 3.8, -14], [158, 62, 5.8, 3.5, -12], [144, 61, 5.4, 3.3, -16], [130, 63, 4.6, 3, -14]],
    sous: [[150, 104, 6.4, 4.2, 14], [136, 98, 5.8, 4, -10], [124, 106, 5.2, 3.6, 20], [132, 122, 5.4, 3.8, 6], [148, 124, 5, 3.4, -8]],
    axil: [[98, 122, 5.6, 4, 70], [100, 138, 6, 4.2, 75], [105, 151, 6.4, 4.4, 70], [107, 168, 6.2, 4.2, 80], [104, 182, 5.6, 3.8, 60],
        [92, 160, 7.4, 5, 40], [88, 177, 6.6, 4.4, 30], [84, 150, 5.4, 3.8, 55], [78, 170, 5.8, 4, 45]],
    mamm: [[191, 122, 3.8, 2.8, 80], [192, 146, 3.8, 2.8, 80], [193, 170, 3.8, 2.8, 80], [192, 194, 3.6, 2.6, 80]],
};

// ═════════════════════════ DÉCOR ═════════════════════════
const decorThorax = (vue) => (c) => {
    const P = `seins-${vue}-b-`;
    const u = (s) => `url(#${P}${s})`;
    const S = c.sombre;
    const blanc = S ? c.chairClair : '#ffffff';
    const aureole = S ? '#1a2230' : '#8493ab';
    const mamelonCol = S ? '#0f1621' : '#64748b';
    const ganglions = vue === 'ganglions';
    const lymphe = S ? '#4fc3ad' : '#2f9484';
    const lympheClair = S ? '#9be6d6' : '#8fdccb';

    const cote = (k) => {
        const { nx, ny, s } = COTES[k];
        const cont = contour(k);
        const bas = lisse(suite(k, -28, 208, 3));
        const imf = lisse(suite(k, 48, 132, 3));
        const [hx, hy] = pl(k, -12, -26);
        const g = (nom) => `url(#${P}${nom}-${k})`;
        return (
            <g key={k}>
                <defs>
                    <clipPath id={`${P}clip-${k}`}><path d={cont} /></clipPath>
                    <linearGradient id={`${P}fade-${k}`} gradientUnits="userSpaceOnUse" x1="0" y1={r1(ny - 66 * s)} x2="0" y2={r1(ny - 12 * s)}>
                        <stop offset="0" stopColor="#000" /><stop offset="0.45" stopColor="#6b6b6b" /><stop offset="1" stopColor="#fff" />
                    </linearGradient>
                    <mask id={`${P}masque-${k}`} maskUnits="userSpaceOnUse" x="0" y="0" width="420" height="360"><rect x="0" y="0" width="420" height="360" fill={g('fade')} /></mask>
                    <linearGradient id={`${P}fin-${k}`} gradientUnits="userSpaceOnUse" x1="0" y1={r1(ny - 52 * s)} x2="0" y2={r1(ny + 6 * s)}>
                        <stop offset="0" stopColor={c.traitFin} stopOpacity="0" /><stop offset="1" stopColor={c.traitFin} stopOpacity="1" />
                    </linearGradient>
                    <radialGradient id={`${P}sein-${k}`} gradientUnits="userSpaceOnUse" cx={r1(hx)} cy={r1(hy)} r={r1(104 * s)}>
                        <stop offset="0" stopColor={c.chairClair} /><stop offset="0.3" stopColor={c.chair} />
                        <stop offset="0.66" stopColor={c.chair} /><stop offset="1" stopColor={c.chairOmbre} />
                    </radialGradient>
                    <radialGradient id={`${P}reflet-${k}`} gradientUnits="userSpaceOnUse" cx={r1(hx)} cy={r1(hy)} r={r1(40 * s)}>
                        <stop offset="0" stopColor={blanc} stopOpacity={S ? 0.5 : 0.95} /><stop offset="1" stopColor={blanc} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id={`${P}areole-${k}`} cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor={aureole} stopOpacity="0.8" /><stop offset="0.86" stopColor={aureole} stopOpacity="0.68" />
                        <stop offset="1" stopColor={aureole} stopOpacity="0.5" />
                    </radialGradient>
                    <radialGradient id={`${P}halo-${k}`} cx="0.5" cy="0.5" r="0.5">
                        <stop offset="0" stopColor={aureole} stopOpacity="0.5" /><stop offset="0.8" stopColor={aureole} stopOpacity="0.4" />
                        <stop offset="1" stopColor={aureole} stopOpacity="0" />
                    </radialGradient>
                </defs>
                {/* ombre portée sous le pli sous-mammaire */}
                <g transform="translate(0 4)" stroke={c.chairOmbre} fill="none">
                    <path d={imf} strokeWidth="18" opacity="0.1" /><path d={imf} strokeWidth="11" opacity="0.16" /><path d={imf} strokeWidth="5" opacity="0.26" />
                </g>
                {/* galbe : se fond dans le thorax et le pectoral vers le haut, pôle supérieur progressif */}
                <g mask={g('masque')}>
                    <path d={cont} fill={g('sein')} stroke="none" />
                    <g clipPath={g('clip')} fill="none" stroke={c.chairOmbre}>
                        <path d={bas} strokeWidth="44" opacity="0.1" /><path d={bas} strokeWidth="28" opacity="0.14" />
                        <path d={bas} strokeWidth="15" opacity="0.2" /><path d={bas} strokeWidth="6" opacity="0.28" />
                    </g>
                </g>
                <ellipse cx={r1(hx)} cy={r1(hy)} rx={r1(34 * s)} ry={r1(30 * s)} fill={g('reflet')} />
                {/* contours : flanc et pli sous-mammaire nets, qui s'estompent vers le haut et vers le sillon */}
                <path d={bas} fill="none" stroke={g('fin')} strokeWidth="1.2" />
                <path d={imf} fill="none" stroke={c.trait} strokeWidth="1.3" />
                {/* aréole (bord fin), mamelon sobre */}
                {!ganglions && (
                    <g>
                        <ellipse cx={r1(nx)} cy={r1(ny + 0.4)} rx={r1(19.5 * s)} ry={r1(18 * s)} fill={g('areole')} stroke={aureole} strokeWidth="0.7" strokeOpacity="0.7" />
                        <ellipse cx={r1(nx + 0.6)} cy={r1(ny + 2.4)} rx={r1(5.4 * s)} ry={r1(2.2 * s)} fill={c.trait} opacity="0.16" />
                        <ellipse cx={r1(nx)} cy={r1(ny)} rx={r1(5 * s)} ry={r1(4.4 * s)} fill={mamelonCol} />
                        <ellipse cx={r1(nx - 1.4)} cy={r1(ny - 1.3)} rx={r1(1.9 * s)} ry={r1(1.2 * s)} fill={blanc} opacity={S ? 0.35 : 0.55} />
                    </g>
                )}
                {ganglions && (
                    <g>
                        <ellipse cx={r1(nx)} cy={r1(ny + 0.4)} rx={r1(15 * s)} ry={r1(13.5 * s)} fill={g('halo')} />
                        <ellipse cx={r1(nx)} cy={r1(ny)} rx={r1(4.4 * s)} ry={r1(3.9 * s)} fill={mamelonCol} fillOpacity="0.85" />
                    </g>
                )}
            </g>
        );
    };

    const clavicule = [[203, 87], [193, 88], [181, 85], [166, 79], [150, 72], [134, 66], [120, 62], [108, 62], [98, 66], [92, 73]];
    const noeud = (n, i, pref) => {
        const [x, y, rx0, ry0, rot] = n; const rx = r1(rx0 * 0.82); const ry = r1(ry0 * 0.82);
        return (
            <g key={`${pref}${i}`} transform={`rotate(${rot} ${x} ${y})`}>
                <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={u('noeud')} stroke={lymphe} strokeWidth="0.9" />
                <ellipse cx={r1(x - rx * 0.28)} cy={r1(y - ry * 0.34)} rx={r1(rx * 0.42)} ry={r1(ry * 0.3)} fill={blanc} opacity="0.7" />
            </g>
        );
    };
    const chaines = ['sus', 'sous', 'axil', 'mamm'];
    // sillon delto-pectoral, bord du grand pectoral, pli axillaire antérieur : rejoint le creux de l'aisselle (point F)
    const pli = [[106, 76], [102, 94], [104, 114], [105, 138], [101, 164], [96, 183], [93, 193]];
    const rebord = [[206, 316], [193, 329], [175, 343], [154, 360], [142, 376]];
    const deltoide = [[62, 100], [52, 122], [44, 146]];
    const cotes = [[110, 128], [118, 146], [124, 164]];

    return (
        <g strokeLinejoin="round" strokeLinecap="round" fill="none">
            <defs>
                <linearGradient id={`${P}fondu-g`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="360">
                    <stop offset="0" stopColor="#000" /><stop offset="0.07" stopColor="#fff" /><stop offset="0.9" stopColor="#fff" /><stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={`${P}fondu`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="440" height="380"><rect x="-10" y="-10" width="440" height="380" fill={u('fondu-g')} /></mask>
                <linearGradient id={`${P}fondu-hg`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="420" y2="0">
                    <stop offset="0" stopColor="#000" /><stop offset="0.04" stopColor="#fff" /><stop offset="0.96" stopColor="#fff" /><stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={`${P}fondu-h`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="440" height="380"><rect x="-10" y="-10" width="440" height="380" fill={u('fondu-hg')} /></mask>
                <clipPath id={`${P}clip-corps`}><path d={CORPS} /></clipPath>
                <linearGradient id={`${P}peau`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="420" y2="0">
                    <stop offset="0" stopColor={c.chair} /><stop offset="0.22" stopColor={c.chair} /><stop offset="0.5" stopColor={c.chairClair} />
                    <stop offset="0.78" stopColor={c.chair} /><stop offset="1" stopColor={c.chair} />
                </linearGradient>
                <radialGradient id={`${P}fosse`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.75" /><stop offset="1" stopColor={c.chairOmbre} stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${P}bras-g`} gradientUnits="userSpaceOnUse" x1="11" y1="178" x2="71" y2="210">
                    <stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.7" /><stop offset="0.2" stopColor={c.chairOmbre} stopOpacity="0.14" />
                    <stop offset="0.5" stopColor={blanc} stopOpacity={S ? 0.06 : 0.35} /><stop offset="0.8" stopColor={c.chairOmbre} stopOpacity="0.1" />
                    <stop offset="1" stopColor={c.chairOmbre} stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id={`${P}bras-d`} gradientUnits="userSpaceOnUse" x1="409" y1="178" x2="349" y2="210">
                    <stop offset="0" stopColor={c.chairOmbre} stopOpacity="0.7" /><stop offset="0.2" stopColor={c.chairOmbre} stopOpacity="0.14" />
                    <stop offset="0.5" stopColor={blanc} stopOpacity={S ? 0.06 : 0.35} /><stop offset="0.8" stopColor={c.chairOmbre} stopOpacity="0.1" />
                    <stop offset="1" stopColor={c.chairOmbre} stopOpacity="0.55" />
                </linearGradient>
                <radialGradient id={`${P}pecs`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={blanc} stopOpacity={S ? 0.14 : 0.7} /><stop offset="1" stopColor={blanc} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${P}epaule`} cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor={blanc} stopOpacity={S ? 0.4 : 0.9} /><stop offset="1" stopColor={blanc} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={`${P}noeud`} cx="0.4" cy="0.35" r="0.8">
                    <stop offset="0" stopColor={lympheClair} /><stop offset="1" stopColor={lymphe} />
                </radialGradient>
            </defs>
            <g mask={u('fondu-h')}>
                <g mask={u('fondu')}>
                    {/* silhouette : thorax, épaules, bras, aisselles */}
                    <path d={CORPS} fill={u('peau')} stroke="none" />
                    <g clipPath={u('clip-corps')}>
                        <path d={CORPS} stroke={c.chairOmbre} strokeWidth="46" opacity="0.1" />
                        <path d={CORPS} stroke={c.chairOmbre} strokeWidth="28" opacity="0.14" />
                        <path d={CORPS} stroke={c.chairOmbre} strokeWidth="14" opacity="0.2" />
                        <path d={CORPS} stroke={c.chairOmbre} strokeWidth="6" opacity="0.28" />
                        {/* reflets des épaules (deltoïdes) et des bras */}
                        <ellipse cx="74" cy="100" rx="24" ry="22" fill={u('epaule')} />
                        <ellipse cx="346" cy="100" rx="24" ry="22" fill={u('epaule')} />
                        <path d={poly([[-20, 30], [106, 30], [106, 150], ...FLANC, [-20, 384]])} fill={u('bras-g')} />
                        <path d={poly(miroir([[-20, 30], [106, 30], [106, 150], ...FLANC, [-20, 384]]))} fill={u('bras-d')} />
                        <ellipse cx="210" cy="132" rx="96" ry="40" fill={u('pecs')} />
                        {/* creux axillaires : ombre sous le pli axillaire antérieur, côté bras */}
                        <path d={lisse(pli.map((p) => [p[0] - 7, p[1] + 6]))} stroke={c.chairOmbre} strokeWidth="14" opacity="0.14" />
                        <path d={lisse(pli.map((p) => [p[0] - 5, p[1] + 8]))} stroke={c.chairOmbre} strokeWidth="7" opacity="0.2" />
                        <path d={lisse(miroir(pli).map((p) => [p[0] + 7, p[1] + 6]))} stroke={c.chairOmbre} strokeWidth="14" opacity="0.14" />
                        <path d={lisse(miroir(pli).map((p) => [p[0] + 5, p[1] + 8]))} stroke={c.chairOmbre} strokeWidth="7" opacity="0.2" />
                        <ellipse cx="86" cy="166" rx="15" ry="34" transform="rotate(-12 86 166)" fill={u('fosse')} />
                        <ellipse cx="334" cy="166" rx="15" ry="34" transform="rotate(12 334 166)" fill={u('fosse')} />
                        {/* cou : volume cylindrique */}
                        <path d="M170 -24L176 20L186 66" stroke={c.chairOmbre} strokeWidth="16" opacity="0.16" />
                        <path d="M250 -24L244 20L234 66" stroke={c.chairOmbre} strokeWidth="16" opacity="0.16" />
                        {/* sillon entre les seins */}
                        <ellipse cx="210" cy="238" rx="17" ry="66" fill={u('fosse')} />
                    </g>
                    <path d={CORPS} stroke={c.trait} strokeWidth="1.3" />

                    {/* muscles sterno-cléido-mastoïdiens et creux sus-sternal */}
                    <path d="M176 -4C178 22 187 52 198 80" stroke={c.traitFin} strokeWidth="1.2" opacity="0.85" />
                    <path d="M244 -4C242 22 233 52 222 80" stroke={c.traitFin} strokeWidth="1.2" opacity="0.85" />
                    <path d="M186 6C187 34 192 58 200 78" stroke={c.traitFin} strokeWidth="0.8" opacity="0.45" />
                    <path d="M234 6C233 34 228 58 220 78" stroke={c.traitFin} strokeWidth="0.8" opacity="0.45" />
                    <ellipse cx="210" cy="85" rx="9" ry="4.6" fill={u('fosse')} />
                    <path d="M203 81C207 85 213 85 217 81" stroke={c.traitFin} strokeWidth="0.9" opacity="0.7" />

                    {/* clavicules : os en S, ombre portée dessous, articulation sterno-claviculaire */}
                    {[clavicule, miroir(clavicule)].map((pts, i) => (
                        <g key={i}>
                            <path d={lisse(pts.map((p) => [p[0], p[1] + 3.4]))} stroke={c.chairOmbre} strokeWidth="4.4" opacity={S ? 0.6 : 0.5} />
                            <path d={lisse(pts)} stroke={blanc} strokeWidth="3.6" opacity={S ? 0.28 : 0.92} />
                            <path d={lisse(pts.map((p) => [p[0], p[1] + 1.9]))} stroke={c.traitFin} strokeWidth="0.7" opacity="0.55" />
                            <circle cx={pts[0][0]} cy={pts[0][1]} r="2.6" fill={blanc} fillOpacity={S ? 0.25 : 0.8} stroke={c.traitFin} strokeWidth="0.7" strokeOpacity="0.6" />
                        </g>
                    ))}

                    {/* sternum (angle de Louis), ligne médiane, grand pectoral et pli axillaire antérieur, rebord costal */}
                    <path d="M197 116C204 119 216 119 223 116" stroke={c.traitFin} strokeWidth="1" opacity="0.5" />
                    {!ganglions && <path d="M210 96L210 176" stroke={c.traitFin} strokeWidth="0.8" opacity="0.28" />}
                    <path d={lisse(pli)} stroke={c.traitFin} strokeWidth="1.1" opacity="0.6" />
                    <path d={lisse(miroir(pli))} stroke={c.traitFin} strokeWidth="1.1" opacity="0.6" />
                    <path d={lisse(deltoide)} stroke={c.traitFin} strokeWidth="0.9" opacity="0.32" />
                    <path d={lisse(miroir(deltoide))} stroke={c.traitFin} strokeWidth="0.9" opacity="0.32" />
                    {/* côtes suggérées sous la clavicule */}
                    {!ganglions && cotes.map(([x, y], i) => (
                        <g key={i} stroke={c.traitFin} strokeWidth="0.8" opacity="0.2">
                            <path d={`M${x} ${y}C${x + 28} ${y + 4} ${x + 62} ${y + 4} 204 ${y - 6}`} />
                            <path d={`M${420 - x} ${y}C${420 - x - 28} ${y + 4} ${420 - x - 62} ${y + 4} 216 ${y - 6}`} />
                        </g>
                    ))}
                    <path d={lisse(rebord)} stroke={c.traitFin} strokeWidth="1.1" opacity="0.55" />
                    <path d={lisse(miroir(rebord))} stroke={c.traitFin} strokeWidth="1.1" opacity="0.55" />
                    <path d={lisse([[199, 332], [186, 343], [170, 356]])} stroke={c.traitFin} strokeWidth="0.9" opacity="0.35" />
                    <path d={lisse(miroir([[199, 332], [186, 343], [170, 356]]))} stroke={c.traitFin} strokeWidth="0.9" opacity="0.35" />

                    {/* seins */}
                    {cote('d')}
                    {cote('g')}

                    {ganglions && (
                        <g>
                            {/* voies lymphatiques : sein → aisselle et chaîne mammaire interne ; aisselle → sous-claviculaire → sus-claviculaire → base du cou */}
                            {[
                                [[132, 228], [120, 212], [110, 197], [106, 186]],
                                [[170, 236], [182, 222], [190, 208], [192, 198]],
                                [[100, 124], [108, 113], [118, 105], [126, 103]],
                                [[140, 96], [146, 84], [156, 72], [166, 65]],
                                [[191, 122], [186, 110], [172, 104], [156, 104]],
                                [[176, 62], [186, 52], [194, 44]],
                            ].map((pts, i) => [pts, miroir(pts)].map((q, j) => (
                                <path key={`${i}-${j}`} d={lisse(q)} stroke={lymphe} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                            )))}
                            {chaines.map((ch) => noeuds[ch].map((n, i) => noeud(n, i, ch)))}
                            {chaines.map((ch) => noeuds[ch].map((n, i) => noeud([2 * AX - n[0], n[1], n[2], n[3], -n[4]], i, `${ch}m`)))}
                        </g>
                    )}
                </g>
            </g>
        </g>
    );
};

// ═════════════════════════ SCHÉMA ═════════════════════════
const CST_GANG = ['Libres, non palpables', 'Adénopathie mobile', 'Adénopathie fixée', 'Adénopathies multiples ou confluentes', 'Dures', 'Douloureux'];
const doubleZone = (id, libD, libG, groupe, pts, ap = null) => ({
    [`${id}_d`]: zone(libD, groupe, CST_GANG, [chemin(lisse(pts, true)), ...(ap ? [aire(chemin(poly(ap)))] : [])]),
    [`${id}_g`]: zone(libG, groupe, CST_GANG, [chemin(lisse(miroir(pts), true)), ...(ap ? [aire(chemin(poly(miroir(ap))))] : [])]),
});

// D / G près des épaules ; « côté droit » rappelle que le côté droit de la patiente est à gauche de l'écran
const ETIQUETTES = [
    { x: 60, y: 38, texte: 'D', taille: 18 }, { x: 60, y: 51, texte: 'côté droit', taille: 9 },
    { x: 360, y: 38, texte: 'G', taille: 18 }, { x: 360, y: 51, texte: 'côté gauche', taille: 9 },
];

export default {
    id: 'seins',
    titre: 'Seins et aires ganglionnaires',
    vues: [
        {
            id: 'face', titre: 'Seins', viewBox: '0 0 420 360', largeur: 420, reperes: true,
            decor: decorThorax('face'),
            etiquettes: ETIQUETTES,
            zones: { ...zonesSein('d', 'droit', 'sd'), ...zonesSein('g', 'gauche', 'sg') },
        },
        {
            id: 'ganglions', titre: 'Ganglions', viewBox: '0 0 420 360', largeur: 420,
            decor: decorThorax('ganglions'),
            etiquettes: ETIQUETTES,
            zones: {
                ...doubleZone('ax', 'Aisselle droite', 'Aisselle gauche', 'Aisselles', GANG.axil),
                ...doubleZone('sc', 'Creux sus-claviculaire droit', 'Creux sus-claviculaire gauche', 'Creux claviculaires', GANG.sus, AIRE.sus),
                ...doubleZone('scl', 'Creux sous-claviculaire droit', 'Creux sous-claviculaire gauche', 'Creux claviculaires', GANG.sous),
                ...doubleZone('mi', 'Chaîne mammaire interne droite', 'Chaîne mammaire interne gauche', 'Chaîne mammaire interne', GANG.mamm, AIRE.mamm),
            },
        },
    ],
};
