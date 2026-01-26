import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Button,
  useMediaQuery,
  useTheme,
  Tooltip,
  alpha,
  Badge,
  Divider,
} from '@mui/material';
import { motion, LayoutGroup } from 'framer-motion';
import { getNeumorphicShadow } from '../styles/neumorphism/mixins';
import {
  Add,
  SupervisorAccount,
  Tune,
  Refresh,
  DarkMode,
  LightMode,
  PictureAsPdf,
  Notifications,
  Lightbulb,
  Menu as MenuIcon,
  Assignment,
} from '@mui/icons-material';
import { logout } from '../store/slices/authSlice';
import { useModules } from '../contexts/ModuleContext';
import { useColorMode } from '../App';
import MobileBottomNav from '../components/MobileBottomNav';
import ModuleActivationDialog from '../components/ModuleActivationDialog';
import IconImage from '../components/IconImage';
import TutorialButton from '../components/tutorial/TutorialButton';
import SimpleTutorial from '../components/tutorial/SimpleTutorial';
import AINotificationProvider from '../components/AI/AINotificationProvider';
import InstallPWAPrompt from '../components/InstallPWAPrompt';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
// import PeriodSelector from '../components/dashboard/PeriodSelector'; // Removed - old dashboard system

const drawerWidth = 240;

const CORE_MODULES = ['dashboard'];

