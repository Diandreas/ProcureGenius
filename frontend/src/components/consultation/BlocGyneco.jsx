import React from 'react';
import { Box, Grid, TextField, Typography, FormControlLabel, Switch, Alert } from '@mui/material';
import Pastilles from './Pastilles';
import SchemaCliquable from './SchemaCliquable';
import TermeGrossesse from './TermeGrossesse';
import seins from './schemas/seins';
import col from './schemas/col';
import pelvis from './schemas/pelvis';
import gravide from './schemas/gravide';

// Gynécologie : la DDR calcule le terme et la date d'accouchement, G/P en chiffres,
// examen des seins, du col (spéculum), toucher vaginal et examen obstétrical sur schémas à toucher.
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
    if (g.speculum?.length) l.push(`Spéculum : ${g.speculum.join(', ')}`);      // saisies antérieures aux schémas
    if (g.tv?.length) l.push(`Toucher vaginal : ${g.tv.join(', ')}`);
    ['seins', 'col', 'pelvis', 'gravide'].forEach(k => { if (g[k]) l.push(...g[k].split('\n').filter(Boolean)); });
    if (g.frottis) l.push(`Dernier frottis : ${g.frottis}`);
    return l;
};

const basculer = (liste = [], v) => (liste.includes(v) ? liste.filter(x => x !== v) : [...liste, v]);

const TitreExamen = ({ children }) => (
    <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1, pb: 0.5, borderBottom: 1, borderColor: 'divider', fontWeight: 600 }}>{children}</Typography>
);

const BlocGyneco = ({ data = {}, onData }) => {
    const maj = (champ, valeur) => onData({ ...data, [champ]: valeur });
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
                {data.enceinte && data.ddr && (
                    <Grid item xs={12}>
                        <TermeGrossesse ddr={data.ddr} enceinte={!!data.enceinte} />
                    </Grid>
                )}
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
            <TitreExamen>Examen des seins</TitreExamen>
            <SchemaCliquable schema={seins} texte={data.seins || ''} onTexte={v => maj('seins', v)} />
            <TitreExamen>Spéculum</TitreExamen>
            <SchemaCliquable schema={col} texte={data.col || ''} onTexte={v => maj('col', v)} />
            <TitreExamen>Toucher vaginal</TitreExamen>
            <SchemaCliquable schema={pelvis} texte={data.pelvis || ''} onTexte={v => maj('pelvis', v)} />
            {data.enceinte && (
                <>
                    <TitreExamen>Examen obstétrical</TitreExamen>
                    <SchemaCliquable schema={gravide} texte={data.gravide || ''} onTexte={v => maj('gravide', v)} />
                </>
            )}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                    <TextField label="Dernier frottis (date ou « jamais »)" value={data.frottis || ''} onChange={e => maj('frottis', e.target.value)} fullWidth size="small" />
                </Grid>
            </Grid>
        </Box>
    );
};

export default BlocGyneco;
