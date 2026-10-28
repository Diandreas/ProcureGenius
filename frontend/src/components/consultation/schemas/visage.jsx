import React from 'react';
import { zone, chemin, ellipse, aire, paire, miroirX, miroirFormes, transformerChemin } from './outils';

// ─────────────────────────────────────────────────────────────────────────────
//  VISAGE (face, profil gauche, profil droit) — « Semi-réaliste en volume »
//  Adulte neutre, planche d'atlas : volumes par dégradés, reflets, ombres portées.
//  Face : axe de symétrie x = 150 (le côté droit du patient est à gauche de l'écran).
//  Profil gauche : regard vers la gauche de l'écran, on voit le côté GAUCHE du patient ; profil droit = reflet (axe x = 185).
//  Les zones sont construites à partir de bordures PARTAGÉES (mêmes points) : régions jointives.
// ─────────────────────────────────────────────────────────────────────────────

const AX = 150;
const AXP = 185;
const r1 = (n) => Math.round(n * 10) / 10;
const mp = (pts) => pts.map(([x, y]) => [2 * AX - x, y]);
const thru = (L) => [...L, ...mp(L).slice(0, -1).reverse()];   // moitié gauche (bord -> axe) => passe l'axe

// Spline de Catmull-Rom convertie en courbes de Bézier cubiques ABSOLUES
const seg = (p0, p1, p2, p3) => `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
const courbes = (pts) => {
    const n = pts.length;
    let s = '';
    for (let i = 0; i < n - 1; i += 1) {
        const p1 = pts[i]; const p2 = pts[i + 1];
        const p0 = i > 0 ? pts[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
        const p3 = i < n - 2 ? pts[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
        s += seg(p0, p1, p2, p3);
    }
    return s;
};
const lisse = (pts) => `M${r1(pts[0][0])} ${r1(pts[0][1])}${courbes(pts)}`;
const anneau = (pts) => {
    const n = pts.length;
    let s = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
    for (let i = 0; i < n; i += 1) s += seg(pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]);
    return `${s}Z`;
};
const egal = (a, b) => Math.abs(a[0] - b[0]) < 0.6 && Math.abs(a[1] - b[1]) < 0.6;
// Contour fermé à partir de bordures (listes de points) ; les bordures sont retournées au besoin et DOIVENT se rejoindre.
const contour = (...parts) => {
    const [p0, p1] = parts;
    const fin = (p) => p[p.length - 1];
    const cur = (egal(fin(p0), p1[0]) || egal(fin(p0), fin(p1))) ? p0 : p0.slice().reverse();
    let d = `M${r1(cur[0][0])} ${r1(cur[0][1])}${courbes(cur)}`;
    let end = fin(cur);
    for (let i = 1; i < parts.length; i += 1) {
        let p = parts[i];
        if (!egal(end, p[0])) {
            if (egal(end, fin(p))) p = p.slice().reverse();
            else throw new Error(`visage : la bordure ${i} ne rejoint pas la précédente (${end}) vs (${p[0]}) / (${fin(p)})`);
        }
        d += courbes(p);
        end = fin(p);
    }
    if (!egal(end, cur[0])) throw new Error(`visage : contour non fermé (${end}) vs (${cur[0]})`);
    return `${d}Z`;
};

// Mèche de cheveux : fuseau effilé (largeur w) de A à B, bombé de b vers l'extérieur du crâne (centre C), + ligne centrale
const meche = (A, B, b, w, C = [150, 120]) => {
    const dx = B[0] - A[0]; const dy = B[1] - A[1]; const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l; let ny = dx / l;
    const mx = (A[0] + B[0]) / 2; const my = (A[1] + B[1]) / 2;
    if ((mx - C[0]) * nx + (my - C[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const cx = mx + nx * b; const cy = my + ny * b;
    const f = (x, y) => `${r1(x)} ${r1(y)}`;
    return {
        lens: `M${f(A[0], A[1])}Q${f(cx + nx * w, cy + ny * w)} ${f(B[0], B[1])}Q${f(cx - nx * w, cy - ny * w)} ${f(A[0], A[1])}Z`,
        ligne: `M${f(A[0], A[1])}Q${f(cx, cy)} ${f(B[0], B[1])}`,
    };
};

// ═════════════════════════════ CONSTATS ═════════════════════════════
const K = {
    front: ['Normal', 'Rides du front', 'Tache pigmentaire', 'Mélasma', 'Acné inflammatoire', 'Comédons', 'Cicatrice atrophique', 'Kyste', 'Grain de beauté', 'Érythème'],
    glabelle: ['Normal', 'Ride du lion', "Ride d'expression", 'Tache pigmentaire', 'Acné inflammatoire', 'Comédons', 'Cicatrice atrophique', 'Grain de beauté', 'Peau sèche', 'Érythème'],
    tempe: ['Normal', 'Perte de volume', 'Tache pigmentaire', 'Mélasma', 'Acné inflammatoire', 'Cicatrice atrophique', 'Télangiectasies', 'Grain de beauté', 'Kyste', 'Artère temporale indurée'],
    sourcil: ['Normal', 'Alopécie du sourcil', 'Tache pigmentaire', 'Acné inflammatoire', 'Cicatrice atrophique', 'Cicatrice hypertrophique', 'Grain de beauté', 'Kyste', 'Peau sèche', 'Perte de volume'],
    oeil: ['Normal', "Pattes d'oie", 'Cernes', 'Poches', 'Œdème palpébral', 'Ptosis', 'Xanthélasma', 'Chalazion', 'Ictère conjonctival', 'Pâleur conjonctivale'],
    pommette: ['Normal', 'Tache pigmentaire', 'Mélasma', 'Couperose', 'Acné inflammatoire', 'Cicatrice atrophique', 'Perte de volume', 'Érythème', 'Œdème', 'Grain de beauté'],
    joue: ['Normal', 'Acné inflammatoire', 'Cicatrice atrophique', 'Cicatrice hypertrophique', 'Tache pigmentaire', 'Mélasma', 'Couperose', 'Érythème', 'Œdème', 'Pâleur'],
    dosNez: ['Normal', 'Comédons', 'Couperose', 'Acné inflammatoire', 'Cicatrice atrophique', 'Tache pigmentaire', 'Grain de beauté', 'Kyste', 'Peau sèche', 'Érythème'],
    pointeNez: ['Normal', 'Comédons', 'Couperose', 'Acné inflammatoire', 'Cicatrice atrophique', 'Cicatrice hypertrophique', 'Kyste', 'Grain de beauté', 'Peau sèche', 'Érythème'],
    sillon: ['Normal', 'Pli marqué', 'Perte de volume', 'Comédons', 'Acné inflammatoire', 'Tache pigmentaire', 'Couperose', 'Peau sèche', 'Érythème'],
    levreSup: ['Normal', 'Herpès labial', 'Fissure', 'Perlèche', 'Cyanose', 'Peau sèche', "Ride d'expression", 'Tache pigmentaire', 'Grain de beauté', 'Perte de volume'],
    levreInf: ['Normal', 'Herpès labial', 'Fissure', 'Perlèche', 'Cyanose', 'Chéilite', 'Peau sèche', 'Perte de volume', 'Tache pigmentaire', 'Grain de beauté'],
    levres: ['Normal', 'Herpès labial', 'Fissure', 'Perlèche', 'Cyanose', 'Chéilite', 'Peau sèche', 'Perte de volume', 'Tache pigmentaire', 'Grain de beauté'],
    menton: ['Normal', 'Acné inflammatoire', 'Comédons', 'Cicatrice atrophique', 'Cicatrice hypertrophique', 'Kyste', 'Tache pigmentaire', 'Perte de volume', 'Grain de beauté', 'Érythème'],
    mandibule: ['Normal', 'Acné inflammatoire', 'Kyste', 'Comédons', 'Cicatrice atrophique', 'Cicatrice hypertrophique', 'Tache pigmentaire', 'Perte de volume', 'Tuméfaction', 'Adénopathie'],
    oreille: ['Normal', 'Otite externe', 'Écoulement', 'Cérumen', 'Kyste', 'Cicatrice hypertrophique', 'Acné inflammatoire', 'Grain de beauté', 'Tache pigmentaire', 'Peau sèche'],
    cou: ['Normal', 'Adénopathie', 'Goitre', 'Masse cervicale', 'Turgescence jugulaire', 'Érythème', 'Tache pigmentaire', 'Grain de beauté', 'Cicatrice atrophique', 'Cicatrice hypertrophique'],
};
const GF = 'Visage — face';

// ═════════════════════════════ FACE : géométrie (moitié gauche de l'écran) ═════════════════════════════
// Silhouette de la tête : crâne, pommettes, angle de la mandibule, menton
const TETE_G = [[150, 24], [118, 28], [90, 44], [72, 72], [63, 106], [60, 140], [61, 172], [63, 200], [67, 228], [78, 254], [96, 277], [118, 293], [136, 302], [150, 305]];
const TETE = anneau([...TETE_G, ...mp(TETE_G).slice(1, -1).reverse()]);
// Buste : cou (affiné), trapèzes concaves puis épaule arrondie
const BUSTE_G = [[103, 258], [101, 292], [99, 322], [96, 344], [80, 353], [58, 361], [34, 372], [10, 387], [-6, 398]];
const BUSTE = `${lisse(BUSTE_G)}L-6 406L306 406L306 398${courbes(mp(BUSTE_G).reverse())}Z`;
const BUSTE_TRAIT_G = lisse(BUSTE_G);

// bordures partagées entre zones
const H_T = [[64, 124], [75, 110]];
const H_F = thru([[75, 110], [86, 95], [103, 79], [126, 70], [150, 68]]);
const T_F = [[75, 110], [79, 120], [80, 128]];
const T_B = [[80, 128], [79, 136], [77, 143]];
const B_TOP = [[80, 128], [94, 119], [110, 118], [124, 120], [136, 124]];
const GT = thru([[136, 124], [142, 117], [150, 113]]);
const G_A = [[136, 124], [134, 135], [136, 150]];
const G_B = [[136, 150], [139, 156], [142, 162]];
const GB = thru([[142, 162], [150, 165]]);
const BR_LOW = [[77, 143], [84, 146], [96, 147], [110, 147], [124, 149], [136, 150]];
const E_LAT = [[77, 143], [72, 156], [75, 172], [86, 184]];
const E_LOW = [[86, 184], [104, 188], [122, 186], [138, 178]];
const N_S1 = [[142, 162], [139, 171], [138, 178]];
const N_S2 = [[138, 178], [136, 184], [134, 189], [132, 193]];          // flanc du nez : ailes à 41 unités (≈ écart intercanthal)
const NC = thru([[132, 193], [141, 191.5], [150, 191]]);
const AO1 = [[132, 193], [129.5, 201], [129.5, 210]];
const AO2 = [[129.5, 210], [130.5, 215], [133, 219]];
const NB = thru([[133, 219], [141, 220.5], [150, 220]]);                // base du nez remontée à y = 220
const T_P = [[64, 194], [74, 189], [86, 184]];
const O_T = [[64, 124], [63, 140], [62, 172], [64, 194]];
const O_P = [[64, 194], [64, 205], [65, 216]];
const P_LOW = [[132, 193], [112, 200], [92, 207], [72, 213], [65, 216]];
const O_J = [[65, 216], [65.5, 219], [66, 222]];
const M_UP = [[66, 222], [80, 230], [92, 242], [100, 256], [102, 268]];
const S_TOP = [[129.5, 210], [124, 214], [118, 218]];
const S_OUT = [[118, 218], [113, 236], [107, 254], [102, 268]];
const CAP_B = [[102, 268], [108, 274], [116, 272]];
const S_IN_U = [[133, 219], [127, 233], [122, 243], [118, 253]];
const S_IN_L = [[118, 253], [117, 263], [116, 272]];
const SL = thru([[118, 253], [134, 252], [150, 251.3]]);
const SU = thru([[116, 272], [128, 275], [140, 276.5], [150, 277]]);
const C_S = [[116, 272], [118, 284], [124, 294], [133, 301]];
const CB = thru([[133, 301], [142, 303], [150, 303.5]]);
const OJ = [[133, 301], [119, 292.5], [103, 282], [88, 266], [74, 246], [66, 222]];
const JO = thru([[103, 282], [119, 294], [135, 303], [150, 306]]);
const N_O = [[103, 282], [101, 302], [99, 322], [96, 345]];
const NZB = thru([[96, 345], [120, 352], [150, 355]]);

const ZF = {
    front: contour(H_F, mp(T_F), mp(B_TOP), GT, B_TOP, T_F),
    glabelle: contour(GT, mp(G_A), mp(G_B), GB, G_B, G_A),
    tempe: contour(H_T, T_F, T_B, E_LAT, T_P, O_T),
    sourcil: contour(B_TOP, G_A, BR_LOW, T_B),
    oeil: contour(BR_LOW, G_B, N_S1, E_LOW, E_LAT),
    pommette: contour(T_P, E_LOW, N_S2, P_LOW, O_P),
    joue: contour(AO1, S_TOP, S_OUT, M_UP, O_J, P_LOW),
    dosNez: contour(GB, mp(N_S1), mp(N_S2), NC, N_S2, N_S1),
    pointeNez: contour(NC, mp(AO1), mp(AO2), NB, AO2, AO1),
    sillon: contour(S_TOP, S_OUT, CAP_B, S_IN_L, S_IN_U, AO2),
    levreSup: contour(NB, mp(S_IN_U), SL, S_IN_U),
    levreInf: contour(SL, mp(S_IN_L), SU, S_IN_L),
    menton: contour(SU, mp(C_S), CB, C_S),
    mandibule: contour(M_UP, CAP_B, C_S, OJ),
    cou: contour(JO, mp(N_O), NZB, N_O),
};
// L'oreille de face : sommet à hauteur du sourcil (y ≈ 142), lobule à hauteur de la base du nez (y ≈ 221)
const OREILLE_RAW = 'M64 152C56 146 47 150 44 162C41 178 43 196 48 212C51 222 55 231 61 236C65 239 69 236 68 230C67 222 66 214 66 205C66 190 65 170 64 152Z';
const ECH_OREILLE = 'matrix(1 0 0 0.94 0 -0.88)';
const OREILLE_D = transformerChemin(OREILLE_RAW, 1, 0.94, 0, -0.88);

// Ordre = ordre de superposition : les grandes zones d'abord, les petites (avec leur aire d'appui) par-dessus
const zonesFace = {
    front: zone('Front', GF, K.front, [chemin(ZF.front)]),
    ...paire('joue', AX, 'face', { libelles: ['Joue droite', 'Joue gauche'], groupe: GF, constats: K.joue, formes: [chemin(ZF.joue)] }),
    ...paire('pommette', AX, 'face', { libelles: ['Pommette droite', 'Pommette gauche'], groupe: GF, constats: K.pommette, formes: [chemin(ZF.pommette), aire(ellipse(96, 200, 30, 23))] }),
    ...paire('tempe', AX, 'face', { libelles: ['Tempe droite', 'Tempe gauche'], groupe: GF, constats: K.tempe, formes: [chemin(ZF.tempe), aire(ellipse(74, 132, 20, 26))] }),
    ...paire('mandibule', AX, 'face', { libelles: ['Mandibule droite', 'Mandibule gauche'], groupe: GF, constats: K.mandibule, formes: [chemin(ZF.mandibule), aire(ellipse(88, 262, 22, 28))] }),
    cou: zone('Cou', GF, K.cou, [chemin(ZF.cou)]),
    menton: zone('Menton', GF, K.menton, [chemin(ZF.menton), aire(ellipse(150, 291, 30, 20))]),
    ...paire('oreille', AX, 'face', { libelles: ['Oreille droite', 'Oreille gauche'], groupe: GF, constats: K.oreille, formes: [chemin(OREILLE_D), aire(ellipse(52, 181, 18, 42))] }),
    ...paire('sourcil', AX, 'face', { libelles: ['Sourcil droit', 'Sourcil gauche'], groupe: GF, constats: K.sourcil, formes: [chemin(ZF.sourcil), aire(ellipse(106, 134, 30, 23))] }),
    ...paire('oeil', AX, 'face', { libelles: ['Œil droit', 'Œil gauche'], groupe: GF, constats: K.oeil, formes: [chemin(ZF.oeil), aire(ellipse(112, 168, 30, 23))] }),
    dos_nez: zone('Dos du nez', GF, K.dosNez, [chemin(ZF.dosNez), aire(ellipse(150, 176, 21, 24))]),
    glabelle: zone('Glabelle', GF, K.glabelle, [chemin(ZF.glabelle), aire(ellipse(150, 136, 21, 24))]),
    pointe_nez: zone('Pointe du nez', GF, K.pointeNez, [chemin(ZF.pointeNez), aire(ellipse(150, 208, 24, 21))]),
    ...paire('sillon', AX, 'face', { libelles: ['Sillon nasogénien droit', 'Sillon nasogénien gauche'], groupe: GF, constats: K.sillon, formes: [chemin(ZF.sillon), aire(ellipse(113, 243, 21, 31))] }),
    levre_sup: zone('Lèvre supérieure', GF, K.levreSup, [chemin(ZF.levreSup), aire(ellipse(150, 237, 30, 20))]),
    levre_inf: zone('Lèvre inférieure', GF, K.levreInf, [chemin(ZF.levreInf), aire(ellipse(150, 270, 28, 19))]),
};

// ═════════════════════════════ PROFIL : géométrie ═════════════════════════════
// Silhouette de bas en haut sur le visage (regard vers la gauche), puis voûte du crâne, nuque, trapèze
const SIL_VISAGE = [[112, 406], [122, 388], [131, 374], [133, 366], [137, 344], [136, 324], [133, 315], [126, 310.5], [116, 309.5], [100, 307], [91, 303], [84, 296], [80, 288], [81, 280], [88, 274],
    [83, 269], [79, 262], [82, 256], [88, 251.5], [81, 247], [79, 241], [82, 233], [86, 222], [78, 219], [70, 214], [67, 207], [72, 201], [80, 193], [88, 182], [94, 170],
    [98, 157], [94, 150], [93, 142], [96, 130], [100, 114], [107, 90], [116, 66]];
const bomb = (pts) => pts.map(([x, y]) => [x <= 120 ? x : r1(120 + (x - 120) * 0.87), y]);   // profondeur du crâne
const CRANE_H = bomb([[131, 48], [152, 34], [182, 25], [222, 27], [262, 45], [292, 77], [308, 115], [312, 150], [306, 186], [292, 218], [270, 242]]);
const SIL_CRANE = [...CRANE_H, [243, 262], [240, 280], [242, 300], [247, 324], [256, 346], [280, 366], [314, 382], [346, 392]];
const SIL_P = `${lisse([...SIL_VISAGE, ...SIL_CRANE])}L346 406Z`;
const SIL_P_TRAIT = lisse([...SIL_VISAGE, ...SIL_CRANE]);

const HP_A = [[116, 66], [134, 70], [146, 77]];
const HP_B = [[146, 77], [160, 88], [171, 108], [180, 128], [190, 146], [198, 156]];
const FPF = [[116, 66], [107, 90], [100, 114], [96, 130], [93, 142]];
const BL = [[93, 142], [110, 139], [125, 137], [138, 138]];
const TF = [[146, 77], [141, 100], [138, 120], [138, 138]];
const EL = [[138, 138], [139, 158], [138, 178]];
const EB = [[138, 178], [125, 184], [112, 184], [106, 178]];
const NE = [[106, 178], [105, 168], [98, 157]];
const FPN0 = [[93, 142], [94, 150], [98, 157]];
const FP_NOSE = [[98, 157], [94, 170], [88, 182], [80, 193], [72, 201], [67, 207], [70, 214], [78, 219], [86, 222]];
const NBP = [[86, 222], [93, 223], [100, 219]];
const AG_L = [[100, 219], [104, 212], [106, 205]];
const AG_U = [[106, 205], [108, 192], [106, 178]];
const ZA_A = [[138, 178], [150, 182], [164, 184]];
const ZA_B = [[164, 184], [183, 180], [203, 166]];
const PBP = [[164, 184], [168, 194], [166, 204]];
const PJ = [[106, 205], [125, 204], [145, 204], [166, 204]];
const EF = [[203, 166], [205, 192], [206, 212], [205, 226]];
const PA = [[198, 156], [200, 160], [203, 166]];
const JB = [[108, 272], [130, 275], [152, 268], [172, 254], [186, 242], [205, 226]];
const NLF2 = [[100, 219], [106, 232], [112, 246], [113, 260], [108, 272]];
const FP_LIPS = [[86, 222], [82, 233], [79, 241], [81, 247], [88, 251.5], [82, 256], [79, 262], [83, 269], [88, 274]];
const S_C = [[88, 274], [98, 277], [108, 272]];
const FP_CHIN = [[88, 274], [81, 280], [80, 288], [84, 296], [91, 303], [100, 307]];
const CU = [[100, 307], [108, 308.5], [116, 309.5]];
const CJ = [[108, 272], [116, 284], [118, 298], [116, 309.5]];
const JL = [[207, 246], [196, 264], [182, 278], [164, 291], [142, 301], [126, 307], [116, 309.5]];
const AMB = [[205, 226], [209, 236], [207, 246]];
const NECK_F = [[116, 309.5], [126, 310.5], [133, 315], [136, 324], [137, 344], [133, 366], [131, 374]];
const NZP = [[131, 374], [170, 380], [215, 376], [256, 346]];
const NECK_B = [[256, 346], [247, 324], [242, 300], [240, 280], [243, 262], [250.5, 242]];
const BN = [[250.5, 242], [246, 231], [237, 225], [226, 226], [215, 228], [205, 226]];   // le cou remonte derrière l'oreille (région rétro-auriculaire)
const OREILLE_P_RAW = 'M205 182C208 166 222 156 235 160C246 165 248 180 243 194C239 206 232 218 224 228C219 234 213 236 210 231C207 224 206 210 205 196Z';
const OREILLE_P = transformerChemin(OREILLE_P_RAW, 1, 1, 0, -14);   // sommet à hauteur du sourcil, lobule à hauteur de la base du nez

const ZP = {
    front: contour(HP_A, TF, BL, FPF),
    tempe: contour(HP_B, PA, ZA_B, ZA_A, EL, TF),
    oeil: contour(BL, EL, EB, NE, FPN0),
    nez: contour(FP_NOSE, NBP, AG_L, AG_U, NE),
    pommette: contour(ZA_A, PBP, PJ, AG_U, EB),
    joue: contour(AG_L, PJ, PBP, ZA_B, EF, JB, NLF2),
    levres: contour(FP_LIPS, S_C, NLF2, NBP),
    menton: contour(FP_CHIN, CU, CJ, S_C),
    angle: contour(JB, AMB, JL, CJ),
    cou: contour(JL, NECK_F, NZP, NECK_B, BN, AMB),
};

// Zones d'un profil : cote 'g' (profil gauche, tel que dessiné) ou 'd' (reflet). Ordre = ordre de superposition.
const zonesProfil = (cote) => {
    const g = cote === 'g';
    const nom = g ? 'gauche' : 'droit';
    const grp = `Visage — profil ${nom}`;
    const F = (formes) => (g ? formes : miroirFormes(formes, AXP));
    const Z = (id, lib, k, formes) => [`profil_${cote}_${id}`, zone(`${lib} (profil ${nom})`, grp, k, F(formes))];
    return Object.fromEntries([
        Z('front', 'Front', K.front, [chemin(ZP.front)]),
        Z('tempe', 'Tempe', K.tempe, [chemin(ZP.tempe)]),
        Z('joue', 'Joue', K.joue, [chemin(ZP.joue)]),
        Z('cou', 'Cou', K.cou, [chemin(ZP.cou)]),
        Z('pommette', 'Pommette', K.pommette, [chemin(ZP.pommette), aire(ellipse(137, 194, 28, 22))]),
        Z('angle', 'Angle mandibulaire', K.mandibule, [chemin(ZP.angle), aire(ellipse(186, 256, 28, 22))]),
        Z('oeil', 'Œil', K.oeil, [chemin(ZP.oeil)]),
        Z('nez', 'Nez', K.pointeNez, [chemin(ZP.nez), aire(ellipse(84, 200, 24, 26))]),
        Z('levres', 'Lèvres', K.levres, [chemin(ZP.levres), aire(ellipse(92, 248, 22, 28))]),
        Z('menton', 'Menton', K.menton, [chemin(ZP.menton), aire(ellipse(96, 292, 22, 22))]),
        Z('oreille', 'Oreille', K.oreille, [chemin(OREILLE_P), aire(ellipse(226, 184, 25, 42))]),
    ]);
};

// ═════════════════════════════ OUTILS DE DESSIN ═════════════════════════════
const arret = (liste) => liste.map(([o, col, op], i) => <stop key={i} offset={o} stopColor={col} stopOpacity={op === undefined ? 1 : op} />);
// dégradé radial « boîte englobante » (suit la forme de l'ellipse) : centre plein -> bord transparent
const halo = (id, col, a) => (
    <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">{arret([[0, col, a], [0.45, col, a * 0.55], [0.8, col, a * 0.14], [1, col, 0]])}</radialGradient>
);
// côté gauche de l'écran (m = 0) puis son reflet (m = 1)
const cotes = (fn) => [fn(0), fn(1)];
const refl = (m) => ({
    Q: (d) => (m ? miroirX(d, AX) : d),
    X: (x) => (m ? 2 * AX - x : x),
    k: m ? 'r' : 'l',
});

// ═════════════════════════════ FACE : dessin ═════════════════════════════
const decorFace = (c) => {
    const S = c.sombre;
    const P = 'visage-face-c-';
    const u = (n) => `url(#${P}${n})`;
    const blanc = S ? '#cfd9e8' : '#ffffff';
    const sclere = S ? '#d3dbe7' : '#fbfcfe';
    const pupille = '#0f172a';
    const cheveuClair = S ? '#8394b2' : '#97a3b8';
    const cheveuFonce = S ? '#5a6a8a' : '#64718a';
    const brin = S ? '#c1cee4' : '#e3e9f2';
    const brinFonce = S ? '#3b4863' : '#475569';
    const clair = S ? '#5f7190' : c.chairClair;

    // ── paupière/œil
    const OUV = 'M96 161C99.5 157 106 154.3 113 154.3C121 154.3 128.5 158.5 132 166C129 167.4 123 168.2 116 168.2C107 168.2 100 165.5 96 161Z';
    const UL = 'M96 161C99.5 157 106 154.3 113 154.3C121 154.3 128.5 158.5 132 166';
    const LL = 'M96 161C100 165.5 107 168.2 116 168.2C123 168.2 129 167.4 132 166';
    const PLI = 'M97.5 156.5C101.5 150.5 108 147.4 115 147.4C123 147.4 130 151 134.5 158';
    const CILS = [[99.6, 157.2, 96.8, 154.8], [103, 155.4, 100.6, 152.4], [107.5, 154.5, 105.8, 151.2], [112.5, 154.2, 111.8, 150.8], [117.5, 154.5, 117.8, 151.2], [122.5, 155.5, 123.8, 152.4], [127, 157.5, 128.8, 154.8]];
    // sourcil : bord inférieur remonté (reste dans la zone « sourcil », sous laquelle commence la paupière)
    const BROW = 'M134 140C128 133 118 127.5 106 126.5C96 125.6 86 130 78 138.5C84 137.5 93 134 104 133.3C114 133 124 136.5 134 143Z';
    const POILS = [[133, 142, 126.5, 136], [130, 143, 123.5, 135], [126, 141, 118.5, 133], [121, 137.5, 112.5, 129.5], [116, 136.5, 108, 128.5], [111, 135, 102.5, 128.3], [105, 134.5, 96.5, 129.5], [99, 135.5, 91, 131.5], [93, 136, 85, 134], [88, 137.5, 80.5, 137.7], [127, 143.5, 120.5, 138.5], [118, 139.5, 110.5, 134.5]];

    const oeil = (m) => {
        const { Q, X, k } = refl(m);
        return (
            <g key={`oeil${k}`}>
                <ellipse cx={X(114)} cy="160" rx="34" ry="21" fill={u('ombre')} opacity=".8" />
                <path d={Q('M97 157C101 150.5 108 147.5 115 147.5C123 147.5 130 151 134.5 158C130 155 123 152 114 152C107 152 101 154 97 158Z')} fill={c.chairOmbre} opacity=".65" />
                <clipPath id={`${P}oeil${k}`}><path d={Q(OUV)} /></clipPath>
                <path d={Q(OUV)} fill={sclere} />
                <g clipPath={`url(#${P}oeil${k})`}>
                    <circle cx={X(115)} cy="161.4" r="6.9" fill={u('iris')} />
                    <circle cx={X(115)} cy="161.4" r="6.9" fill="none" stroke="#1e293b" strokeWidth="0.9" opacity=".7" />
                    <circle cx={X(115)} cy="161.4" r="2.9" fill={pupille} />
                    <ellipse cx={X(112.2)} cy="158.6" rx="1.8" ry="1.4" fill="#fff" opacity=".95" />
                    <ellipse cx={X(118)} cy="165" rx="1" ry="0.8" fill="#fff" opacity=".35" />
                    <rect x="90" y="148" width="50" height="11" fill={u('lidV2')} />
                    <path d={Q('M96 161C100 165.5 107 168.2 116 168.2C123 168.2 129 167.4 132 166L132 172L96 172Z')} fill={u('lidInf')} />
                </g>
                <path d={Q('M131.5 164.6C132.8 165.2 133.4 166.2 133.2 167C132.2 167.4 131.2 166.6 131.5 164.6Z')} fill={c.rouge} opacity=".5" />
                <path d={Q(PLI)} fill="none" stroke={c.trait} strokeWidth="1.1" strokeLinecap="round" opacity=".75" />
                <path d={Q(LL)} fill="none" stroke={c.trait} strokeWidth="1" strokeLinecap="round" opacity=".7" />
                <path d={Q(UL)} fill="none" stroke={c.trait} strokeWidth="2.1" strokeLinecap="round" />
                {CILS.map(([x1, y1, x2, y2], i) => <path key={i} d={Q(`M${x1} ${y1}L${x2} ${y2}`)} stroke={c.trait} strokeWidth="0.8" strokeLinecap="round" opacity=".8" />)}
                <path d={Q('M131 171C124 178 112 181 99.5 177.5')} fill="none" stroke={c.traitFin} strokeWidth="1" strokeLinecap="round" opacity=".8" />
                <path d={Q('M126 176C118 182 108 183.5 98 180.5')} fill="none" stroke={c.chairOmbre} strokeWidth="3.5" strokeLinecap="round" opacity=".35" />
                <path d={Q('M97 177C91 175 86 171 83 166')} fill="none" stroke={c.traitFin} strokeWidth="0.8" strokeLinecap="round" opacity=".6" />
            </g>
        );
    };
    const sourcil = (m) => {
        const { Q, k } = refl(m);
        return (
            <g key={`src${k}`}>
                <path d={Q('M134 150C126 146 116 142 104 142C94 142 84 144 76 148C84 140 94 137 106 138C118 138.5 128 143 134 150Z')} fill={u('ombre')} opacity=".7" />
                <path d={Q(BROW)} fill={c.trait} opacity=".5" />
                {POILS.map(([x1, y1, x2, y2], i) => <path key={i} d={Q(`M${x1} ${y1}L${x2} ${y2}`)} stroke={c.trait} strokeWidth="0.8" strokeLinecap="round" opacity=".6" />)}
            </g>
        );
    };
    const oreille = (m) => {
        const { Q, X, k } = refl(m);
        return (
            <g key={`or${k}`} transform={ECH_OREILLE}>
                <path d={Q(OREILLE_RAW)} fill={u('oreille')} />
                <clipPath id={`${P}or${k}`}><path d={Q(OREILLE_RAW)} /></clipPath>
                <g clipPath={`url(#${P}or${k})`}>
                    <ellipse cx={X(57)} cy="193" rx="9" ry="16" fill={u('ombre')} opacity=".95" />
                    <ellipse cx={X(66)} cy="228" rx="7" ry="9" fill={u('ombre')} opacity=".7" />
                </g>
                <path d={Q('M61 157C54 154 49 159 48 168C47 183 49 198 53 210C55.5 217 58 222 61 227')} fill="none" stroke={c.trait} strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
                <path d={Q('M62 170C56 171.500 55 180 56.500 188C58 196 60 203 63 212')} fill="none" stroke={c.traitFin} strokeWidth="1.1" strokeLinecap="round" />
                <path d={Q('M62 172C58 168 54 169 53 174')} fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" />
                <path d={Q('M66 188C62 189.500 61.500 196 65 201C67 198 68 192 66 188Z')} fill={c.chairClair} stroke={c.trait} strokeWidth="0.9" />
                <path d={Q('M64 207C62 211 63 215 66 217')} fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" />
                <path d={Q('M52 213C54 224 58 231 63 234')} fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity=".7" />
                <path d={Q(OREILLE_RAW)} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            </g>
        );
    };
    const joue = (m) => {
        const { X, k } = refl(m);
        return (
            <g key={`jo${k}`}>
                <ellipse cx={X(97)} cy="196" rx="30" ry="17" fill={u('clair')} transform={`rotate(${m ? 14 : -14} ${X(97)} 196)`} />
                <ellipse cx={X(96)} cy="194" rx="15" ry="8" fill={u('blanc')} opacity=".5" transform={`rotate(${m ? 14 : -14} ${X(96)} 194)`} />
                <ellipse cx={X(97)} cy="238" rx="19" ry="19" fill={u('ombre')} opacity=".55" />
                <ellipse cx={X(77)} cy="150" rx="12" ry="27" fill={u('ombre')} opacity=".55" />
                <ellipse cx={X(80)} cy="260" rx="16" ry="26" fill={u('ombre')} opacity=".6" />
            </g>
        );
    };

    // ── cheveux : masse mince qui épouse le crâne, mèches courbes effilées qui partent d'une raie latérale
    const HC_G = [[62, 146], [57, 134], [56, 106], [62, 74], [86, 42], [118, 25], [150, 20]];
    const HC = `M75 110${courbes([[75, 110], [64, 124], [62, 146]])}${courbes([[62, 146], ...HC_G.slice(1), ...mp(HC_G).slice(0, -1).reverse()])}${courbes([[238, 146], [236, 124], [225, 110]])}${courbes(H_F.slice().reverse())}Z`;
    // cibles : points de la lisière + points intermédiaires + tempes ; chaque mèche part du sommet du crâne, au-dessus de sa cible
    const CIB = [...H_F.flatMap((Pt, i) => (i < H_F.length - 1 ? [Pt, [(Pt[0] + H_F[i + 1][0]) / 2, (Pt[1] + H_F[i + 1][1]) / 2]] : [Pt])), [64, 124], [236, 124]];
    const MECHES = CIB.map((Pt, i) => meche([150 + (Pt[0] - 150) * 0.42 - 10 + (i % 3) * 4, 22 + Math.abs(Pt[0] - 150) * 0.06], Pt, [8, 11, 9, 12][i % 4], [5, 8, 6, 9, 7][i % 5]));
    const SECHES = [[[104, 26], [58, 112], 7, 5], [[196, 26], [242, 112], 7, 5]].map(([A, B, b, w]) => meche(A, B, b, w));

    return (
        <g>
            <defs>
                <radialGradient id={`${P}peau`} gradientUnits="userSpaceOnUse" cx="138" cy="130" r="215">{arret([[0, clair], [0.42, c.chair], [1, c.chairOmbre]])}</radialGradient>
                <linearGradient id={`${P}bord`} gradientUnits="userSpaceOnUse" x1="56" y1="0" x2="244" y2="0">
                    {arret([[0, c.chairOmbre, 0.85], [0.16, c.chairOmbre, 0.3], [0.32, c.chairOmbre, 0], [0.68, c.chairOmbre, 0], [0.84, c.chairOmbre, 0.3], [1, c.chairOmbre, 0.85]])}
                </linearGradient>
                <linearGradient id={`${P}bas`} gradientUnits="userSpaceOnUse" x1="0" y1="205" x2="0" y2="308">{arret([[0, c.chairOmbre, 0], [1, c.chairOmbre, 0.6]])}</linearGradient>
                <linearGradient id={`${P}cou`} gradientUnits="userSpaceOnUse" x1="0" y1="262" x2="0" y2="372">{arret([[0, c.chairOmbre, 0.95], [0.45, c.chairOmbre, 0.35], [1, c.chair, 0]])}</linearGradient>
                <linearGradient id={`${P}buste`} gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="406">{arret([[0, c.chair], [0.5, c.chair], [1, c.chairClair]])}</linearGradient>
                <linearGradient id={`${P}epaule`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="0">
                    {arret([[0, c.chairOmbre, 0.75], [0.2, c.chairOmbre, 0.15], [0.35, c.chairOmbre, 0], [0.65, c.chairOmbre, 0], [0.8, c.chairOmbre, 0.15], [1, c.chairOmbre, 0.75]])}
                </linearGradient>
                <linearGradient id={`${P}lidV2`} gradientUnits="userSpaceOnUse" x1="0" y1="152" x2="0" y2="161">{arret([[0, '#0f172a', 0.55], [1, '#0f172a', 0]])}</linearGradient>
                <linearGradient id={`${P}lidInf`} gradientUnits="userSpaceOnUse" x1="0" y1="163" x2="0" y2="169">{arret([[0, '#0f172a', 0], [1, '#0f172a', 0.28]])}</linearGradient>
                <radialGradient id={`${P}iris`} cx="0.5" cy="0.5" r="0.5">
                    {arret([[0, S ? '#b9c6d8' : '#a3b1c4'], [0.5, S ? '#8a9ab2' : '#6b7c94'], [0.85, S ? '#64748b' : '#3a475b'], [1, S ? '#475569' : '#1f2937']])}
                </radialGradient>
                <linearGradient id={`${P}oreille`} gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="68" y2="0">{arret([[0, c.chairOmbre], [0.5, c.chair], [1, c.chairClair]])}</linearGradient>
                <linearGradient id={`${P}cheveu`} gradientUnits="userSpaceOnUse" x1="60" y1="10" x2="210" y2="140">{arret([[0, cheveuClair], [1, cheveuFonce]])}</linearGradient>
                <linearGradient id={`${P}levre`} x1="0" y1="0" x2="0" y2="1">{arret([[0, c.rouge, 0.34], [1, c.rouge, 0.46]])}</linearGradient>
                <linearGradient id={`${P}nezG`} x1="0" y1="0" x2="1" y2="0">{arret([[0, c.chairOmbre, 0.75], [1, c.chairOmbre, 0]])}</linearGradient>
                <linearGradient id={`${P}nezD`} x1="1" y1="0" x2="0" y2="0">{arret([[0, c.chairOmbre, 0.75], [1, c.chairOmbre, 0]])}</linearGradient>
                {halo(`${P}clair`, clair, 1)}
                {halo(`${P}blanc`, blanc, S ? 0.45 : 0.95)}
                {halo(`${P}ombre`, c.chairOmbre, 1)}
                <clipPath id={`${P}tete`}><path d={TETE} /></clipPath>
                <clipPath id={`${P}busteclip`}><path d={BUSTE} /></clipPath>
                <clipPath id={`${P}cheveuclip`}><path d={HC} /></clipPath>
            </defs>

            {/* ── buste, cou, trapèzes ── */}
            <path d={BUSTE} fill={u('buste')} />
            <g clipPath={u('busteclip')}>
                <rect x="-10" y="250" width="320" height="160" fill={u('epaule')} />
                <rect x="60" y="255" width="180" height="125" fill={u('cou')} />
                {/* sterno-cléido-mastoïdiens (volume doux), clavicules, creux sus-sternal */}
                {cotes((m) => {
                    const { Q, k } = refl(m);
                    return (
                        <g key={`scm${k}`}>
                            <path d={Q('M97 282C103 310 114 342 133 371')} fill="none" stroke={c.traitFin} strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
                            <path d={Q('M106 286C112 308 122 332 138 358')} fill="none" stroke={c.chairClair} strokeWidth="6" strokeLinecap="round" opacity=".5" />
                            <path d={Q('M112 290C118 310 128 330 141 348')} fill="none" stroke={c.chairOmbre} strokeWidth="7" strokeLinecap="round" opacity=".2" />
                            <path d={Q('M137 372C119 367 98 368 78 375C58 382 34 392 12 402')} fill="none" stroke={c.traitFin} strokeWidth="1.3" strokeLinecap="round" />
                            <path d={Q('M130 376C112 376 92 378 72 386')} fill="none" stroke={c.chairClair} strokeWidth="4" strokeLinecap="round" opacity=".5" />
                            <path d={Q('M98 357C80 364 58 374 34 388')} fill="none" stroke={c.chairOmbre} strokeWidth="6" strokeLinecap="round" opacity=".18" />
                        </g>
                    );
                })}
                <ellipse cx="150" cy="370" rx="9" ry="5" fill={u('ombre')} opacity=".9" />
                <path d="M143 322C146 329 154 329 157 322" fill="none" stroke={c.traitFin} strokeWidth="1" strokeLinecap="round" opacity=".6" />
                <ellipse cx="150" cy="336" rx="7" ry="13" fill={u('blanc')} opacity=".28" />
                <path d="M150 351L150 370" stroke={c.chairOmbre} strokeWidth="2" strokeLinecap="round" opacity=".35" />
            </g>
            <path d={BUSTE_TRAIT_G} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinecap="round" />
            <path d={`${lisse(mp(BUSTE_G))}`} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinecap="round" />

            {/* ── oreilles ── */}
            {cotes(oreille)}

            {/* ── tête ── */}
            <path d={TETE} fill={u('peau')} />
            <g clipPath={u('tete')}>
                <rect x="30" y="8" width="240" height="310" fill={u('bord')} />
                <rect x="30" y="205" width="240" height="105" fill={u('bas')} />
                <ellipse cx="150" cy="92" rx="72" ry="38" fill={u('clair')} opacity=".95" />
                <ellipse cx="146" cy="104" rx="30" ry="20" fill={u('blanc')} opacity=".4" />
                {cotes(joue)}
                {/* creux sous la lèvre, dessous du nez, menton */}
                <ellipse cx="150" cy="230" rx="26" ry="6.5" fill={u('ombre')} opacity=".5" />
                <ellipse cx="150" cy="281" rx="25" ry="7" fill={u('ombre')} opacity=".75" />
                <ellipse cx="150" cy="291" rx="18" ry="9" fill={u('clair')} opacity=".9" />
                <ellipse cx="150" cy="289" rx="9" ry="4.5" fill={u('blanc')} opacity=".4" />
                <ellipse cx="150" cy="299" rx="30" ry="9" fill={u('ombre')} opacity=".55" />
                {/* pente latérale du nez (ombre) et dorsum (lumière) */}
                <path d="M143 168C141 178 138 188 133.500 197L129.500 209C131 214 134 218 139 219C141 208 144.500 190 145 170Z" fill={u('nezG')} />
                <path d="M157 168C159 178 162 188 166.500 197L170.500 209C169 214 166 218 161 219C159 208 155.500 190 155 170Z" fill={u('nezD')} />
                <ellipse cx="150" cy="180" rx="5.5" ry="20" fill={u('blanc')} opacity=".75" />
                <ellipse cx="150" cy="199" rx="9" ry="8" fill={u('blanc')} opacity=".6" />
                <ellipse cx="150" cy="223" rx="9" ry="3.500" fill={u('ombre')} opacity=".55" />
                <ellipse cx="150" cy="164" rx="9" ry="8" fill={u('ombre')} opacity=".35" />
                <ellipse cx="150" cy="130" rx="11" ry="12" fill={u('ombre')} opacity=".18" />
                {cotes(oeil)}
                {/* sillons nasogéniens : ombre portée douce, pli fin, dans l'axe de la zone */}
                {cotes((m) => {
                    const { Q, k } = refl(m);
                    return (
                        <g key={`nl${k}`}>
                            <path d={Q('M129 212C124 222 118 237 113.500 250C111 258 110 265 110.500 272')} fill="none" stroke={c.chairOmbre} strokeWidth="6" strokeLinecap="round" opacity=".28" />
                            <path d={Q('M129 212C124 222 118 237 113.500 250C111 258 110 265 110.500 272')} fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" opacity=".6" />
                        </g>
                    );
                })}
            </g>
            <path d={TETE} fill="none" stroke={c.trait} strokeWidth="1.6" strokeLinejoin="round" />

            {/* ── sourcils ── */}
            {cotes(sourcil)}

            {/* ── nez : ailes ouvertes (non refermées), narines inégales, sillon alaire fin ── */}
            {cotes((m) => {
                const { Q, k } = refl(m);
                return (
                    <g key={`nez${k}`}>
                        <path d={Q('M141.500 166C140.500 176 138 185 134.500 194')} fill="none" stroke={c.traitFin} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
                        <path d={Q('M137 198C132 199 129.500 203 129.500 208.500C129.500 213.500 131.500 217 134.500 218.800')} fill="none" stroke={c.trait} strokeWidth="1" strokeLinecap="round" opacity=".7" />
                        <path d={Q('M132.500 207C134 205 136 204 138.500 204')} fill="none" stroke={c.traitFin} strokeWidth="0.8" strokeLinecap="round" opacity=".55" />
                        <path d={Q(k === 'l' ? 'M135.500 218.500C136.500 214.500 141 213.500 145 215.500C142.500 218.700 139 220 135.500 218.500Z' : 'M136 218.600C137 215.200 141 214.200 144.500 216C142.200 218.800 139 219.800 136 218.600Z')} fill={pupille} opacity=".42" />
                        <path d={Q('M134.500 221.500C139 223 145 223 148.500 220.800')} fill="none" stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" opacity=".5" />
                        <path d={Q('M139 205C143.500 209 148 210 150 210')} fill="none" stroke={c.traitFin} strokeWidth="0.8" strokeLinecap="round" opacity=".5" />
                        <path d={Q('M146.500 222.500C145.500 227 144.500 233 144.800 238')} fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" opacity=".7" />
                    </g>
                );
            })}
            <path d="M149 214C149.500 217.500 149.500 219.500 150 220C150.500 219.500 150.500 217.500 151 214" fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity=".6" />

            {/* ── bouche ── */}
            <path d="M118 253C125 250 134 245 144 238.500C146 237.500 148 239.500 150 240.500C152 239.500 154 237.500 156 238.500C166 245 175 250 182 253C172 252.200 161 251.400 150 251.500C139 251.400 128 252.200 118 253Z" fill={u('levre')} />
            <path d="M118 253C128 252.200 139 251.400 150 251.500C161 251.400 172 252.200 182 253C178 261 168 268.500 150 269.200C132 268.500 122 261 118 253Z" fill={u('levre')} />
            <ellipse cx="150" cy="262" rx="17" ry="4.500" fill={u('blanc')} opacity=".6" />
            <ellipse cx="150" cy="268" rx="15" ry="3" fill={u('ombre')} opacity=".4" />
            <ellipse cx="150" cy="245.500" rx="19" ry="3.600" fill={u('ombre')} opacity=".45" />
            <path d="M118 253C125 250 134 245 144 238.500C146 237.500 148 239.500 150 240.500C152 239.500 154 237.500 156 238.500C166 245 175 250 182 253" fill="none" stroke={c.trait} strokeWidth="1" strokeLinecap="round" opacity=".65" />
            <path d="M118 253C128 252.200 139 251.400 150 251.500C161 251.400 172 252.200 182 253" fill="none" stroke={c.trait} strokeWidth="1.7" strokeLinecap="round" />
            <path d="M118 253C122 262 132 269.500 150 270.200C168 269.500 178 262 182 253" fill="none" stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" opacity=".55" />
            <path d="M118 253C116.500 253.200 115.500 252.200 115 250.500M182 253C183.500 253.200 184.500 252.200 185 250.500" fill="none" stroke={c.trait} strokeWidth="1.100" strokeLinecap="round" />
            <path d="M138 277C145 279 155 279 162 277" fill="none" stroke={c.traitFin} strokeWidth="1" strokeLinecap="round" opacity=".8" />

            {/* ── cheveux ── */}
            <path d={HC} fill={u('cheveu')} />
            <g clipPath={u('cheveuclip')}>
                {MECHES.map((mc, i) => <path key={`m${i}`} d={mc.lens} fill={brinFonce} opacity=".34" />)}
                {SECHES.map((mc, i) => <path key={`s${i}`} d={mc.lens} fill={brinFonce} opacity=".26" />)}
                {MECHES.map((mc, i) => <path key={`l${i}`} d={mc.ligne} fill="none" stroke={brin} strokeWidth={0.5 + (i % 3) * 0.25} strokeLinecap="round" opacity=".42" />)}
                <path d="M104 30C124 21 170 21 192 32C172 27 128 27 104 30Z" fill={brin} opacity=".4" />
            </g>
            <path d={HC} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            <path d={lisse(H_F)} fill="none" stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" opacity=".5" />
        </g>
    );
};

// ═════════════════════════════ PROFIL : dessin ═════════════════════════════
const decorProfil = (cote) => (c) => {
    const S = c.sombre;
    const P = `visage-profil-${cote}-c-`;
    const u = (n) => `url(#${P}${n})`;
    const blanc = S ? '#cfd9e8' : '#ffffff';
    const sclere = S ? '#d3dbe7' : '#fbfcfe';
    const cheveuClair = S ? '#8394b2' : '#97a3b8';
    const cheveuFonce = S ? '#5a6a8a' : '#64718a';
    const brin = S ? '#c1cee4' : '#e3e9f2';
    const brinFonce = S ? '#3b4863' : '#475569';
    const clair = S ? '#5f7190' : c.chairClair;

    // cheveux : épousent le crâne (épaisseur ≈ 5), s'arrêtent derrière l'oreille par un bord arrondi (pas de pointe sur la nuque)
    const HAUT = [[272, 222], [286.6, 188], [292.4, 150], [288.7, 113], [273.6, 73.5], [245, 40.4], [209.6, 22], [173.2, 20.1], [146, 29.4], [126.9, 43.8], [116, 66]];
    const HAIR = `${lisse([...HP_A, ...HP_B.slice(1)])}${courbes([[198, 156], [206, 150], [222, 146], [240, 152], [249, 168], [251, 196], [249, 216], [247, 230], [253, 237], [262, 232], [272, 222]])}${courbes(HAUT)}Z`;
    const CIBLES = [[116, 66], [134, 70], [146, 77], [160, 88], [171, 108], [180, 128], [190, 146], [198, 156], [249, 168], [251, 196], [249, 216], [247, 230], [262, 232]];
    const CIB2 = CIBLES.flatMap((Pt, i) => (i < CIBLES.length - 1 ? [Pt, [(Pt[0] + CIBLES[i + 1][0]) / 2, (Pt[1] + CIBLES[i + 1][1]) / 2]] : [Pt]));
    const MECHES = CIB2.map((Pt, i) => meche([172 + (i / (CIB2.length - 1)) * 92 + (i % 3) * 4, 30 + Math.pow(i / (CIB2.length - 1), 2) * 34], Pt, [12, 9, 14, 10][i % 4], [7, 5, 8, 6][i % 4], [190, 125]));
    const OEIL = 'M135 161C128 156 119 152.500 112 153C107.500 154 103.500 157 103 161C103 164.500 105.500 167 110 168C118 169.500 128 166 135 161Z';

    return (
        <g>
            <defs>
                <linearGradient id={`${P}peau`} gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="290" y2="0">{arret([[0, clair], [0.35, c.chair], [1, c.chairOmbre]])}</linearGradient>
                <linearGradient id={`${P}cou`} gradientUnits="userSpaceOnUse" x1="0" y1="285" x2="0" y2="400">{arret([[0, c.chairOmbre, 0], [0.2, c.chairOmbre, 0.5], [0.6, c.chairOmbre, 0.2], [1, c.chair, 0]])}</linearGradient>
                <linearGradient id={`${P}oreille`} gradientUnits="userSpaceOnUse" x1="205" y1="0" x2="250" y2="0">{arret([[0, c.chairClair], [1, c.chairOmbre]])}</linearGradient>
                <linearGradient id={`${P}cheveu`} gradientUnits="userSpaceOnUse" x1="120" y1="10" x2="290" y2="220">{arret([[0, cheveuClair], [1, cheveuFonce]])}</linearGradient>
                <radialGradient id={`${P}iris`} cx="0.5" cy="0.5" r="0.5">{arret([[0, S ? '#b9c6d8' : '#a3b1c4'], [0.6, S ? '#7d8da6' : '#566780'], [1, S ? '#475569' : '#1f2937']])}</radialGradient>
                <linearGradient id={`${P}levre`} x1="0" y1="0" x2="0" y2="1">{arret([[0, c.rouge, 0.34], [1, c.rouge, 0.46]])}</linearGradient>
                {halo(`${P}clair`, clair, 1)}
                {halo(`${P}blanc`, blanc, S ? 0.45 : 0.95)}
                {halo(`${P}ombre`, c.chairOmbre, 1)}
                <clipPath id={`${P}sil`}><path d={SIL_P} /></clipPath>
                <clipPath id={`${P}cheveuclip`}><path d={HAIR} /></clipPath>
                <clipPath id={`${P}oeil`}><path d={OEIL} /></clipPath>
                <clipPath id={`${P}ore`}><path d={OREILLE_P_RAW} /></clipPath>
            </defs>

            <path d={SIL_P} fill={u('peau')} />
            <g clipPath={u('sil')}>
                {/* ombre sous la mâchoire, nuque */}
                <rect x="100" y="285" width="260" height="120" fill={u('cou')} />
                <ellipse cx="168" cy="320" rx="58" ry="20" fill={u('ombre')} opacity=".8" />
                {/* reliefs : front, arcade, pommette, masséter, angle, mastoïde */}
                <ellipse cx="112" cy="104" rx="20" ry="36" fill={u('blanc')} opacity=".55" transform="rotate(14 112 104)" />
                <ellipse cx="150" cy="196" rx="30" ry="14" fill={u('clair')} opacity=".95" transform="rotate(10 150 196)" />
                <ellipse cx="146" cy="193" rx="14" ry="6" fill={u('blanc')} opacity=".5" transform="rotate(10 146 193)" />
                <ellipse cx="146" cy="236" rx="30" ry="22" fill={u('ombre')} opacity=".4" />
                <ellipse cx="176" cy="238" rx="20" ry="22" fill={u('clair')} opacity=".55" />
                <ellipse cx="196" cy="268" rx="22" ry="12" fill={u('ombre')} opacity=".55" transform="rotate(-35 196 268)" />
                <ellipse cx="122" cy="164" rx="24" ry="14" fill={u('ombre')} opacity=".55" />
                <ellipse cx="170" cy="126" rx="18" ry="30" fill={u('ombre')} opacity=".4" />
                <ellipse cx="96" cy="279" rx="13" ry="6" fill={u('ombre')} opacity=".7" />
                <ellipse cx="87" cy="292" rx="8" ry="9" fill={u('clair')} opacity=".9" />
                <ellipse cx="86" cy="196" rx="9" ry="14" fill={u('blanc')} opacity=".4" />
                <ellipse cx="230" cy="262" rx="14" ry="16" fill={u('ombre')} opacity=".35" />
                <ellipse cx="282" cy="165" rx="20" ry="80" fill={u('ombre')} opacity=".5" />
                {/* sterno-cléido-mastoïdien et trapèze */}
                <path d="M214 248C198 278 174 318 146 368" fill="none" stroke={c.traitFin} strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
                <path d="M226 252C216 286 196 332 168 382" fill="none" stroke={c.traitFin} strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
                <path d="M219 262C208 290 190 326 166 366" fill="none" stroke={c.chairClair} strokeWidth="9" strokeLinecap="round" opacity=".3" />
                <path d="M236 268C232 294 236 322 250 350" fill="none" stroke={c.traitFin} strokeWidth="1" opacity=".5" />
                <ellipse cx="146" cy="334" rx="6" ry="10" fill={u('blanc')} opacity=".4" />
                <path d="M141 322C138 328 138 336 140 343" fill="none" stroke={c.traitFin} strokeWidth="0.9" opacity=".55" />
                {/* ligne de la mandibule (relief sous la peau) */}
                <path d="M207 246C197 266 184 280 164 292C146 302 128 307 112 308" fill="none" stroke={c.chairOmbre} strokeWidth="4" strokeLinecap="round" opacity=".24" />
                {/* arcade sourcilière et glabelle */}
                <path d="M97 152C108 145 124 143 138 149" fill="none" stroke={c.chairOmbre} strokeWidth="4" strokeLinecap="round" opacity=".3" />
                <ellipse cx="100" cy="141" rx="6" ry="9" fill={u('blanc')} opacity=".5" />
            </g>

            <path d={SIL_P_TRAIT} fill="none" stroke={c.trait} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />

            {/* oreille (sommet à hauteur du sourcil) */}
            <g transform="translate(0 -14)">
                <path d={OREILLE_P_RAW} fill={u('oreille')} />
                <g clipPath={u('ore')}>
                    <ellipse cx="219" cy="197" rx="8" ry="12" fill={u('ombre')} opacity=".95" />
                    <ellipse cx="238" cy="190" rx="9" ry="20" fill={u('ombre')} opacity=".45" />
                </g>
                <path d="M209 183C213 172 226 165 235 169C241 174 240 185 236 195C232 205 226 215 220 222" fill="none" stroke={c.trait} strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
                <path d="M213 189C218 180 228 179 231 186C232 192 229 199 224 206" fill="none" stroke={c.traitFin} strokeWidth="1.1" strokeLinecap="round" />
                <path d="M229 183C226 178 221 178 218 182" fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" />
                <path d="M217 205C215 210 217 215 222 215C222.500 211 221 207 217 205Z" fill={c.chairClair} stroke={c.trait} strokeWidth="0.9" />
                <path d="M209 190C206 192 206 199 209 203C212 200 212 194 209 190Z" fill={c.chairClair} stroke={c.trait} strokeWidth="0.9" />
                <path d="M212 232C214 226 218 221 222 218" fill="none" stroke={c.traitFin} strokeWidth="0.8" opacity=".7" />
                <path d={OREILLE_P_RAW} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            </g>

            {/* cheveux */}
            <path d={HAIR} fill={u('cheveu')} />
            <g clipPath={u('cheveuclip')}>
                {MECHES.map((mc, i) => <path key={`m${i}`} d={mc.lens} fill={brinFonce} opacity=".34" />)}
                {MECHES.map((mc, i) => <path key={`l${i}`} d={mc.ligne} fill="none" stroke={brin} strokeWidth={0.5 + (i % 3) * 0.25} strokeLinecap="round" opacity=".42" />)}
                <path d="M170 28C196 20 232 21 258 38C232 31 196 32 170 28Z" fill={brin} opacity=".4" />
            </g>
            <path d={HAIR} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            {/* l'oreille reste visible par-dessus la lisière des cheveux */}
            <g transform="translate(0 -14)">
                <path d={OREILLE_P_RAW} fill={u('oreille')} />
                <path d="M209 183C213 172 226 165 235 169C241 174 240 185 236 195C232 205 226 215 220 222" fill="none" stroke={c.trait} strokeWidth="1.1" strokeLinecap="round" opacity=".85" />
                <path d="M213 189C218 180 228 179 231 186C232 192 229 199 224 206" fill="none" stroke={c.traitFin} strokeWidth="1.1" strokeLinecap="round" />
                <path d="M217 205C215 210 217 215 222 215C222.500 211 221 207 217 205Z" fill={c.chairClair} stroke={c.trait} strokeWidth="0.9" />
                <path d="M209 190C206 192 206 199 209 203C212 200 212 194 209 190Z" fill={c.chairClair} stroke={c.trait} strokeWidth="0.9" />
                <path d={OREILLE_P_RAW} fill="none" stroke={c.trait} strokeWidth="1.5" strokeLinejoin="round" />
            </g>

            {/* sourcil sur l'arcade, œil de profil (cornée en saillie, fente en coin) */}
            <path d="M94 143C100 135 116 131 141 137C128 136 113 139.500 101 148C97.500 148 94 146.500 94 143Z" fill={c.trait} opacity=".6" />
            {[[96, 142, 100, 137.500], [102, 140, 107, 135], [110, 137, 116, 133.500], [118, 135.500, 125, 133], [127, 135.500, 135, 134.500]].map(([a, b, d, e], i) => (
                <path key={i} d={`M${a} ${b}L${d} ${e}`} stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" />
            ))}
            <path d={OEIL} fill={sclere} />
            <g clipPath={u('oeil')}>
                <ellipse cx="107.200" cy="160.800" rx="3.600" ry="5.800" fill={u('iris')} />
                <ellipse cx="105.800" cy="160.800" rx="1.800" ry="3" fill="#0f172a" />
                <ellipse cx="105.500" cy="158.800" rx="0.900" ry="1.200" fill="#fff" />
                <rect x="100" y="151" width="40" height="8" fill="#0f172a" opacity=".22" />
            </g>
            <path d="M135 161C128 156 119 152.500 112 153C108 153.800 104.500 156 103.300 159" fill="none" stroke={c.trait} strokeWidth="1.9" strokeLinecap="round" />
            <path d="M103.300 163C104 166 107 168 110 168C118 169.500 128 166 135 161" fill="none" stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" opacity=".75" />
            {[[108, 153.300, 103, 150], [113, 152.700, 109, 148.500], [119, 153.400, 116, 149.500]].map(([a, b, d, e], i) => (
                <path key={i} d={`M${a} ${b}L${d} ${e}`} stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" />
            ))}
            <path d="M106 150C113 146.500 126 147 139 155" fill="none" stroke={c.trait} strokeWidth="1" strokeLinecap="round" opacity=".6" />
            <path d="M112 175C122 179.500 134 180 142 177" fill="none" stroke={c.traitFin} strokeWidth="1" strokeLinecap="round" opacity=".8" />
            <path d="M111 177C120 183 131 184 140 181" fill="none" stroke={c.chairOmbre} strokeWidth="4" strokeLinecap="round" opacity=".3" />

            {/* nez : dos modelé, aile avec une vraie narine */}
            <path d="M100 197C106 201 107.500 211 101 218C98 220.500 93 221.500 88 220.500" fill="none" stroke={c.trait} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M80 215.500C85 212.500 92 213.500 96 217.500C91.500 220 85 220.500 80 215.500Z" fill="#0f172a" opacity=".42" />
            <path d="M83 212C89 208.500 96.500 210.500 99.500 215.500" fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" opacity=".6" />
            <path d="M96 181C98 188 100 193 100.500 198" fill="none" stroke={c.traitFin} strokeWidth="0.9" opacity=".7" />
            <path d="M97 168C98.500 178 100.500 187 102 194" fill="none" stroke={c.chairOmbre} strokeWidth="4" strokeLinecap="round" opacity=".28" />

            {/* bouche */}
            <path d="M79 242C81 246.500 84 250 88 251.500C98 252 107 253 115 254.500C107 249 99 242.500 91 237.500C87 235.500 82 236.500 79 242Z" fill={u('levre')} />
            <path d="M88 251.500C98 252 107 253 115 254.500C111 261 100 266 87 268.500C83.500 269 80 266.500 79 262C79 257.500 83 254 88 251.500Z" fill={u('levre')} />
            <ellipse cx="93" cy="262" rx="9" ry="3.500" fill={u('blanc')} opacity=".55" transform="rotate(-10 93 262)" />
            <path d="M88 251.500C98 252 107 253 115 254.500" fill="none" stroke={c.trait} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M115 254.500C116.500 254.700 117.500 254 118 252.800" fill="none" stroke={c.trait} strokeWidth="1" strokeLinecap="round" />
            <path d="M81 241C91 243 103 247.500 115 254.500" fill="none" stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" opacity=".55" />
            <path d="M83 268.500C93 270.500 105 266 114 257.500" fill="none" stroke={c.trait} strokeWidth="0.9" strokeLinecap="round" opacity=".5" />
            <path d="M100 221C105 233 111 245 113 252" fill="none" stroke={c.chairOmbre} strokeWidth="5" strokeLinecap="round" opacity=".28" />
            <path d="M100 221C105 233 111 245 113 252" fill="none" stroke={c.traitFin} strokeWidth="0.9" strokeLinecap="round" opacity=".6" />
            <path d="M89 275C98 278.500 106 276 112 268" fill="none" stroke={c.traitFin} strokeWidth="1" strokeLinecap="round" opacity=".8" />
        </g>
    );
};

const etiquettesProfil = (cote) => (cote === 'g'
    ? [{ x: 56, y: 24, texte: 'Profil gauche', ancre: 'start', taille: 14 }]
    : [{ x: 314, y: 24, texte: 'Profil droit', ancre: 'end', taille: 14 }]);

export default {
    id: 'visage',
    titre: 'Visage',
    vues: [
        {
            id: 'face', titre: 'Face', viewBox: '0 0 300 400', largeur: 290, reperes: true,
            decor: decorFace,
            etiquettes: [
                { x: 22, y: 166, texte: 'D', ancre: 'middle', taille: 20 },
                { x: 278, y: 166, texte: 'G', ancre: 'middle', taille: 20 },
            ],
            zones: zonesFace,
        },
        {
            id: 'profil_g', titre: 'Profil gauche', viewBox: '50 10 270 396', largeur: 290, reperes: true,
            decor: decorProfil('g'),
            etiquettes: etiquettesProfil('g'),
            zones: zonesProfil('g'),
        },
        {
            id: 'profil_d', titre: 'Profil droit', viewBox: '50 10 270 396', largeur: 290, reperes: true,
            // reflet du profil gauche autour de x = 185 (les textes ne sont pas retournés : ils sont dans `etiquettes`)
            decor: (c, o) => <g transform="translate(370 0) scale(-1 1)">{decorProfil('d')(c, o)}</g>,
            etiquettes: etiquettesProfil('d'),
            zones: zonesProfil('d'),
        },
    ],
};
