import React, { useMemo, useState } from 'react';
import { Box, Card, Tabs, Tab, Typography, Button, ButtonBase, Collapse, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MedicationIcon from '@mui/icons-material/Medication';
import CopyIcon from '@mui/icons-material/ContentCopy';
import ScienceIcon from '@mui/icons-material/Science';
import WarningIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpIcon from '@mui/icons-material/HelpOutline';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowUpIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownIcon from '@mui/icons-material/ArrowDownward';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RemoveIcon from '@mui/icons-material/Remove';
import ImageIcon from '@mui/icons-material/ImageOutlined';
import RepeatIcon from '@mui/icons-material/Repeat';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderIcon from '@mui/icons-material/FolderOpen';
import EventIcon from '@mui/icons-material/EventNote';

// Le dossier du patient à côté de la consultation : on relit les visites précédentes et
// les résultats de labo / imagerie sans quitter la page, et on les reprend d'un toucher.

/* ------------------------------------------------------------------ utilitaires */

const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
const dateLongue = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const COULEUR_FLAG = { H: 'error', L: 'info', 'H*': 'error', 'L*': 'info' };
const premiereLigne = (t) => (t || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || '';
const lignes = (t) => (t || '').split('\n').map(x => x.trim()).filter(Boolean);
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

const ilYa = (d) => {
    if (!d) return '';
    const j = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (Number.isNaN(j) || j < 0) return '';
    if (j === 0) return "aujourd'hui";
    if (j < 14) return `il y a ${j} j`;
    if (j < 60) return `il y a ${Math.round(j / 7)} sem.`;
    if (j < 365) return `il y a ${Math.round(j / 30.4)} mois`;
    const a = Math.floor(j / 365);
    return `il y a ${a} an${a > 1 ? 's' : ''}`;
};

export const ligneResultat = (e) => {
    if (e.parametres?.length) {
        const anormaux = e.parametres.filter(p => COULEUR_FLAG[p.flag]);
        if (!anormaux.length && e.parametres.every(p => !p.flag || p.flag === 'N')) return `${e.nom} : normale`;
        const liste = (anormaux.length ? anormaux : e.parametres).map(p => `${p.nom} ${p.valeur}${p.unite ? ` ${p.unite}` : ''}${p.flag ? ` (${p.flag})` : ''}`);
        return `${e.nom} : ${liste.join(', ')}`;
    }
    return `${e.nom} : ${premiereLigne(e.valeur)}${e.unite ? ` ${e.unite}` : ''}${e.anormal ? ' (anormal)' : ''}`;
};

/* ------------------------------------------------------------------ teintes et petits éléments */

// Vert / orange / rouge lisibles en clair comme en sombre (texte assez contrasté sur fond teinté).
const useTons = () => {
    const t = useTheme();
    const dark = t.palette.mode === 'dark';
    return useMemo(() => ({
        dark,
        ok: { fg: dark ? '#34d399' : '#047857', bg: alpha(dark ? '#34d399' : '#10b981', dark ? 0.14 : 0.1), trait: dark ? '#34d399' : '#10b981' },
        warn: { fg: dark ? '#fbbf24' : '#b45309', bg: alpha(dark ? '#fbbf24' : '#f59e0b', dark ? 0.13 : 0.12), trait: dark ? '#fbbf24' : '#f59e0b' },
        crit: { fg: dark ? '#f87171' : '#b91c1c', bg: alpha(dark ? '#f87171' : '#ef4444', dark ? 0.16 : 0.09), trait: dark ? '#f87171' : '#dc2626' },
        info: { fg: dark ? '#93c5fd' : '#1d4ed8', bg: alpha(dark ? '#60a5fa' : '#2563eb', dark ? 0.14 : 0.08), trait: dark ? '#60a5fa' : '#2563eb' },
        mute: { fg: t.palette.text.secondary, bg: alpha(t.palette.text.secondary, dark ? 0.16 : 0.1), trait: alpha(t.palette.text.secondary, 0.5) },
    }), [dark, t.palette.text.secondary]);
};

const SPECIALITES_TEINTES = {
    general: { clair: '#2563eb', sombre: '#60a5fa' },
    gyneco: { clair: '#be185d', sombre: '#f472b6' },
    cardio: { clair: '#0f766e', sombre: '#2dd4bf' },
    esthetique: { clair: '#6d28d9', sombre: '#a78bfa' },
    pediatrie: { clair: '#c2410c', sombre: '#fb923c' },
};
const cleSpecialite = (s = '') => {
    const x = s.toLowerCase();
    if (x.includes('gyn')) return 'gyneco';
    if (x.includes('cardio')) return 'cardio';
    if (x.includes('esth')) return 'esthetique';
    if (/p[ée]diat/.test(x)) return 'pediatrie';
    return 'general';
};
const teinteSpecialite = (s, dark) => SPECIALITES_TEINTES[cleSpecialite(s)][dark ? 'sombre' : 'clair'];

// Étiquette de la rubrique (petite, grise, en gras)
const Etiquette = ({ children, sx }) => (
    <Typography component="span" sx={{ display: 'block', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.02em', color: 'text.secondary', lineHeight: 1.3, ...sx }}>{children}</Typography>
);

// Tuile d'icône teintée (comme les StatCard)
const Tuile = ({ icone: Icone, ton, taille = 28 }) => (
    <Box aria-hidden sx={{ width: taille, height: taille, borderRadius: '8px', flexShrink: 0, bgcolor: ton.bg, color: ton.fg, display: 'grid', placeItems: 'center' }}>
        <Icone sx={{ fontSize: taille * 0.64 }} />
    </Box>
);

// Pastille d'état : toujours une icône ET un mot, jamais la couleur seule
const Pastille = ({ ton, icone: Icone, children, sx }) => (
    <Box component="span" sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 22, px: 0.875, borderRadius: '8px', bgcolor: ton.bg, color: ton.fg,
        fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', maxWidth: '100%', ...sx,
    }}>
        {Icone && <Icone aria-hidden sx={{ fontSize: 14 }} />}
        {children}
    </Box>
);

const BoutonSobre = React.forwardRef(({ sx, ...p }, ref) => <Button ref={ref} size="small" {...p} sx={{ minHeight: 36, ...sx }} />);

const Vide = ({ icone, texte, tons }) => (
    <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1, textAlign: 'center', py: 4, px: 2 }}>
        <Tuile icone={icone} ton={tons.mute} taille={40} />
        <Typography variant="body2" color="text.secondary">{texte}</Typography>
    </Box>
);

