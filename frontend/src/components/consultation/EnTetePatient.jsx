import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha, useTheme } from '@mui/material/styles';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import {
    dateRelative, dateCourte, libelleAgePatient, libelleSexe, initiales, decouperAllergies, pluriel,
} from './enTetePatientUtils';

// Bandeau patient en haut de la consultation : qui est-ce, quelles allergies, qu'a-t-on fait depuis la dernière visite.
// Hiérarchie : nom et allergies d'abord, le reste (âge, historique, minuteur) en secondaire.

const TOUCHE = 36; // cible tactile minimale (px)

// Teintes sobres (texte foncé / clair selon le thème) pour les trois états signalés par le bandeau.
const teinte = (theme, famille) => {
    const sombre = theme.palette.mode === 'dark';
    const texte = { error: sombre ? '#fca5a5' : '#991b1b', warning: sombre ? '#fcd34d' : '#92400e', success: sombre ? '#6ee7b7' : '#065f46' }[famille];
    const base = theme.palette[famille].main;
    return {
        texte, base,
        fond: alpha(base, sombre ? 0.11 : 0.07),
        bord: alpha(base, sombre ? 0.45 : 0.35),
        tuile: alpha(base, sombre ? 0.22 : 0.14),
    };
};

// Avatar : teinte discrète selon le sexe (deux teintes neutres, aucun rose/bleu conventionnel).
const teinteAvatar = (theme, sexe) => {
    const sombre = theme.palette.mode === 'dark';
    const base = sexe === 'F' ? '#0d9488' : sexe === 'M' ? '#4f46e5' : '#64748b';
    const texte = sexe === 'F' ? (sombre ? '#5eead4' : '#0f766e') : sexe === 'M' ? (sombre ? '#a5b4fc' : '#4338ca') : (sombre ? '#cbd5e1' : '#475569');
    return { fond: alpha(base, sombre ? 0.2 : 0.12), bord: alpha(base, sombre ? 0.5 : 0.32), texte };
};

const Pastille = ({ children, fort = false, label }) => (
    <Box component="span" aria-label={label} sx={{
        display: 'inline-flex', alignItems: 'center', height: 24, px: 1, borderRadius: '8px', whiteSpace: 'nowrap',
        border: 1, borderColor: 'divider', bgcolor: 'background.subtle', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1,
        color: fort ? 'text.primary' : 'text.secondary', fontVariantNumeric: 'tabular-nums',
    }}>{children}</Box>
);

const Tuile = ({ t, children, taille = 24 }) => (
    <Box aria-hidden sx={{
        width: taille, height: taille, flex: '0 0 auto', borderRadius: '8px', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', bgcolor: t.tuile, color: t.texte,
    }}>{children}</Box>
);