function MainLayout() {
  const { t } = useTranslation(['navigation', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dashboardPeriod, setDashboardPeriod] = useState('last_30_days');
  const [aiChatStats, setAiChatStats] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { toggleColorMode, mode } = useColorMode();
  const isAIChatPage = location.pathname === '/ai-chat' || location.pathname.startsWith('/ai-chat/');

  const { modules: enabledModules, hasModule, loading: modulesLoading } = useModules();

  // Activer les raccourcis clavier
  useKeyboardShortcuts();

  useEffect(() => {
    const handlePeriodChange = (event) => {
      if (event.detail?.period) {
        setDashboardPeriod(event.detail.period);
      }
    };
    window.addEventListener('dashboard-period-change', handlePeriodChange);
    return () => window.removeEventListener('dashboard-period-change', handlePeriodChange);
  }, []);

  // Écouter les mises à jour des stats AI Chat
  useEffect(() => {
    const handleAIStatsUpdate = (event) => {
      if (event.detail?.stats) {
        setAiChatStats(event.detail.stats);
      }
    };
    window.addEventListener('ai-chat-stats-update', handleAIStatsUpdate);
    return () => window.removeEventListener('ai-chat-stats-update', handleAIStatsUpdate);
  }, []);

  // Handlers pour les boutons AI Chat
  const handleAIChatNotificationsClick = () => {
    window.dispatchEvent(new CustomEvent('ai-chat-open-notifications'));
  };

  const handleAIChatSuggestionsClick = () => {
    window.dispatchEvent(new CustomEvent('ai-chat-open-suggestions'));
  };

  const handleAIChatConversationsClick = () => {
    window.dispatchEvent(new CustomEvent('ai-chat-open-conversations'));
  };

  const handleAIChatImportReviewsClick = () => {
    navigate('/ai-chat/import-reviews');
  };

  const menuItems = [
    { text: t('navigation:menu.dashboard'), iconSrc: '/icon/dashboard.png', path: '/dashboard', moduleId: 'dashboard', isCore: true },
    { text: t('navigation:menu.suppliers'), iconSrc: '/icon/supplier.png', path: '/suppliers', moduleId: 'suppliers', isCore: false },
    { text: t('navigation:menu.purchaseOrders'), iconSrc: '/icon/purchase-order.png', path: '/purchase-orders', moduleId: 'purchase-orders', isCore: false },
    { text: t('navigation:menu.invoices'), iconSrc: '/icon/bill.png', path: '/invoices', moduleId: 'invoices', isCore: false },
    { text: t('navigation:menu.products'), iconSrc: '/icon/product.png', path: '/products', moduleId: 'products', isCore: false },
    { text: t('navigation:menu.clients'), iconSrc: '/icon/user.png', path: '/clients', moduleId: 'clients', isCore: false },
    { text: t('navigation:menu.eSourcing'), iconSrc: '/icon/market.png', path: '/e-sourcing/events', moduleId: 'e-sourcing', isCore: false },
    { text: t('navigation:menu.contracts'), iconSrc: '/icon/contract.png', path: '/contracts', moduleId: 'contracts', isCore: false },

    // Healthcare
    { text: 'Patients', iconSrc: '/icon/user.png', path: '/healthcare/patients', moduleId: 'patients', isCore: false },
    { text: 'Réception', iconSrc: '/icon/support.png', path: '/healthcare/reception', moduleId: 'reception', isCore: false },
    { text: 'Laboratoire', iconSrc: '/icon/analysis.png', path: '/healthcare/laboratory', moduleId: 'laboratory', isCore: false },
    { text: 'Pharmacie', iconSrc: '/icon/product.png', path: '/healthcare/pharmacy/inventory', moduleId: 'pharmacy', isCore: false },
    { text: 'Dispensation', iconSrc: '/icon/product.png', path: '/healthcare/pharmacy/dispensing', moduleId: 'pharmacy', isCore: false },
    { text: 'Consultations', iconSrc: '/icon/contract.png', path: '/healthcare/consultations', moduleId: 'consultations', isCore: false },

    // { text: t('navigation:menu.aiAssistant'), iconSrc: '/icon/ai-assistant.png', path: '/ai-chat', moduleId: 'dashboard', isCore: true },
  ];

  const [userPermissions, setUserPermissions] = useState(null);
  const [moduleActivationDialogOpen, setModuleActivationDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [reportAction, setReportAction] = useState(null);

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  // Écouter les événements de rapport depuis les pages
  useEffect(() => {
    const handleReportAction = (event) => {
      if (event.detail?.onClick) {
        setReportAction({
          onClick: event.detail.onClick,
          label: event.detail.label || t('navigation:topBar.report', 'Rapport PDF'),
        });
      }
    };

    const handleClearReportAction = () => {
      setReportAction(null);
    };

    window.addEventListener('register-report-action', handleReportAction);
    window.addEventListener('clear-report-action', handleClearReportAction);

    return () => {
      window.removeEventListener('register-report-action', handleReportAction);
      window.removeEventListener('clear-report-action', handleClearReportAction);
    };
  }, [t]);

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch('/api/v1/accounts/profile/', {
        headers: { 'Authorization': `Token ${localStorage.getItem('authToken')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleModuleClick = (item) => {
    if (item.isCore || hasModule(item.moduleId)) {
      navigate(item.path);
      if (isMobile) setMobileOpen(false);
    } else {
      setSelectedModule(item.moduleId);
      setModuleActivationDialogOpen(true);
    }
  };

  const handleActivateModule = async (moduleId) => {
    setModuleActivationDialogOpen(false);
    navigate('/settings/modules');
  };

  const currentModule = useMemo(() => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (path.startsWith(item.path) || path === item.path) {
        return item.moduleId;
      }
    }
    return 'dashboard';
  }, [location.pathname]);

  const getContextualActions = () => {
    const currentPath = location.pathname;

    switch (currentPath) {
      case '/dashboard':
        return {
          title: t('navigation:menu.dashboard'),
          // Actions will be set by Dashboard component itself via setContextualActions
        };
      case '/suppliers':
        return {
          title: t('navigation:menu.suppliers'),
          action: {
            label: t('navigation:topBar.newSupplier', 'Nouveau fournisseur'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/suppliers/new')
          }
        };
      case '/purchase-orders':
        return {
          title: t('navigation:menu.purchaseOrders'),
          action: {
            label: t('navigation:topBar.newPurchaseOrder', 'Nouveau bon de commande'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/purchase-orders/new')
          }
        };
      case '/invoices':
        return {
          title: t('navigation:menu.invoices'),
          action: {
            label: t('navigation:topBar.newInvoice', 'Nouvelle facture'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/invoices/new')
          }
        };
      case '/products':
        return {
          title: t('navigation:menu.products'),
          action: {
            label: t('navigation:topBar.newProduct', 'Nouveau produit'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/products/new')
          }
        };
      case '/clients':
        return {
          title: t('navigation:menu.clients'),
          action: {
            label: t('navigation:topBar.newClient', 'Nouveau client'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/clients/new')
          }
        };
      case '/e-sourcing/events':
        return {
          title: t('navigation:menu.eSourcing'),
          action: {
            label: t('navigation:topBar.newRfqEvent', 'Nouvel événement'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/e-sourcing/events/new')
          }
        };
      case '/contracts':
        return {
          title: t('navigation:menu.contracts'),
          action: {
            label: t('navigation:topBar.newContract', 'Nouveau contrat'),
            icon: <Add fontSize="small" />,
            onClick: () => navigate('/contracts/new')
          }
        };
      case '/migration/jobs':
        return { title: t('navigation:topBar.dataImport'), action: { label: t('navigation:topBar.newImport'), icon: <IconImage src="/icon/migration.png" alt="Import" size={18} />, onClick: () => navigate('/migration/wizard') } };
      case '/migration/wizard':
        return { title: t('navigation:topBar.importWizard') };
      case '/ai-chat':
        return { title: t('navigation:menu.aiAssistant'), action: { label: isMobile ? '' : t('navigation:topBar.newConversation'), icon: <Add fontSize="small" />, onClick: () => window.dispatchEvent(new CustomEvent('ai-chat-new-conversation')) } };
      case '/settings':
        return { title: t('navigation:menu.settings') };
      default:
        return { title: 'Procura' };
    }
  };

  const contextualActions = useMemo(() => getContextualActions(), [location.pathname, isMobile, dashboardPeriod]);

  const drawer = (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      bgcolor: 'background.paper',
      borderRight: `1px solid ${theme.palette.divider}`,
    }}>
      {/* Logo */}
      <Box sx={{
        px: 3,
        py: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <Box
          component="img"
          src="/main.png"
          alt="Procura"
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
          sx={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
        />
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1rem',
            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
          }}
        >
          P
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: '1.25rem',
            background: `linear-gradient(to right, ${theme.palette.text.primary}, ${theme.palette.text.secondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          Procura
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 2, px: 2 }}>
        <List disablePadding>
          {menuItems.filter(item => item.isCore || hasModule(item.moduleId)).map((item) => {
            const isSelected = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleModuleClick(item)}
                  data-tutorial={`menu-${item.moduleId}`}
                  sx={{
                    minHeight: 48,
                    px: 2,
                    borderRadius: 3,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      transform: 'translateX(4px)',
                    },
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '50%',
                        width: 4,
                        borderRadius: '0 4px 4px 0',
                        bgcolor: 'primary.main',
                      },
                      '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 700 },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                    <IconImage
                      src={item.iconSrc}
                      alt={item.text}
                      size={22}
                      withBackground={mode === 'dark'}
                      style={{ filter: isSelected ? `drop-shadow(0 2px 4px ${alpha(theme.palette.primary.main, 0.3)})` : 'none' }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'primary.main' : 'text.secondary',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Bottom Section */}
      <Box sx={{ px: 2, pb: 3 }}>
        {userPermissions?.can_manage_users && (
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              onClick={() => navigate('/settings/users')}
              sx={{
                minHeight: 48, px: 2, borderRadius: 3,
                '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.08) }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {mode === 'dark' ? (
                  <Box sx={{
                    width: 30, height: 30, borderRadius: '8px',
                    bgcolor: '#fef7ed',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <SupervisorAccount sx={{ fontSize: 18, color: '#475569' }} />
                  </Box>
                ) : (
                  <SupervisorAccount sx={{ fontSize: 22, color: 'text.secondary' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={t('navigation:menu.users')}
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500, color: 'text.secondary' }}
              />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/settings')}
            data-tutorial="menu-settings"
            sx={{
              minHeight: 48, px: 2, borderRadius: 3,
              '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.08) }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconImage
                src="/icon/setting.png"
                alt="Settings"
                size={22}
                withBackground={mode === 'dark'}
              />
            </ListItemIcon>
            <ListItemText
              primary={t('navigation:menu.settings')}
              primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500, color: 'text.secondary' }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  // Calculer isMainPage pour utilisation dans plusieurs endroits
  const path = location.pathname;
  const mainPages = ['/dashboard', '/suppliers', '/purchase-orders', '/invoices', '/products', '/clients', '/ai-chat', '/e-sourcing', '/contracts'];
  const isMainPage = mainPages.some(page => path === page);

  return (
    <AINotificationProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Top Bar - Design Premium avec effet Morphism */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            bgcolor: 'background.paper',
            border: 'none',
            boxShadow: getNeumorphicShadow(mode === 'dark' ? 'dark' : 'light', 'soft'),
            color: 'text.primary',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 4 }, gap: { xs: 0.5, sm: 1 } }}>

            {/* Navigation mobile - Bouton menu/retour + Titre */}
            {(() => {
              // Utiliser isMainPage calculé en dehors

              // Pages de détail (avec ID dans l'URL, ex: /suppliers/123)
              const isDetailPage = !isMainPage && mainPages.some(page => path.startsWith(page + '/')) && !path.endsWith('/new') && !path.endsWith('/edit') && !path.includes('/edit/');

              // Pages formulaire/wizard (tab bar cachée)
              const isFormPage = path.endsWith('/new') || path.endsWith('/edit') || path.includes('/edit/');
              const isWizardPage = path.includes('/wizard');

              // Afficher bouton retour sur pages où navigation nécessaire
              const showBackButton = isAIChatPage || isFormPage || isWizardPage || isDetailPage;
              // Afficher titre sur mobile pour pages de détail et formulaires
              const showTitleOnMobile = !isMainPage;

              // Vérifier si on est sur le dashboard
              const isDashboard = path === '/dashboard';

              return (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.5 } }}>
                  {/* Bouton retour sur mobile OU contrôles période (dashboard) OU bouton "Nouveau" sur pages principales */}
                  {showBackButton ? (
                    <IconButton
                      onClick={() => navigate(-1)}
                      size="small"
                      sx={{
                        display: { xs: 'flex', md: 'none' },
                        p: 0.75,
                        borderRadius: '10px',
                        color: 'text.primary',
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.15),
                        }
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontSize: 16,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        ←
                      </Box>
                    </IconButton>
                  ) : isDashboard && contextualActions?.periodControls ? (
                    // Afficher les contrôles de période à gauche sur mobile pour le dashboard
                    <Box sx={{
                      display: { xs: 'flex', md: 'none' },
                      alignItems: 'center',
                      gap: 0.5,
                      mr: { xs: 0, sm: 1 },
                      '& .period-selector-button': {
                        px: '8px !important',
                        py: '6px !important',
                        fontSize: '0.75rem !important',
                        '& span': {
                          maxWidth: 70,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }
                      }
                    }}>
                      {/* <PeriodSelector period={contextualActions.currentPeriod} onChange={contextualActions.onPeriodChange} /> */}
                      <Tooltip title="Actualiser">
                        <IconButton
                          onClick={contextualActions.onRefresh}
                          size="small"
                          sx={{
                            p: 0.75,
                            borderRadius: 2,
                            color: 'text.secondary',
                            '&:hover': {
                              color: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.08)
                            }
                          }}
                        >
                          <Refresh sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : isMainPage && contextualActions?.action ? (
                    // Afficher le bouton "Nouveau" à gauche sur mobile pour les pages principales
                    <Button
                      variant="contained"
                      startIcon={contextualActions.action.icon}
                      onClick={contextualActions.action.onClick}
                      disableElevation
                      size="small"
                      sx={{
                        display: { xs: 'flex', md: 'none' },
                        borderRadius: '10px',
                        fontWeight: 600,
                        px: 1.5,
                        py: 0.75,
                        fontSize: '0.75rem',
                        mr: { xs: 0, sm: 1 },
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'white',
                        textTransform: 'none',
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                          background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                        },
                        '& .MuiButton-startIcon': {
                          marginRight: 0.5,
                          '& svg': {
                            fontSize: '1rem',
                          }
                        }
                      }}
                    >
                      {t('navigation:topBar.new', 'Nouveau')}
                    </Button>
                  ) : (
                    <IconButton
                      color="inherit"
                      aria-label="open drawer"
                      edge="start"
                      onClick={handleDrawerToggle}
                      sx={{
                        display: { xs: 'flex', md: 'none' },
                        mr: { xs: 0, sm: 2 },
                        borderRadius: 1,
                        p: 0.75,
                        color: 'text.primary',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.action.hover, 0.08),
                        }
                      }}
                    >
                      <MenuIcon />
                    </IconButton>
                  )}

                  {/* Indicateur de page actif - petit accent coloré (desktop only) */}
                  <Box
                    sx={{
                      width: 4,
                      height: 24,
                      borderRadius: 2,
                      background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.4)} 100%)`,
                      boxShadow: `0 0 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                      display: { xs: 'none', md: 'block' },
                    }}
                  />

                  {/* Titre de la page - Utilise l'espace disponible */}
                  <Typography
                    variant="h6"
                    noWrap
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: '0.9rem', sm: '1.15rem' },
                      flex: 1, // Prend l'espace disponible
                      background: mode === 'dark'
                        ? `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.text.secondary} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.02em',
                      // Cacher sur mobile pour les pages principales seulement
                      display: { xs: showTitleOnMobile ? 'block' : 'none', md: 'block' },
                    }}
                  >
                    {contextualActions?.title || 'Procura'}
                  </Typography>
                </Box>
              );
            })()}

            {/* Actions AI Chat - Masquer sur mobile pour éviter redondance avec les boutons dans l'interface AI */}
            {isAIChatPage && (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, mr: 2 }}>
                <Tooltip title="Imports">
                  <IconButton
                    size="small"
                    onClick={handleAIChatImportReviewsClick}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      color: 'text.secondary',
                      '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.08), color: 'success.main' }
                    }}
                  >
                    <Assignment sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Notifications">
                  <IconButton
                    size="small"
                    onClick={handleAIChatNotificationsClick}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      color: aiChatStats?.notifications_count > 0 ? 'warning.main' : 'text.secondary',
                      '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.08) }
                    }}
                  >
                    <Badge badgeContent={aiChatStats?.notifications_count || 0} color="warning" variant="dot">
                      <Notifications sx={{ fontSize: 20 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Tooltip title="Suggestions">
                  <IconButton
                    size="small"
                    onClick={handleAIChatSuggestionsClick}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      color: aiChatStats?.suggestions_count > 0 ? 'secondary.main' : 'text.secondary',
                      '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.08) }
                    }}
                  >
                    <Badge badgeContent={aiChatStats?.suggestions_count || 0} color="secondary" variant="dot">
                      <Lightbulb sx={{ fontSize: 20 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Period Selector - Global Dashboard Control (optimisé mobile) */}
            {contextualActions?.periodControls && (
              <Box sx={{
                // Cacher sur mobile pour le dashboard (affiché à gauche à la place)
                display: {
                  xs: isMainPage && path === '/dashboard' ? 'none' : 'flex',
                  md: 'flex'
                },
                alignItems: 'center',
                gap: { xs: 0.5, sm: 1.5 },
                mr: { xs: 0, sm: 2 },
                // Sur mobile, le sélecteur s'adapte
                '& .period-selector-button': {
                  px: { xs: '8px !important', sm: '12px !important' },
                  py: { xs: '6px !important', sm: '8px !important' },
                  fontSize: { xs: '0.75rem !important', sm: '0.875rem !important' },
                  '& span': {
                    maxWidth: { xs: 70, sm: 'none' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }
                }
              }}>
                {/* <PeriodSelector period={contextualActions.currentPeriod} onChange={contextualActions.onPeriodChange} /> */}
                <Tooltip title="Actualiser">
                  <IconButton
                    onClick={contextualActions.onRefresh}
                    size="small"
                    sx={{
                      p: { xs: 0.75, sm: 1 },
                      borderRadius: 2,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Refresh sx={{ fontSize: { xs: 16, sm: 18 } }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Contextual Actions - Boutons Rectangles Adoucis */}
            {contextualActions?.actions?.map((action, index) => (
              action.component ? (
                // Render custom React component directly
                <Box key={index} sx={{ mr: 1.5 }}>
                  {action.component}
                </Box>
              ) : action.isIconOnly ? (
                <Tooltip key={index} title={action.tooltip || action.label}>
                  <IconButton
                    onClick={action.onClick}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      mr: 1,
                      p: 1,
                      borderRadius: 2,
                      '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.08) }
                    }}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ) : (
                <Button
                  key={index}
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={action.onClick}
                  size="small"
                  sx={{
                    borderRadius: 2, // Radius 8px standard
                    fontWeight: 600,
                    px: 2,
                    py: 0.8,
                    fontSize: '0.875rem',
                    mr: 1.5,
                    textTransform: 'none',
                    borderColor: theme.palette.divider,
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.04)
                    }
                  }}
                >
                  {action.label}
                </Button>
              )
            ))}

            {/* Legacy Primary Action - Bouton Premium avec effet Glow */}
            {contextualActions?.action && !contextualActions?.actions && (
              <Button
                variant="contained"
                startIcon={contextualActions.action.icon}
                onClick={contextualActions.action.onClick}
                disableElevation
                sx={{
                  borderRadius: '12px',
                  fontWeight: 600,
                  px: { xs: 2, sm: 3 },
                  py: 1,
                  fontSize: '0.875rem',
                  mr: 2,
                  // Cacher sur mobile pour les pages principales (affiché à gauche à la place)
                  display: {
                    xs: isMainPage ? 'none' : 'flex',
                    md: 'flex'
                  },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: 'white',
                  textTransform: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  // Effet shimmer
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: `linear-gradient(180deg, ${alpha('#ffffff', 0.2)} 0%, transparent 100%)`,
                    borderRadius: '12px 12px 0 0',
                    pointerEvents: 'none',
                  },
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.45)}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  }
                }}
              >
                {isMobile ? t('navigation:topBar.new', 'Nouveau') : (contextualActions.action.label || t('navigation:topBar.new', 'Nouveau'))}
              </Button>
            )}

            {/* Report Button */}
            {reportAction && (
              <IconButton
                onClick={reportAction.onClick}
                sx={{
                  mr: 2,
                  borderRadius: 2,
                  color: 'text.secondary',
                  border: `1px solid ${theme.palette.divider}`,
                  p: 1,
                  '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.05), borderColor: 'text.primary' }
                }}
              >
                <PictureAsPdf sx={{ fontSize: 20 }} />
              </IconButton>
            )}

            {/* Tutorial Button - Visible partout */}
            <TutorialButton variant="icon" size="small" />

            {/* Theme Toggle - Design Premium (compact sur mobile) */}
            <Tooltip title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'}>
              <IconButton
                onClick={toggleColorMode}
                sx={{
                  color: 'text.secondary',
                  mr: { xs: 0.5, sm: 1 },
                  p: { xs: 0.75, sm: 1 },
                  borderRadius: { xs: '10px', sm: '12px' },
                  bgcolor: mode === 'dark'
                    ? alpha('#ffffff', 0.05)
                    : alpha('#000000', 0.03),
                  border: `1px solid ${alpha(mode === 'dark' ? '#ffffff' : '#000000', 0.06)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: mode === 'dark'
                      ? alpha('#ffffff', 0.1)
                      : alpha('#000000', 0.06),
                    transform: 'rotate(15deg)',
                  }
                }}
              >
                {mode === 'dark' ? (
                  <LightMode sx={{
                    fontSize: { xs: 18, sm: 20 },
                    color: '#f59e0b',
                    filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))'
                  }} />
                ) : (
                  <DarkMode sx={{
                    fontSize: { xs: 18, sm: 20 },
                    color: '#6366f1',
                  }} />
                )}
              </IconButton>
            </Tooltip>

            {/* User Profile - Design Premium avec anneau (compact sur mobile) */}
            <Tooltip title={t('navigation:userMenu.profile', 'Profil')}>
              <IconButton
                onClick={handleMenuClick}
                sx={{
                  ml: { xs: 0, sm: 0.5 },
                  p: 0.5,
                  borderRadius: { xs: '12px', sm: '14px' },
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  }
                }}
                data-tutorial="profile-menu"
              >
                <Avatar
                  sx={{
                    width: { xs: 28, sm: 34 },
                    height: { xs: 28, sm: 34 },
                    bgcolor: mode === 'dark'
                      ? theme.palette.background.paper
                      : '#ffffff',
                    border: 'none',
                    p: 0.5,
                  }}
                >
                  <Box
                    component="img"
                    src="/icon/ai-assistant.png"
                    alt="Profile"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                },
              }}
            >
              <MenuItem
                onClick={() => { navigate('/settings'); handleMenuClose(); }}
                sx={{ py: 1.5, px: 2, fontSize: '0.875rem', gap: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Tune fontSize="small" />
                </ListItemIcon>
                {t('navigation:userMenu.settings')}
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2, fontSize: '0.875rem', gap: 1.5, color: 'error.main' }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'error.main' }}>
                  <Box component="span" sx={{ fontSize: 20 }}>⏻</Box>
                </ListItemIcon>
                {t('navigation:userMenu.logout')}
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
          {/* Mobile Drawer */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                bgcolor: 'background.paper',
              },
            }}
          >
            {drawer}
          </Drawer>

          {/* Desktop Drawer */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                bgcolor: 'background.paper',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 2.5 },
            pb: { xs: 10, sm: 2.5 },
            width: { md: `calc(100% - ${drawerWidth}px)` },
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 60 } }} />
          <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
            <LayoutGroup>
              <Outlet />
            </LayoutGroup>
          </Box>
        </Box>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav enabledModules={enabledModules} />

        {/* Module Activation Dialog */}
        <ModuleActivationDialog
          open={moduleActivationDialogOpen}
          moduleId={selectedModule}
          onClose={() => setModuleActivationDialogOpen(false)}
          onActivate={handleActivateModule}
        />

        {/* Tutorial System */}
        <SimpleTutorial />

        {/* PWA Installation Prompt */}
        <InstallPWAPrompt />
      </Box>
    </AINotificationProvider>
  );
}

export default MainLayout;
