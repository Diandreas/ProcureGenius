import React, { useState, useEffect } from 'react';
import { Box, Tooltip, Fade, Paper, Typography, IconButton } from '@mui/material';
import { Close, Lightbulb } from '@mui/icons-material';
import Mascot from './Mascot';

/**
 * Mascotte flottante contextuelle qui apparaît en coin d'écran
 * Change d'expression selon le contexte de l'application
 * 
 * @param {boolean} showTips - Afficher des tips au clic
 * @param {array} tips - Liste des tips à afficher
 */
function ContextualMascot({
    showTips = true,
    tips = [
        " Utilisez l'Assistant IA pour créer rapidement des documents",
        " Les raccourcis clavier accélèrent votre travail",
        " Consultez le dashboard pour suivre vos performances",
        " L'e-sourcing vous aide à comparer les offres fournisseurs",
        " Importez vos données depuis d'autres systèmes facilement",
    ]
}) {
    const [pose, setPose] = useState('happy');
    const [animation, setAnimation] = useState('float');
    const [showTip, setShowTip] = useState(false);
    const [currentTip, setCurrentTip] = useState('');
    const [isVisible, setIsVisible] = useState(true);

    // Déterminer la pose selon l'heure de la journée
    useEffect(() => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            setPose('excited'); // Matin: énergique
        } else if (hour >= 12 && hour < 18) {
            setPose('reading'); // Après-midi: concentré
        } else if (hour >= 18 && hour < 22) {
            setPose('happy'); // Soirée: satisfait
        } else {
            setPose('thinking'); // Nuit: pensif
        }
    }, []);

    // Écouter les événements globaux pour changer l'expression
    useEffect(() => {
        const handleSuccess = () => {
            setPose('thumbup');
            setAnimation('bounce');
            setTimeout(() => {
                setPose('happy');
                setAnimation('float');
            }, 3000);
        };

        const handleError = () => {
            setPose('error');
            setAnimation('wave');
            setTimeout(() => {
                setPose('thinking');
                setAnimation('float');
            }, 3000);
        };

        window.addEventListener('mascot-success', handleSuccess);
        window.addEventListener('mascot-error', handleError);

        return () => {
            window.removeEventListener('mascot-success', handleSuccess);
            window.removeEventListener('mascot-error', handleError);
        };
    }, []);

    const handleClick = () => {
        if (showTips && tips.length > 0) {
            const randomTip = tips[Math.floor(Math.random() * tips.length)];
            setCurrentTip(randomTip);
            setShowTip(true);

            // Auto-fermer après 5 secondes
            setTimeout(() => {
                setShowTip(false);
            }, 5000);
        }
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Mascotte flottante */}
            <Tooltip title="Cliquez pour un conseil !" arrow placement="right">
                <Box
                    onClick={handleClick}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        left: 24,
                        zIndex: 999,
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease, opacity 0.3s ease',
                        '&:hover': {
                            transform: 'scale(1.05)',
                            opacity: 1,
                        },
                        '&:active': {
                            transform: 'scale(0.98)',
                        },
                        opacity: 0.9,
                    }}
                >
                    <Mascot
                        pose={pose}
                        animation={animation}
                        size={70}
                    />
                </Box>
            </Tooltip>

            {/* Bulle de conseil */}
            <Fade in={showTip}>
                <Paper
                    elevation={6}
                    sx={{
                        position: 'fixed',
                        bottom: 110,
                        left: 24,
                        zIndex: 1000,
                        maxWidth: 320,
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Lightbulb sx={{ color: '#fbbf24', fontSize: 24, mt: 0.5 }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
                                {currentTip}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={() => setShowTip(false)}
                            sx={{
                                color: 'white',
                                ml: 1,
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Flèche pointant vers la mascotte */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: -8,
                            left: 30,
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid #764ba2',
                        }}
                    />
                </Paper>
            </Fade>
        </>
    );
}

export default ContextualMascot;

