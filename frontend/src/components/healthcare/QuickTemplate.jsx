import React, { useState } from 'react';
import { Box, Chip, Collapse, Button, Tooltip } from '@mui/material';
import { Lightbulb as LightbulbIcon, ExpandMore as ExpandIcon, ExpandLess as CollapseIcon } from '@mui/icons-material';

/**
 * QuickTemplate — Raccourcis cliniques cliquables
 * S'adapte automatiquement au thème light/dark.
 *
 * Props:
 *  - label: string — Titre du bouton toggle
 *  - templates: string[] — Textes à proposer
 *  - onSelect: (value: string) => void — Callback lors d'un clic
 */
const QuickTemplate = ({ label = 'Suggestions', templates = [], onSelect }) => {
    const [open, setOpen] = useState(false);

    if (!templates.length) return null;

    return (
        <Box sx={{ mt: 0.5, mb: 0.5 }}>
            <Button
                size="small"
                onClick={() => setOpen(o => !o)}
                startIcon={
                    <LightbulbIcon sx={{ fontSize: '14px !important', color: open ? 'warning.main' : 'text.disabled' }} />
                }
                endIcon={open
                    ? <CollapseIcon sx={{ fontSize: '14px !important' }} />
                    : <ExpandIcon sx={{ fontSize: '14px !important' }} />
                }
                sx={{
                    fontSize: '0.7rem',
                    py: 0.2,
                    px: 0.75,
                    minWidth: 0,
                    textTransform: 'none',
                    color: open ? 'primary.main' : 'text.disabled',
                    fontWeight: open ? 600 : 400,
                    '&:hover': {
                        color: 'primary.main',
                        bgcolor: 'action.hover',
                    },
                }}
            >
                {label} ({templates.length})
            </Button>

            <Collapse in={open}>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        mt: 0.5,
                        p: 1.25,
                        // Utilise les variables du thème — s'adapte light/dark
                        bgcolor: 'action.hover',
                        borderRadius: 1.5,
                        border: '1px dashed',
                        borderColor: 'divider',
                    }}
                >
                    {templates.map((tpl, i) => (
                        <Tooltip
                            key={i}
                            title={`Cliquer pour ajouter`}
                            arrow
                            placement="top"
                            enterDelay={800}
                        >
                            <Chip
                                label={tpl}
                                size="small"
                                clickable
                                onClick={() => onSelect(tpl)}
                                sx={{
                                    fontSize: '0.71rem',
                                    height: 24,
                                    borderRadius: 1,
                                    // Couleurs adaptées thème
                                    bgcolor: 'background.paper',
                                    color: 'text.primary',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        borderColor: 'primary.main',
                                    },
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer',
                                }}
                            />
                        </Tooltip>
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
};

export default QuickTemplate;