const carte = (extra = {}) => ({
    bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '10px', minWidth: 0,
    boxShadow: (t) => (t.palette.mode === 'dark' ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.04)'),
    ...extra,
});

/* ------------------------------------------------------------------ états d'un résultat de labo */

const etatParametre = (p) => {
    switch (p.flag) {
        case 'H*': return { etat: 'critique', mot: 'Critique élevé', icone: ErrorIcon, ton: 'crit' };
        case 'L*': return { etat: 'critique', mot: 'Critique bas', icone: ErrorIcon, ton: 'crit' };
        case 'H': return { etat: 'haut', mot: 'Élevé', icone: ArrowUpIcon, ton: 'warn' };
        case 'L': return { etat: 'bas', mot: 'Bas', icone: ArrowDownIcon, ton: 'warn' };
        case 'N': return { etat: 'normal', mot: 'Normal', icone: CheckCircleIcon, ton: 'ok' };
        case undefined: case null: case '': return { etat: 'neutre', mot: '', icone: RemoveIcon, ton: 'mute' };
        default: return { etat: 'neutre', mot: String(p.flag), icone: RemoveIcon, ton: 'mute' };
    }
};
const rangParametre = { critique: 0, haut: 1, bas: 1, anormal: 1, neutre: 2, normal: 3 };

const comptesParametres = (e) => {
    const ps = e.parametres || [];
    const etats = ps.map(etatParametre);
    return {
        critiques: etats.filter(x => x.etat === 'critique').length,
        anormaux: etats.filter(x => x.etat === 'haut' || x.etat === 'bas').length,
        total: ps.length,
    };
};

const etatExamen = (e) => {
    if (!e.resultat_saisi) return { etat: 'attente', mot: 'En attente', icone: ScheduleIcon, ton: 'mute' };
    if (e.parametres?.length) {
        const { critiques, anormaux } = comptesParametres(e);
        if (critiques || e.critique) return { etat: 'critique', mot: critiques ? pluriel(critiques, 'critique', 'critiques') : 'Critique', icone: ErrorIcon, ton: 'crit' };
        if (anormaux) return { etat: 'anormal', mot: pluriel(anormaux, 'anormal', 'anormaux'), icone: WarningIcon, ton: 'warn' };
        if (e.anormal) return { etat: 'anormal', mot: 'Anormal', icone: WarningIcon, ton: 'warn' };
        return { etat: 'normal', mot: 'Normal', icone: CheckCircleIcon, ton: 'ok' };
    }
    if (e.critique) return { etat: 'critique', mot: 'Critique', icone: ErrorIcon, ton: 'crit' };
    if (e.anormal) return { etat: 'anormal', mot: 'Anormal', icone: WarningIcon, ton: 'warn' };
    return { etat: 'normal', mot: 'Normal', icone: CheckCircleIcon, ton: 'ok' };
};

/* ------------------------------------------------------------------ position dans la plage de référence */

const nombre = (s) => {
    const m = String(s ?? '').trim().replace(',', '.').match(/^-?\d+(?:\.\d+)?$/);
    return m ? parseFloat(m[0]) : null;
};
// « 5 - 11 », « 0.70 - 1.10 », « < 6 », « ≥ 40 » ; tout autre format (« Négatif ») : pas de barre
const lirePlage = (reference) => {
    const r = String(reference || '').trim().replace(/,/g, '.');
    if (!r) return null;
    const unite = '\\s*[A-Za-zµ%/³.\\s]*$';
    let m = r.match(new RegExp(`^(-?\\d+(?:\\.\\d+)?)\\s*(?:-|–|—|à|a)\\s*(-?\\d+(?:\\.\\d+)?)${unite}`));
    if (m) { const lo = parseFloat(m[1]); const hi = parseFloat(m[2]); return hi > lo ? { lo, hi } : null; }
    m = r.match(new RegExp(`^(?:<|≤|<=|inf[ée]rieur)\\s*(-?\\d+(?:\\.\\d+)?)${unite}`, 'i'));
    if (m) return { lo: null, hi: parseFloat(m[1]) };
    m = r.match(new RegExp(`^(?:>|≥|>=|sup[ée]rieur)\\s*(-?\\d+(?:\\.\\d+)?)${unite}`, 'i'));
    if (m) return { lo: parseFloat(m[1]), hi: null };
    return null;
};

