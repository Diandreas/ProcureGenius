import React, { useId } from 'react';
import { Box, ButtonBase, Typography, alpha, useTheme } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import { accentDe } from './teintes';

const apparition = keyframes`
    from { transform: scale(0.4); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
`;

// Une pastille : bouton à bascule (aria-pressed). 36 px de haut au doigt ; état allumé = lavis teinté +
// bordure + coche pleine (jamais la couleur seule) ; survol, focus clavier et appui visibles.
const Pastille = ({ libelle, allumee, teinte, taille, desactive, onClick }) => {
    const theme = useTheme();
    const sombre = theme.palette.mode === 'dark';
    const a = accentDe(theme, teinte);
    const petite = taille === 'small';
    const bordure = sombre ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.20)';

    return (
        <ButtonBase
            type="button"
            disabled={desactive}
            onClick={onClick}
            aria-pressed={allumee}
            sx={{
                position: 'relative',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                minHeight: petite ? 32 : 36, maxWidth: '100%',
                px: petite ? '10px' : '14px', py: '4px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: allumee ? a.main : bordure,
                bgcolor: allumee ? alpha(a.main, sombre ? 0.2 : 0.1) : 'background.paper',
                color: allumee ? a.texte : 'text.primary',
                boxShadow: allumee ? `inset 0 0 0 1px ${a.main}` : 'none',
                fontFamily: 'inherit', fontSize: petite ? '0.75rem' : '0.8125rem', lineHeight: 1.3,
                textAlign: 'left', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
                transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                // zone tactile de 36 px même en petite taille
                '&::after': petite ? { content: '""', position: 'absolute', left: 0, right: 0, top: -2, bottom: -2 } : {},
                '&:hover': {
                    bgcolor: allumee ? alpha(a.main, sombre ? 0.28 : 0.16) : 'action.hover',
                    borderColor: allumee ? a.main : (sombre ? 'rgba(255,255,255,0.36)' : 'rgba(15,23,42,0.36)'),
                },
                '&:active': { transform: 'scale(0.97)' },
                '&.Mui-focusVisible': { outline: `2px solid ${a.main}`, outlineOffset: 2 },
                '&.Mui-disabled': { opacity: 0.55, color: allumee ? a.texte : 'text.secondary' },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:active': { transform: 'none' } },
            }}
        >
            {allumee && (
                <Box
                    aria-hidden="true"
                    sx={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: a.texte, color: a.surCouleur,
                        animation: `${apparition} 0.16s ease-out`,
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }}
                >
                    <CheckIcon sx={{ fontSize: 13 }} />
                </Box>
            )}
            {/* data-libelle réserve la largeur du gras : la pastille ne « saute » pas quand on l'allume */}
            <Box
                component="span"
                data-libelle={libelle}
                sx={{
                    display: 'inline-flex', flexDirection: 'column', minWidth: 0, overflowWrap: 'anywhere',
                    fontWeight: allumee ? 600 : 500,
                    '&::after': { content: 'attr(data-libelle)', fontWeight: 600, height: 0, overflow: 'hidden', visibility: 'hidden', userSelect: 'none', pointerEvents: 'none' },
                }}
            >
                {libelle}
            </Box>
        </ButtonBase>
    );
};

// Rangée de pastilles à toucher. `actif(valeur)` dit si la pastille est allumée,
// `onBascule(valeur)` l'allume ou l'éteint. Pensé pour le doigt (tablette).
const Pastilles = ({ titre, options = [], actif, onBascule, couleur = 'primary', taille = 'medium', desactive = false }) => {
    const idTitre = useId();
    return (
        <Box role="group" aria-labelledby={titre ? idTitre : undefined} sx={{ mb: 1.75 }}>
            {titre && (
                <Typography id={idTitre} variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.875, fontWeight: 600, lineHeight: 1.4 }}>
                    {titre}
                </Typography>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {options.map((o) => {
                    const valeur = typeof o === 'string' ? o : o.valeur;
                    const libelle = typeof o === 'string' ? o : o.libelle;
                    const teinte = (typeof o === 'object' && o.couleur) || couleur;
                    return (
                        <Pastille
                            key={valeur}
                            libelle={libelle}
                            allumee={!!actif(valeur)}
                            teinte={teinte}
                            taille={taille}
                            desactive={desactive}
                            onClick={() => onBascule(valeur)}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};

export default Pastilles;
