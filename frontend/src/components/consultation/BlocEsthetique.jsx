import React, { useRef, useState } from 'react';
import { Box, Button, Grid, TextField, Typography, IconButton, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { PhotoCamera as CameraIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Pastilles from './Pastilles';
import SchemaCliquable from './SchemaCliquable';

// Médecine esthétique : schéma du visage (zone + type de lésion), phototype, suivi des séances,
// photos avant / après rattachées à la consultation.
const LESIONS = ['Tache pigmentaire', 'Mélasma', 'Acné', 'Cicatrice', 'Ride', 'Rougeur', 'Grain de beauté', 'Peau sèche'];
const VISAGE = {
    front: { libelle: 'Front', constats: LESIONS },
    tempe_d: { libelle: 'Tempe droite', constats: LESIONS },
    tempe_g: { libelle: 'Tempe gauche', constats: LESIONS },
    yeux: { libelle: 'Contour des yeux', constats: LESIONS },
    nez: { libelle: 'Nez', constats: LESIONS },
    joue_d: { libelle: 'Joue droite', constats: LESIONS },
    joue_g: { libelle: 'Joue gauche', constats: LESIONS },
    levres: { libelle: 'Lèvres', constats: LESIONS },
    menton: { libelle: 'Menton', constats: LESIONS },
    cou: { libelle: 'Cou', constats: LESIONS },
};
// vue de face : la joue droite de la patiente est à gauche de l'image
const FORMES_VISAGE = [
    { zone: 'cou', type: 'rect', props: { x: 42, y: 128, width: 36, height: 26, rx: 6 } },
    { zone: 'front', type: 'ellipse', props: { cx: 60, cy: 26, rx: 34, ry: 16 } },
    { zone: 'tempe_d', type: 'ellipse', props: { cx: 19, cy: 50, rx: 8, ry: 12 } },
    { zone: 'tempe_g', type: 'ellipse', props: { cx: 101, cy: 50, rx: 8, ry: 12 } },
    { zone: 'yeux', type: 'rect', props: { x: 30, y: 46, width: 60, height: 12, rx: 6 } },
    { zone: 'nez', type: 'rect', props: { x: 53, y: 60, width: 14, height: 26, rx: 6 } },
    { zone: 'joue_d', type: 'ellipse', props: { cx: 34, cy: 80, rx: 15, ry: 16 } },
    { zone: 'joue_g', type: 'ellipse', props: { cx: 86, cy: 80, rx: 15, ry: 16 } },
    { zone: 'levres', type: 'ellipse', props: { cx: 60, cy: 98, rx: 14, ry: 6 } },
    { zone: 'menton', type: 'ellipse', props: { cx: 60, cy: 114, rx: 16, ry: 9 } },
];
const PHOTOTYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export const resumeEsthetique = (e = {}) => {
    const l = [];
    if (e.phototype) l.push(`Phototype : ${e.phototype}`);
    if (e.lesions) l.push(...e.lesions.split('\n').filter(Boolean));
    if (e.seance) l.push(`Séance ${e.seance}${e.seances_total ? ` sur ${e.seances_total}` : ''}`);
    if (e.protocole) l.push(`Protocole / produits : ${e.protocole}`);
    return l;
};

const BlocEsthetique = ({ data = {}, onData, photos = [], onAjouterPhoto, onSupprimerPhoto, peutPhoto }) => {
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
            <SchemaCliquable viewBox="0 0 120 156" largeur={150} formes={FORMES_VISAGE} zones={VISAGE}
                texte={data.lesions || ''} onTexte={v => maj('lesions', v)} legende="Vue de face : la joue droite est à gauche" />
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
                {photos.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {photos.map(p => (
                            <Box key={p.id} sx={{ position: 'relative', width: 120 }}>
                                <Box component="img" src={p.url} alt={p.moment_display} sx={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }} />
                                <Typography variant="caption" sx={{ display: 'block' }}>{p.moment_display}</Typography>
                                <IconButton size="small" aria-label="Retirer la photo" onClick={() => onSupprimerPhoto(p.id)}
                                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default BlocEsthetique;
