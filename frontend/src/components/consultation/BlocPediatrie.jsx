import React from 'react';
import { Box, Grid, TextField, Typography, Alert, Chip } from '@mui/material';
import Pastilles from './Pastilles';
import CourbeCroissance from './CourbeCroissance';
import { ageDepuis, libelleAge } from './specialites';

// Pédiatrie : âge exact, périmètre crânien, courbe de poids de l'enfant (ses propres mesures),
// vaccins en retard, développement et alimentation en pastilles.
const DEVELOPPEMENT = ['Tient sa tête', 'Sourit', 'Tient assis', 'Marche à 4 pattes', 'Marche seul', 'Premiers mots', 'Phrases', 'Propre le jour'];
const ALIMENTATION = ['Allaitement exclusif', 'Allaitement mixte', 'Lait artificiel', 'Diversification commencée', 'Repas familial', 'Mange bien', 'Refus alimentaire'];
const ETAT = ['Bon état général', 'Fatigué', 'Déshydratation', 'Dénutrition', 'Pâleur', 'Ictère'];

export const resumePediatrie = (p = {}, age) => {
    const l = [];
    if (age) l.push(`Âge : ${libelleAge(age)}`);
    if (p.pc) l.push(`Périmètre crânien : ${p.pc} cm`);
    if (p.etat?.length) l.push(`État général : ${p.etat.join(', ')}`);
    if (p.developpement?.length) l.push(`Développement : ${p.developpement.join(', ')}`);
    if (p.alimentation?.length) l.push(`Alimentation : ${p.alimentation.join(', ')}`);
    if (p.vaccins_a_jour !== undefined && p.vaccins_a_jour !== '') l.push(`Vaccins : ${p.vaccins_a_jour ? 'à jour' : 'en retard'}`);
    return l;
};

const basculer = (liste = [], v) => (liste.includes(v) ? liste.filter(x => x !== v) : [...liste, v]);

const BlocPediatrie = ({ data = {}, onData, contexte, constantes }) => {
    const maj = (champ, valeur) => onData({ ...data, [champ]: valeur });
    const naissance = contexte?.patient?.date_naissance;
    const age = ageDepuis(naissance);
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const enRetard = (contexte?.vaccins || []).filter(v => v.prochaine_dose && v.prochaine_dose < aujourdhui);
    const aVenir = (contexte?.vaccins || []).filter(v => v.prochaine_dose && v.prochaine_dose >= aujourdhui);
    return (
        <Box>
            <Grid container spacing={2} sx={{ mb: 1 }}>
                <Grid item xs={12} sm={4}>
                    {age ? (
                        <Typography variant="h6">{libelleAge(age)} <Typography component="span" variant="body2" color="text.secondary">({age.mois} mois)</Typography></Typography>
                    ) : (
                        <Alert severity="warning" sx={{ py: 0 }}>Date de naissance absente du dossier : l'âge et la courbe ne peuvent pas être calculés.</Alert>
                    )}
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField label="Périmètre crânien (cm)" value={data.pc || ''} onChange={e => maj('pc', e.target.value.replace(',', '.'))} fullWidth size="small" />
                </Grid>
            </Grid>
            <CourbeCroissance contexte={contexte} constantes={{ weight: constantes.weight, height: constantes.height, pc: data.pc }} age={age} />
            <Box sx={{ my: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Vaccins</Typography>
                {enRetard.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                        En retard : {enRetard.map(v => `${v.vaccin} (prévu le ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')})`).join(', ')}
                    </Alert>
                )}
                {aVenir.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                        {aVenir.map((v, i) => <Chip key={i} size="small" label={`${v.vaccin} — ${new Date(v.prochaine_dose).toLocaleDateString('fr-FR')}`} />)}
                    </Box>
                )}
                {(contexte?.vaccins || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Aucun vaccin enregistré dans le module Vaccination.</Typography>
                )}
                <Pastilles options={[{ valeur: 'oui', libelle: 'Carnet à jour' }, { valeur: 'non', libelle: 'Carnet en retard' }]}
                    actif={v => (v === 'oui' ? data.vaccins_a_jour === true : data.vaccins_a_jour === false)}
                    onBascule={v => maj('vaccins_a_jour', data.vaccins_a_jour === (v === 'oui') ? '' : v === 'oui')} />
            </Box>
            <Pastilles titre="État général" options={ETAT} actif={v => (data.etat || []).includes(v)} onBascule={v => maj('etat', basculer(data.etat, v))} couleur="secondary" />
            <Pastilles titre="Développement" options={DEVELOPPEMENT} actif={v => (data.developpement || []).includes(v)} onBascule={v => maj('developpement', basculer(data.developpement, v))} />
            <Pastilles titre="Alimentation" options={ALIMENTATION} actif={v => (data.alimentation || []).includes(v)} onBascule={v => maj('alimentation', basculer(data.alimentation, v))} />
        </Box>
    );
};

export default BlocPediatrie;