export default function EnTetePatient({
    patient, contexte, age, allergies = '', sansAllergie = false, resultats, isNew = false,
    onChangerPatient, onVoirResultats, minuteur, actions, maintenant, sx,
}) {
    const theme = useTheme();
    if (!patient) return null;

    const nom = patient.name || contexte?.patient?.nom || 'Patient';
    const sexe = contexte?.patient?.sexe;
    const numero = patient.numero || patient.patient_number || contexte?.patient?.numero || contexte?.patient?.patient_number;
    const libAge = libelleAgePatient(age);
    const libSexe = libelleSexe(sexe, age);
    const av = teinteAvatar(theme, sexe);

    const listeAllergies = !sansAllergie ? decouperAllergies(allergies) : [];
    const rouge = teinte(theme, 'error');

    const nbCommandes = resultats?.commandes || 0;
    const nbAnormaux = resultats?.anormaux || 0;
    const tAnalyses = teinte(theme, nbAnormaux > 0 ? 'warning' : 'success');

    const nbConsultations = contexte?.nombre_consultations;
    const derniere = contexte?.derniere_visite;
    const diagnostic = (derniere?.diagnostic || derniere?.motif || '').split('\n')[0].trim();
    const ref = maintenant ? new Date(maintenant) : new Date();

    const aOutils = isNew && onChangerPatient || actions || minuteur;
    const aBandeau = listeAllergies.length > 0 || nbCommandes > 0;

    const blocAnalyses = nbCommandes > 0 && (
        <Box
            component={onVoirResultats ? ButtonBase : 'div'}
            onClick={onVoirResultats}
            role="status"
            sx={{
                flex: '0 1 auto', minHeight: TOUCHE, display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: '10px',
                border: 1, borderColor: tAnalyses.bord, bgcolor: tAnalyses.fond, color: tAnalyses.texte, textAlign: 'left',
                font: 'inherit', fontSize: '0.8125rem', lineHeight: 1.3,
                ...(onVoirResultats && { cursor: 'pointer', '&:hover': { bgcolor: alpha(tAnalyses.base, 0.14) } }),
            }}
        >
            <Tuile t={tAnalyses}><ScienceOutlinedIcon sx={{ fontSize: 16 }} /></Tuile>
            <span>
                <b>{pluriel(nbCommandes, 'analyse', 'analyses')}</b> depuis la dernière visite
                {' '}
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 700, whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
                    {nbAnormaux > 0
                        ? <><ErrorOutlineRoundedIcon aria-hidden sx={{ fontSize: 16 }} />{nbAnormaux > 1 ? `${nbAnormaux} anormales` : '1 anormale'}</>
                        : <><CheckCircleOutlineRoundedIcon aria-hidden sx={{ fontSize: 16 }} />{nbCommandes > 1 ? 'toutes normales' : 'normale'}</>}
                </Box>
            </span>
        </Box>
    );

    return (
        <Paper component="section" elevation={1} aria-label={`Patient : ${nom}`} sx={{
            borderRadius: '14px', border: 1, borderColor: 'divider', containerType: 'inline-size', px: { xs: 1.5, sm: 2 }, py: { xs: 1.25, sm: 1.25 }, minWidth: 0, ...sx,
        }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 2, rowGap: 1 }}>
                {/* Identité */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '1 1 260px', minWidth: 0, alignItems: { xs: 'flex-start', sm: 'center' } }}>
                    <Box aria-hidden sx={{
                        width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 }, flex: '0 0 auto', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', bgcolor: av.fond, color: av.texte, border: 1.5, borderColor: av.bord,
                        fontWeight: 700, fontSize: { xs: '0.9rem', sm: '1rem' }, letterSpacing: '0.02em', userSelect: 'none',
                    }}>{initiales(nom)}</Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1, rowGap: 0.5 }}>
                            <Typography component="h2" sx={{
                                fontSize: { xs: '1.0625rem', sm: '1.25rem' }, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em',
                                color: 'text.primary', minWidth: 0, overflowWrap: 'anywhere',
                            }}>{nom}</Typography>
                            {libAge && <Pastille fort label={`Âge : ${libAge}`}>{libAge}</Pastille>}
                            {libSexe && <Pastille fort label={`Sexe : ${libSexe}`}>{libSexe}</Pastille>}
                            {numero && <Box component="span" className="etp-n-pastille" sx={{ display: 'inline-flex', '@container (min-width: 600px) and (max-width: 979px)': { display: 'none' } }}><Pastille label={`Numéro de patient : ${numero}`}>N° {numero}</Pastille></Box>}
                        </Box>
                        {contexte && (
                            <Typography component="div" sx={{
                                mt: 0.25, fontSize: '0.8125rem', lineHeight: 1.4, color: 'text.secondary', display: 'flex', alignItems: 'flex-start', gap: 0.5,
                            }}>
                                <HistoryRoundedIcon aria-hidden sx={{ fontSize: 16, mt: '2px', flex: '0 0 auto', color: 'text.disabled' }} />
                                <Box component="span" title={[numero && `N° ${numero}`, pluriel(nbConsultations || 0, 'consultation', 'consultations'), derniere?.date && `dernière visite ${dateRelative(derniere.date, ref)} (${dateCourte(derniere.date)})`, diagnostic].filter(Boolean).join(' · ')} sx={{ minWidth: 0, flex: 1, display: 'flex', '@container (max-width: 599px)': { display: 'block' } }}>
                                    <Box component="span" sx={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre', '@container (max-width: 599px)': { whiteSpace: 'normal' } }}>
                                        {numero && <Box component="span" sx={{ display: 'none', '@container (min-width: 600px) and (max-width: 979px)': { display: 'inline' } }}>N° {numero} · </Box>}
                                        {nbConsultations > 0 && derniere?.date ? (
                                            <>
                                                {pluriel(nbConsultations, 'consultation', 'consultations')}
                                                {' · '}Dernière visite{' '}
                                                <Box component="time" dateTime={derniere.date} title={dateCourte(derniere.date)} sx={{ color: 'text.primary', fontWeight: 600 }}>
                                                    {dateRelative(derniere.date, ref)}
                                                </Box>
                                                {diagnostic ? ' — ' : ''}
                                            </>
                                        ) : nbConsultations > 0 ? pluriel(nbConsultations, 'consultation', 'consultations')
                                            : <>Première consultation dans le centre</>}
                                    </Box>
                                    {nbConsultations > 0 && derniere?.date && diagnostic && (
                                        <Box component="span" title={diagnostic} sx={{ minWidth: 0, flexShrink: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '@container (max-width: 599px)': { whiteSpace: 'normal' } }}>
                                            {diagnostic}
                                        </Box>
                                    )}
                                </Box>
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Outils : changer de patient, actions, minuteur */}
                {aOutils && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, ml: 'auto',
                        width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' }, order: { xs: 3, sm: 1 },
                    }}>
                        {isNew && onChangerPatient && (
                            <Button variant="outlined" color="inherit" onClick={onChangerPatient} aria-label="Changer de patient" title="Changer de patient"
                                sx={{ minHeight: TOUCHE, minWidth: TOUCHE, px: 1.5, gap: 1, borderColor: 'divider', whiteSpace: 'nowrap', flex: { xs: '1 1 auto', sm: '0 0 auto' },
                                    '@container (min-width: 600px) and (max-width: 979px)': { px: 1, '& .etp-libelle': { display: 'none' } } }}>
                                <SwapHorizRoundedIcon aria-hidden sx={{ fontSize: 20 }} />
                                <span className="etp-libelle">Changer de patient</span>
                            </Button>
                        )}
                        {actions}
                        {minuteur}
                    </Box>
                )}

                {/* Alertes : allergies d'abord, puis analyses (sur téléphone : avant les boutons) */}
                {aBandeau && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flex: '1 1 100%', order: 2, minWidth: 0 }}>
                    {listeAllergies.length > 0 && (
                        <Box role="group" aria-label={`Allergies : ${listeAllergies.join(', ')}`} sx={{
                            flex: '1 1 300px', minWidth: 0, minHeight: TOUCHE, display: 'flex', alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' }, columnGap: 1.25, rowGap: 0.75, px: 1, py: 0.5,
                            borderRadius: '10px', border: 1, borderColor: rouge.bord, borderLeft: `4px solid ${rouge.base}`, bgcolor: rouge.fond,
                        }}>
                            <Tuile t={rouge}><WarningAmberRoundedIcon sx={{ fontSize: 18 }} /></Tuile>
                            <Typography component="span" sx={{
                                flex: '0 0 auto', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: rouge.texte,
                            }}>Allergies</Typography>
                            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexWrap: 'wrap', gap: 0.75, minWidth: 0, flexBasis: { xs: '100%', sm: 'auto' } }}>
                                {listeAllergies.map((a, i) => (
                                    <Box component="li" key={`${a}-${i}`} sx={{
                                        px: 1, py: '2px', borderRadius: '6px', bgcolor: 'background.paper', border: 1, borderColor: rouge.bord,
                                        color: rouge.texte, fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.4, overflowWrap: 'anywhere',
                                    }}>{a}</Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                    {blocAnalyses}
                </Box>
                )}
            </Box>
        </Paper>
    );
}
