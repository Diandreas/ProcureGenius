import React, { useState } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import Pastilles from './Pastilles';
import { basculerLigne, contientLigne } from './specialites';

// Schéma à toucher : on touche une zone, puis un constat ; chaque constat écrit
// « Zone : constat » dans le texte (toujours modifiable). Les zones déjà décrites sont colorées.
//   formes : [{ zone, type: 'rect'|'circle'|'ellipse'|'path', props }]
//   zones  : { [zone]: { libelle, constats: [...] } }
const SchemaCliquable = ({ viewBox, largeur = 180, formes, zones, texte, onTexte, legende }) => {
    const theme = useTheme();
    const [zone, setZone] = useState(null);
    const ligne = (z, c) => `${zones[z].libelle} : ${c}`;
    const decrite = (z) => zones[z].constats.some(c => contientLigne(texte, ligne(z, c)));
    const couleur = (z) => {
        if (zone === z) return theme.palette.primary.main;
        if (decrite(z)) return theme.palette.primary.light;
        return theme.palette.action.hover;
    };
    return (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box sx={{ width: largeur, flexShrink: 0 }}>
                <svg viewBox={viewBox} width="100%" role="img" aria-label={legende || 'Schéma'}>
                    {formes.map((f, i) => {
                        const El = f.type;
                        return (
                            <El key={i} {...f.props} fill={couleur(f.zone)} stroke={theme.palette.divider} strokeWidth="1.5"
                                style={{ cursor: 'pointer' }} onClick={() => setZone(f.zone)}>
                                <title>{zones[f.zone].libelle}</title>
                            </El>
                        );
                    })}
                </svg>
                {legende && <Typography variant="caption" color="text.secondary">{legende}</Typography>}
            </Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>
                {zone ? (
                    <Pastilles
                        titre={zones[zone].libelle}
                        options={zones[zone].constats}
                        actif={(c) => contientLigne(texte, ligne(zone, c))}
                        onBascule={(c) => onTexte(basculerLigne(texte, ligne(zone, c)))}
                    />
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Touchez une zone du schéma pour noter ce que vous trouvez.
                    </Typography>
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {Object.keys(zones).map(z => (
                        <Box key={z} component="button" type="button" onClick={() => setZone(z)}
                            sx={{
                                border: 1, borderColor: zone === z ? 'primary.main' : 'divider', borderRadius: 1, px: 1, py: 0.25,
                                bgcolor: decrite(z) ? alpha(theme.palette.primary.main, 0.08) : 'transparent', cursor: 'pointer', fontSize: 12,
                                color: decrite(z) ? 'primary.main' : 'text.secondary', fontWeight: decrite(z) ? 600 : 400,
                            }}>
                            {zones[z].libelle}{decrite(z) ? ' ✓' : ''}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default SchemaCliquable;

// Silhouette de face (médecine générale, pédiatrie)
export const FORMES_CORPS = [
    { zone: 'tete', type: 'circle', props: { cx: 60, cy: 24, r: 18 } },
    { zone: 'neuro', type: 'rect', props: { x: 52, y: 0, width: 16, height: 6, rx: 3 } },
    { zone: 'thorax', type: 'rect', props: { x: 34, y: 46, width: 52, height: 40, rx: 10 } },
    { zone: 'coeur', type: 'circle', props: { cx: 68, cy: 66, r: 8 } },
    { zone: 'abdomen', type: 'rect', props: { x: 36, y: 89, width: 48, height: 38, rx: 8 } },
    { zone: 'pelvis', type: 'rect', props: { x: 38, y: 130, width: 44, height: 18, rx: 6 } },
    { zone: 'membres', type: 'rect', props: { x: 14, y: 48, width: 16, height: 80, rx: 7 } },
    { zone: 'membres', type: 'rect', props: { x: 90, y: 48, width: 16, height: 80, rx: 7 } },
    { zone: 'membres', type: 'rect', props: { x: 40, y: 151, width: 18, height: 80, rx: 7 } },
    { zone: 'membres', type: 'rect', props: { x: 62, y: 151, width: 18, height: 80, rx: 7 } },
    { zone: 'peau', type: 'rect', props: { x: 2, y: 225, width: 26, height: 10, rx: 4 } },
];
export const VIEWBOX_CORPS = '0 0 120 240';
