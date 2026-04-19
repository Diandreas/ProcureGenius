/**
 * OnboardingChecklist - Checklist flottante d'onboarding pour nouveaux clients
 *
 * S'affiche automatiquement pour les nouveaux utilisateurs.
 * Persiste en bas à droite jusqu'à completion ou dismissal explicite.
 * Suit la progression via API + localStorage.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Portal,
  useTheme,
  alpha,
  Collapse,
} from '@mui/material';
import {
  Close,
  ExpandLess,
  ExpandMore,
  CheckRounded,
  ArrowForward,
  Business,
  People,
  ShoppingCart,
  Receipt,
  SmartToy,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Onboarding tasks definition ─────────────────────────────────
const ONBOARDING_TASKS = [
  {
    id: 'company_profile',
    icon: <Business sx={{ fontSize: 17 }} />,
    title: 'Configurer votre profil entreprise',
    subtitle: 'Nom, logo, informations légales',
    path: '/settings',
    checkKey: 'onboarding_company_done',
    apiCheck: async (token) => {
      try {
        const r = await fetch('/api/v1/accounts/profile/', { headers: { Authorization: `Token ${token}` } });
        if (!r.ok) return false;
        const d = await r.json();
        return !!(d.company_name || d.organization?.name);
      } catch { return false; }
    },
  },
  {
    id: 'first_supplier',
    icon: <People sx={{ fontSize: 17 }} />,
    title: 'Ajouter votre premier fournisseur',
    subtitle: 'Nom, contact, conditions',
    path: '/suppliers/new',
    checkKey: 'onboarding_supplier_done',
    module: 'suppliers',
    apiCheck: async (token) => {
      try {
        const r = await fetch('/api/v1/suppliers/?page_size=1', { headers: { Authorization: `Token ${token}` } });
        if (!r.ok) return false;
        const d = await r.json();
        return (d.count || d.results?.length || 0) > 0;
      } catch { return false; }
    },
  },
  {
    id: 'first_product',
    icon: <Receipt sx={{ fontSize: 17 }} />,
    title: 'Créer un produit ou service',
    subtitle: 'Référence, prix, stock initial',
    path: '/products/new',
    checkKey: 'onboarding_product_done',
    module: 'products',
    apiCheck: async (token) => {
      try {
        const r = await fetch('/api/v1/products/?page_size=1', { headers: { Authorization: `Token ${token}` } });
        if (!r.ok) return false;
        const d = await r.json();
        return (d.count || d.results?.length || 0) > 0;
      } catch { return false; }
    },
  },
  {
    id: 'first_po',
    icon: <ShoppingCart sx={{ fontSize: 17 }} />,
    title: 'Créer un bon de commande',
    subtitle: 'Votre premier achat fournisseur',
    path: '/purchase-orders/new',
    checkKey: 'onboarding_po_done',
    module: 'purchase-orders',
    apiCheck: async (token) => {
      try {
        const r = await fetch('/api/v1/purchase-orders/?page_size=1', { headers: { Authorization: `Token ${token}` } });
        if (!r.ok) return false;
        const d = await r.json();
        return (d.count || d.results?.length || 0) > 0;
      } catch { return false; }
    },
  },
  {
    id: 'explore_ai',
    icon: <SmartToy sx={{ fontSize: 17 }} />,
    title: 'Essayer l\'assistant IA',
    subtitle: 'Posez votre première question',
    path: '/ai-chat',
    checkKey: 'onboarding_ai_done',
    apiCheck: async () => false, // Manuel via localStorage uniquement
  },
];

// ─── Single task row ──────────────────────────────────────────────
const TaskRow = ({ task, done, onAction, isDark }) => (
  <Box
    onClick={() => !done && onAction(task)}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      px: 2,
      py: 1.5,
      cursor: done ? 'default' : 'pointer',
      borderRadius: 2,
      transition: 'background 0.18s',
      '&:hover': !done ? {
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(37,99,235,0.04)',
      } : {},
    }}
  >
    {/* Status circle */}
    <Box sx={{
      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: done
        ? 'rgba(16,185,129,0.12)'
        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      border: `1.5px solid ${done ? '#10b981' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)')}`,
      transition: 'all 0.25s ease',
    }}>
      {done
        ? <CheckRounded sx={{ fontSize: 13, color: '#10b981' }} />
        : <Box sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)', display: 'flex' }}>{task.icon}</Box>
      }
    </Box>

    {/* Text */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{
        fontSize: '0.825rem',
        fontWeight: done ? 500 : 600,
        color: done
          ? (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)')
          : (isDark ? '#f1f5f9' : '#0f172a'),
        textDecoration: done ? 'line-through' : 'none',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {task.title}
      </Typography>
      {!done && (
        <Typography sx={{
          fontSize: '0.72rem',
          color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)',
          lineHeight: 1.3,
        }}>
          {task.subtitle}
        </Typography>
      )}
    </Box>

    {/* Arrow */}
    {!done && (
      <ArrowForward sx={{
        fontSize: 14, flexShrink: 0,
        color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
      }} />
    )}
  </Box>
);

