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
import PermanentAIAssistant from '../components/PermanentAIAssistant';
import ModuleActivationDialog from '../components/ModuleActivationDialog';
import IconImage from '../components/IconImage';
import TutorialButton from '../components/tutorial/TutorialButton';
import SimpleTutorial from '../components/tutorial/SimpleTutorial';
import AINotificationProvider from '../components/AI/AINotificationProvider';
import { useTranslation } from 'react-i18next';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import PeriodSelector from '../components/dashboard/PeriodSelector';

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
    { text: t('navigation:menu.aiAssistant'), iconSrc: '/icon/ai-assistant.png', path: '/ai-chat', moduleId: 'dashboard', isCore: true },
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
          periodControls: true,
          currentPeriod: dashboardPeriod,
          onPeriodChange: (newPeriod) => {
            setDashboardPeriod(newPeriod);
            window.dispatchEvent(new CustomEvent('dashboard-period-change', { detail: { period: newPeriod } }));
          },
          onRefresh: () => window.dispatchEvent(new CustomEvent('dashboard-refresh')),
          actions: [{
            label: '',
            icon: <Tune fontSize="small" />,
            onClick: () => window.dispatchEvent(new CustomEvent('dashboard-edit-mode', { detail: { activate: true } })),
            isIconOnly: true,
            tooltip: t('navigation:topBar.customizeDashboard', 'Personnaliser')
          }]
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
      // Liquid Glass Effect
      bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.6 : 0.8),
      backdropFilter: 'blur(20px)',
      background: mode === 'dark'
        ? `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`
        : `linear-gradient(160deg, ${alpha('#ffffff', 0.9)} 0%, ${alpha('#f8fafc', 0.85)} 100%)`,
      borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      boxShadow: `inset -1px 0 0 ${alpha(theme.palette.common.white, mode === 'dark' ? 0.05 : 0.5)}`, // Inner shimmer
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

  return (
    <AINotificationProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Top Bar - Liquid Glass Design */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            // Liquid Glass Style
            bgcolor: alpha(theme.palette.background.paper, mode === 'dark' ? 0.6 : 0.65),
            backdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            boxShadow: mode === 'dark'
              ? '0 4px 30px rgba(0, 0, 0, 0.4)'
              : '0 4px 30px rgba(0, 0, 0, 0.03)',
            color: 'text.primary',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            // Inner shine for 3D liquid feel
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, mode === 'dark' ? 0.05 : 0.4)}`,
            }
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, sm: 64 }, px: { xs: 2.5, sm: 4 }, gap: 1 }}>

            {/* Mobile Menu Toggle - Only show on small tablets, not on phones */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { xs: 'none', sm: 'block', md: 'none' }, borderRadius: 1 }}
            >
              <MenuIcon />
            </IconButton>

            {/* Titre de la page - Simple et Clean */}
            <Typography
              variant="h6"
              noWrap
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                fontSize: '1.1rem',
                color: 'text.primary',
                letterSpacing: '-0.01em',
              }}
            >
              {contextualActions?.title || 'Procura'}
            </Typography>

            {/* Actions AI Chat - Style Discret */}
            {isAIChatPage && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
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

            {/* Period Selector - Global Dashboard Control */}
            {contextualActions?.periodControls && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 2 }}>
                <PeriodSelector
                  period={contextualActions.currentPeriod}
                  onChange={contextualActions.onPeriodChange}
                />
                <Tooltip title="Actualiser">
                  <IconButton
                    onClick={contextualActions.onRefresh}
                    size="small"
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.08)
                      }
                    }}
                  >
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Contextual Actions - Boutons Rectangles Adoucis */}
            {contextualActions?.actions?.map((action, index) => (
              action.isIconOnly ? (
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

            {/* Legacy Primary Action - Solid Button */}
            {contextualActions?.action && !contextualActions?.actions && (
              <Button
                variant="contained"
                startIcon={contextualActions.action.icon}
                onClick={contextualActions.action.onClick}
                disableElevation
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  fontSize: '0.875rem',
                  mr: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: 'primary.dark',
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

            {/* Tutorial Button */}
            <TutorialButton variant="icon" size="small" />

            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'}>
              <IconButton
                onClick={toggleColorMode}
                sx={{
                  color: 'text.secondary',
                  mr: 1,
                  p: 1,
                  borderRadius: 2,
                  '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.08) }
                }}
              >
                {mode === 'dark' ? <LightMode sx={{ fontSize: 22 }} /> : <DarkMode sx={{ fontSize: 22 }} />}
              </IconButton>
            </Tooltip>

            {/* User Profile - Minimalist */}
            <IconButton
              onClick={handleMenuClick}
              sx={{ ml: 0.5, p: 0.5 }}
              data-tutorial="profile-menu"
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                {useSelector((state) => {
                  const user = state.auth.user;
                  const orgName = user?.organization?.name;
                  if (orgName) return orgName.substring(0, 2).toUpperCase();
                  if (user?.first_name && user?.last_name) {
                    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
                  }
                  return user?.email?.[0]?.toUpperCase() || 'P';
                })}
              </Avatar>
            </IconButton>

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
            <Outlet />
          </Box>
        </Box>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav enabledModules={enabledModules} />

        {/* Permanent AI Assistant */}
        {!isMobile && <PermanentAIAssistant currentModule={currentModule} />}

        {/* Module Activation Dialog */}
        <ModuleActivationDialog
          open={moduleActivationDialogOpen}
          moduleId={selectedModule}
          onClose={() => setModuleActivationDialogOpen(false)}
          onActivate={handleActivateModule}
        />

        {/* Tutorial System */}
        <SimpleTutorial />
      </Box>
    </AINotificationProvider>
  );
}

export default MainLayout;
