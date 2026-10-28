import React, { useMemo } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import PregnantWomanIcon from '@mui/icons-material/PregnantWoman';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventIcon from '@mui/icons-material/Event';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Terme de la grossesse : frise de 0 à 41 SA, curseur « vous êtes ici », date prévue d'accouchement (DPA)
// et repères des trois échographies obstétricales. Remplace la petite alerte « 28 SA + 0 j » de BlocGyneco.
// Props : ddr "AAAA-MM-JJ" | "", enceinte bool. `aujourdhui` (Date ou "AAAA-MM-JJ") ne sert qu'aux tests et aperçus.

const JOUR = 86400000;
const FIN_FRISE = 41;              // la frise va de 0 à 41 SA
const SA_MAX_VALIDE = 44;          // au-delà de 44 SA révolues, la DDR est jugée incohérente
const DUREE_TERME = 280;           // 40 SA

const TRIMESTRES = [
    { id: 1, debut: 0, fin: 14, court: '1er trimestre', plage: '0–13 SA', teinte: 'info' },
    { id: 2, debut: 14, fin: 28, court: '2e trimestre', plage: '14–27 SA', teinte: 'success' },
    { id: 3, debut: 28, fin: 41, court: '3e trimestre', plage: '28–41 SA', teinte: 'warning' },
];

// Échographies obstétricales françaises (fenêtres de réalisation : 11–13+6, 20–25 et 30–35 SA)
const ECHOS = [
    { n: 1, sa: 12, nom: '1re échographie', fenetre: '11 à 13 SA + 6 j' },
    { n: 2, sa: 22, nom: '2e échographie (morphologique)', fenetre: '20 à 25 SA' },
    { n: 3, sa: 32, nom: '3e échographie (croissance)', fenetre: '30 à 35 SA' },
];

const parserJour = (v) => {
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : Date.UTC(v.getFullYear(), v.getMonth(), v.getDate());
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : null;
};
const fr = (t) => new Date(t).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

const delaiTexte = (jours) => {
    if (jours === 0) return 'aujourd’hui';
    if (jours === 1) return 'demain';
    if (jours < 14) return `dans ${jours} jours`;
    const s = Math.floor(jours / 7);
    const r = jours % 7;
    return `dans ${pluriel(s, 'semaine', 'semaines')}${r ? ` et ${pluriel(r, 'jour', 'jours')}` : ''}`;
};

// Calcul pur, exporté pour les tests et pour un éventuel résumé imprimé.
export const calculerTerme = (ddr, aujourdhui = new Date()) => {
    const debut = parserJour(ddr);
    const ref = parserJour(aujourdhui);
    if (debut === null || ref === null) return null;
    const jours = Math.round((ref - debut) / JOUR);
    const sa = Math.floor(jours / 7);
    const dpa = debut + DUREE_TERME * JOUR;
    const restant = DUREE_TERME - jours;
    const base = { jours, sa, j: ((jours % 7) + 7) % 7, dpa, restant };
    if (jours < 0) return { ...base, statut: 'futur' };
    if (jours >= (SA_MAX_VALIDE + 1) * 7) return { ...base, statut: 'trop_long' };
    const depasse = jours > FIN_FRISE * 7;
    return {
        ...base,
        statut: 'ok',
        depasse,
        pct: Math.min(100, Math.round((jours / DUREE_TERME) * 100)),
        position: Math.min(100, (jours / 7 / FIN_FRISE) * 100),
        trimestre: jours < 14 * 7 ? 1 : jours < 28 * 7 ? 2 : 3,
        echos: ECHOS.map(e => ({ ...e, faite: jours >= e.sa * 7 })),
    };
};

const masque = {
    position: 'absolute', width: 1, height: 1, p: 0, m: '-1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
};