const Position = ({ valeur, plage, ton, tons, reference, unite }) => {
    const { lo, hi } = plage;
    let dMin; let dMax;
    if (lo != null && hi != null) { const l = hi - lo; dMin = lo - l * 0.6; dMax = hi + l * 0.6; if (lo >= 0) dMin = Math.max(0, dMin); }
    else if (hi != null) { dMin = hi > 0 ? 0 : hi - 1; dMax = hi > 0 ? hi * 2 : hi + 1; }
    else { dMin = lo > 0 ? 0 : lo - 1; dMax = lo > 0 ? lo * 2 : lo + 1; }
    const pct = (x) => Math.min(100, Math.max(0, ((x - dMin) / (dMax - dMin)) * 100));
    const debut = lo != null ? pct(lo) : 0;
    const fin = hi != null ? pct(hi) : 100;
    const hors = valeur < (lo ?? -Infinity) || valeur > (hi ?? Infinity);
    return (
        <Box role="img" aria-label={`${valeur}${unite ? ` ${unite}` : ''} ${hors ? 'hors de' : 'dans'} la plage de référence ${reference}`}
            sx={{ position: 'relative', height: 14, mt: 0.75 }}>
            <Box sx={{ position: 'absolute', left: 0, right: 0, top: 4, height: 6, borderRadius: 3, bgcolor: alpha(tons.mute.fg, tons.dark ? 0.22 : 0.16) }} />
            <Box sx={{ position: 'absolute', left: `${debut}%`, width: `${Math.max(2, fin - debut)}%`, top: 4, height: 6, borderRadius: 3, bgcolor: alpha(tons.ok.trait, tons.dark ? 0.5 : 0.45) }} />
            <Box sx={{
                position: 'absolute', top: 0, left: `calc(7px + (100% - 14px) * ${pct(valeur) / 100})`, width: 14, height: 14, ml: '-7px', borderRadius: '50%', boxSizing: 'border-box',
                bgcolor: ton.trait, border: 2.5, borderColor: 'background.paper', boxShadow: `0 0 0 1px ${alpha(ton.trait, 0.6)}`,
            }} />
        </Box>
    );
};

/* ------------------------------------------------------------------ onglet Labo */

const ACRONYMES = /\b(nfs|crp|ecbu|vs|vih|hiv|tsh|psa|ecg|asat|alat|hcg|ldl|hdl|inr|cpk|ggt|tp|tca|hba1c|igg|igm|ast|alt)\b/gi;
// Les noms d'examens arrivent souvent en capitales : on les adoucit (« Numération formule sanguine »), sigles conservés
const adoucir = (nom) => {
    if (nom !== nom.toUpperCase() || !(/\s/.test(nom) || nom.length > 5)) return nom;
    const bas = nom.toLowerCase().replace(ACRONYMES, (m) => m.toUpperCase());
    return bas.charAt(0).toUpperCase() + bas.slice(1);
};
const nettoyerNom = (nom = '') => adoucir(nom.split('(')[0].trim() || nom);

// « Goutte épaisse : Positive » -> [['Goutte épaisse', 'Positive'], …] quand toutes les lignes sont de ce format
const lirePaires = (valeur) => {
    const ls = lignes(valeur);
    if (ls.length < 2 || ls.length > 8) return null;
    const paires = ls.map(l => l.match(/^(.{1,40}?)\s*:\s*(.+)$/)).map(m => (m ? [m[1], m[2]] : null));
    return paires.every(Boolean) ? paires : null;
};

const ValeurDroite = ({ valeur, unite, ton, gras = true }) => (
    <Typography component="span" sx={{ display: 'block', textAlign: 'right', overflowWrap: 'anywhere' }}>
        <Typography component="span" sx={{ fontSize: gras ? 16 : 14.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ton || 'text.primary', letterSpacing: '-0.01em' }}>
            {valeur}
        </Typography>
        {unite && <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', ml: 0.5, fontWeight: 500 }}>{unite}</Typography>}
    </Typography>
);

const LigneParametre = ({ p, tons, dernier }) => {
    const E = etatParametre(p);
    const t = tons[E.ton];
    const anormal = E.etat === 'critique' || E.etat === 'haut' || E.etat === 'bas';
    const plage = lirePlage(p.reference);
    const v = nombre(p.valeur);
    return (
        <Box component="li" sx={{
            listStyle: 'none', px: 1.25, py: 0.875, borderLeft: 3, borderColor: anormal ? t.trait : 'transparent', bgcolor: anormal ? alpha(t.trait, tons.dark ? 0.1 : 0.07) : 'transparent',
            borderBottom: dernier ? 0 : 1, borderBottomColor: 'divider',
        }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: 1.5, alignItems: 'center' }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: anormal ? 600 : 500, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{p.nom}</Typography>
                    {E.mot && <Pastille ton={t} icone={E.icone} sx={{ mt: 0.5 }}>{E.mot}</Pastille>}
                </Box>
                <Box>
                    <ValeurDroite valeur={p.valeur} unite={p.unite} ton={anormal ? t.fg : undefined} />
                    {p.reference && <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'right' }}>réf. {p.reference}</Typography>}
                </Box>
            </Box>
            {plage && v != null && <Position valeur={v} plage={plage} ton={t} tons={tons} reference={p.reference} unite={p.unite} />}
        </Box>
    );
};