// ─── Main component ───────────────────────────────────────────────
export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [completedIds, setCompletedIds] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Check if we should show (new user) ───────────────────────
  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding_dismissed') === 'true';
    if (dismissed) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Show after short delay
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // ── Load & check completion state ────────────────────────────
  const checkTasks = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Load enabled modules to filter tasks
    let enabledModules = [];
    try {
      const r = await fetch('/api/v1/dashboard/stats/', { headers: { Authorization: `Token ${token}` } });
      if (r.ok) {
        const d = await r.json();
        enabledModules = d.enabled_modules || [];
      }
    } catch {}

    // Filter tasks by module availability
    const availableTasks = ONBOARDING_TASKS.filter(t =>
      !t.module || enabledModules.some(m => m.replace(/-/g, '_') === t.module.replace(/-/g, '_') || m === t.module)
    );
    setTasks(availableTasks);

    // Check completion for each task
    const completed = {};
    await Promise.all(availableTasks.map(async (task) => {
      // First check localStorage cache
      const cached = localStorage.getItem(task.checkKey);
      if (cached === 'true') {
        completed[task.id] = true;
        return;
      }
      // Then check via API
      const done = await task.apiCheck(token);
      if (done) localStorage.setItem(task.checkKey, 'true');
      completed[task.id] = done;
    }));

    setCompletedIds(completed);
    setLoading(false);

    // Auto-hide if all done
    const allDone = availableTasks.every(t => completed[t.id]);
    if (allDone) {
      setTimeout(() => {
        localStorage.setItem('onboarding_dismissed', 'true');
        setVisible(false);
      }, 3000);
    }
  }, []);

  useEffect(() => {
    if (visible) checkTasks();
  }, [visible, checkTasks]);

  // Re-check when user navigates back to dashboard
  useEffect(() => {
    const handler = () => { if (visible) checkTasks(); };
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [visible, checkTasks]);

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setVisible(false);
  };

  const handleAction = (task) => {
    navigate(task.path);
    // Mark AI task as done when navigated to
    if (task.id === 'explore_ai') {
      localStorage.setItem(task.checkKey, 'true');
      setCompletedIds(prev => ({ ...prev, [task.id]: true }));
    }
  };

  const doneCount = tasks.filter(t => completedIds[t.id]).length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  if (!visible || total === 0) return null;

  return (
    <Portal>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1200,
              width: 320,
              maxHeight: '80vh',
              pointerEvents: 'all',
            }}
          >
            <Box sx={{
              bgcolor: isDark ? '#1e2530' : '#ffffff',
              borderRadius: 3,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isDark
                ? '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                : '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <Box sx={{
                px: 2.5, py: 2,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
              }} onClick={() => setExpanded(e => !e)}>
                {/* Progress ring */}
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke="#2563eb" strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 14}`}
                      strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                    <text x="18" y="22" textAnchor="middle"
                      fontSize="9" fontWeight="700"
                      fill={isDark ? '#f1f5f9' : '#0f172a'}
                    >
                      {progress}%
                    </text>
                  </svg>
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    lineHeight: 1.2,
                  }}>
                    Démarrage rapide
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.72rem',
                    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)',
                    mt: 0.25,
                  }}>
                    {doneCount}/{total} tâches complétées
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', p: 0.5 }}
                  >
                    {expanded ? <ExpandMore sx={{ fontSize: 18 }} /> : <ExpandLess sx={{ fontSize: 18 }} />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', p: 0.5 }}
                  >
                    <Close sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Task list */}
              <Collapse in={expanded}>
                <Box sx={{ py: 1, maxHeight: 340, overflowY: 'auto' }}>
                  {loading ? (
                    <Box sx={{ px: 2.5, py: 2 }}>
                      <LinearProgress sx={{ borderRadius: 2 }} />
                    </Box>
                  ) : (
                    tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        done={!!completedIds[task.id]}
                        onAction={handleAction}
                        isDark={isDark}
                      />
                    ))
                  )}
                </Box>

                {/* All done message */}
                {!loading && doneCount === total && (
                  <Box sx={{
                    mx: 2, mb: 2, p: 2,
                    bgcolor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.07)',
                    border: `1px solid ${alpha('#10b981', 0.2)}`,
                    borderRadius: 2,
                    textAlign: 'center',
                  }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981', mb: 0.25 }}>
                      🎉 Tout est en place !
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>
                      Votre espace Procura est configuré.
                    </Typography>
                  </Box>
                )}
              </Collapse>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
