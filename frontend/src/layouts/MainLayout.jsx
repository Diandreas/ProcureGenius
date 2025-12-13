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
  Divider,
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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  ShoppingCart,
  Receipt,
  Inventory,
  People,
  Chat,
  Settings,
  Logout,
  ChevronLeft,
  Add,
  Gavel,
  CompareArrows,
  CloudUpload,
  Lock,
  SupervisorAccount,
  Tune,
  Refresh,
} from '@mui/icons-material';
import { logout } from '../store/slices/authSlice';
import { useModules } from '../contexts/ModuleContext';
import MobileBottomNav from '../components/MobileBottomNav';
import PermanentAIAssistant from '../components/PermanentAIAssistant';
import ModuleActivationDialog from '../components/ModuleActivationDialog';
import IconImage from '../components/IconImage';
import { useTranslation } from 'react-i18next';

const drawerWidth = 260;

// Modules incontournables (toujours affichés)
const CORE_MODULES = ['dashboard'];

const menuItems = [
  { text: 'Tableau de bord', icon: <IconImage src="/icon/dashboard.png" alt="Dashboard" size={24} />, path: '/dashboard', moduleId: 'dashboard', isCore: true },
  { text: 'Fournisseurs', icon: <IconImage src="/icon/supplier.png" alt="Suppliers" size={24} />, path: '/suppliers', moduleId: 'suppliers', isCore: false },
  { text: 'Bons de commande', icon: <IconImage src="/icon/purchase-order.png" alt="Purchase Orders" size={24} />, path: '/purchase-orders', moduleId: 'purchase-orders', isCore: false },
  { text: 'Factures', icon: <IconImage src="/icon/bill.png" alt="Invoices" size={24} />, path: '/invoices', moduleId: 'invoices', isCore: false },
  { text: 'Produits', icon: <IconImage src="/icon/product.png" alt="Products" size={24} />, path: '/products', moduleId: 'products', isCore: false },
  { text: 'Clients', icon: <IconImage src="/icon/user.png" alt="Clients" size={24} />, path: '/clients', moduleId: 'clients', isCore: false },
  { text: 'E-Sourcing (RFQ)', icon: <IconImage src="/icon/market.png" alt="E-Sourcing" size={24} />, path: '/e-sourcing/events', moduleId: 'e-sourcing', isCore: false },
  { text: 'Contrats', icon: <IconImage src="/icon/contract.png" alt="Contracts" size={24} />, path: '/contracts', moduleId: 'contracts', isCore: false },
  { text: 'Assistant IA', icon: <IconImage src="/icon/ai-assistant.png" alt="AI Assistant" size={24} />, path: '/ai-chat', moduleId: 'dashboard', isCore: true }, // Toujours disponible
];

