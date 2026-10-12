import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Portal,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowForward,
  ArrowBack,
  CheckRounded,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// ─── Tutorial steps ───────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    titleKey: 'onboarding:tutorial.simple.welcome.title',
    descriptionKey: 'onboarding:tutorial.simple.welcome.description',
    target: null,
    route: '/dashboard',
    icon: '',
  },
  {
    id: 'dashboard',
    titleKey: 'onboarding:tutorial.simple.dashboard.title',
    descriptionKey: 'onboarding:tutorial.simple.dashboard.description',
    target: '[data-tutorial="menu-dashboard"]',
    route: '/dashboard',
    icon: '',
  },
  {
    id: 'suppliers',
    titleKey: 'onboarding:tutorial.simple.suppliers.title',
    descriptionKey: 'onboarding:tutorial.simple.suppliers.description',
    target: '[data-tutorial="menu-suppliers"]',
    route: '/dashboard',
    module: 'suppliers',
    icon: '',
  },
  {
    id: 'purchase-orders',
    titleKey: 'onboarding:tutorial.simple.purchaseOrders.title',
    descriptionKey: 'onboarding:tutorial.simple.purchaseOrders.description',
    target: '[data-tutorial="menu-purchase-orders"]',
    route: '/dashboard',
    module: 'purchase-orders',
    icon: '',
  },
  {
    id: 'invoices',
    titleKey: 'onboarding:tutorial.simple.invoices.title',
    descriptionKey: 'onboarding:tutorial.simple.invoices.description',
    target: '[data-tutorial="menu-invoices"]',
    route: '/dashboard',
    module: 'invoices',
    icon: '',
  },
  {
    id: 'products',
    titleKey: 'onboarding:tutorial.simple.products.title',
    descriptionKey: 'onboarding:tutorial.simple.products.description',
    target: '[data-tutorial="menu-products"]',
    route: '/dashboard',
    module: 'products',
    icon: '',
  },
  {
    id: 'contracts',
    titleKey: 'onboarding:tutorial.simple.contracts.title',
    descriptionKey: 'onboarding:tutorial.simple.contracts.description',
    target: '[data-tutorial="menu-contracts"]',
    route: '/dashboard',
    module: 'contracts',
    icon: '',
  },
  {
    id: 'accounting',
    titleKey: 'onboarding:tutorial.simple.accounting.title',
    descriptionKey: 'onboarding:tutorial.simple.accounting.description',
    target: '[data-tutorial="menu-accounting"]',
    route: '/dashboard',
    module: 'accounting',
    icon: '',
  },
  {
    id: 'ai-assistant',
    titleKey: 'onboarding:tutorial.simple.aiAssistant.title',
    descriptionKey: 'onboarding:tutorial.simple.aiAssistant.description',
    target: '[data-tutorial="menu-ai-assistant"]',
    route: '/dashboard',
    module: 'ai-assistant',
    icon: '',
  },
  {
    id: 'settings',
    titleKey: 'onboarding:tutorial.simple.settings.title',
    descriptionKey: 'onboarding:tutorial.simple.settings.description',
    target: '[data-tutorial="menu-settings"]',
    route: '/dashboard',
    icon: '',
  },
  {
    id: 'complete',
    titleKey: 'onboarding:tutorial.simple.complete.title',
    descriptionKey: 'onboarding:tutorial.simple.complete.description',
    target: null,
    route: '/dashboard',
    icon: '',
  },
];

// ─── Spotlight SVG overlay ────────────────────────────────────────
const Spotlight = ({ targetRect }) => {
  if (!targetRect) return null;
  const pad = 10;
  const rx = 10;
  return (
    <Box
      component="svg"
      sx={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 9997, pointerEvents: 'none',
      }}
    >
      <defs>
        <mask id="spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x={targetRect.left - pad}
            y={targetRect.top - pad}
            width={targetRect.width + pad * 2}
            height={targetRect.height + pad * 2}
            rx={rx}
            fill="black"
          />
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#spotlight-mask)" />
      {/* Highlight ring */}
      <rect
        x={targetRect.left - pad}
        y={targetRect.top - pad}
        width={targetRect.width + pad * 2}
        height={targetRect.height + pad * 2}
        rx={rx}
        fill="none"
        stroke="rgba(37,99,235,0.7)"
        strokeWidth="2"
      />
    </Box>
  );
};

