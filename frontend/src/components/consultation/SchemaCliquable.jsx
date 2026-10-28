import React, { useMemo, useState } from 'react';
import { Box, Typography, useTheme, alpha, ToggleButton, ToggleButtonGroup, Button, TextField, IconButton, Chip } from '@mui/material';
import PinIcon from '@mui/icons-material/PushPin';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import Pastilles from './Pastilles';
import SchemaSvg from './SchemaSvg';
import { paletteSchema } from './schemas/palette';
import { basculerLigne, contientLigne } from './specialites';

// Schéma anatomique à toucher. On touche une zone, puis un constat ; chaque constat écrit
// « Zone : constat » dans le texte (toujours modifiable). Le premier constat d'une zone est toujours le constat normal :
// une zone décrite « normale » se colore en vert, une zone avec un constat anormal en rouge.
//   schema  : { id, titre, vues: [{ id, titre, viewBox, largeur, decor, zones, reperes? }] }  (voir schemas/LISEZMOI.md)
//   opts    : { sexe: 'F'|'M'|null, ageMois: number|null } transmis au dessin (silhouette, proportions)
//   reperes / onReperes : repères libres posés sur l'image [{ id, schema, vue, x, y, zone, note }]
export const etatDesZones = (schema, texte) => {
    const decrites = {};
    schema.vues.forEach(v => Object.entries(v.zones).forEach(([id, z]) => {
        let etat = null;
        z.constats.forEach((cst, i) => {
            if (contientLigne(texte, `${z.libelle} : ${cst}`)) etat = (i === 0 && etat !== 'anormal') ? 'normal' : 'anormal';
        });
        if (etat) decrites[id] = etat;
    }));
    return decrites;
};