const TermeGrossesse = ({ ddr, enceinte, aujourdhui }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const t = useMemo(() => (ddr && enceinte ? calculerTerme(ddr, aujourdhui) : null), [ddr, enceinte, aujourdhui]);
    if (!t) return null;

    const carte = {
        containerType: 'inline-size',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '14px',
        boxShadow: sombre ? 'none' : '0 1px 2px rgba(15,23,42,0.05), 0 4px 14px rgba(15,23,42,0.04)',
        px: 1.75,
        py: 1,
        minWidth: 0,
    };
    const accent = sombre ? theme.palette.primary.light : theme.palette.primary.main;

    const tuile = (couleur, Icone) => (
        <Box aria-hidden sx={{
            '@container (max-width: 290px)': { display: 'none' },
            width: 36, height: 36, flex: 'none', borderRadius: '10px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(couleur, sombre ? 0.2 : 0.12), color: couleur,
        }}>
            <Icone sx={{ fontSize: 22 }} />
        </Box>
    );

    // Terme incohérent : message sobre, pas de frise
    if (t.statut !== 'ok') {
        const futur = t.statut === 'futur';
        return (
            <Box role="status" sx={{ ...carte, borderColor: alpha(theme.palette.warning.main, 0.55), display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {tuile(sombre ? theme.palette.warning.main : theme.palette.warning.dark, WarningAmberIcon)}
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>Terme de la grossesse à vérifier</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                        {futur
                            ? `La date des dernières règles (${fr(parserJour(ddr))}) est postérieure à aujourd’hui. Corrigez la DDR pour afficher le terme.`
                            : `Plus de ${SA_MAX_VALIDE} SA se sont écoulées depuis la DDR (${fr(parserJour(ddr))}). Vérifiez la DDR, ou décochez « Grossesse en cours ».`}
                    </Typography>
                </Box>
            </Box>
        );
    }

    const termeTexte = `${t.sa} SA + ${t.j} j`;
    const dpaTexte = fr(t.dpa);
    const delai = t.restant >= 0 ? delaiTexte(t.restant) : `il y a ${pluriel(-t.restant, 'jour', 'jours')}`;
    const prochaine = t.echos.find(e => !e.faite);
    const resume = `Grossesse en cours : ${termeTexte}, ${t.trimestre === 1 ? '1er' : `${t.trimestre}e`} trimestre, ${t.pct} % du terme. `
        + `Accouchement prévu le ${dpaTexte}, ${delai}.${t.depasse ? ' Terme dépassé.' : ''}`;

    const couleurTrim = (teinte) => theme.palette[teinte].main;
    const pos = t.position;

    return (
        <Box component="section" role="group" aria-label={resume} sx={{ ...carte, ...(t.depasse ? { borderColor: alpha(theme.palette.warning.main, 0.6) } : null) }}>
            {/* En-tête : terme à gauche, date prévue à droite */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    {tuile(accent, PregnantWomanIcon)}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="div" sx={{
                            fontSize: 11.5, lineHeight: 1.25, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 0.5,
                            color: t.depasse ? (sombre ? 'warning.light' : 'warning.dark') : 'text.secondary', fontWeight: t.depasse ? 700 : 500,
                        }}>
                            {t.depasse && <WarningAmberIcon aria-hidden sx={{ fontSize: 14 }} />}
                            {t.depasse ? 'Terme dépassé' : 'Grossesse en cours'} · {t.pct} %
                        </Typography>
                        <Typography component="div" sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, color: accent, letterSpacing: '-0.01em', whiteSpace: 'nowrap', '@container (max-width: 440px)': { fontSize: 20 } }}>
                            {termeTexte}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ textAlign: 'right', minWidth: 0 }}>
                    <Typography component="div" sx={{ fontSize: 11.5, lineHeight: 1.25, color: 'text.secondary', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Accouchement prévu le
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', columnGap: 0.875, '@container (max-width: 440px)': { flexDirection: 'column', alignItems: 'flex-end' } }}>
                        <Typography component="div" sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.01em', whiteSpace: 'nowrap', '@container (max-width: 440px)': { fontSize: 20 } }}>
                            {dpaTexte}
                        </Typography>
                        <Typography component="div" sx={{ fontSize: 12.5, lineHeight: 1.25, color: t.depasse ? (sombre ? 'warning.light' : 'warning.dark') : 'text.secondary', fontWeight: t.depasse ? 700 : 500, whiteSpace: 'nowrap', '@container (max-width: 440px)': { fontSize: 12 } }}>
                            {delai}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Frise 0 – 41 SA */}
            <Box role="img" aria-label={`Frise du terme de 0 à ${FIN_FRISE} SA. ${t.echos.map(e => `${e.nom} vers ${e.sa} SA : ${e.faite ? 'faite' : 'à venir'}.`).join(' ')}`}
                sx={{ position: 'relative', mt: 0, mx: 1, '@container (max-width: 440px)': { mt: 0.5 }, pt: '24px' }}>
                {/* Curseur : bulle + pointe, repère sur le trait de progression */}
                <Box aria-hidden sx={{
                    position: 'absolute', left: `${pos}%`, top: 0, zIndex: 3, whiteSpace: 'nowrap',
                    transform: `translateX(calc(${-pos / 100} * (100% - 16px) - 8px))`,
                    display: 'inline-flex', alignItems: 'center', height: 20, px: 1, borderRadius: '6px',
                    bgcolor: theme.palette.primary.dark, color: '#fff', fontSize: 11.5, fontWeight: 700, lineHeight: 1,
                    '&::after': {
                        content: '""', position: 'absolute', top: '100%', left: `calc(8px + ${pos / 100} * (100% - 16px))`, transform: 'translateX(-50%)',
                        borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${theme.palette.primary.dark}`,
                    },
                }}>
                    <Box component="span" sx={{ '@container (max-width: 440px)': { display: 'none' } }}>Vous êtes ici&nbsp;·&nbsp;</Box>
                    <Box component="span" sx={{ display: 'none', '@container (max-width: 440px)': { display: 'inline' } }}>Ici&nbsp;·&nbsp;</Box>{termeTexte}
                </Box>
                <Box aria-hidden sx={{
                    position: 'absolute', left: `${pos}%`, top: 'calc(24px + 22px - 6px)', width: 10, height: 10, ml: '-5px', zIndex: 3, borderRadius: '50%',
                    bgcolor: theme.palette.primary.dark, border: `2px solid ${theme.palette.background.paper}`, boxSizing: 'border-box',
                }} />

                {/* Tronçons */}
                <Box sx={{ display: 'flex', gap: '3px', height: 22 }}>
                    {TRIMESTRES.map(tr => {
                        const c = couleurTrim(tr.teinte);
                        const longueur = tr.fin - tr.debut;
                        const rempli = Math.max(0, Math.min(1, (t.jours / 7 - tr.debut) / longueur));
                        const actuel = tr.id === t.trimestre;
                        return (
                            <Box key={tr.id} sx={{
                                flex: `${longueur} 1 0`, minWidth: 0, position: 'relative', overflow: 'hidden', bgcolor: alpha(c, sombre ? 0.2 : 0.14),
                                borderRadius: tr.id === 1 ? '8px 3px 3px 8px' : tr.id === 3 ? '3px 8px 8px 3px' : '3px',
                            }}>
                                <Box sx={{ position: 'absolute', inset: 0, width: `${rempli * 100}%`, bgcolor: alpha(c, sombre ? 0.42 : 0.4), borderBottom: `3px solid ${c}` }} />
                                <Typography component="span" sx={{
                                    position: 'relative', zIndex: 1, display: 'block', px: 0.875, lineHeight: '19px', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip',
                                    fontWeight: actuel ? 700 : 500, color: 'text.primary',
                                }}>
                                    {tr.court}
                                    <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500, ml: 0.75, '@container (max-width: 560px)': { display: 'none' } }}>{tr.plage}</Box>
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>

                {/* Échographies */}
                <Box sx={{ position: 'relative', height: 25 }}>
                    <Typography aria-hidden component="span" sx={{ position: 'absolute', left: 0, top: 6, fontSize: 11, color: 'text.secondary', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        Échos
                    </Typography>
                    {t.echos.map(e => {
                        const prochain = prochaine && prochaine.n === e.n;
                        const Icone = e.faite ? CheckCircleIcon : prochain ? ScheduleIcon : EventIcon;
                        const x = (e.sa / FIN_FRISE) * 100;
                        return (
                            <Box key={e.n} aria-hidden sx={{ position: 'absolute', left: `${x}%`, top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Box sx={{ width: 2, height: 4, bgcolor: e.faite ? theme.palette.success.main : prochain ? accent : theme.palette.text.disabled }} />
                                <Box sx={{
                                    display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 21, px: 0.75, borderRadius: '11px', whiteSpace: 'nowrap', fontSize: 11, lineHeight: 1,
                                    fontWeight: prochain ? 700 : 600, color: e.faite || prochain ? 'text.primary' : 'text.secondary',
                                    bgcolor: e.faite ? alpha(theme.palette.success.main, sombre ? 0.2 : 0.14) : 'background.paper',
                                    border: '1.5px solid',
                                    borderStyle: e.faite || prochain ? 'solid' : 'dashed',
                                    borderColor: e.faite ? alpha(theme.palette.success.main, 0.6) : prochain ? accent : theme.palette.text.disabled,
                                }}>
                                    <Icone sx={{ fontSize: 14, color: e.faite ? (sombre ? theme.palette.success.main : theme.palette.success.dark) : prochain ? accent : 'text.disabled' }} />
                                    <span><Box component="span" sx={{ '@container (max-width: 440px)': { display: 'none' } }}>Écho&nbsp;</Box>{e.sa}&nbsp;SA</span>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Équivalent texte pour les lecteurs d'écran */}
            <Box component="ul" sx={masque}>
                {t.echos.map(e => (
                    <li key={e.n}>{e.nom}, vers {e.sa} SA (fenêtre {e.fenetre}) : {e.faite ? 'faite' : e === prochaine ? 'prochaine' : 'à venir'}</li>
                ))}
            </Box>
        </Box>
    );
};

export default TermeGrossesse;
