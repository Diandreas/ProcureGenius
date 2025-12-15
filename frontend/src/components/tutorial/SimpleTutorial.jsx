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
    title: 'Bienvenue sur ProcureGenius ! 🎉',
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
    description: 'Vous connaissez maintenant les bases de ProcureGenius. Utilisez le widget "Premiers pas" sur votre dashboard pour compléter les actions recommandées. Bonne utilisation !',
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

        // Charger depuis plusieurs sources pour être sûr
        const [profileResponse, statsResponse] = await Promise.allSettled([
          fetch('/api/v1/accounts/profile/', {
            headers: { 'Authorization': `Token ${authToken}` },
          }),
          fetch('/api/v1/dashboard/stats/', {
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
  }, []);

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
  }, [currentStepIndex, steps.length, handleClose, isMobile, steps]);

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
    
    // Si l'élément est à gauche, mettre le tooltip à droite
    if (targetRect.left < window.innerWidth / 2) {
      return {
        position: 'fixed',
        top: Math.max(20, Math.min(targetRect.top, window.innerHeight - 300)),
        left: targetRect.left + targetRect.width + padding,
      };
    }
    
    // Sinon, mettre le tooltip en dessous ou au-dessus
    return {
      position: 'fixed',
      top: Math.min(targetRect.top + targetRect.height + padding, window.innerHeight - 300),
      left: Math.max(20, targetRect.left - tooltipWidth / 2),
    };
  };

  return (
    <Portal>
      {/* Backdrop */}
      <Backdrop
        open={isActive}
        sx={{
          zIndex: 9997,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
        }}
      />

      {/* Highlight de l'élément cible */}
      {targetRect && (
        <>
          {/* Overlay sombre avec découpe */}
          <Box
            sx={{
              position: 'fixed',
              top: targetRect.top - 12,
              left: targetRect.left - 12,
              width: targetRect.width + 24,
              height: targetRect.height + 24,
              borderRadius: 3,
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75)`,
              zIndex: 9998,
              pointerEvents: 'none',
              transition: 'all 0.3s ease',
            }}
          />
          
          {/* Bordure principale animée */}
          <Box
            sx={{
              position: 'fixed',
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              border: '4px solid',
              borderColor: 'primary.main',
              borderRadius: 2.5,
              zIndex: 9998,
              pointerEvents: 'none',
              transition: 'all 0.3s ease',
              animation: 'tutorial-pulse 2s ease-in-out infinite',
              '@keyframes tutorial-pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.02)',
                  opacity: 0.9,
                },
              },
            }}
          />
          
          {/* Effet glow externe */}
          <Box
            sx={{
              position: 'fixed',
              top: targetRect.top - 10,
              left: targetRect.left - 10,
              width: targetRect.width + 20,
              height: targetRect.height + 20,
              borderRadius: 3,
              boxShadow: '0 0 30px 10px rgba(33, 150, 243, 0.6), 0 0 60px 20px rgba(33, 150, 243, 0.3)',
              zIndex: 9997,
              pointerEvents: 'none',
              transition: 'all 0.3s ease',
              animation: 'tutorial-glow 2s ease-in-out infinite',
              '@keyframes tutorial-glow': {
                '0%, 100%': {
                  boxShadow: '0 0 30px 10px rgba(33, 150, 243, 0.6), 0 0 60px 20px rgba(33, 150, 243, 0.3)',
                },
                '50%': {
                  boxShadow: '0 0 40px 15px rgba(33, 150, 243, 0.8), 0 0 80px 30px rgba(33, 150, 243, 0.5)',
                },
              },
            }}
          />
          
          {/* Effet de coins animés */}
          {[
            { top: -12, left: -12 },
            { top: -12, right: -12 },
            { bottom: -12, left: -12 },
            { bottom: -12, right: -12 },
          ].map((position, index) => (
            <Box
              key={index}
              sx={{
                position: 'fixed',
                top: position.top !== undefined ? targetRect.top + position.top : undefined,
                bottom: position.bottom !== undefined ? window.innerHeight - targetRect.bottom + position.bottom : undefined,
                left: position.left !== undefined ? targetRect.left + position.left : undefined,
                right: position.right !== undefined ? window.innerWidth - targetRect.right + position.right : undefined,
                width: 24,
                height: 24,
                border: '4px solid',
                borderColor: 'primary.main',
                borderRadius: '50%',
                zIndex: 9999,
                pointerEvents: 'none',
                bgcolor: 'primary.main',
                animation: `tutorial-corner-${index} 2s ease-in-out infinite`,
                '@keyframes tutorial-corner-0': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(0.8)', opacity: 0.6 },
                },
                '@keyframes tutorial-corner-1': {
                  '0%, 100%': { transform: 'scale(0.8)', opacity: 0.6 },
                  '50%': { transform: 'scale(1)', opacity: 1 },
                },
                '@keyframes tutorial-corner-2': {
                  '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(0.8)', opacity: 0.6 },
                },
                '@keyframes tutorial-corner-3': {
                  '0%, 100%': { transform: 'scale(0.8)', opacity: 0.6 },
                  '50%': { transform: 'scale(1)', opacity: 1 },
                },
              }}
            />
          ))}
        </>
      )}

      {/* Tooltip */}
      <Fade in={isActive}>
        <Paper
          elevation={24}
          sx={{
            ...getTooltipPosition(),
            p: isMobile ? 2 : 3,
            maxWidth: isMobile ? 'calc(100vw - 32px)' : 400,
            minWidth: isMobile ? 'unset' : 340,
            width: isMobile ? 'calc(100vw - 32px)' : 'auto',
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

