/**
 * TutorialProvider - Système de tutoriel walkthrough interactif
 * 
 * Fournit un contexte global pour le système de tutoriel guidé
 * avec des étapes interactives qui mettent en surbrillance les éléments de l'interface
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext,
  NavigateBefore,
  School as TutorialIcon,
  CheckCircle,
  PlayArrow,
  SkipNext,
} from '@mui/icons-material';

// Contexte du tutoriel
const TutorialContext = createContext();

// Hook pour utiliser le tutoriel
export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

// Étapes du tutoriel par défaut
const DEFAULT_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenue au Centre de Santé Julianna ! 🎉',
    description: 'Je suis Procury, votre assistant. Je vais vous faire découvrir les principales fonctionnalités de la plateforme.',
    target: null, // Pas de cible spécifique
    route: '/dashboard',
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Le Tableau de bord',
    description: 'C\'est votre centre de commande. Vous y trouverez un aperçu de votre activité, vos alertes et vos statistiques en temps réel.',
    target: '[data-tutorial="dashboard"]',
    route: '/dashboard',
    position: 'bottom',
  },
  {
    id: 'sidebar',
    title: 'Le Menu latéral',
    description: 'Naviguez facilement entre les différents modules de l\'application. Les modules affichés dépendent de votre configuration.',
    target: '[data-tutorial="sidebar"]',
    route: '/dashboard',
    position: 'right',
  },
  {
    id: 'suppliers',
    title: 'Gestion des Fournisseurs',
    description: 'Ajoutez et gérez vos fournisseurs. Vous pouvez importer depuis Excel, scanner des cartes de visite, et suivre leurs performances.',
    target: '[data-tutorial="menu-suppliers"]',
    route: '/suppliers',
    position: 'right',
    module: 'suppliers',
  },
  {
    id: 'purchase-orders',
    title: 'Bons de Commande',
    description: 'Créez des bons de commande professionnels en quelques clics. L\'IA peut vous aider à rédiger le contenu.',
    target: '[data-tutorial="menu-purchase-orders"]',
    route: '/purchase-orders',
    position: 'right',
    module: 'purchase-orders',
  },
  {
    id: 'invoices',
    title: 'Facturation',
    description: 'Gérez vos factures clients. Envoyez-les par email et suivez les paiements en temps réel.',
    target: '[data-tutorial="menu-invoices"]',
    route: '/invoices',
    position: 'right',
    module: 'invoices',
  },
  {
    id: 'clients',
    title: 'Gestion des Clients',
    description: 'Suivez vos clients, leur historique d\'achats et leurs soldes impayés.',
    target: '[data-tutorial="menu-clients"]',
    route: '/clients',
    position: 'right',
    module: 'clients',
  },
  {
    id: 'products',
    title: 'Produits & Stock',
    description: 'Gérez votre catalogue de produits, suivez vos stocks et recevez des alertes de réapprovisionnement.',
    target: '[data-tutorial="menu-products"]',
    route: '/products',
    position: 'right',
    module: 'products',
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Personnalisez votre expérience : informations entreprise, modules, impression, notifications et plus encore.',
    target: '[data-tutorial="menu-settings"]',
    route: '/settings',
    position: 'right',
  },
  {
    id: 'ai-assistant',
    title: 'Assistant IA 🤖',
    description: 'Votre assistant intelligent peut répondre à vos questions, générer des documents et vous aider dans vos tâches quotidiennes.',
    target: '[data-tutorial="ai-button"]',
    route: '/dashboard',
    position: 'left',
  },
  {
    id: 'complete',
    title: 'Vous êtes prêt ! 🚀',
    description: 'Vous connaissez maintenant les bases du système CSJ. N\'hésitez pas à explorer et à relancer ce tutoriel depuis le menu d\'aide si besoin.',
    target: null,
    route: '/dashboard',
    position: 'center',
  },
];

// Composant Tooltip du tutoriel
const TutorialTooltip = ({ 
  step, 
  currentStep, 
  totalSteps, 
  onNext, 
  onPrev, 
  onClose, 
  onSkip,
  position 
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'center':
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
        };
      case 'bottom':
        return {
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'top':
        return {
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'right':
        return {
          position: 'absolute',
          left: 'calc(100% + 10px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'left':
        return {
          position: 'absolute',
          right: 'calc(100% + 10px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <Paper
      elevation={12}
      sx={{
        ...getPositionStyles(),
        p: 3,
        maxWidth: 400,
        minWidth: 320,
        borderRadius: 3,
        bgcolor: 'background.paper',
        zIndex: 9999,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TutorialIcon color="primary" />
          <Chip 
            label={`${currentStep + 1} / ${totalSteps}`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Progress */}
      <LinearProgress 
        variant="determinate" 
        value={((currentStep + 1) / totalSteps) * 100} 
        sx={{ mb: 2, borderRadius: 1, height: 6 }}
      />

      {/* Content */}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
        {step.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {step.description}
      </Typography>

      {/* Actions */}
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
        <Box>
          {!isLast && (
            <Button 
              size="small" 
              onClick={onSkip}
              sx={{ color: 'text.secondary' }}
            >
              Passer le tutoriel
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {!isFirst && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<NavigateBefore />}
              onClick={onPrev}
            >
              Précédent
            </Button>
          )}
          {isLast ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<CheckCircle />}
              onClick={onClose}
              color="success"
            >
              Terminer
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              endIcon={<NavigateNext />}
              onClick={onNext}
            >
              {isFirst ? 'Commencer' : 'Suivant'}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

// Provider principal
export const TutorialProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tutorialSteps, setTutorialSteps] = useState(DEFAULT_TUTORIAL_STEPS);
  const [userModules, setUserModules] = useState([]);
  const [targetElement, setTargetElement] = useState(null);

  // Charger les modules de l'utilisateur
  useEffect(() => {
    const loadUserModules = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        const response = await fetch('/api/v1/accounts/profile/', {
          headers: { 'Authorization': `Token ${authToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          const modules = data.preferences?.enabled_modules || data.accessible_modules || [];
          setUserModules(modules);
          
          // Filtrer les étapes selon les modules activés
          const filteredSteps = DEFAULT_TUTORIAL_STEPS.filter(step => {
            if (!step.module) return true; // Étapes générales
            return modules.includes(step.module);
          });
          setTutorialSteps(filteredSteps);
        }
      } catch (error) {
        console.error('Error loading user modules for tutorial:', error);
      }
    };

    loadUserModules();
  }, []);

  // Mettre à jour l'élément cible quand l'étape change
  useEffect(() => {
    if (!isActive) {
      setTargetElement(null);
      return;
    }

    const step = tutorialSteps[currentStepIndex];
    if (!step) return;

    // Naviguer vers la route si nécessaire
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
      // Attendre que la page charge avant de chercher l'élément
      setTimeout(() => {
        if (step.target) {
          const element = document.querySelector(step.target);
          setTargetElement(element);
        } else {
          setTargetElement(null);
        }
      }, 500);
    } else {
      if (step.target) {
        const element = document.querySelector(step.target);
        setTargetElement(element);
      } else {
        setTargetElement(null);
      }
    }
  }, [isActive, currentStepIndex, tutorialSteps, navigate, location.pathname]);

  // Démarrer le tutoriel
  const startTutorial = useCallback((customSteps = null) => {
    if (customSteps) {
      setTutorialSteps(customSteps);
    }
    setCurrentStepIndex(0);
    setIsActive(true);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('tutorial_in_progress', 'true');
  }, []);

  // Arrêter le tutoriel
  const stopTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setTargetElement(null);
    localStorage.removeItem('tutorial_in_progress');
    
    // Marquer comme complété
    localStorage.setItem('tutorial_completed', 'true');
  }, []);

  // Passer à l'étape suivante
  const nextStep = useCallback(() => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopTutorial();
    }
  }, [currentStepIndex, tutorialSteps.length, stopTutorial]);

  // Revenir à l'étape précédente
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Aller à une étape spécifique
  const goToStep = useCallback((stepIndex) => {
    if (stepIndex >= 0 && stepIndex < tutorialSteps.length) {
      setCurrentStepIndex(stepIndex);
    }
  }, [tutorialSteps.length]);

  const currentStep = tutorialSteps[currentStepIndex];

  const value = {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: tutorialSteps.length,
    startTutorial,
    stopTutorial,
    nextStep,
    prevStep,
    goToStep,
    userModules,
    isTutorialCompleted: localStorage.getItem('tutorial_completed') === 'true',
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
      
      {/* Overlay du tutoriel */}
      {isActive && (
        <>
          {/* Backdrop avec trou pour l'élément cible */}
          <Backdrop
            open={isActive}
            sx={{
              zIndex: 9997,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
          />
          
          {/* Surbrillance de l'élément cible */}
          {targetElement && (
            <Box
              sx={{
                position: 'fixed',
                top: targetElement.getBoundingClientRect().top - 5,
                left: targetElement.getBoundingClientRect().left - 5,
                width: targetElement.getBoundingClientRect().width + 10,
                height: targetElement.getBoundingClientRect().height + 10,
                border: '3px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                zIndex: 9998,
                pointerEvents: 'none',
                transition: 'all 0.3s ease',
              }}
            />
          )}
          
          {/* Tooltip */}
          <Fade in={isActive}>
            <Box sx={{ position: targetElement ? 'relative' : 'fixed', zIndex: 9999 }}>
              {targetElement ? (
                <Box
                  sx={{
                    position: 'fixed',
                    top: targetElement.getBoundingClientRect().bottom + 15,
                    left: Math.min(
                      Math.max(targetElement.getBoundingClientRect().left, 20),
                      window.innerWidth - 420
                    ),
                    zIndex: 9999,
                  }}
                >
                  <TutorialTooltip
                    step={currentStep}
                    currentStep={currentStepIndex}
                    totalSteps={tutorialSteps.length}
                    onNext={nextStep}
                    onPrev={prevStep}
                    onClose={stopTutorial}
                    onSkip={stopTutorial}
                    position="bottom"
                  />
                </Box>
              ) : (
                <TutorialTooltip
                  step={currentStep}
                  currentStep={currentStepIndex}
                  totalSteps={tutorialSteps.length}
                  onNext={nextStep}
                  onPrev={prevStep}
                  onClose={stopTutorial}
                  onSkip={stopTutorial}
                  position="center"
                />
              )}
            </Box>
          </Fade>
        </>
      )}
    </TutorialContext.Provider>
  );
};

export default TutorialProvider;

