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
      // #region agent log
      const requestUrl = '/api/v1/accounts/profile/';
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        fetch('http://127.0.0.1:7242/ingest/dfaf7dec-d0bf-4b5b-b3ba-9ed78f29cc9a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'MainLayout.jsx:156', message: 'Before fetch profile request', data: { requestUrl, origin: window.location.origin }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      }
      // #endregion
      const response = await fetch(requestUrl, {
        headers: { 'Authorization': `Token ${localStorage.getItem('authToken')}` },
      });
      // #region agent log
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        fetch('http://127.0.0.1:7242/ingest/dfaf7dec-d0bf-4b5b-b3ba-9ed78f29cc9a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'MainLayout.jsx:159', message: 'After fetch profile response', data: { status: response.status, statusText: response.statusText, ok: response.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      }
      // #endregion
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
      bgcolor: 'background.paper',
    }}>
      {/* Logo */}
      <Box sx={{
        px: 2,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        <Box
          component="img"
          src="/main.png"
          alt="Procura"
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
          sx={{ width: 32, height: 32, objectFit: 'contain' }}
        />
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          P
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: '1rem',
            color: 'text.primary',
          }}
        >
          Procura
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1, px: 1 }}>
        <List disablePadding>
          {menuItems.filter(item => item.isCore || hasModule(item.moduleId)).map((item) => {
            const isSelected = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleModuleClick(item)}
                  data-tutorial={`menu-${item.moduleId}`}
                  sx={{
                    minHeight: 40,
                    px: 1.5,
                    borderRadius: 1.5,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.15 : 0.08),
                      '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconImage
                      src={item.iconSrc}
                      alt={item.text}
                      size={20}
                      withBackground={mode === 'dark'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.813rem',
                      fontWeight: isSelected ? 600 : 500,
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
      <Box sx={{ px: 1, pb: 2 }}>
        {userPermissions?.can_manage_users && (
          <ListItem disablePadding sx={{ mb: 0.25 }}>
            <ListItemButton
              onClick={() => navigate('/settings/users')}
              sx={{ minHeight: 40, px: 1.5, borderRadius: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {mode === 'dark' ? (
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '6px',
                    bgcolor: '#fef7ed',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <SupervisorAccount sx={{ fontSize: 18, color: '#475569' }} />
                  </Box>
                ) : (
                  <SupervisorAccount sx={{ fontSize: 20, color: 'text.secondary' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={t('navigation:menu.users')}
                primaryTypographyProps={{ fontSize: '0.813rem', fontWeight: 500, color: 'text.secondary' }}
              />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/settings')}
            data-tutorial="menu-settings"
            sx={{ minHeight: 40, px: 1.5, borderRadius: 1.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <IconImage
                src="/icon/setting.png"
                alt="Settings"
                size={20}
                withBackground={mode === 'dark'}
              />
            </ListItemIcon>
            <ListItemText
              primary={t('navigation:menu.settings')}
              primaryTypographyProps={{ fontSize: '0.813rem', fontWeight: 500, color: 'text.secondary' }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <AINotificationProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Top Bar */}
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(12px)',
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56, sm: 60 }, px: { xs: 2, sm: 3 } }}>
            <Typography
              variant="h6"
              noWrap
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                fontSize: '0.938rem',
                color: 'text.primary',
              }}
            >
              {contextualActions?.title || 'Procura'}
            </Typography>

            {/* Boutons AI Chat dans la toolbar */}
            {isAIChatPage && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                {/* Import Reviews */}
                <Tooltip title="Imports en attente">
                  <IconButton
                    size="small"
                    onClick={handleAIChatImportReviewsClick}
                    sx={{
                      p: 0.75,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.action.hover, 0.05),
                      }
                    }}
                  >
                    <Assignment sx={{ fontSize: 18, color: '#10b981' }} />
                  </IconButton>
                </Tooltip>

                {/* Notifications */}
                <Tooltip title="Notifications IA">
                  <IconButton
                    size="small"
                    onClick={handleAIChatNotificationsClick}
                    sx={{
                      p: 0.75,
                      bgcolor: aiChatStats?.notifications_count > 0
                        ? alpha('#f59e0b', 0.15)
                        : 'transparent',
                      '&:hover': {
                        bgcolor: aiChatStats?.notifications_count > 0
                          ? alpha('#f59e0b', 0.25)
                          : alpha(theme.palette.action.hover, 0.05),
                      }
                    }}
                  >
                    <Badge badgeContent={aiChatStats?.notifications_count || 0} color="warning" max={9}>
                      <Notifications sx={{ fontSize: 18 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* Suggestions */}
                <Tooltip title="Suggestions actives">
                  <IconButton
                    size="small"
                    onClick={handleAIChatSuggestionsClick}
                    sx={{
                      p: 0.75,
                      bgcolor: aiChatStats?.suggestions_count > 0
                        ? alpha('#8b5cf6', 0.15)
                        : 'transparent',
                      '&:hover': {
                        bgcolor: aiChatStats?.suggestions_count > 0
                          ? alpha('#8b5cf6', 0.25)
                          : alpha(theme.palette.action.hover, 0.05),
                      }
                    }}
                  >
                    <Badge badgeContent={aiChatStats?.suggestions_count || 0} color="secondary" max={9}>
                      <Lightbulb sx={{ fontSize: 18 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* Burger menu pour conversations */}
                <Tooltip title="Historique des conversations">
                  <IconButton
                    size="small"
                    onClick={handleAIChatConversationsClick}
                    sx={{
                      p: 0.75,
                      '&:hover': {
                        bgcolor: alpha(theme.palette.action.hover, 0.05),
                      }
                    }}
                  >
                    <MenuIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Period controls for dashboard */}
            {contextualActions?.periodControls && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                {['last_7_days', 'last_30_days', 'this_month'].map((period, i) => (
                  <Button
                    key={period}
                    size="small"
                    onClick={() => contextualActions.onPeriodChange(period)}
                    variant={contextualActions.currentPeriod === period ? 'contained' : 'text'}
                    sx={{
                      minWidth: 'auto',
                      px: 1,
                      py: 0.5,
                      fontSize: '0.688rem',
                      borderRadius: 1,
                      fontWeight: 500,
                      color: contextualActions.currentPeriod === period ? 'white' : 'text.secondary',
                    }}
                  >
                    {['7j', '30j', 'Mois'][i]}
                  </Button>
                ))}
                <Tooltip title="Actualiser">
                  <IconButton
                    onClick={contextualActions.onRefresh}
                    size="small"
                    sx={{ ml: 0.5, color: 'text.secondary' }}
                  >
                    <Refresh sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Actions */}
            {contextualActions?.actions?.map((action, index) => (
              action.isIconOnly ? (
                <Tooltip key={index} title={action.tooltip || action.label}>
                  <IconButton onClick={action.onClick} size="small" sx={{ color: 'text.secondary', mr: 0.5 }}>
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ) : (
                <Button
                  key={index}
                  variant="contained"
                  startIcon={action.icon}
                  onClick={action.onClick}
                  size="small"
                  sx={{ borderRadius: 1.5, fontWeight: 500, px: 1.5, py: 0.5, fontSize: '0.75rem', mr: 0.5 }}
                >
                  {action.label}
                </Button>
              )
            ))}

            {/* Legacy action support - Label court sur mobile */}
            {contextualActions?.action && !contextualActions?.actions && (
              <Button
                variant="contained"
                startIcon={contextualActions.action.icon}
                onClick={contextualActions.action.onClick}
                size="small"
                disableElevation
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  px: { xs: 1.5, sm: 2 },
                  py: 0.75,
                  fontSize: '0.813rem',
                  mr: 1.5,
                  bgcolor: 'primary.main',
                  color: 'white',
                  textTransform: 'none',
                  letterSpacing: '0.01em',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                {isMobile ? t('navigation:topBar.new', 'Nouveau') : (contextualActions.action.label || t('navigation:topBar.new', 'Nouveau'))}
              </Button>
            )}

            {/* Bouton Rapport PDF - Label court sur mobile */}
            {reportAction && (
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf fontSize="small" />}
                onClick={reportAction.onClick}
                size="small"
                sx={{
                  borderRadius: 2,
                  fontWeight: 500,
                  px: { xs: 1.5, sm: 1.5 },
                  py: 0.75,
                  fontSize: '0.813rem',
                  mr: 1.5,
                  borderColor: 'text.secondary',
                  color: 'text.primary',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, mode === 'dark' ? 0.1 : 0.05),
                  },
                }}
              >
                {isMobile ? t('navigation:topBar.report', 'Rapport') : reportAction.label}
              </Button>
            )}

            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? 'Mode clair' : 'Mode sombre'}>
              <IconButton onClick={toggleColorMode} size="small" sx={{ color: 'text.secondary', mr: 0.5 }}>
                {mode === 'dark' ? <LightMode sx={{ fontSize: 20 }} /> : <DarkMode sx={{ fontSize: 20 }} />}
              </IconButton>
            </Tooltip>

            {/* Tutorial Button */}
            <TutorialButton variant="icon" size="small" />

            {/* User Avatar */}
            <IconButton onClick={handleMenuClick} size="small" sx={{ ml: 0.5 }} data-tutorial="profile-menu">
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.75rem',
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
                sx: { mt: 1, minWidth: 180 },
              }}
            >
              <MenuItem
                onClick={() => { navigate('/settings'); handleMenuClose(); }}
                data-tutorial="menu-settings-profile"
                sx={{ py: 1, px: 2, fontSize: '0.813rem' }}
              >
                <ListItemIcon>
                  <IconImage src="/icon/setting.png" alt="Settings" size={18} withBackground={mode === 'dark'} />
                </ListItemIcon>
                {t('navigation:userMenu.settings')}
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ py: 1, px: 2, fontSize: '0.813rem' }}>
                <ListItemIcon>
                  <IconImage src="/icon/logout.png" alt="Logout" size={18} withBackground={mode === 'dark'} />
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