const SchemaCliquable = ({ schema, texte, onTexte, opts = {}, largeur, legende, reperes = [], onReperes, vueInitiale = 0 }) => {
    const theme = useTheme();
    const c = useMemo(() => paletteSchema(theme), [theme]);
    const [vueIdx, setVueIdx] = useState(Math.min(vueInitiale, schema.vues.length - 1));
    const [zone, setZone] = useState(null);
    const [poser, setPoser] = useState(false);
    const vue = schema.vues[vueIdx];
    const toutes = useMemo(() => Object.assign({}, ...schema.vues.map(v => v.zones)), [schema]);
    const vueDe = useMemo(() => {
        const m = {};
        schema.vues.forEach((v, i) => Object.keys(v.zones).forEach(z => { m[z] = i; }));
        return m;
    }, [schema]);
    const decrites = useMemo(() => etatDesZones(schema, texte), [schema, texte]);
    const ligne = (z, cst) => `${toutes[z].libelle} : ${cst}`;
    const mesReperes = reperes.filter(r => r.schema === schema.id).map((r, i) => ({ ...r, n: i + 1 }));
    const reperesVue = mesReperes.filter(r => r.vue === vue.id);

    const choisir = (id) => {
        setZone(id);
        if (vueDe[id] !== undefined && vueDe[id] !== vueIdx) setVueIdx(vueDe[id]);
    };
    const poserRepere = (e, idZone) => {
        const svg = e.currentTarget.ownerSVGElement || e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        onReperes([...reperes, { id: `r${Date.now()}${Math.round(Math.random() * 1000)}`, schema: schema.id, vue: vue.id, x: Math.round(p.x), y: Math.round(p.y), zone: idZone || null, note: '' }]);
        setPoser(false);
    };
    const surZone = (id, e) => {
        if (poser && onReperes && e?.clientX !== undefined) { poserRepere(e, id); choisir(id); return; }
        choisir(id);
    };

    // Gestes rapides par groupe : « Tout normal » documente d un geste les zones pas encore décrites ; « Effacer » retire leurs lignes
    const toutNormal = (ids) => {
        let t = texte;
        ids.forEach(id => { if (!decrites[id]) t = basculerLigne(t, ligne(id, toutes[id].constats[0])); });
        onTexte(t);
    };
    const effacer = (ids) => {
        let t = texte;
        ids.forEach(id => toutes[id].constats.forEach(cst => { if (contientLigne(t, ligne(id, cst))) t = basculerLigne(t, ligne(id, cst)); }));
        onTexte(t);
    };
    const groupes = useMemo(() => {
        const g = {};
        Object.entries(toutes).forEach(([id, z]) => { (g[z.groupe || ''] = g[z.groupe || ''] || []).push(id); });
        return g;
    }, [toutes]);

    if (Object.keys(toutes).length === 0) return null;   // schéma pas encore dessiné : on n'affiche pas de cadre vide

    return (
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box sx={{ width: { xs: '100%', sm: vue.largeur || largeur || 220 }, maxWidth: { xs: 340, sm: 'none' }, flexShrink: 0, mx: { xs: 'auto', sm: 0 } }}>
                {schema.vues.length > 1 && (
                    <ToggleButtonGroup size="small" exclusive fullWidth value={vueIdx} onChange={(e, v) => v !== null && setVueIdx(v)} sx={{ mb: 1 }}>
                        {schema.vues.map((v, i) => <ToggleButton key={v.id} value={i} sx={{ textTransform: 'none', py: 0.25 }}>{v.titre}</ToggleButton>)}
                    </ToggleButtonGroup>
                )}
                <Box sx={{ border: 1, borderColor: poser ? 'warning.main' : 'divider', borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.03 : 0.02), p: 1, cursor: poser ? 'crosshair' : 'default' }}>
                    <SchemaSvg vue={vue} c={c} opts={opts} libelle={legende || schema.titre}
                        etat={{ selection: zone, decrites }} onZone={surZone} reperes={reperesVue}
                        onFond={poser && onReperes ? (e) => poserRepere(e, null) : undefined} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.normalTrait }} /> normal
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c.anormalTrait }} /> anormal
                    </Typography>
                    {legende && <Typography variant="caption" color="text.secondary" sx={{ flexBasis: '100%' }}>{legende}</Typography>}
                </Box>
                {vue.reperes && onReperes && (
                    <Button size="small" startIcon={<PinIcon />} variant={poser ? 'contained' : 'outlined'} color="warning" sx={{ mt: 1 }} onClick={() => setPoser(!poser)}>
                        {poser ? 'Touchez l\'endroit sur le schéma' : 'Placer un repère'}
                    </Button>
                )}
            </Box>

            <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 240 } }}>
                {zone ? (
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                            {toutes[zone].libelle}{toutes[zone].groupe ? <Typography component="span" variant="caption" color="text.secondary"> — {toutes[zone].groupe}</Typography> : null}
                        </Typography>
                        <Pastilles
                            options={toutes[zone].constats.map((cst, i) => ({ valeur: cst, libelle: cst, couleur: i === 0 ? 'success' : 'error' }))}
                            actif={(cst) => contientLigne(texte, ligne(zone, cst))}
                            onBascule={(cst) => onTexte(basculerLigne(texte, ligne(zone, cst)))}
                        />
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Touchez une zone du schéma pour noter ce que vous trouvez.
                    </Typography>
                )}

                {Object.entries(groupes).map(([g, ids]) => (
                    <Box key={g || '_'} sx={{ mb: 1 }}>
                        {g && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>{g}</Typography>
                                {ids.some(id => !decrites[id]) && (
                                    <Button size="small" startIcon={<CheckIcon sx={{ fontSize: 15 }} />} onClick={() => toutNormal(ids)}
                                        sx={{ py: 0, minHeight: 22, fontSize: 11, color: 'success.main' }}>Tout normal</Button>
                                )}
                                {ids.some(id => decrites[id]) && (
                                    <Button size="small" onClick={() => effacer(ids)} sx={{ py: 0, minHeight: 22, fontSize: 11, color: 'text.secondary' }}>Effacer</Button>
                                )}
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {ids.map(id => {
                                const etat = decrites[id];
                                return (
                                    <Chip key={id} size="small" label={toutes[id].libelle} onClick={() => choisir(id)}
                                        variant={zone === id ? 'filled' : 'outlined'} color={zone === id ? 'primary' : etat === 'anormal' ? 'error' : etat === 'normal' ? 'success' : 'default'}
                                        sx={{ fontWeight: etat || zone === id ? 600 : 400 }} />
                                );
                            })}
                        </Box>
                    </Box>
                ))}

                {mesReperes.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Repères posés</Typography>
                        {mesReperes.map(r => (
                            <Box key={r.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
                                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: c.repere, color: '#1f2937', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.n}</Box>
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 70 }}>{r.zone && toutes[r.zone] ? toutes[r.zone].libelle : 'Hors zone'}</Typography>
                                <TextField size="small" fullWidth placeholder="Lésion, taille, aspect…" value={r.note}
                                    onChange={(e) => onReperes(reperes.map(x => (x.id === r.id ? { ...x, note: e.target.value } : x)))} />
                                <IconButton size="small" aria-label="Retirer le repère" onClick={() => onReperes(reperes.filter(x => x.id !== r.id))}><CloseIcon fontSize="small" /></IconButton>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default SchemaCliquable;

// Lignes de résumé des repères (compte rendu, PDF) : « Repère 1 — Joue gauche : tache 2 cm »
export const resumeReperes = (reperes = [], schemas = {}) => {
    const parSchema = {};
    return reperes.map(r => {
        parSchema[r.schema] = (parSchema[r.schema] || 0) + 1;
        const s = schemas[r.schema];
        const z = s ? Object.assign({}, ...s.vues.map(v => v.zones))[r.zone] : null;
        return `Repère ${parSchema[r.schema]}${s ? ` (${s.titre})` : ''} — ${z ? z.libelle : 'hors zone'}${r.note ? ` : ${r.note}` : ''}`;
    });
};
