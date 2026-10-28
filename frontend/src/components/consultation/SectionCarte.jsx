import React, { useId, useState } from 'react';
import { Box, ButtonBase, Card, Collapse, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { accentDe } from './teintes';

// Carte de section de la consultation : tuile d'icône teintée (comme les StatCard), titre, sous-titre,
// filet fin, puis le contenu. Si `repliable`, l'en-tête devient un bouton qui plie / déplie la carte
// (animation douce, état annoncé aux lecteurs d'écran). `action` reste à droite et n'active jamais le repli.
const SectionCarte = ({ titre, sousTitre, icone: Icone, teinte = 'primary', action, repliable = false, ouvertParDefaut = true, children }) => {
    const theme = useTheme();
    const reduit = useMediaQuery('(prefers-reduced-motion: reduce)');
    const [ouvert, setOuvert] = useState(ouvertParDefaut !== false);
    const idCorps = useId();
    const accent = accentDe(theme, teinte);
    const deplie = !repliable || ouvert;

    const chevron = (affichage, extra = {}) => (
        <Box
            aria-hidden="true"
            sx={{
                width: 28, height: 28, borderRadius: '8px', flexShrink: 0, ml: 0.5,
                display: affichage, alignItems: 'center', justifyContent: 'center',
                color: 'text.secondary', ...extra,
            }}
        >
            <ExpandMoreIcon sx={{ transition: reduit ? 'none' : 'transform 0.22s ease', transform: ouvert ? 'rotate(180deg)' : 'none' }} />
        </Box>
    );

    const entete = (
        <>
            {Icone && (
                <Box
                    aria-hidden="true"
                    sx={{
                        width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha(accent.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                        color: accent.texte,
                        '& .MuiSvgIcon-root': { fontSize: 20 },
                    }}
                >
                    <Icone />
                </Box>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3, color: 'text.primary' }}>
                    {titre}
                </Typography>
                {sousTitre && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}>
                        {sousTitre}
                    </Typography>
                )}
            </Box>
            {repliable && chevron({ xs: 'flex', sm: 'none' })}
        </>
    );

    const marges = { xs: 1.75, sm: 2.25 };

    return (
        <Card sx={{ mb: 2, '&:hover': { boxShadow: 'inherit' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5, rowGap: 1, px: marges, py: 1.5 }}>
                {repliable ? (
                    <ButtonBase
                        type="button"
                        onClick={() => setOuvert(o => !o)}
                        aria-expanded={ouvert}
                        aria-controls={idCorps}
                        sx={{
                            flex: '1 1 220px', minWidth: 0, minHeight: 44, display: 'flex', alignItems: 'center', gap: 1.5,
                            textAlign: 'left', borderRadius: '10px', mx: -0.75, px: 0.75, py: 0.5,
                            fontFamily: 'inherit', color: 'inherit', WebkitTapHighlightColor: 'transparent',
                            transition: reduit ? 'none' : 'background-color 0.15s ease',
                            '&:hover': { bgcolor: 'action.hover' },
                            '&.Mui-focusVisible': { outline: `2px solid ${accent.main}`, outlineOffset: 1 },
                        }}
                    >
                        {entete}
                    </ButtonBase>
                ) : (
                    <Box sx={{ flex: '1 1 220px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 36 }}>
                        {entete}
                    </Box>
                )}
                {action && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>{action}</Box>}
                {repliable && (
                    <ButtonBase
                        type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOuvert(o => !o)}
                        sx={{ display: { xs: 'none', sm: 'flex' }, width: 36, height: 36, borderRadius: '10px', flexShrink: 0, color: 'text.secondary', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <ExpandMoreIcon sx={{ transition: reduit ? 'none' : 'transform 0.22s ease', transform: ouvert ? 'rotate(180deg)' : 'none' }} />
                    </ButtonBase>
                )}
            </Box>
            <Collapse in={deplie} timeout={reduit ? 0 : 240} id={idCorps}>
                <Box sx={{ height: '1px', bgcolor: 'divider' }} />
                <Box sx={{ px: marges, pt: 2, pb: 2.25, '& > :last-child': { mb: 0 } }}>
                    {children}
                </Box>
            </Collapse>
        </Card>
    );
};

export default SectionCarte;
