import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SEGMENTS_IMC, IMC_MIN, IMC_MAX, formater } from './constantesSeuils';

// Petits graphiques des constantes vitales : mini-courbe (sparkline) et jauge d'IMC.
// Dessinés en SVG / CSS, sans bibliothèque. Les couleurs viennent du thème.

/** Couleur d'un niveau (normal / limite / anormal) : `main` pour les aplats, `texte` pour le texte lisible. */
export function couleursNiveau(theme, niveau) {
    const palette = { normal: theme.palette.success, limite: theme.palette.warning, verifier: theme.palette.warning, anormal: theme.palette.error }[niveau];
    if (!palette) return null;
    const sombre = theme.palette.mode === 'dark';
    // En clair, l'ambre et le vert « main » sont trop pâles pour du texte : on les fonce (contraste >= 4,5:1).
    const fonce = { normal: 0.4, limite: 0.5, verifier: 0.5, anormal: 0.25 }[niveau];
    return {
        main: palette.main,
        texte: sombre ? palette.main : mixerSombre(palette.main, fonce),
        plein: sombre ? palette.main : palette.dark,
    };
}

function mixerSombre(hex, facteur) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(x * (1 - facteur)));
    return `rgb(${c.join(',')})`;
}

const L = 200; // largeur du repère du SVG

/**
 * Mini-courbe.
 *  lignes   : [[v0, v1, ...]] une ou deux séries de même longueur (TAS puis TAD) ; null = point manquant
 *  bande    : [bas, haut] zone « normale » estompée derrière la courbe (facultatif)
 *  etendue  : amplitude minimale de l'axe, pour qu'une variation infime ne ressemble pas à un grand écart
 *  couleur  : couleur du point actuel et du dernier segment
 *  courant  : true si le dernier point est la valeur saisie aujourd'hui
 */
export function MiniCourbe({ lignes, bande, etendue = 1, couleur, courant, libelle, hauteur = 36 }) {
    const theme = useTheme();
    const n = lignes[0].length;
    if (n < 2) return null;
    const valeurs = lignes.flat().filter((v) => v !== null && v !== undefined);
    let min = Math.min(...valeurs);
    let max = Math.max(...valeurs);
    if (max - min < etendue) { const milieu = (min + max) / 2; min = milieu - etendue / 2; max = milieu + etendue / 2; }
    const marge = (max - min) * 0.12;
    min -= marge; max += marge;
    const X = (i) => 8 + (i / (n - 1)) * (L - 16);
    const Y = (v) => hauteur - 4 - ((v - min) / (max - min)) * (hauteur - 8);
    const trace = (ligne) => ligne.map((v, i) => (v === null || v === undefined ? null : [X(i), Y(v)])).filter(Boolean);
    const lisse = theme.palette.text.secondary;
    const pct = (v, total) => `${(v / total) * 100}%`;
    const haut = bande ? Math.max(0, Math.min(hauteur, Y(bande[1]))) : 0;
    const bas = bande ? Math.max(0, Math.min(hauteur, Y(bande[0]))) : 0;

    return (
        <Box role="img" aria-label={libelle} sx={{ position: 'relative', height: hauteur, width: '100%' }}>
            <svg viewBox={`0 0 ${L} ${hauteur}`} preserveAspectRatio="none" width="100%" height={hauteur} style={{ display: 'block', overflow: 'hidden' }} aria-hidden="true">
                {bande && bas - haut > 0.5 && (
                    <rect x="0" y={haut} width={L} height={bas - haut} fill={alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.16 : 0.13)} />
                )}
                {lignes.map((ligne, k) => {
                    const pts = trace(ligne);
                    if (pts.length < 2) return null;
                    const dernier = pts.slice(-2);
                    return (
                        <g key={k} fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={pts.map((p) => p.join(',')).join(' ')} stroke={lisse} strokeOpacity={k === 0 ? 0.75 : 0.4} strokeWidth="1.5" strokeDasharray={k === 0 ? undefined : '3 3'} vectorEffect="non-scaling-stroke" />
                            {k === 0 && courant && (
                                <polyline points={dernier.map((p) => p.join(',')).join(' ')} stroke={couleur} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            )}
                        </g>
                    );
                })}
            </svg>
            {/* Les points sont en HTML pour rester ronds malgré l'étirement du SVG */}
            {lignes.map((ligne, k) => trace(ligne).map(([x, y], i, pts) => {
                const dernier = i === pts.length - 1;
                if (k > 0 && !dernier) return null;
                const taille = dernier ? (k === 0 ? 10 : 6) : 5;
                const teinte = dernier && k === 0 ? (courant ? couleur : lisse) : lisse;
                return (
                    <Box key={`${k}-${i}`} sx={{
                        position: 'absolute', left: pct(x, L), top: pct(y, hauteur), width: taille, height: taille, borderRadius: '50%',
                        transform: 'translate(-50%, -50%)', bgcolor: teinte, opacity: dernier ? 1 : 0.55,
                        boxShadow: dernier && k === 0 ? `0 0 0 2px ${theme.palette.background.subtle || theme.palette.background.paper}` : 'none',
                    }} />
                );
            }))}
        </Box>
    );
}

