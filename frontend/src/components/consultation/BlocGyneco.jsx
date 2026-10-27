import React from 'react';
import { Box, Grid, TextField, Typography, FormControlLabel, Switch, Alert } from '@mui/material';
import Pastilles from './Pastilles';
import SchemaCliquable from './SchemaCliquable';

// Gynécologie : la DDR calcule le terme et la date d'accouchement, G/P en chiffres,
// examen au spéculum et toucher vaginal en pastilles, schéma des seins.
const SEINS = {
    sd_se: { libelle: 'Sein droit — quadrant supéro-externe', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sd_si: { libelle: 'Sein droit — quadrant supéro-interne', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sd_ie: { libelle: 'Sein droit — quadrant inféro-externe', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sd_ii: { libelle: 'Sein droit — quadrant inféro-interne', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sd_ma: { libelle: 'Mamelon droit', constats: ['Normal', 'Écoulement', 'Rétraction'] },
    sg_se: { libelle: 'Sein gauche — quadrant supéro-externe', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sg_si: { libelle: 'Sein gauche — quadrant supéro-interne', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sg_ie: { libelle: 'Sein gauche — quadrant inféro-externe', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sg_ii: { libelle: 'Sein gauche — quadrant inféro-interne', constats: ['Normal', 'Nodule', 'Douleur', 'Placard'] },
    sg_ma: { libelle: 'Mamelon gauche', constats: ['Normal', 'Écoulement', 'Rétraction'] },
};
// vue de face : le sein droit de la patiente est à gauche de l'image
const quart = (cx, cy, dx, dy) => `M${cx},${cy} L${cx + dx * 30},${cy} A30,30 0 0 ${dx * dy > 0 ? 1 : 0} ${cx},${cy + dy * 30} Z`;
const FORMES_SEINS = [
    { zone: 'sd_se', type: 'path', props: { d: quart(45, 45, -1, -1) } },
    { zone: 'sd_si', type: 'path', props: { d: quart(45, 45, 1, -1) } },
    { zone: 'sd_ie', type: 'path', props: { d: quart(45, 45, -1, 1) } },
    { zone: 'sd_ii', type: 'path', props: { d: quart(45, 45, 1, 1) } },
    { zone: 'sd_ma', type: 'circle', props: { cx: 45, cy: 45, r: 6 } },
    { zone: 'sg_si', type: 'path', props: { d: quart(125, 45, -1, -1) } },
    { zone: 'sg_se', type: 'path', props: { d: quart(125, 45, 1, -1) } },
    { zone: 'sg_ii', type: 'path', props: { d: quart(125, 45, -1, 1) } },
    { zone: 'sg_ie', type: 'path', props: { d: quart(125, 45, 1, 1) } },
    { zone: 'sg_ma', type: 'circle', props: { cx: 125, cy: 45, r: 6 } },
];

const SPECULUM = ['Col sain', 'Col inflammatoire', 'Ectropion', 'Leucorrhées blanches', 'Leucorrhées jaunâtres', 'Leucorrhées malodorantes',
    'Saignement endocol', 'Lésion suspecte du col'];
const TV = ['Utérus de taille normale', 'Utérus augmenté de volume', 'Utérus gravide', 'Annexes libres', 'Masse annexielle',
    'Douleur à la mobilisation utérine', 'Cul-de-sac douloureux'];
const CONTRACEPTION = ['Aucune', 'Pilule', 'Injectable', 'Implant', 'DIU', 'Préservatif', 'Méthode naturelle'];

const JOUR = 86400000;
export const termeGrossesse = (ddr, ref = new Date()) => {
    if (!ddr) return null;
    const d = new Date(ddr);
    if (Number.isNaN(d.getTime())) return null;
    const jours = Math.floor((ref - d) / JOUR);
    if (jours < 0 || jours > 310) return null;
    const dpa = new Date(d.getTime() + 280 * JOUR);
    return { sa: Math.floor(jours / 7), j: jours % 7, dpa };
};
const fr = (d) => d.toLocaleDateString('fr-FR');

export const resumeGyneco = (g = {}) => {
    const l = [];
    if (g.ddr) {
        const t = g.enceinte ? termeGrossesse(g.ddr) : null;
        l.push(`DDR : ${fr(new Date(g.ddr))}${t ? ` — terme ${t.sa} SA + ${t.j} j, accouchement prévu le ${fr(t.dpa)}` : ''}`);
    }
    const gp = ['g', 'p', 'ev', 'a'].filter(k => g[k] !== undefined && g[k] !== '');
    if (gp.length) l.push(`Gestité ${g.g ?? '?'} — Parité ${g.p ?? '?'} — Enfants vivants ${g.ev ?? '?'} — Avortements ${g.a ?? '?'}`);
    if (g.cycle) l.push(`Cycle : ${g.cycle}${g.duree_cycle ? ` (${g.duree_cycle} j)` : ''}`);
    if (g.contraception?.length) l.push(`Contraception : ${g.contraception.join(', ')}`);
    if (g.speculum?.length) l.push(`Spéculum : ${g.speculum.join(', ')}`);
    if (g.tv?.length) l.push(`Toucher vaginal : ${g.tv.join(', ')}`);
    if (g.seins) l.push(...g.seins.split('\n').filter(Boolean).map(x => `Seins — ${x}`));
    if (g.frottis) l.push(`Dernier frottis : ${g.frottis}`);
    return l;
};

const basculer = (liste = [], v) => (liste.includes(v) ? liste.filter(x => x !== v) : [...liste, v]);

const BlocGyneco = ({ data = {}, onData }) => {
    const maj = (champ, valeur) => onData({ ...data, [champ]: valeur });
    const t = data.enceinte ? termeGrossesse(data.ddr) : null;
    return (
        <Box>
            <Grid container spacing={2} sx={{ mb: 1 }}>
                <Grid item xs={12} sm={4}>
                    <TextField label="Date des dernières règles (DDR)" type="date" value={data.ddr || ''} onChange={e => maj('ddr', e.target.value)}
                        fullWidth size="small" InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControlLabel control={<Switch checked={!!data.enceinte} onChange={e => maj('enceinte', e.target.checked)} />} label="Grossesse en cours" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    {t && (
                        <Alert severity="info" icon={false} sx={{ py: 0 }}>
                            <b>{t.sa} SA + {t.j} j</b> — accouchement prévu le <b>{fr(t.dpa)}</b>
                        </Alert>
                    )}
                </Grid>
                {[['g', 'Gestité'], ['p', 'Parité'], ['ev', 'Enfants vivants'], ['a', 'Avortements']].map(([k, lib]) => (
                    <Grid item xs={6} sm={3} key={k}>
                        <TextField label={lib} type="number" value={data[k] ?? ''} onChange={e => maj(k, e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))}
                            fullWidth size="small" inputProps={{ min: 0 }} />
                    </Grid>
                ))}
            </Grid>
            <Pastilles titre="Cycle" options={['Régulier', 'Irrégulier', 'Aménorrhée', 'Ménopause']} actif={v => data.cycle === v}
                onBascule={v => maj('cycle', data.cycle === v ? '' : v)} />
            <Pastilles titre="Contraception" options={CONTRACEPTION} actif={v => (data.contraception || []).includes(v)}
                onBascule={v => maj('contraception', basculer(data.contraception, v))} />
            <Pastilles titre="Spéculum" options={SPECULUM} actif={v => (data.speculum || []).includes(v)}
                onBascule={v => maj('speculum', basculer(data.speculum, v))} couleur="secondary" />
            <Pastilles titre="Toucher vaginal" options={TV} actif={v => (data.tv || []).includes(v)}
                onBascule={v => maj('tv', basculer(data.tv, v))} couleur="secondary" />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, mt: 1, mb: 0.5 }}>Examen des seins</Typography>
            <SchemaCliquable viewBox="0 0 170 95" largeur={200} formes={FORMES_SEINS} zones={SEINS}
                texte={data.seins || ''} onTexte={v => maj('seins', v)} legende="Vue de face : le sein droit est à gauche" />
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                    <TextField label="Dernier frottis (date ou « jamais »)" value={data.frottis || ''} onChange={e => maj('frottis', e.target.value)} fullWidth size="small" />
                </Grid>
            </Grid>
        </Box>
    );
};

export default BlocGyneco;
