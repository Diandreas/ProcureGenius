import React, { useState } from 'react';
import {
    Box, Card, CardContent, Tabs, Tab, Typography, Chip, Button, Collapse, Divider, Stack, Tooltip,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, Medication as MedicationIcon,
    ContentCopy as CopyIcon, Science as ScienceIcon,
} from '@mui/icons-material';

// Le dossier du patient à côté de la consultation : on relit les visites précédentes et
// les résultats de labo / imagerie sans quitter la page, et on les reprend d'un toucher.
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
const COULEUR_FLAG = { H: 'error', L: 'info', 'H*': 'error', 'L*': 'info' };
const premiereLigne = (t) => (t || '').split('\n').map(x => x.trim()).filter(Boolean)[0] || '';

export const ligneResultat = (e) => {
    if (e.parametres?.length) {
        const anormaux = e.parametres.filter(p => COULEUR_FLAG[p.flag]);
        if (!anormaux.length && e.parametres.every(p => !p.flag || p.flag === 'N')) return `${e.nom} : normale`;
        const liste = (anormaux.length ? anormaux : e.parametres).map(p => `${p.nom} ${p.valeur}${p.unite ? ` ${p.unite}` : ''}${p.flag ? ` (${p.flag})` : ''}`);
        return `${e.nom} : ${liste.join(', ')}`;
    }
    return `${e.nom} : ${premiereLigne(e.valeur)}${e.unite ? ` ${e.unite}` : ''}${e.anormal ? ' (anormal)' : ''}`;
};

const Consultation = ({ c, onReprendreTraitement, onCopier }) => {
    const [ouvert, setOuvert] = useState(false);
    const constantes = [c.constantes?.ta && `TA ${c.constantes.ta}`, c.constantes?.temperature && `T° ${c.constantes.temperature}`,
        c.constantes?.poids && `${c.constantes.poids} kg`].filter(Boolean).join(' · ');
    return (
        <Box sx={{ py: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                <Typography variant="subtitle2">{jour(c.date)}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {[c.specialite !== 'Médecine générale' && c.specialite, c.praticien && `Dr ${c.praticien}`].filter(Boolean).join(' · ')}
                </Typography>
            </Box>
            {c.diagnostic && <Typography variant="body2" color="error.main" sx={{ fontWeight: 600, whiteSpace: 'pre-line' }}>{c.diagnostic}</Typography>}
            {c.motif && <Typography variant="body2" color="text.secondary" noWrap={!ouvert}>Motif : {ouvert ? c.motif : premiereLigne(c.motif)}</Typography>}
            {constantes && <Typography variant="caption" color="text.secondary">{constantes}</Typography>}
            {c.ordonnance?.length > 0 && !ouvert && (
                <Typography variant="caption" sx={{ display: 'block' }} noWrap>
                    <MedicationIcon sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.5 }} />
                    {c.ordonnance.map(o => o.medication_name).join(', ')}
                </Typography>
            )}
            <Collapse in={ouvert} unmountOnExit>
                <Box sx={{ mt: 1, display: 'grid', gap: 0.75 }}>
                    {c.examen && <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}><b>Examen :</b> {c.examen}</Typography>}
                    {c.resume_specialite && <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}><b>{c.specialite} :</b> {c.resume_specialite}</Typography>}
                    {c.traitement && <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}><b>Traitement :</b> {c.traitement}</Typography>}
                    {c.ordonnance?.length > 0 && (
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Ordonnance</Typography>
                            {c.ordonnance.map((o, i) => (
                                <Typography key={i} variant="body2" sx={{ pl: 1 }}>
                                    • {[o.medication_name, o.dosage, o.frequency, o.duration].filter(Boolean).join(' — ')}
                                </Typography>
                            ))}
                        </Box>
                    )}
                    {c.a_revoir_le && <Typography variant="caption" color="text.secondary">À revoir le {jour(c.a_revoir_le)}</Typography>}
                </Box>
            </Collapse>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Button size="small" onClick={() => setOuvert(!ouvert)} endIcon={ouvert ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                    {ouvert ? 'Moins' : 'Tout voir'}
                </Button>
                {c.ordonnance?.length > 0 && (
                    <Tooltip title="Ajoute ces médicaments à l'ordonnance d'aujourd'hui">
                        <Button size="small" startIcon={<MedicationIcon />} onClick={() => onReprendreTraitement(c.ordonnance)}>Reprendre le traitement</Button>
                    </Tooltip>
                )}
                <Tooltip title="Ajoute un résumé de cette visite à l'histoire de la maladie">
                    <Button size="small" startIcon={<CopyIcon />} onClick={() => onCopier(`Visite du ${jour(c.date)} : ${premiereLigne(c.diagnostic) || premiereLigne(c.motif)}${c.ordonnance?.length ? ` — traité par ${c.ordonnance.map(o => o.medication_name).join(', ')}` : ''}`)}>
                        Citer
                    </Button>
                </Tooltip>
            </Box>
        </Box>
    );
};

