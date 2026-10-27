import React from 'react';
import { Box, Grid, TextField, Typography, Alert } from '@mui/material';
import Pastilles from './Pastilles';
import CourbeSimple from './CourbeSimple';

// Cardiologie : courbe de la tension sur toutes les visites, facteurs de risque comptés,
// examen cardiaque et ECG en pastilles.
const FACTEURS = ['HTA connue', 'Diabète', 'Tabac', 'Dyslipidémie', 'Obésité', 'Sédentarité', 'Antécédent familial cardiovasculaire', 'Insuffisance rénale'];
const EXAMEN = ['B1 B2 réguliers', 'Souffle systolique', 'Souffle diastolique', 'Arythmie', 'Galop', 'Turgescence jugulaire',
    'Crépitants aux bases', 'Œdèmes des membres inférieurs', 'Pouls périphériques perçus', 'Pouls périphériques abolis'];
const ECG = ['ECG non fait', 'ECG normal', 'Hypertrophie ventriculaire gauche', 'Trouble du rythme', 'Trouble de conduction', 'Signes d\'ischémie'];

export const resumeCardio = (c = {}) => {
    const l = [];
    if (c.facteurs?.length) l.push(`Facteurs de risque (${c.facteurs.length}) : ${c.facteurs.join(', ')}`);
    if (c.examen?.length) l.push(`Examen cardiovasculaire : ${c.examen.join(', ')}`);
    if (c.ecg?.length) l.push(`ECG : ${c.ecg.join(', ')}`);
    if (c.tension_bras) l.push(`TA contrôlée au 2e bras : ${c.tension_bras}`);
    if (c.traitement_en_cours) l.push(`Traitement en cours : ${c.traitement_en_cours}`);
    return l;
};

const basculer = (liste = [], v) => (liste.includes(v) ? liste.filter(x => x !== v) : [...liste, v]);
const dateCourte = (x) => new Date(x).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const BlocCardio = ({ data = {}, onData, contexte, constantes }) => {
    const maj = (champ, valeur) => onData({ ...data, [champ]: valeur });
    const anciennes = (contexte?.mesures || []).filter(m => m.tas);
    const maintenant = Date.now();
    const pts = (cle, actuel) => [
        ...anciennes.map(m => ({ x: new Date(m.date).getTime(), y: m[cle] })),
        ...(actuel ? [{ x: maintenant, y: +actuel }] : []),
    ];
    const tas = +constantes.blood_pressure_systolic, tad = +constantes.blood_pressure_diastolic;
    const auDessus = (tas && tas >= 140) || (tad && tad >= 90);
    const imc = constantes.bmi ? +constantes.bmi : null;
    return (
        <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                Tension sur toutes les visites ({anciennes.length + (tas ? 1 : 0)} mesures)
            </Typography>
            <CourbeSimple
                series={[
                    { nom: 'Systolique', couleur: '#D85A30', points: pts('tas', constantes.blood_pressure_systolic) },
                    { nom: 'Diastolique', couleur: '#378ADD', points: pts('tad', constantes.blood_pressure_diastolic) },
                ]}
                seuils={[{ y: 140, libelle: '140' }, { y: 90, libelle: '90', couleur: '#85B7EB' }]}
                etiquetteX={dateCourte} unite=" mmHg"
            />
            {tas > 0 && (
                <Alert severity={auDessus ? 'warning' : 'success'} sx={{ my: 1, py: 0 }}>
                    Aujourd'hui {tas}/{tad || '?'} mmHg — {auDessus ? 'au-dessus de l\'objectif (140/90)' : 'dans l\'objectif (< 140/90)'}
                </Alert>
            )}
            <Pastilles titre={`Facteurs de risque — ${(data.facteurs || []).length} coché(s)${imc && imc >= 30 && !(data.facteurs || []).includes('Obésité') ? ` · IMC ${imc} : penser à « Obésité »` : ''}`}
                options={FACTEURS} actif={v => (data.facteurs || []).includes(v)} onBascule={v => maj('facteurs', basculer(data.facteurs, v))} couleur="warning" />
            <Pastilles titre="Examen cardiovasculaire" options={EXAMEN} actif={v => (data.examen || []).includes(v)}
                onBascule={v => maj('examen', basculer(data.examen, v))} couleur="secondary" />
            <Pastilles titre="ECG" options={ECG} actif={v => (data.ecg || []).includes(v)} onBascule={v => maj('ecg', basculer(data.ecg, v))} couleur="secondary" />
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={4}>
                    <TextField label="TA au 2e bras" placeholder="13/8" value={data.tension_bras || ''} onChange={e => maj('tension_bras', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={8}>
                    <TextField label="Traitement en cours" placeholder="Amlodipine 10 mg, 1 cp le matin" value={data.traitement_en_cours || ''}
                        onChange={e => maj('traitement_en_cours', e.target.value)} fullWidth size="small" />
                </Grid>
            </Grid>
        </Box>
    );
};

export default BlocCardio;