const ExamenGroupe = ({ e, tons }) => {
    const [tout, setTout] = useState(false);
    const E = etatExamen(e);
    const t = tons[E.ton];
    const ps = [...(e.parametres || [])].map((p, i) => ({ p, i, E: etatParametre(p) }))
        .sort((a, b) => (rangParametre[a.E.etat] - rangParametre[b.E.etat]) || (a.i - b.i));
    const aMasquer = ps.length > 4 ? ps.filter(x => x.E.etat !== 'critique' && x.E.etat !== 'haut' && x.E.etat !== 'bas') : [];
    const visibles = tout ? ps : ps.filter(x => !aMasquer.includes(x));
    return (
        <Box sx={{ py: 1.25 }}>
            <Box sx={{ px: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Box sx={{ minWidth: 0, flex: '1 1 140px' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{nettoyerNom(e.nom)}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{pluriel(ps.length, 'paramètre', 'paramètres')}</Typography>
                </Box>
                <Pastille ton={t} icone={E.icone}>{E.mot}</Pastille>
            </Box>
            <Box component="ul" sx={{ m: 0, mx: 1.5, mt: 1, p: 0, border: 1, borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }} aria-label={`Paramètres de ${nettoyerNom(e.nom)}`}>
                {visibles.map((x, k) => <LigneParametre key={x.p.nom + x.i} p={x.p} tons={tons} dernier={k === visibles.length - 1 && (tout || !aMasquer.length)} />)}
                {aMasquer.length > 0 && !tout && (
                    <Box component="li" sx={{ listStyle: 'none' }} />
                )}
            </Box>
            {aMasquer.length > 0 && (
                <BoutonSobre onClick={() => setTout(!tout)} aria-expanded={tout} endIcon={tout ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ ml: 1, mt: 0.25 }}>
                    {tout ? 'Masquer les valeurs normales' : `Voir les ${aMasquer.length} autres paramètres`}
                </BoutonSobre>
            )}
            {e.interpretation && <Typography sx={{ px: 1.5, mt: 0.5, fontSize: 12.5, fontStyle: 'italic', color: 'text.secondary' }}>{e.interpretation}</Typography>}
        </Box>
    );
};

const ExamenSimple = ({ e, tons }) => {
    const [lu, setLu] = useState(false);
    const E = etatExamen(e);
    const t = tons[E.ton];
    const attente = E.etat === 'attente';
    const anormal = E.etat === 'anormal' || E.etat === 'critique';
    const paires = lirePaires(e.valeur);
    const valeurCourte = !paires && e.valeur && !e.valeur.includes('\n') && e.valeur.length <= 28;
    const textLong = !paires && !valeurCourte && e.valeur;
    const plage = lirePlage(e.reference);
    const v = nombre(e.valeur);
    return (
        <Box sx={{
            px: 1.5, py: 1.25, borderLeft: 3, borderColor: anormal ? t.trait : 'transparent', bgcolor: anormal ? alpha(t.trait, tons.dark ? 0.1 : 0.07) : 'transparent',
            opacity: attente ? 0.62 : 1,
        }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', columnGap: 1.5, alignItems: 'center' }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: anormal ? 700 : 600, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{nettoyerNom(e.nom)}</Typography>
                    <Pastille ton={t} icone={E.icone} sx={{ mt: 0.5 }}>{E.mot}</Pastille>
                </Box>
                <Box>
                    {valeurCourte && <ValeurDroite valeur={e.valeur} unite={e.unite} ton={anormal ? t.fg : undefined} />}
                    {attente && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontStyle: 'italic', textAlign: 'right' }}>Résultat à venir</Typography>}
                    {e.reference && <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'right' }}>réf. {e.reference}</Typography>}
                </Box>
            </Box>
            {!attente && valeurCourte && plage && v != null && <Position valeur={v} plage={plage} ton={t} tons={tons} reference={e.reference} unite={e.unite} />}
            {paires && (
                <Box sx={{ mt: 0.75, display: 'grid', gap: 0.25 }}>
                    {paires.map(([k, val]) => (
                        <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, fontSize: 13 }}>
                            <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>{k}</Typography>
                            <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: anormal ? t.fg : 'text.primary', overflowWrap: 'anywhere' }}>
                                {val}{e.unite && val === paires[paires.length - 1][1] ? ` ${e.unite}` : ''}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            )}
            {textLong && (
                <>
                    <Typography sx={{
                        mt: 0.75, fontSize: 13, whiteSpace: 'pre-line', overflowWrap: 'anywhere', color: anormal ? t.fg : 'text.primary',
                        ...(lu ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
                    }}>
                        {e.valeur}{e.unite ? ` ${e.unite}` : ''}
                    </Typography>
                    {(e.valeur.length > 120 || e.valeur.split('\n').length > 3) && (
                        <BoutonSobre onClick={() => setLu(!lu)} aria-expanded={lu} sx={{ ml: -1 }} endIcon={lu ? <ExpandLessIcon /> : <ExpandMoreIcon />}>{lu ? 'Réduire' : 'Lire tout'}</BoutonSobre>
                    )}
                </>
            )}
            {e.interpretation && <Typography sx={{ mt: 0.5, fontSize: 12.5, fontStyle: 'italic', color: 'text.secondary' }}>{e.interpretation}</Typography>}
        </Box>
    );
};