const Examen = ({ e }) => {
    const [ouvert, setOuvert] = useState(false);
    const anormaux = (e.parametres || []).filter(p => COULEUR_FLAG[p.flag]);
    return (
        <Box sx={{ py: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', cursor: e.parametres?.length ? 'pointer' : 'default' }} onClick={() => setOuvert(!ouvert)}>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, color: e.anormal ? 'error.main' : 'text.primary' }}>
                    {e.nom.split('(')[0].trim()}
                </Typography>
                {!e.resultat_saisi && <Chip size="small" label="En attente" variant="outlined" />}
                {e.critique && <Chip size="small" color="error" label="Critique" />}
            </Box>
            {e.valeur && (
                <Typography variant="body2" color={e.anormal ? 'error.main' : 'text.secondary'} sx={{ whiteSpace: 'pre-line' }}>
                    {ouvert ? e.valeur : premiereLigne(e.valeur)}{e.unite ? ` ${e.unite}` : ''}{e.reference ? ` (réf. ${e.reference})` : ''}
                </Typography>
            )}
            {anormaux.length > 0 && !ouvert && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                    {anormaux.map(p => <Chip key={p.nom} size="small" color={COULEUR_FLAG[p.flag]} label={`${p.nom} ${p.valeur}${p.unite ? ` ${p.unite}` : ''} ${p.flag}`} />)}
                </Box>
            )}
            {e.parametres?.length > 0 && (
                <Collapse in={ouvert} unmountOnExit>
                    <Box sx={{ pl: 1, mt: 0.5 }}>
                        {e.parametres.map(p => (
                            <Typography key={p.nom} variant="caption" sx={{ display: 'block', color: COULEUR_FLAG[p.flag] ? `${COULEUR_FLAG[p.flag]}.main` : 'text.secondary', fontWeight: COULEUR_FLAG[p.flag] ? 600 : 400 }}>
                                {p.nom} : {p.valeur}{p.unite ? ` ${p.unite}` : ''}{p.flag && p.flag !== 'N' ? ` (${p.flag})` : ''}
                            </Typography>
                        ))}
                    </Box>
                </Collapse>
            )}
        </Box>
    );
};

const DossierPatient = ({ contexte, onReprendreTraitement, onCopierHistoire, onAjouterResultats, ongletInitial = 0 }) => {
    const [onglet, setOnglet] = useState(ongletInitial);
    if (!contexte) {
        return <Card><CardContent><Typography variant="body2" color="text.secondary">Choisissez un patient pour voir son dossier.</Typography></CardContent></Card>;
    }
    const historique = contexte.historique || [];
    const labo = contexte.labo || [];
    const imagerie = (contexte.imagerie || []).filter(i => i.compte_rendu);
    const derniereVisite = historique[0]?.date ? new Date(historique[0].date) : null;
    return (
        <Card>
            <Tabs value={onglet} onChange={(e, v) => setOnglet(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40 }}>
                <Tab label={`Visites (${historique.length})`} sx={{ minHeight: 40 }} />
                <Tab label={`Labo (${labo.length})`} sx={{ minHeight: 40 }} />
                {imagerie.length > 0 && <Tab label={`Imagerie (${imagerie.length})`} sx={{ minHeight: 40 }} />}
            </Tabs>
            <CardContent sx={{ maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto', pt: 1 }}>
                {onglet === 0 && (
                    historique.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Première consultation de ce patient au centre.</Typography>
                    ) : historique.map((c, i) => (
                        <Box key={c.id}>
                            {i > 0 && <Divider />}
                            <Consultation c={c} onReprendreTraitement={onReprendreTraitement} onCopier={onCopierHistoire} />
                        </Box>
                    ))
                )}
                {onglet === 1 && (
                    labo.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Aucune analyse au centre pour ce patient.</Typography>
                    ) : labo.map((o, i) => {
                        const nouveau = derniereVisite && new Date(o.date) > derniereVisite;
                        const avecResultat = o.examens.filter(e => e.resultat_saisi);
                        return (
                            <Box key={o.id}>
                                {i > 0 && <Divider sx={{ my: 1 }} />}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                    <Typography variant="subtitle2">{jour(o.date)}</Typography>
                                    <Typography variant="caption" color="text.secondary">{o.numero} · {o.statut}</Typography>
                                    {nouveau && <Chip size="small" color="success" label="Depuis la dernière visite" />}
                                </Box>
                                {o.examens.map((e, k) => <Examen key={k} e={e} />)}
                                {o.diagnostic_biologiste && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>Biologiste : {o.diagnostic_biologiste}</Typography>
                                )}
                                {avecResultat.length > 0 && (
                                    <Button size="small" startIcon={<ScienceIcon />} sx={{ mt: 0.5 }}
                                        onClick={() => onAjouterResultats([`Résultats du ${jour(o.date)} (${o.numero}) :`, ...avecResultat.map(ligneResultat)])}>
                                        Ajouter ces résultats à la consultation
                                    </Button>
                                )}
                            </Box>
                        );
                    })
                )}
                {onglet === 2 && imagerie.map((im, i) => (
                    <Box key={i} sx={{ py: 1 }}>
                        {i > 0 && <Divider sx={{ mb: 1 }} />}
                        <Typography variant="subtitle2">{jour(im.date)} — {im.examen}</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{im.compte_rendu}</Typography>
                        <Button size="small" startIcon={<CopyIcon />} onClick={() => onAjouterResultats([`Imagerie du ${jour(im.date)} — ${im.examen} : ${premiereLigne(im.compte_rendu)}`])}>
                            Ajouter à la consultation
                        </Button>
                    </Box>
                ))}
            </CardContent>
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