function MainLayout() {
  const { t } = useTranslation(['navigation', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dashboardPeriod, setDashboardPeriod] = useState('last_30_days');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Use module context
  const { modules: enabledModules, hasModule, loading: modulesLoading } = useModules();

  // Listen for dashboard period changes
  useEffect(() => {
    const handlePeriodChange = (event) => {
      if (event.detail?.period) {
        setDashboardPeriod(event.detail.period);
      }
    };
    window.addEventListener('dashboard-period-change', handlePeriodChange);
    return () => {
      window.removeEventListener('dashboard-period-change', handlePeriodChange);
    };
  }, []);

  // Menu items with translations
  const menuItems = [
    { text: t('navigation:menu.dashboard'), icon: <IconImage src="/icon/dashboard.png" alt="Dashboard" size={24} />, path: '/dashboard', moduleId: 'dashboard', isCore: true },
    { text: t('navigation:menu.suppliers'), icon: <IconImage src="/icon/supplier.png" alt="Suppliers" size={24} />, path: '/suppliers', moduleId: 'suppliers', isCore: false },
    { text: t('navigation:menu.purchaseOrders'), icon: <IconImage src="/icon/purchase-order.png" alt="Purchase Orders" size={24} />, path: '/purchase-orders', moduleId: 'purchase-orders', isCore: false },
    { text: t('navigation:menu.invoices'), icon: <IconImage src="/icon/bill.png" alt="Invoices" size={24} />, path: '/invoices', moduleId: 'invoices', isCore: false },
    { text: t('navigation:menu.products'), icon: <IconImage src="/icon/product.png" alt="Products" size={24} />, path: '/products', moduleId: 'products', isCore: false },
    { text: t('navigation:menu.clients'), icon: <IconImage src="/icon/user.png" alt="Clients" size={24} />, path: '/clients', moduleId: 'clients', isCore: false },
    { text: t('navigation:menu.eSourcing'), icon: <IconImage src="/icon/market.png" alt="E-Sourcing" size={24} />, path: '/e-sourcing/events', moduleId: 'e-sourcing', isCore: false },
    { text: t('navigation:menu.contracts'), icon: <IconImage src="/icon/contract.png" alt="Contracts" size={24} />, path: '/contracts', moduleId: 'contracts', isCore: false },
    { text: t('navigation:menu.aiAssistant'), icon: <IconImage src="/icon/ai-assistant.png" alt="AI Assistant" size={24} />, path: '/ai-chat', moduleId: 'dashboard', isCore: true },
  ];


  // États pour la gestion des modules
  const [userPermissions, setUserPermissions] = useState(null);
  const [moduleActivationDialogOpen, setModuleActivationDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  // Charger les préférences utilisateur au montage
  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch('/api/v1/accounts/profile/', {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.permissions);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleModuleClick = (item) => {
    // Les modules core sont toujours accessibles
    if (item.isCore || hasModule(item.moduleId)) {
      // Module activé ou core: navigation normale
      navigate(item.path);
      if (isMobile) {
        setMobileOpen(false);
      }
    } else {
      // Module désactivé: display message (admin needs to change subscription)
      setSelectedModule(item.moduleId);
      setModuleActivationDialogOpen(true);
    }
  };

  const handleActivateModule = async (moduleId) => {
    // Module activation is now controlled at organization level
    // Redirect to module settings where admin can upgrade subscription
    setModuleActivationDialogOpen(false);
    navigate('/settings/modules');
  };

  // Déterminer le module actuel depuis le path
  const currentModule = useMemo(() => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (path.startsWith(item.path) || path === item.path) {
        return item.moduleId;
      }
    }
    return 'dashboard';
  }, [location.pathname]);

  // Actions contextuelles selon la page
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
          onRefresh: () => {
            window.dispatchEvent(new CustomEvent('dashboard-refresh'));
          },
          actions: [
            {
              label: '',
              icon: <Tune />,
              onClick: () => {
                // Dispatch event to activate edit mode in CustomizableDashboard
                window.dispatchEvent(new CustomEvent('dashboard-edit-mode', { detail: { activate: true } }));
              },
              isIconOnly: true,
              tooltip: t('navigation:topBar.customizeDashboard', 'Personnaliser le tableau de bord')
            }
          ]
        };
      case '/suppliers':
        return {
          title: t('navigation:menu.suppliers'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newSupplier'),
            icon: <Add />,
            onClick: () => navigate('/suppliers/new')
          }
        };
      case '/purchase-orders':
        return {
          title: t('navigation:menu.purchaseOrders'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newPurchaseOrder'),
            icon: <Add />,
            onClick: () => navigate('/purchase-orders/new')
          }
        };
      case '/invoices':
        return {
          title: t('navigation:menu.invoices'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newInvoice'),
            icon: <Add />,
            onClick: () => navigate('/invoices/new')
          }
        };
      case '/products':
        return {
          title: t('navigation:menu.products'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newProduct'),
            icon: <Add />,
            onClick: () => navigate('/products/new')
          }
        };
      case '/clients':
        return {
          title: t('navigation:menu.clients'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newClient'),
            icon: <Add />,
            onClick: () => navigate('/clients/new')
          }
        };
      case '/e-sourcing/events':
        return {
          title: t('navigation:menu.eSourcing'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newRfqEvent'),
            icon: <Add />,
            onClick: () => navigate('/e-sourcing/events/new')
          }
        };
      case '/contracts':
        return {
          title: t('navigation:menu.contracts'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newContract'),
            icon: <Add />,
            onClick: () => navigate('/contracts/new')
          }
        };
      case '/migration/jobs':
        return {
          title: t('navigation:topBar.dataImport'),
          action: {
            label: isMobile ? t('navigation:topBar.newImport') : t('navigation:topBar.newImport'),
            icon: <IconImage src="/icon/migration.png" alt="Import" size={20} />,
            onClick: () => navigate('/migration/wizard')
          }
        };
      case '/migration/wizard':
        return {
          title: t('navigation:topBar.importWizard')
        };
      case '/ai-chat':
        return {
          title: t('navigation:menu.aiAssistant'),
          action: {
            label: isMobile ? t('navigation:topBar.new') : t('navigation:topBar.newConversation'),
            icon: <Add />,
            onClick: () => {
              // Cette action sera gérée par le composant AIChat
              window.dispatchEvent(new CustomEvent('ai-chat-new-conversation'));
            }
          }
        };
      case '/settings':
        return {
          title: t('navigation:menu.settings')
        };
      default:
        // Fallback pour les routes non définies
        return {
          title: 'Procura'
        };
    }
  };

  const contextualActions = useMemo(() => getContextualActions(), [location.pathname, isMobile, dashboardPeriod]);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            component="img"
            src="/main.png"
            alt="Procura"
            onError={(e) => {
              // Fallback si le logo n'existe pas
              e.target.style.display = 'none';
              if (e.target.nextSibling) {
                e.target.nextSibling.style.display = 'flex';
              }
            }}
            sx={{
              width: 36,
              height: 36,
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '1.125rem',
            }}
          >
            P
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
            Procura
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 1 }}>
          {menuItems.filter(item => {
            // Only show items if module is enabled (hide completely instead of graying out)
            return item.isCore || hasModule(item.moduleId);
          }).map((item) => {
            const isSelected = location.pathname === item.path;

            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleModuleClick(item)}
                  sx={{
                    minHeight: 44,
                    px: 2,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 600 : 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {userPermissions?.can_manage_users && (
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => navigate('/settings/users')}
              sx={{
                minHeight: 44,
                px: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <SupervisorAccount />
              </ListItemIcon>
              <ListItemText
                primary={t('navigation:menu.users')}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/settings')}
            sx={{
              minHeight: 44,
              px: 2,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <IconImage src="/icon/setting.png" alt="Settings" size={24} />
            </ListItemIcon>
            <ListItemText
              primary={t('navigation:menu.settings')}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          color: 'text.primary',
          borderBottom: '0px ',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>
              {contextualActions?.title || 'Procura'}
            </Typography>
          </Box>
          {/* Period controls for dashboard */}
          {contextualActions?.periodControls && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
              <Button
                size="small"
                onClick={() => contextualActions.onPeriodChange('last_7_days')}
                variant={contextualActions.currentPeriod === 'last_7_days' ? 'contained' : 'outlined'}
                sx={{
                  minWidth: 'auto',
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.7rem',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                7j
              </Button>
              <Button
                size="small"
                onClick={() => contextualActions.onPeriodChange('last_30_days')}
                variant={contextualActions.currentPeriod === 'last_30_days' ? 'contained' : 'outlined'}
                sx={{
                  minWidth: 'auto',
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.7rem',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                30j
              </Button>
              <Button
                size="small"
                onClick={() => contextualActions.onPeriodChange('this_month')}
                variant={contextualActions.currentPeriod === 'this_month' ? 'contained' : 'outlined'}
                sx={{
                  minWidth: 'auto',
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.7rem',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Mois
              </Button>
              <Tooltip title="Actualiser">
                <IconButton
                  onClick={contextualActions.onRefresh}
                  size="small"
                  sx={{
                    ml: 0.5,
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          {/* Actions */}
          {contextualActions?.actions?.map((action, index) => (
            action.isIconOnly ? (
              <Tooltip key={index} title={action.tooltip || action.label}>
                <IconButton
                  onClick={action.onClick}
                  size="small"
                  sx={{
                    mr: index < (contextualActions.actions?.length || 0) - 1 ? 1 : 2,
                    color: 'text.secondary',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'action.hover',
                      transform: 'scale(1.05)',
                    }
                  }}
                >
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
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: isMobile ? 1.5 : 2,
                  py: 0.5,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  mr: index < (contextualActions.actions?.length || 0) - 1 ? 1 : 2,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.01)',
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)'
                  }
                }}
              >
                {action.label}
              </Button>
            )
          ))}
          {/* Legacy action support */}
          {contextualActions?.action && !contextualActions?.actions && (
            contextualActions.action.isIconOnly ? (
              <Tooltip title={contextualActions.action.tooltip || contextualActions.action.label}>
                <IconButton
                  onClick={contextualActions.action.onClick}
                  size="small"
                  sx={{
                    mr: 2,
                    color: 'text.secondary',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'action.hover',
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  {contextualActions.action.icon}
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                variant="contained"
                startIcon={contextualActions.action.icon}
                onClick={contextualActions.action.onClick}
                size="small"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: isMobile ? 1.5 : 2,
                  py: 0.5,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  mr: 2,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.01)',
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)'
                  }
                }}
              >
                {contextualActions.action.label}
              </Button>
            )
          )}
          <IconButton
            onClick={handleMenuClick}
            size="small"
            sx={{
              ml: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: '0 2px 8px rgba(30, 64, 175, 0.15)',
              }}
            >
              {useSelector((state) => {
                const user = state.auth.user;
                const orgName = user?.organization?.name;

                if (orgName) {
                  // Prend les 2 premières lettres du nom de l'organisation
                  return orgName.substring(0, 2).toUpperCase();
                }

                // Fallback: Initiales utilisateur ou Email
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
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <MenuItem
              onClick={() => {
                navigate('/settings');
                handleMenuClose();
              }}
              sx={{ py: 1.5, px: 2 }}
            >
              <ListItemIcon>
                <IconImage src="/icon/setting.png" alt="Settings" size={20} />
              </ListItemIcon>
              <Typography variant="body2">{t('navigation:userMenu.settings')}</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2 }}>
              <ListItemIcon>
                <IconImage src="/icon/logout.png" alt="Logout" size={20} />
              </ListItemIcon>
              <Typography variant="body2">{t('navigation:userMenu.logout')}</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          pb: { xs: 10, sm: 3 }, // Padding bottom pour la navigation mobile
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 70 } }} />
        <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav enabledModules={enabledModules} />

      {/* Assistant IA permanent (toujours visible) */}
      {!isMobile && <PermanentAIAssistant currentModule={currentModule} />}

      {/* Dialog d'activation de module */}
      <ModuleActivationDialog
        open={moduleActivationDialogOpen}
        moduleId={selectedModule}
        onClose={() => setModuleActivationDialogOpen(false)}
        onActivate={handleActivateModule}
      />
    </Box>
  );
}

export default MainLayout;