/** Jauge d'IMC : barre segmentée (classes OMS adulte) avec un curseur sur la valeur. */
export function JaugeImc({ valeur }) {
    const theme = useTheme();
    const total = IMC_MAX - IMC_MIN;
    const position = valeur === null ? null : Math.min(100, Math.max(0, ((valeur - IMC_MIN) / total) * 100));
    const actif = valeur === null ? null : [...SEGMENTS_IMC].reverse().find((s) => valeur >= s.de) || SEGMENTS_IMC[0];
    const repere = theme.palette.background.subtle || theme.palette.background.paper;
    return (
        <Box sx={{ pt: 0.5 }} role="img" aria-label={valeur === null ? 'Jauge d\'IMC : en attente du poids et de la taille' : `Jauge d'IMC : ${formater(valeur, 1, 1)} (${actif.mot})`}>
            <Box sx={{ position: 'relative' }}>
                <Box sx={{ display: 'flex', gap: '2px', height: 10 }}>
                    {SEGMENTS_IMC.map((s) => {
                        const c = couleursNiveau(theme, s.niveau);
                        const courant = actif === s;
                        return (
                            <Box key={s.de} sx={{
                                flex: `${s.a - s.de} 1 0`, minWidth: 0, bgcolor: c.main, opacity: valeur === null ? 0.28 : (courant ? 1 : 0.32),
                                borderRadius: '2px', '&:first-of-type': { borderRadius: '5px 2px 2px 5px' }, '&:last-of-type': { borderRadius: '2px 5px 5px 2px' },
                            }} />
                        );
                    })}
                </Box>
                {position !== null && (
                    <Box sx={{
                        position: 'absolute', left: `${position}%`, top: '50%', width: 16, height: 16, borderRadius: '50%', transform: 'translate(-50%, -50%)',
                        bgcolor: 'background.paper', border: '3px solid', borderColor: couleursNiveau(theme, actif.niveau).plein,
                        boxShadow: `0 0 0 2px ${repere}, 0 2px 4px rgba(15,23,42,0.25)`,
                    }} />
                )}
            </Box>
            <Box sx={{ position: 'relative', height: 16, mt: 0.5 }} aria-hidden="true">
                {[18.5, 25, 30, 35, 40].map((v) => (
                    <Typography key={v} component="span" sx={{
                        position: 'absolute', left: `${((v - IMC_MIN) / total) * 100}%`, transform: 'translateX(-50%)', fontSize: '0.68rem', lineHeight: '16px',
                        color: 'text.secondary', fontVariantNumeric: 'tabular-nums',
                    }}>{formater(v, 0, 1)}</Typography>
                ))}
            </Box>
        </Box>
    );
}
