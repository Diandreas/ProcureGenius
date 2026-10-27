import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';

// Rangée de pastilles à toucher. `actif(valeur)` dit si la pastille est allumée,
// `onBascule(valeur)` l'allume ou l'éteint. Pensé pour le doigt (tablette).
const Pastilles = ({ titre, options, actif, onBascule, couleur = 'primary', taille = 'medium', desactive = false }) => (
    <Box sx={{ mb: 1 }}>
        {titre && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                {titre}
            </Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {options.map((o) => {
                const valeur = typeof o === 'string' ? o : o.valeur;
                const libelle = typeof o === 'string' ? o : o.libelle;
                const on = actif(valeur);
                return (
                    <Chip
                        key={valeur}
                        label={libelle}
                        icon={on ? <CheckIcon /> : undefined}
                        size={taille}
                        color={on ? couleur : 'default'}
                        variant={on ? 'filled' : 'outlined'}
                        onClick={desactive ? undefined : () => onBascule(valeur)}
                        sx={{ fontWeight: on ? 600 : 400 }}
                    />
                );
            })}
        </Box>
    </Box>
);

export default Pastilles;