const CarteLabo = ({ o, nouveau, tons, onAjouterResultats }) => {
    const avecResultat = o.examens.filter(e => e.resultat_saisi);
    const etats = o.examens.map(etatExamen);
    const nAnormaux = etats.filter(x => x.etat === 'anormal' || x.etat === 'critique').length;
    const nCritiques = etats.filter(x => x.etat === 'critique').length;
    const nAttente = etats.filter(x => x.etat === 'attente').length;
    const nNormaux = etats.filter(x => x.etat === 'normal').length;
    return (
        <Box component="section" aria-label={`Demande ${o.numero} du ${jour(o.date)}`} sx={carte({ overflow: 'hidden' })}>
            <Box sx={{ px: 1.5, pt: 1.25, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 700 }}>{jour(o.date)}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{o.numero}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>
                    <Pastille ton={tons.mute}>{o.statut}</Pastille>
                    {nouveau && <Pastille ton={tons.info} icone={EventIcon}>Depuis la dernière visite</Pastille>}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }} aria-label="Bilan de la demande">
                    {nCritiques > 0 && <Pastille ton={tons.crit} icone={ErrorIcon}>{pluriel(nCritiques, 'critique', 'critiques')}</Pastille>}
                    {nAnormaux - nCritiques > 0 && <Pastille ton={tons.warn} icone={WarningIcon}>{pluriel(nAnormaux - nCritiques, 'anormal', 'anormaux')}</Pastille>}
                    {nNormaux > 0 && <Pastille ton={tons.ok} icone={CheckCircleIcon}>{pluriel(nNormaux, 'normal', 'normaux')}</Pastille>}
                    {nAttente > 0 && <Pastille ton={tons.mute} icone={ScheduleIcon}>{nAttente} en attente</Pastille>}
                </Box>
            </Box>
            {o.examens.map((e, k) => (
                <Box key={k} sx={{ borderTop: 1, borderColor: 'divider' }}>
                    {e.parametres?.length && e.resultat_saisi ? <ExamenGroupe e={e} tons={tons} /> : <ExamenSimple e={e} tons={tons} />}
                </Box>
            ))}
            {o.diagnostic_biologiste && (
                <Box sx={{ mx: 1.5, mb: 1.25, mt: 0.5, px: 1.25, py: 1, borderLeft: 3, borderColor: tons.info.trait, bgcolor: tons.info.bg, borderRadius: '0 8px 8px 0' }}>
                    <Etiquette sx={{ color: tons.info.fg }}>Biologiste</Etiquette>
                    <Typography sx={{ fontSize: 13, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{o.diagnostic_biologiste}</Typography>
                </Box>
            )}
            {avecResultat.length > 0 && (
                <Box sx={{ px: 1.5, pb: 1.5, pt: o.diagnostic_biologiste ? 0 : 0.75 }}>
                    <Button fullWidth variant="outlined" size="small" startIcon={<ScienceIcon />} sx={{ minHeight: 40 }}
                        onClick={() => onAjouterResultats?.([`Résultats du ${jour(o.date)} (${o.numero}) :`, ...avecResultat.map(ligneResultat)])}>
                        Ajouter ces résultats à la consultation
                    </Button>
                </Box>
            )}
        </Box>
    );
};

/* ------------------------------------------------------------------ onglet Visites (frise) */

const prefixeDr = (nom) => (/^dr\.?\s/i.test(nom) ? nom : `Dr ${nom}`);

const Constante = ({ etiquette, valeur, tons }) => (
    <Box component="span" sx={{
        display: 'inline-flex', alignItems: 'baseline', gap: 0.5, px: 0.875, py: 0.25, borderRadius: '8px', bgcolor: tons.mute.bg, fontSize: 12.5, whiteSpace: 'nowrap',
    }}>
        {etiquette && <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>{etiquette}</Typography>}
        <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{valeur}</Typography>
    </Box>
);

