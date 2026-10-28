import React, { useRef, useState } from 'react';
import { Box, Button, Grid, TextField, Typography, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import CameraIcon from '@mui/icons-material/PhotoCamera';
import Pastilles from './Pastilles';
import ComparaisonPhotos from './ComparaisonPhotos';
import SchemaCliquable from './SchemaCliquable';
import visage from './schemas/visage';

// Médecine esthétique : schéma du visage (zone + type de lésion), phototype, suivi des séances,
// photos avant / après rattachées à la consultation.
const PHOTOTYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export const resumeEsthetique = (e = {}) => {
    const l = [];
    if (e.phototype) l.push(`Phototype : ${e.phototype}`);
    if (e.lesions) l.push(...e.lesions.split('\n').filter(Boolean));
    if (e.seance) l.push(`Séance ${e.seance}${e.seances_total ? ` sur ${e.seances_total}` : ''}`);
    if (e.protocole) l.push(`Protocole / produits : ${e.protocole}`);
    return l;
};

const BlocEsthetique = ({ data = {}, onData, photos = [], onAjouterPhoto, onSupprimerPhoto, peutPhoto, reperes = [], onReperes }) => {
    const maj = (champ, valeur) => onData({ ...data, [champ]: valeur });
    const fichier = useRef(null);
    const [moment, setMoment] = useState('avant');
    const [envoi, setEnvoi] = useState(false);
    const choisir = async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setEnvoi(true);
        try { await onAjouterPhoto(f, moment); } finally { setEnvoi(false); }
    };
    return (
        <Box>
            <Pastilles titre="Phototype (Fitzpatrick)" options={PHOTOTYPES} actif={v => data.phototype === v}
                onBascule={v => maj('phototype', data.phototype === v ? '' : v)} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mt: 1, mb: 0.5 }}>Lésions</Typography>
            <SchemaCliquable schema={visage} texte={data.lesions || ''} onTexte={v => maj('lesions', v)} reperes={reperes} onReperes={onReperes} legende="Vue de face : la joue droite est à gauche" />
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6} sm={2}>
                    <TextField label="Séance n°" type="number" value={data.seance ?? ''} onChange={e => maj('seance', e.target.value)} fullWidth size="small" inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={6} sm={2}>
                    <TextField label="sur" type="number" value={data.seances_total ?? ''} onChange={e => maj('seances_total', e.target.value)} fullWidth size="small" inputProps={{ min: 1 }} />
                </Grid>
                <Grid item xs={12} sm={8}>
                    <TextField label="Protocole / produits utilisés" value={data.protocole || ''} onChange={e => maj('protocole', e.target.value)} fullWidth size="small" />
                </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>Photos</Typography>
                {peutPhoto ? (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <ToggleButtonGroup size="small" exclusive value={moment} onChange={(e, v) => v && setMoment(v)}>
                            <ToggleButton value="avant">Avant</ToggleButton>
                            <ToggleButton value="apres">Après</ToggleButton>
                            <ToggleButton value="suivi">Suivi</ToggleButton>
                        </ToggleButtonGroup>
                        <Button variant="outlined" startIcon={envoi ? <CircularProgress size={16} /> : <CameraIcon />} onClick={() => fichier.current?.click()} disabled={envoi}>
                            Prendre / ajouter une photo
                        </Button>
                        <input ref={fichier} type="file" accept="image/*" capture="environment" hidden onChange={choisir} />
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">Enregistrez la consultation une première fois pour pouvoir ajouter des photos.</Typography>
                )}
                <Box sx={{ mt: 1.5 }}>
                    <ComparaisonPhotos photos={photos} onSupprimer={onSupprimerPhoto} peutSupprimer={!!peutPhoto} />
                </Box>
            </Box>
        </Box>
    );
};

export default BlocEsthetique;
