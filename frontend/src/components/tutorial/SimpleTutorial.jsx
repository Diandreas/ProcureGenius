/**
 * SimpleTutorial - Système de tutoriel simplifié
 * 
 * Version légère du système de tutoriel qui fonctionne sans contexte React.
 * Écoute les événements globaux et affiche les tooltips de tutoriel.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Paper,
    IconButton,
    LinearProgress,
    Fade,
    Backdrop,
    Stack,
    Chip,
    Portal,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    Close as CloseIcon,
    NavigateNext,
    NavigateBefore,
    School as TutorialIcon,
    CheckCircle,
} from '@mui/icons-material';
import Mascot from '../Mascot';

// Étapes du tutoriel
const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Bienvenue au Centre de Santé Julianna ! 🎉',
        description: 'Je suis Procury, votre assistant. Laissez-moi vous faire découvrir les principales fonctionnalités de la plateforme.',
        target: null,
        route: '/dashboard',
        showMascot: true,
    },
    {
        id: 'dashboard',
        title: 'Votre Tableau de bord',
        description: 'C\'est votre centre de commande. Vous y trouverez un aperçu de votre activité, vos alertes et vos statistiques en temps réel. Vous pouvez personnaliser ce tableau de bord en ajoutant ou supprimant des widgets.',
        target: '[data-tutorial="getting-started"]',
        route: '/dashboard',
    },
    {
        id: 'suppliers',
        title: 'Gestion des Fournisseurs',
        description: 'Ajoutez et gérez tous vos fournisseurs. Vous pouvez importer depuis Excel, scanner des cartes de visite avec l\'IA, et suivre leurs performances.',
        target: '[data-tutorial="menu-suppliers"]',
        route: '/dashboard',
        module: 'suppliers',
    },
    {
        id: 'purchase-orders',
        title: 'Bons de Commande',
        description: 'Créez des bons de commande professionnels en quelques clics. L\'assistant IA peut vous aider à rédiger le contenu et suggérer des fournisseurs.',
        target: '[data-tutorial="menu-purchase-orders"]',
        route: '/dashboard',
        module: 'purchase-orders',
    },
    {
        id: 'invoices',
        title: 'Facturation',
        description: 'Gérez vos factures clients. Créez-les rapidement, envoyez-les par email et suivez les paiements en temps réel.',
        target: '[data-tutorial="menu-invoices"]',
        route: '/dashboard',
        module: 'invoices',
    },
    {
        id: 'clients',
        title: 'Gestion des Clients',
        description: 'Suivez vos clients, leur historique d\'achats et leurs soldes impayés. Parfait pour gérer votre relation client.',
        target: '[data-tutorial="menu-clients"]',
        route: '/dashboard',
        module: 'clients',
    },
    {
        id: 'products',
        title: 'Produits & Stock',
        description: 'Gérez votre catalogue de produits et services, suivez vos niveaux de stock et recevez des alertes de réapprovisionnement.',
        target: '[data-tutorial="menu-products"]',
        route: '/dashboard',
        module: 'products',
    },
    {
        id: 'settings',
        title: 'Paramètres',
        description: 'Personnalisez votre expérience : informations entreprise, logo, paramètres fiscaux, modules activés, impression et plus encore.',
        target: '[data-tutorial="menu-settings"]',
        targetMobile: '[data-tutorial="menu-settings-profile"]',
        requireOpenMenu: true, // Indique qu'il faut ouvrir le menu profil en mobile
        route: '/dashboard',
    },
    {
        id: 'help',
        title: 'Aide & Support',
        description: 'Vous pouvez relancer ce tutoriel à tout moment en cliquant sur le bouton d\'aide dans la barre supérieure.',
        target: '[data-tutorial="help-button"]',
        route: '/dashboard',
    },
    {
        id: 'complete',
        title: 'Vous êtes prêt ! 🚀',
        description: 'Vous connaissez maintenant les bases du système CSJ. Utilisez le widget "Premiers pas" sur votre dashboard pour compléter les actions recommandées. Bonne utilisation !',
        target: null,
        route: '/dashboard',
        showMascot: true,
    },
];

const SimpleTutorial = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [isActive, setIsActive] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [steps, setSteps] = useState([]);
    const [targetRect, setTargetRect] = useState(null);
    const [targetElement, setTargetElement] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Charger les modules utilisateur et filtrer les étapes
    useEffect(() => {
        const loadUserModules = async () => {
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    setSteps(TUTORIAL_STEPS.filter(s => !s.module));
                    return;
                }

                const profileUrl = '/api/v1/accounts/profile/';
                const statsUrl = '/api/v1/dashboard/stats/';

                // Charger depuis plusieurs sources pour être sûr
                const [profileResponse, statsResponse] = await Promise.allSettled([
                    fetch(profileUrl, {
                        headers: { 'Authorization': `Token ${authToken}` },
                    }),
                    fetch(statsUrl, {
                        headers: { 'Authorization': `Token ${authToken}` },
                    }),
                ]);

                let modules = [];

                // Extraire depuis profile
                if (profileResponse.status === 'fulfilled' && profileResponse.value.ok) {
                    const profileData = await profileResponse.value.json();
                    modules = profileData.accessible_modules ||
                        profileData.preferences?.enabled_modules ||
                        profileData.enabled_modules ||
                        [];
                }

                // Extraire depuis stats (plus fiable)
                if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
                    const statsData = await statsResponse.value.json();
                    if (statsData.enabled_modules && Array.isArray(statsData.enabled_modules)) {
                        // Fusionner les modules (union)
                        modules = [...new Set([...modules, ...statsData.enabled_modules])];
                    }
                }

                console.log('[Tutorial] Modules actifs détectés:', modules);

                // Filtrer les étapes selon les modules
                const filteredSteps = TUTORIAL_STEPS.filter(step => {
                    if (!step.module) return true; // Étapes générales toujours affichées

                    // Normaliser les IDs de modules pour comparaison
                    const stepModule = step.module;
                    const normalizedModules = modules.map(m => m.replace(/-/g, '_'));
                    const normalizedStepModule = stepModule.replace(/-/g, '_');

                    return modules.includes(stepModule) ||
                        normalizedModules.includes(normalizedStepModule) ||
                        normalizedModules.includes(stepModule) ||
                        modules.includes(normalizedStepModule);
                });

                console.log('[Tutorial] Étapes filtrées:', filteredSteps.map(s => s.id));
                setSteps(filteredSteps);
            } catch (error) {
                console.error('[Tutorial] Error loading modules:', error);
                // En cas d'erreur, afficher toutes les étapes générales
                setSteps(TUTORIAL_STEPS.filter(s => !s.module));
            }
        };

        loadUserModules();
    }, []);

    // Écouter l'événement pour démarrer le tutoriel
    useEffect(() => {
        const handleStartTutorial = () => {
            setCurrentStepIndex(0);
            setIsActive(true);
        };

        window.addEventListener('start-tutorial', handleStartTutorial);
        return () => window.removeEventListener('start-tutorial', handleStartTutorial);
    }, []);

    // Fonction pour trouver l'élément cible avec retry
    const findTarget = useCallback((step, retry = 0) => {
        if (!step || !step.target) {
            setTargetRect(null);
            setTargetElement(null);
            return;
        }

        // Sur mobile, si l'étape nécessite d'ouvrir le menu profil
        if (isMobile && step.requireOpenMenu && step.targetMobile) {
            // Ouvrir le menu profil
            const profileButton = document.querySelector('[data-tutorial="profile-menu"]');
            if (profileButton && retry === 0) {
                profileButton.click();
                // Attendre que le menu s'ouvre puis chercher l'élément
                setTimeout(() => findTarget(step, 1), 300);
                return;
            }

            // Chercher dans le menu ouvert
            const menuElement = document.querySelector(step.targetMobile);
            if (menuElement && menuElement.offsetParent !== null) {
                const rect = menuElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setTargetElement(menuElement);
                    setTargetRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    });
                    console.log(`[Tutorial] ✓ Élément mobile trouvé: ${step.targetMobile}`, menuElement);
                    setRetryCount(0);
                    return;
                }
            }

            // Retry si pas encore trouvé
            if (retry < 4) {
                console.log(`[Tutorial] Élément mobile non trouvé (tentative ${retry + 1}/4): ${step.targetMobile}`);
                setRetryCount(retry + 1);
                setTimeout(() => findTarget(step, retry + 1), 500);
                return;
            }
        }

        let element = null;

        // Extraire le module ID du target (ex: "menu-suppliers" -> "suppliers")
        const moduleMatch = step.target.match(/menu-([^"]+)/);
        const moduleId = moduleMatch ? moduleMatch[1] : null;

        if (moduleId) {
            // Chercher dans le menu desktop (sidebar) - plusieurs sélecteurs possibles
            const desktopSelectors = [
                `[data-tutorial="menu-${moduleId}"]`,
                `[data-tutorial="sidebar"] [data-tutorial="menu-${moduleId}"]`,
                `[data-tutorial="sidebar"] *[data-tutorial*="${moduleId}"]`,
                `[data-tutorial="sidebar"] button[data-tutorial*="${moduleId}"]`,
                `[data-tutorial="sidebar"] a[data-tutorial*="${moduleId}"]`,
            ];

            for (const selector of desktopSelectors) {
                const found = document.querySelector(selector);
                if (found && found.offsetParent !== null) { // Vérifier que l'élément est visible
                    element = found;
                    break;
                }
            }

            // Si pas trouvé, chercher dans la mobile toolbar
            if (!element) {
                const mobileSelectors = [
                    `[data-tutorial="menu-${moduleId}"]`,
                    `*[data-tutorial*="${moduleId}"]`,
                ];

                for (const selector of mobileSelectors) {
                    // Chercher dans le bottom nav
                    const bottomNav = document.querySelector('[data-tutorial="mobile-nav"]') ||
                        document.querySelector('nav[aria-label*="navigation"]') ||
                        document.querySelector('.MuiBottomNavigation-root') ||
                        document.querySelector('[role="navigation"]');
                    if (bottomNav) {
                        const found = bottomNav.querySelector(selector);
                        if (found && found.offsetParent !== null) {
                            element = found;
                            break;
                        }
                    }
                }
            }
        }

        // Si toujours pas trouvé, utiliser le sélecteur original
        if (!element) {
            element = document.querySelector(step.target);
        }

        // Si toujours pas trouvé, essayer des sélecteurs alternatifs génériques
        if (!element && moduleId) {
            const fallbackSelectors = [
                `a[href*="${moduleId}"]`,
                `button[aria-label*="${moduleId}"]`,
                `*[aria-label*="${moduleId}"]`,
                `*[title*="${moduleId}"]`,
            ];

            for (const selector of fallbackSelectors) {
                const found = document.querySelector(selector);
                if (found && found.offsetParent !== null) {
                    element = found;
                    break;
                }
            }
        }

        if (element && element.offsetParent !== null) {
            const rect = element.getBoundingClientRect();

            // Vérifier que l'élément est visible et a une taille
            if (rect.width > 0 && rect.height > 0) {
                setTargetElement(element);
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                });

                // Scroll pour voir l'élément (seulement si nécessaire)
                const isVisible = rect.top >= -50 &&
                    rect.left >= -50 &&
                    rect.bottom <= window.innerHeight + 50 &&
                    rect.right <= window.innerWidth + 50;

                if (!isVisible) {
                    // Attendre un peu avant de scroller pour laisser le DOM se stabiliser
                    setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    }, 100);
                }

                console.log(`[Tutorial] ✓ Élément trouvé: ${step.target}`, element);
                setRetryCount(0);
            } else {
                console.warn(`[Tutorial] Élément trouvé mais invisible: ${step.target}`, element);
                setTargetRect(null);
                setTargetElement(null);
            }
        } else {
            // Retry jusqu'à 4 fois avec délai croissant
            if (retry < 4) {
                console.log(`[Tutorial] Élément non trouvé (tentative ${retry + 1}/4): ${step.target}`);
                setRetryCount(retry + 1);
                setTimeout(() => findTarget(step, retry + 1), 500 * (retry + 1));
            } else {
                console.warn(`[Tutorial] Élément non trouvé après 4 tentatives: ${step.target}`);
                setTargetRect(null);
                setTargetElement(null);
            }
        }
    }, [isMobile]);

    // Mettre à jour la position de l'élément cible
    useEffect(() => {
        if (!isActive || steps.length === 0) {
            setTargetRect(null);
            setTargetElement(null);
            return;
        }

        const step = steps[currentStepIndex];
        if (!step) return;

        // Naviguer si nécessaire
        if (step.route && location.pathname !== step.route) {
            navigate(step.route);
        }

        // Attendre que le DOM se mette à jour, puis chercher avec retry
        const timer = setTimeout(() => findTarget(step, 0), 300);

        // Utiliser MutationObserver pour détecter les changements du DOM
        const observer = new MutationObserver(() => {
            if (isActive && step) {
                findTarget(step, 0);
            }
        });

        // Observer les changements dans le body
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-tutorial', 'style', 'class'],
        });

        return () => {
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [isActive, currentStepIndex, steps, navigate, location.pathname, findTarget]);

    const handleClose = useCallback(() => {
        setIsActive(false);
        setCurrentStepIndex(0);
        setTargetRect(null);
        localStorage.setItem('tutorial_completed', 'true');
    }, []);

    const handleNext = useCallback(() => {
        // Fermer le menu profil si ouvert (en mobile)
        if (isMobile && steps[currentStepIndex]?.requireOpenMenu) {
            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) backdrop.click();
        }

        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            handleClose();
        }
    }, [currentStepIndex, steps, handleClose, isMobile]);

    const handlePrev = useCallback(() => {
        // Fermer le menu profil si ouvert (en mobile)
        if (isMobile && steps[currentStepIndex]?.requireOpenMenu) {
            const backdrop = document.querySelector('.MuiBackdrop-root');
            if (backdrop) backdrop.click();
        }

        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex, isMobile, steps]);

    if (!isActive || steps.length === 0) return null;

    const currentStep = steps[currentStepIndex];
    const isFirst = currentStepIndex === 0;
    const isLast = currentStepIndex === steps.length - 1;
    const progress = ((currentStepIndex + 1) / steps.length) * 100;

    // Calcul de la position du tooltip
    const getTooltipPosition = () => {
        // Sur mobile, toujours centrer le modal
        if (isMobile) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: 'calc(100vw - 32px)',
                width: 'calc(100vw - 32px)',
            };
        }

        // Sur desktop, positionner à côté de l'élément
        if (!targetRect) {
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        const padding = 15;
        const tooltipWidth = 380;
        const tooltipHeight = 300; // Approximate height of the tooltip

        // Calculer les positions possibles
        const positionRight = targetRect.left + targetRect.width + padding;
        const positionLeft = targetRect.left - tooltipWidth - padding;
        const positionBelow = targetRect.top + targetRect.height + padding;
        const positionAbove = targetRect.top - tooltipHeight - padding;

        // Vérifier si les positions sont valides (à l'intérieur de l'écran)
        const canPositionRight = positionRight + tooltipWidth <= window.innerWidth - 20;
        const canPositionLeft = positionLeft >= 20;
        const canPositionBelow = positionBelow + tooltipHeight <= window.innerHeight - 20;
        const canPositionAbove = positionAbove >= 20;

        // Priorité : droite > gauche > dessous > dessus
        if (canPositionRight && targetRect.left < window.innerWidth / 2) {
            const availableWidth = window.innerWidth - positionRight - 20;
            return {
                position: 'fixed',
                top: Math.max(20, Math.min(targetRect.top, window.innerHeight - tooltipHeight)),
                left: positionRight,
                maxWidth: `${Math.min(tooltipWidth, availableWidth)}px`,
            };
        } else if (canPositionLeft && targetRect.left >= window.innerWidth / 2) {
            return {
                position: 'fixed',
                top: Math.max(20, Math.min(targetRect.top, window.innerHeight - tooltipHeight)),
                left: Math.max(20, positionLeft), // Ensure minimum left position of 20px
                maxWidth: `${Math.min(tooltipWidth, positionLeft - 20)}px`, // Ensure it doesn't go beyond left margin
            };
        } else if (canPositionBelow) {
            const adjustedLeft = Math.max(20, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 20));
            return {
                position: 'fixed',
                top: positionBelow,
                left: adjustedLeft,
                maxWidth: `${Math.min(tooltipWidth, window.innerWidth - adjustedLeft - 20)}px`,
            };
        } else {
            // Position au-dessus ou centré si aucune autre position n'est valide
            const adjustedLeft = Math.max(20, Math.min(targetRect.left, window.innerWidth - tooltipWidth - 20));
            return {
                position: 'fixed',
                top: Math.max(20, positionAbove),
                left: adjustedLeft,
                maxWidth: `${Math.min(tooltipWidth, window.innerWidth - adjustedLeft - 20)}px`,
            };
        }
    };

    return (
        <Portal>
            {/* Backdrop - seulement si pas de targetRect (sinon le SVG gère le backdrop) */}
            {!targetRect && (
                <Backdrop
                    open={isActive}
                    sx={{
                        zIndex: 9997,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    }}
                />
            )}

            {/* Highlight de l'élément cible - Backdrop avec découpe */}
            {targetRect && (
                <>
                    {/* SVG pour créer un vrai trou dans le backdrop */}
                    <Box
                        component="svg"
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 9998,
                            pointerEvents: 'none',
                        }}
                    >
                        <defs>
                            <mask id="tutorial-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                <rect
                                    x={targetRect.left - 12}
                                    y={targetRect.top - 12}
                                    width={targetRect.width + 24}
                                    height={targetRect.height + 24}
                                    rx="12"
                                    fill="black"
                                />
                            </mask>
                        </defs>
                        <rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            fill="rgba(0, 0, 0, 0.85)"
                            mask="url(#tutorial-mask)"
                        />
                    </Box>

                    {/* Zone de l'élément avec fond légèrement éclairci */}
                    <Box
                        sx={{
                            position: 'fixed',
                            top: targetRect.top - 12,
                            left: targetRect.left - 12,
                            width: targetRect.width + 24,
                            height: targetRect.height + 24,
                            borderRadius: 3,
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            zIndex: 9998,
                            pointerEvents: 'none',
                            transition: 'all 0.3s ease',
                        }}
                    />

                    {/* Bordure principale animée avec effet pulsant */}
                    <Box
                        sx={{
                            position: 'fixed',
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            border: '5px solid',
                            borderColor: 'primary.main',
                            borderRadius: 2.5,
                            zIndex: 9999,
                            pointerEvents: 'none',
                            transition: 'all 0.3s ease',
                            animation: 'tutorial-pulse 2s ease-in-out infinite',
                            boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.3)',
                            '@keyframes tutorial-pulse': {
                                '0%, 100%': {
                                    transform: 'scale(1)',
                                    boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.3)',
                                },
                                '50%': {
                                    transform: 'scale(1.03)',
                                    boxShadow: '0 0 0 8px rgba(33, 150, 243, 0.5)',
                                },
                            },
                        }}
                    />

                    {/* Effet glow lumineux externe */}
                    <Box
                        sx={{
                            position: 'fixed',
                            top: targetRect.top - 12,
                            left: targetRect.left - 12,
                            width: targetRect.width + 24,
                            height: targetRect.height + 24,
                            borderRadius: 3,
                            zIndex: 9998,
                            pointerEvents: 'none',
                            transition: 'all 0.3s ease',
                            animation: 'tutorial-glow 2s ease-in-out infinite',
                            '@keyframes tutorial-glow': {
                                '0%, 100%': {
                                    boxShadow: '0 0 40px 15px rgba(33, 150, 243, 0.7), 0 0 80px 30px rgba(33, 150, 243, 0.4), inset 0 0 20px rgba(33, 150, 243, 0.2)',
                                },
                                '50%': {
                                    boxShadow: '0 0 60px 25px rgba(33, 150, 243, 0.9), 0 0 120px 50px rgba(33, 150, 243, 0.6), inset 0 0 30px rgba(33, 150, 243, 0.3)',
                                },
                            },
                        }}
                    />

                    {/* Effet de coins animés (indicateurs visuels) */}
                    {[
                        { top: -16, left: -16, rotation: 0 },
                        { top: -16, right: -16, rotation: 90 },
                        { bottom: -16, right: -16, rotation: 180 },
                        { bottom: -16, left: -16, rotation: 270 },
                    ].map((position, index) => (
                        <Box
                            key={index}
                            sx={{
                                position: 'fixed',
                                top: position.top !== undefined ? targetRect.top + position.top : undefined,
                                bottom: position.bottom !== undefined ? window.innerHeight - targetRect.bottom + position.bottom : undefined,
                                left: position.left !== undefined ? targetRect.left + position.left : undefined,
                                right: position.right !== undefined ? window.innerWidth - targetRect.right + position.right : undefined,
                                width: 32,
                                height: 32,
                                zIndex: 9999,
                                pointerEvents: 'none',
                                transform: `rotate(${position.rotation}deg)`,
                                animation: `tutorial-corner-${index} 2s ease-in-out infinite`,
                                '&::before, &::after': {
                                    content: '""',
                                    position: 'absolute',
                                    bgcolor: 'primary.main',
                                    borderRadius: '2px',
                                },
                                '&::before': {
                                    width: '100%',
                                    height: '4px',
                                    top: 0,
                                    left: 0,
                                },
                                '&::after': {
                                    width: '4px',
                                    height: '100%',
                                    top: 0,
                                    left: 0,
                                },
                                '@keyframes tutorial-corner-0': {
                                    '0%, 100%': { opacity: 1 },
                                    '25%': { opacity: 0.4 },
                                    '50%': { opacity: 1 },
                                },
                                '@keyframes tutorial-corner-1': {
                                    '0%, 100%': { opacity: 0.4 },
                                    '25%': { opacity: 1 },
                                    '50%': { opacity: 0.4 },
                                    '75%': { opacity: 1 },
                                },
                                '@keyframes tutorial-corner-2': {
                                    '0%, 100%': { opacity: 1 },
                                    '25%': { opacity: 0.4 },
                                    '50%': { opacity: 1 },
                                },
                                '@keyframes tutorial-corner-3': {
                                    '0%, 100%': { opacity: 0.4 },
                                    '25%': { opacity: 1 },
                                    '50%': { opacity: 0.4 },
                                    '75%': { opacity: 1 },
                                },
                            }}
                        />
                    ))}

                    {/* Flèche indicatrice animée (pointant vers l'élément) */}
                    <Box
                        sx={{
                            position: 'fixed',
                            top: targetRect.top - 50,
                            left: targetRect.left + targetRect.width / 2 - 20,
                            width: 40,
                            height: 40,
                            zIndex: 9999,
                            pointerEvents: 'none',
                            animation: 'tutorial-arrow 1.5s ease-in-out infinite',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                width: 0,
                                height: 0,
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                borderLeft: '12px solid transparent',
                                borderRight: '12px solid transparent',
                                borderTop: '16px solid',
                                borderTopColor: 'primary.main',
                                filter: 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.8))',
                            },
                            '@keyframes tutorial-arrow': {
                                '0%, 100%': { transform: 'translateY(0px)' },
                                '50%': { transform: 'translateY(-10px)' },
                            },
                        }}
                    />
                </>
            )}

            {/* Tooltip */}
            <Fade in={isActive}>
                <Paper
                    elevation={24}
                    sx={{
                        ...getTooltipPosition(),
                        p: isMobile ? 2 : 3,
                        maxWidth: isMobile ? 'calc(100vw - 32px)' : 'unset', // Use 'unset' to allow getTooltipPosition to control maxWidth
                        minWidth: isMobile ? 'unset' : 340,
                        width: isMobile ? 'calc(100vw - 32px)' : 'unset', // Use unset to respect the calculated width from getTooltipPosition
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        zIndex: 9999,
                    }}
                >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: isMobile ? 1.5 : 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TutorialIcon color="primary" fontSize={isMobile ? 'small' : 'medium'} />
                            <Chip
                                label={`${currentStepIndex + 1} / ${steps.length}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        </Box>
                        <IconButton size="small" onClick={handleClose}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Progress */}
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ mb: isMobile ? 1.5 : 2, borderRadius: 1, height: isMobile ? 4 : 6 }}
                    />

                    {/* Mascot (optionnel) */}
                    {currentStep.showMascot && (
                        <Box sx={{ textAlign: 'center', mb: isMobile ? 1.5 : 2 }}>
                            <Mascot pose={isLast ? 'celebration' : 'happy'} animation="bounce" size={isMobile ? 60 : 80} />
                        </Box>
                    )}

                    {/* Content */}
                    <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {currentStep.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ lineHeight: 1.6, fontSize: isMobile ? '0.875rem' : 'inherit' }}>
                        {currentStep.description}
                    </Typography>

                    {/* Actions */}
                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mt: isMobile ? 2 : 3 }}>
                        <Box>
                            {!isLast && (
                                <Button
                                    size="small"
                                    onClick={handleClose}
                                    sx={{ color: 'text.secondary' }}
                                >
                                    Passer
                                </Button>
                            )}
                        </Box>
                        <Stack direction="row" spacing={1}>
                            {!isFirst && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<NavigateBefore />}
                                    onClick={handlePrev}
                                >
                                    Précédent
                                </Button>
                            )}
                            {isLast ? (
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<CheckCircle />}
                                    onClick={handleClose}
                                    color="success"
                                >
                                    Terminer
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    size="small"
                                    endIcon={<NavigateNext />}
                                    onClick={handleNext}
                                >
                                    {isFirst ? 'Commencer' : 'Suivant'}
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            </Fade>
        </Portal>
    );
};

export default SimpleTutorial;