const Visite = ({ c, dernier, tons, onReprendreTraitement, onCopier }) => {
    const [ouvert, setOuvert] = useState(false);
    const couleur = teinteSpecialite(c.specialite, tons.dark);
    const k = c.constantes || {};
    const constantes = [
        k.ta && ['TA', k.ta], k.temperature && ['T°', k.temperature], k.fc && ['FC', k.fc], k.poids && [null, `${k.poids} kg`],
    ].filter(Boolean);
    const ordo = c.ordonnance || [];
    const motifs = lignes(c.motif);
    const diagnostics = lignes(c.diagnostic);
    const ordoVisible = ouvert ? ordo : ordo.slice(0, 3);
    const aPlus = !!(c.examen || c.resume_specialite || c.traitement || c.a_revoir_le || motifs.length > 1 || ordo.length > 3 || ordo.some(o => o.instructions));
    const meta = [c.specialite || 'Médecine générale', c.praticien && prefixeDr(c.praticien)].filter(Boolean).join(' · ');
    return (
        <Box component="li" sx={{
            listStyle: 'none', position: 'relative', pl: '30px', pb: dernier ? 0 : 1.5,
            ...(dernier ? {} : { '&::before': { content: '""', position: 'absolute', left: '9px', top: '24px', bottom: 0, width: '2px', borderRadius: 1, bgcolor: 'divider', backgroundColor: (th) => alpha(th.palette.text.secondary, 0.28) } }),
        }}>
            <Box aria-hidden sx={{ position: 'absolute', left: '1px', top: '15px', width: 12, height: 12, boxSizing: 'content-box', borderRadius: '50%', bgcolor: couleur, border: '3px solid', borderColor: 'background.default' }} />
            <Box sx={carte({ p: 1.5 })}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Box component="time" dateTime={c.date} sx={{ display: 'inline-flex', alignItems: 'center', height: 24, px: 1, borderRadius: '8px', bgcolor: alpha(couleur, tons.dark ? 0.18 : 0.1), color: couleur, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {dateLongue(c.date)}
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{ilYa(c.date)}</Typography>
                </Box>
                <Typography sx={{ mt: 0.5, fontSize: 12, color: 'text.secondary', overflowWrap: 'anywhere' }}>{meta}</Typography>

                {diagnostics.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <Etiquette>Diagnostic</Etiquette>
                        {diagnostics.map((d, i) => <Typography key={i} sx={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.005em', overflowWrap: 'anywhere' }}>{d}</Typography>)}
                    </Box>
                )}
                {motifs.length > 0 && (
                    <Typography sx={{
                        mt: 0.75, fontSize: 13, color: 'text.secondary', overflowWrap: 'anywhere',
                        ...(ouvert ? { whiteSpace: 'pre-line' } : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
                    }}>
                        <Box component="span" sx={{ fontWeight: 600 }}>Motif : </Box>{ouvert ? motifs.join('\n') : motifs.join(' · ')}
                    </Typography>
                )}
                {constantes.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }} aria-label="Constantes">
                        {constantes.map(([et, val]) => <Constante key={`${et}${val}`} etiquette={et} valeur={val} tons={tons} />)}
                    </Box>
                )}
                {ordo.length > 0 && (
                    <Box sx={{ mt: 1.25 }}>
                        <Etiquette>Ordonnance</Etiquette>
                        <Box component="ul" sx={{ m: 0, p: 0, mt: 0.25 }}>
                            {ordoVisible.map((o, i) => (
                                <Box component="li" key={i} sx={{ listStyle: 'none', display: 'flex', gap: 1, py: 0.5, alignItems: 'flex-start' }}>
                                    <MedicationIcon aria-hidden sx={{ fontSize: 16, mt: '2px', color: 'text.secondary', flexShrink: 0 }} />
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{o.medication_name}</Typography>
                                        {[o.dosage, o.frequency, o.duration].some(Boolean) && (
                                            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', overflowWrap: 'anywhere' }}>{[o.dosage, o.frequency, o.duration].filter(Boolean).join(' · ')}</Typography>
                                        )}
                                        {ouvert && o.instructions && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontStyle: 'italic' }}>{o.instructions}</Typography>}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                        {!ouvert && ordo.length > 3 && <Typography sx={{ fontSize: 12, color: 'text.secondary', pl: 3 }}>+ {pluriel(ordo.length - 3, 'autre médicament', 'autres médicaments')}</Typography>}
                    </Box>
                )}

                <Collapse in={ouvert} unmountOnExit>
                    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider', display: 'grid', gap: 1 }}>
                        {c.examen && <Bloc titre="Examen" texte={c.examen} />}
                        {c.resume_specialite && <Bloc titre={c.specialite || 'Spécialité'} texte={c.resume_specialite} />}
                        {c.traitement && <Bloc titre="Traitement" texte={c.traitement} />}
                        {c.a_revoir_le && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>À revoir le {jour(c.a_revoir_le)}</Typography>}
                    </Box>
                </Collapse>

                {ordo.length > 0 && (
                    <Tooltip title="Ajoute ces médicaments à l'ordonnance d'aujourd'hui">
                        <BoutonSobre fullWidth variant="outlined" startIcon={<MedicationIcon />} sx={{ mt: 1.25, minHeight: 40 }} onClick={() => onReprendreTraitement?.(c.ordonnance)}>Reprendre le traitement</BoutonSobre>
                    </Tooltip>
                )}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, mx: -0.5, alignItems: 'center' }}>
                    {aPlus && (
                        <BoutonSobre onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert} endIcon={ouvert ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                            {ouvert ? 'Moins' : 'Tout voir'}
                        </BoutonSobre>
                    )}
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Ajoute un résumé de cette visite à l'histoire de la maladie">
                        <BoutonSobre startIcon={<CopyIcon />} onClick={() => onCopier?.(`Visite du ${jour(c.date)} : ${premiereLigne(c.diagnostic) || premiereLigne(c.motif)}${c.ordonnance?.length ? ` — traité par ${c.ordonnance.map(o => o.medication_name).join(', ')}` : ''}`)}>
                            Citer
                        </BoutonSobre>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );
};

const Bloc = ({ titre, texte }) => (
    <Box>
        <Etiquette>{titre}</Etiquette>
        <Typography sx={{ fontSize: 13, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{texte}</Typography>
    </Box>
);

/* ------------------------------------------------------------------ onglet Imagerie */

const CarteImagerie = ({ im, tons, onAjouterResultats }) => {
    const [lu, setLu] = useState(false);
    const texte = im.compte_rendu || '';
    const long = texte.length > 150 || texte.split('\n').length > 3;
    return (
        <Box component="article" sx={carte({ p: 1.5 })}>
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                <Tuile icone={ImageIcon} ton={tons.info} taille={32} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{im.examen}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{dateLongue(im.date)} · {ilYa(im.date)}</Typography>
                        {im.statut && <Pastille ton={tons.mute}>{im.statut}</Pastille>}
                    </Box>
                </Box>
            </Box>
            <Etiquette sx={{ mt: 1.25 }}>Compte rendu</Etiquette>
            <Typography sx={{
                fontSize: 13, whiteSpace: 'pre-line', overflowWrap: 'anywhere',
                ...(lu ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
            }}>{texte}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, mx: -0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                {long && (
                    <BoutonSobre onClick={() => setLu(!lu)} aria-expanded={lu} endIcon={lu ? <ExpandLessIcon /> : <ExpandMoreIcon />}>{lu ? 'Réduire' : 'Lire tout'}</BoutonSobre>
                )}
                <Box sx={{ flex: 1 }} />
                <BoutonSobre variant="outlined" startIcon={<CopyIcon />}
                    onClick={() => onAjouterResultats?.([`Imagerie du ${jour(im.date)} — ${im.examen} : ${premiereLigne(im.compte_rendu)}`])}>
                    Ajouter à la consultation
                </BoutonSobre>
            </Box>
        </Box>
    );
};

/* ------------------------------------------------------------------ en-tête Résumé */

const SANS_ALLERGIE = /^(pas d.allergie|aucune?|n[ée]ant|ras|non|rien)(\s|$|\W)/i;
// « Pénicilline (urticaire), AINS » -> ['Pénicilline (urticaire)', 'AINS'] (on ne coupe pas dans les parenthèses)
const listeAllergies = (t) => t.split(/[,;\n]+(?![^(]*\))/).map(x => x.trim()).filter(Boolean);

const diagnosticsRecurrents = (historique) => {
    const compte = new Map();
    historique.forEach((c) => {
        const vus = new Set();
        lignes(c.diagnostic).forEach((d) => {
            const cle = d.toLowerCase();
            if (vus.has(cle)) return;
            vus.add(cle);
            const x = compte.get(cle) || { d, n: 0 };
            x.n += 1;
            compte.set(cle, x);
        });
    });
    return [...compte.values()].filter(x => x.n >= 2).sort((a, b) => b.n - a.n);
};

const LigneResume = ({ icone, ton, titre, detail, children, sx }) => (
    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', ...sx }}>
        <Tuile icone={icone} ton={ton} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Etiquette sx={{ color: ton.fg === undefined ? undefined : 'text.secondary' }}>{titre}</Etiquette>
                {detail && <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary' }}>{detail}</Typography>}
            </Box>
            {children}
        </Box>
    </Box>
);

const Resume = ({ contexte, historique, tons, ouvert, onBascule, onVoirLabo }) => {
    const patient = contexte.patient || {};
    const allergies = (patient.allergies || '').trim();
    const sansAllergie = !!allergies && SANS_ALLERGIE.test(allergies);
    const derniere = historique[0];
    const ordoDerniere = derniere?.ordonnance || [];
    const recurrents = diagnosticsRecurrents(historique);
    const depuis = resultatsDepuisDerniereVisite(contexte);
    const aDetails = !!derniere || historique.length >= 2 || (historique.length > 0 && depuis.commandes > 0);
    const nbConsult = contexte.nombre_consultations ?? historique.length;
    const meta = [nbConsult > 0 && pluriel(nbConsult, 'consultation', 'consultations'), derniere?.date && `dernière ${ilYa(derniere.date)}`].filter(Boolean).join(' · ');
    return (
        <Box sx={{ px: 1.5, pt: 0.5, pb: 1.5 }}>
            <ButtonBase onClick={onBascule} aria-expanded={aDetails ? ouvert : undefined} aria-controls="dossier-resume-details" disabled={!aDetails} tabIndex={aDetails ? 0 : -1}
                sx={{ width: '100%', minHeight: 40, '&.Mui-disabled': { pointerEvents: 'none' }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, textAlign: 'left', borderRadius: '8px', px: 0.5, mx: -0.5 }}>
                <Typography component="span" sx={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Résumé</Typography>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    {meta && <Typography component="span" noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>{meta}</Typography>}
                    {aDetails && (ouvert ? <ExpandLessIcon sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />)}
                </Box>
            </ButtonBase>

            {/* Allergies : toujours visibles, c'est une information de sécurité */}
            {allergies && !sansAllergie ? (
                <Box role="note" sx={{ mt: 0.5, p: 1.25, borderRadius: '10px', bgcolor: tons.crit.bg, border: 1, borderColor: alpha(tons.crit.trait, 0.4) }}>
                    <LigneResume icone={WarningIcon} ton={tons.crit} titre="Allergies">
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                            {listeAllergies(allergies).map(a => (
                                <Box component="span" key={a} sx={{ px: 1, py: 0.25, borderRadius: '8px', bgcolor: 'background.paper', border: 1, borderColor: alpha(tons.crit.trait, 0.5), color: tons.crit.fg, fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{a}</Box>
                            ))}
                        </Box>
                    </LigneResume>
                </Box>
            ) : (
                <Box sx={{ mt: 0.5, display: 'flex', gap: 1.25, alignItems: 'center', minHeight: 36 }}>
                    <Tuile icone={sansAllergie ? CheckCircleIcon : HelpIcon} ton={sansAllergie ? tons.ok : tons.mute} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Allergies : </Box>
                        {sansAllergie ? 'aucune connue' : 'non renseignées'}
                    </Typography>
                </Box>
            )}

            <Collapse in={ouvert && aDetails} id="dossier-resume-details">
                <Box sx={{ display: 'grid', gap: 1.5, pt: 1.5, maxHeight: { md: '32vh' }, overflowY: 'auto' }}>
                    {derniere && (
                        <LigneResume icone={MedicationIcon} ton={tons.info} titre="Traitement de la dernière visite" detail={jour(derniere.date)}>
                            {ordoDerniere.length ? (
                                <Box component="ul" sx={{ m: 0, p: 0, mt: 0.25 }}>
                                    {ordoDerniere.map((o, i) => (
                                        <Box component="li" key={i} sx={{ listStyle: 'none', py: 0.125 }}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{o.medication_name}</Typography>
                                            {[o.dosage, o.frequency, o.duration].some(Boolean) && (
                                                <Typography sx={{ fontSize: 12, color: 'text.secondary', overflowWrap: 'anywhere' }}>{[o.dosage, o.frequency, o.duration].filter(Boolean).join(' · ')}</Typography>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Aucune ordonnance lors de cette visite</Typography>
                            )}
                        </LigneResume>
                    )}
                    {historique.length >= 2 && (
                        <LigneResume icone={RepeatIcon} ton={tons.warn} titre="Diagnostics récurrents">
                            {recurrents.length ? (
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
                                    {recurrents.map(r => (
                                        <Box component="span" key={r.d} sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5, px: 1, py: 0.25, borderRadius: '8px', bgcolor: tons.warn.bg, color: tons.warn.fg, fontSize: 13, fontWeight: 700 }}>
                                            {r.d}<Typography component="span" sx={{ fontSize: 11.5, fontWeight: 700 }} aria-label={`${r.n} fois`}>×{r.n}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Aucun diagnostic répété sur {historique.length} visites</Typography>
                            )}
                        </LigneResume>
                    )}
                    {historique.length > 0 && depuis.commandes > 0 && (
                        <ButtonBase onClick={onVoirLabo} sx={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: '10px', minHeight: 44, p: 1, mx: -1, width: 'calc(100% + 16px)', '&:hover': { bgcolor: 'action.hover' } }}>
                            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                                <Tuile icone={ScienceIcon} ton={depuis.anormaux ? tons.warn : tons.ok} />
                                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                                    {pluriel(depuis.commandes, 'demande de labo', 'demandes de labo')} depuis la dernière visite
                                    <Box component="span" sx={{ display: 'block', fontSize: 12, fontWeight: 500, color: depuis.anormaux ? tons.warn.fg : 'text.secondary' }}>
                                        {depuis.anormaux ? `${pluriel(depuis.anormaux, 'résultat anormal', 'résultats anormaux')}` : 'aucun résultat anormal'}
                                    </Box>
                                </Typography>
                                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                            </Box>
                        </ButtonBase>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

/* ------------------------------------------------------------------ composant */

const DossierPatient = ({ contexte, onReprendreTraitement, onCopierHistoire, onAjouterResultats, ongletInitial = 0 }) => {
    const [onglet, setOnglet] = useState(ongletInitial);
    // Résumé déplié d'office seulement quand l'écran a la place (tablette haute, ordinateur) ; sinon les allergies restent visibles et le reste se déplie d'un toucher
    const placeLibre = useMediaQuery('(min-width:600px) and (min-height:860px)', { noSsr: true });
    const [resumeOuvert, setResumeOuvert] = useState(placeLibre);
    const tons = useTons();
    if (!contexte) {
        return (
            <Card sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Choisissez un patient pour voir son dossier.</Typography>
            </Card>
        );
    }
    const historique = contexte.historique || [];
    const labo = contexte.labo || [];
    const imagerie = (contexte.imagerie || []).filter(i => i.compte_rendu);
    const derniereVisite = historique[0]?.date ? new Date(historique[0].date) : null;
    const nouveaux = labo.filter(o => derniereVisite && new Date(o.date) > derniereVisite).length;
    const actif = onglet === 2 && imagerie.length === 0 ? 0 : onglet;

    return (
        <Card sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: { md: 'calc(100vh - 230px)' }, minWidth: 0 }}>
            <Resume contexte={contexte} historique={historique} tons={tons} ouvert={resumeOuvert}
                onBascule={() => setResumeOuvert(!resumeOuvert)} onVoirLabo={() => setOnglet(1)} />
            <Tabs value={actif} onChange={(e, v) => setOnglet(v)} variant="fullWidth" aria-label="Dossier du patient"
                sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider', minHeight: 44, flexShrink: 0 }}>
                <Tab label={`Visites (${historique.length})`} sx={{ minHeight: 44, fontSize: 13, fontWeight: 600, px: 1 }} />
                <Tab sx={{ minHeight: 44, fontSize: 13, fontWeight: 600, px: 1 }} aria-label={`Labo (${labo.length})${nouveaux ? `, ${pluriel(nouveaux, 'nouvelle demande', 'nouvelles demandes')}` : ''}`}
                    label={(
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                            {`Labo (${labo.length})`}
                            {nouveaux > 0 && <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tons.info.trait }} />}
                        </Box>
                    )} />
                {imagerie.length > 0 && <Tab label={`Imagerie (${imagerie.length})`} sx={{ minHeight: 44, fontSize: 13, fontWeight: 600, px: 1 }} />}
            </Tabs>
            <Box role="region" aria-label={['Visites', 'Labo', 'Imagerie'][actif]} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', bgcolor: 'background.default', p: 1.5 }}>
                {actif === 0 && (
                    historique.length === 0 ? (
                        <Vide icone={FolderIcon} texte="Première consultation de ce patient au centre." tons={tons} />
                    ) : (
                        <Box component="ol" aria-label="Visites précédentes" sx={{ m: 0, p: 0 }}>
                            {historique.map((c, i) => (
                                <Visite key={c.id} c={c} dernier={i === historique.length - 1} tons={tons} onReprendreTraitement={onReprendreTraitement} onCopier={onCopierHistoire} />
                            ))}
                        </Box>
                    )
                )}
                {actif === 1 && (
                    labo.length === 0 ? (
                        <Vide icone={ScienceIcon} texte="Aucune analyse au centre pour ce patient." tons={tons} />
                    ) : (
                        <Box sx={{ display: 'grid', gap: 1.5 }}>
                            {labo.map(o => (
                                <CarteLabo key={o.id} o={o} nouveau={!!derniereVisite && new Date(o.date) > derniereVisite} tons={tons} onAjouterResultats={onAjouterResultats} />
                            ))}
                        </Box>
                    )
                )}
                {actif === 2 && (
                    <Box sx={{ display: 'grid', gap: 1.5 }}>
                        {imagerie.map((im, i) => <CarteImagerie key={i} im={im} tons={tons} onAjouterResultats={onAjouterResultats} />)}
                    </Box>
                )}
            </Box>
        </Card>
    );
};

export default DossierPatient;

// Combien de résultats anormaux sont arrivés depuis la dernière visite (pour le bandeau)
export const resultatsDepuisDerniereVisite = (contexte) => {
    if (!contexte) return { commandes: 0, anormaux: 0 };
    const derniere = contexte.historique?.[0]?.date ? new Date(contexte.historique[0].date) : null;
    const recents = (contexte.labo || []).filter(o => !derniere || new Date(o.date) > derniere);
    return {
        commandes: recents.length,
        anormaux: recents.flatMap(o => o.examens).filter(e => e.anormal).length,
    };
};