// ─── Step indicator dots ──────────────────────────────────────────
const StepDots = ({ total, current }) => (
  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
    {Array.from({ length: total }).map((_, i) => (
      <Box
        key={i}
        sx={{
          width: i === current ? 20 : 6,
          height: 6,
          borderRadius: 3,
          bgcolor: i === current
            ? 'primary.main'
            : i < current
              ? alpha('#2563eb', 0.35)
              : 'rgba(0,0,0,0.12)',
          transition: 'all 0.3s ease',
        }}
      />
    ))}
  </Box>
);

// ─── Main component ───────────────────────────────────────────────
const SimpleTutorial = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslation(['onboarding', 'common']);

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({});
  const [direction, setDirection] = useState(1);

  // ── Load modules & filter steps ──────────────────────────────
  useEffect(() => {
    const loadSteps = async () => {
      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setSteps(TUTORIAL_STEPS.filter(s => !s.module));
          return;
        }
        const [profileRes, statsRes] = await Promise.allSettled([
          fetch('/api/v1/accounts/profile/', { headers: { Authorization: `Token ${authToken}` } }),
          fetch('/api/v1/dashboard/stats/', { headers: { Authorization: `Token ${authToken}` } }),
        ]);

        let modules = [];
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
          const d = await profileRes.value.json();
          modules = d.accessible_modules || d.preferences?.enabled_modules || d.enabled_modules || [];
        }
        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const d = await statsRes.value.json();
          if (d.enabled_modules) modules = [...new Set([...modules, ...d.enabled_modules])];
        }

        const filtered = TUTORIAL_STEPS.filter(step => {
          if (!step.module) return true;
          const norm = (s) => s.replace(/-/g, '_');
          return modules.some(m => norm(m) === norm(step.module) || m === step.module);
        });
        setSteps(filtered);
      } catch {
        setSteps(TUTORIAL_STEPS.filter(s => !s.module));
      }
    };
    loadSteps();
  }, []);

  // ── Auto-launch on first login ────────────────────────────────
  useEffect(() => {
    if (steps.length === 0) return;
    const alreadySeen = localStorage.getItem('tutorial_completed') === 'true'
      || localStorage.getItem('tutorial_seen') === 'true';
    if (!alreadySeen) {
      // Small delay to let the dashboard render first
      const t = setTimeout(() => {
        localStorage.setItem('tutorial_seen', 'true');
        setCurrentStepIndex(0);
        setDirection(1);
        setIsActive(true);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [steps]);

  // ── Listen for manual trigger ─────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setCurrentStepIndex(0);
      setDirection(1);
      setIsActive(true);
    };
    window.addEventListener('start-tutorial', handler);
    return () => window.removeEventListener('start-tutorial', handler);
  }, []);

  // ── Find target element & compute tooltip position ────────────
  const computePositions = useCallback((step, retries = 0) => {
    if (!step?.target) {
      setTargetRect(null);
      setTooltipPos(isMobile
        ? { position: 'fixed', bottom: 24, left: 16, right: 16 }
        : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      );
      return;
    }

    // Plusieurs éléments peuvent partager le même data-tutorial (menu latéral
    // caché sur mobile + barre de navigation mobile visible) : on choisit le
    // premier élément RÉELLEMENT visible, sinon le spotlight ne s'affiche pas
    // sur mobile (offsetParent du drawer caché === null).
    const candidates = Array.from(document.querySelectorAll(step.target));
    const el = candidates.find(c => c.offsetParent !== null && c.getBoundingClientRect().width > 0) || candidates[0];
    if (!el || el.offsetParent === null) {
      if (retries < 5) setTimeout(() => computePositions(step, retries + 1), 400 * (retries + 1));
      else {
        setTargetRect(null);
        setTooltipPos(isMobile
          ? { position: 'fixed', bottom: 24, left: 16, right: 16 }
          : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        );
      }
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0) {
      if (retries < 5) setTimeout(() => computePositions(step, retries + 1), 400);
      return;
    }

    setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

    // Scroll element into view if needed
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!visible) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Calculate tooltip position
    if (isMobile) {
      setTooltipPos({ position: 'fixed', bottom: 24, left: 16, right: 16 });
      return;
    }

    const TW = 380, TH = 260, PAD = 20;
    const spaceRight = window.innerWidth - rect.right - PAD;
    const spaceLeft = rect.left - PAD;
    const spaceBelow = window.innerHeight - rect.bottom - PAD;
    const spaceAbove = rect.top - PAD;

    let pos = {};
    if (spaceRight >= TW) {
      pos = {
        position: 'fixed',
        top: Math.max(PAD, Math.min(rect.top, window.innerHeight - TH - PAD)),
        left: rect.right + PAD,
        width: Math.min(TW, spaceRight),
      };
    } else if (spaceLeft >= TW) {
      pos = {
        position: 'fixed',
        top: Math.max(PAD, Math.min(rect.top, window.innerHeight - TH - PAD)),
        left: Math.max(PAD, rect.left - TW - PAD),
        width: Math.min(TW, spaceLeft),
      };
    } else if (spaceBelow >= TH) {
      pos = {
        position: 'fixed',
        top: rect.bottom + PAD,
        left: Math.max(PAD, Math.min(rect.left, window.innerWidth - TW - PAD)),
        width: TW,
      };
    } else {
      pos = {
        position: 'fixed',
        top: Math.max(PAD, rect.top - TH - PAD),
        left: Math.max(PAD, Math.min(rect.left, window.innerWidth - TW - PAD)),
        width: TW,
      };
    }
    setTooltipPos(pos);
  }, [isMobile]);

  useEffect(() => {
    if (!isActive || steps.length === 0) return;
    const step = steps[currentStepIndex];
    if (!step) return;
    if (step.route && location.pathname !== step.route) navigate(step.route);
    const timer = setTimeout(() => computePositions(step), 350);
    return () => clearTimeout(timer);
  }, [isActive, currentStepIndex, steps, location.pathname, navigate, computePositions]);

  const handleClose = useCallback(() => {
    setIsActive(false);
    setTargetRect(null);
    localStorage.setItem('tutorial_completed', 'true');
  }, []);

  const handleNext = useCallback(() => {
    setDirection(1);
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex(i => i + 1);
    else handleClose();
  }, [currentStepIndex, steps.length, handleClose]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    if (currentStepIndex > 0) setCurrentStepIndex(i => i - 1);
  }, [currentStepIndex]);

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const cardVariants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 32 : -32 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d > 0 ? -32 : 32 }),
  };

  return (
    <Portal>
      {/* Spotlight */}
      <Spotlight targetRect={targetRect} />
      {!targetRect && (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.72)', zIndex: 9997, pointerEvents: 'none' }} />
      )}

      {/* Tooltip card */}
      <Box
        sx={{
          ...tooltipPos,
          zIndex: 9999,
          pointerEvents: 'all',
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Box sx={{
              bgcolor: isDark ? '#1e2530' : '#ffffff',
              borderRadius: 3,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isDark
                ? '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 24px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}>
              {/* Progress bar */}
              <Box sx={{ height: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <Box sx={{
                  height: '100%',
                  width: `${progress}%`,
                  bgcolor: 'primary.main',
                  transition: 'width 0.4s ease',
                  borderRadius: 2,
                }} />
              </Box>

              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 2.5,
                      bgcolor: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', flexShrink: 0,
                    }}>
                      {step.icon}
                    </Box>
                    <Box>
                      <Typography sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'primary.main',
                        mb: 0.1,
                      }}>
                        {t('onboarding:tutorial.stepOf', { current: currentStepIndex + 1, total: steps.length })}
                      </Typography>
                      <Typography sx={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        lineHeight: 1.2,
                      }}>
                        {t(step.titleKey)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={handleClose}
                    sx={{
                      color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                      '&:hover': { color: isDark ? '#fff' : '#0f172a' },
                      p: 0.5,
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>

                {/* Description */}
                <Typography sx={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  fontSize: '0.875rem',
                  lineHeight: 1.65,
                  mb: 3,
                }}>
                  {t(step.descriptionKey)}
                </Typography>

                {/* Footer */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <StepDots total={steps.length} current={currentStepIndex} />

                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {!isFirst && (
                      <IconButton
                        size="small"
                        onClick={handlePrev}
                        sx={{
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                          borderRadius: 2, p: 0.75,
                          color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                        }}
                      >
                        <ArrowBack sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disableElevation
                      endIcon={isLast ? <CheckRounded sx={{ fontSize: 16 }} /> : <ArrowForward sx={{ fontSize: 16 }} />}
                      sx={{
                        bgcolor: 'primary.main',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 2.5,
                        py: 0.9,
                        boxShadow: `0 4px 14px ${alpha('#2563eb', 0.35)}`,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          boxShadow: `0 6px 20px ${alpha('#2563eb', 0.45)}`,
                        },
                      }}
                    >
                      {isFirst ? t('onboarding:actions.start') : isLast ? t('onboarding:actions.finish') : t('onboarding:actions.next')}
                    </Button>
                    {!isLast && (
                      <Button
                        size="small"
                        onClick={handleClose}
                        sx={{
                          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                          textTransform: 'none',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          '&:hover': { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
                        }}
                      >
                        {t('onboarding:actions.skip')}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Portal>
  );
};

export default SimpleTutorial;
