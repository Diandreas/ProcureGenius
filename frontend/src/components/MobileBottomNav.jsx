import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation, Paper, Box, useTheme, alpha,
  SwipeableDrawer, List, ListItemButton, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import { MoreHoriz as MoreIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { aiChatAPI } from '../services/api';
import IconImage from './IconImage';
import { SafeBottomNavigationAction } from './safe';

// Nombre max d'icônes affichées directement dans la barre — au-delà, le reste
// part dans le tiroir "Plus" pour ne jamais surcharger l'écran (ex: profil admin
// avec beaucoup de modules activés).
const MAX_VISIBLE_ITEMS = 4;

function MobileBottomNav({ enabledModules = ['dashboard'] }) {
  const { t } = useTranslation(['navigation']);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Pages où cacher la tab bar pour une meilleure UX
  const shouldHideTabBar = () => {
    const path = location.pathname;

    // AI Chat - expérience immersive
    if (path.startsWith('/ai-chat')) return true;

    // Formulaires de création/édition - éviter perte de données
    if (path.endsWith('/new')) return true;
    if (path.endsWith('/edit')) return true;
    if (path.includes('/edit/')) return true;

    // Wizards et processus multi-étapes
    if (path.includes('/wizard')) return true;

    // Pages de détail (ex: /suppliers/123) - titre dans top navbar
    const mainPaths = ['/dashboard', '/suppliers', '/purchase-orders', '/invoices', '/products', '/clients', '/e-sourcing', '/contracts'];
    const isDetailPage = mainPaths.some(mainPath =>
      path.startsWith(mainPath + '/') && path !== mainPath
    );
    if (isDetailPage) return true;

    return false;
  };

  // IMPORTANT: Tous les hooks DOIVENT être appelés AVANT tout return conditionnel
  // Récupérer le count de notifications au chargement et toutes les 30 secondes
  useEffect(() => {
    // Ne pas fetch si on va cacher le composant
    if (shouldHideTabBar()) return;

    const fetchNotificationsCount = async () => {
      try {
        const response = await aiChatAPI.getNotificationsCount();
        setNotificationsCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching notifications count:', error);
      }
    };

    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 30000); // Poll toutes les 30s

    return () => clearInterval(interval);
  }, [location.pathname]);

  // Ne pas rendre le composant si on doit le cacher (APRÈS les hooks)
  if (shouldHideTabBar()) {
    return null;
  }

  // Couleur beige/crème chaude
  const bgColor = '#fef7ed';

  const allNavigationItems = [
    { label: t('navigation:mobile.dashboard'), value: '/dashboard', icon: '/icon/dashboard.png', moduleId: 'dashboard', isCore: true },
    // { label: t('navigation:mobile.suppliers'), value: '/suppliers', icon: '/icon/supplier.png', moduleId: 'suppliers', isCore: false },
    // { label: t('navigation:mobile.orders'), value: '/purchase-orders', icon: '/icon/purchase-order.png', moduleId: 'purchase-orders', isCore: false },
    { label: t('navigation:mobile.invoices'), value: '/invoices', icon: '/icon/bill.png', moduleId: 'invoices', isCore: false },
    { label: t('navigation:mobile.products'), value: '/products', icon: '/icon/product.png', moduleId: 'products', isCore: false },
    { label: t('navigation:mobile.clients'), value: '/clients', icon: '/icon/user.png', moduleId: 'clients', isCore: false },
    // Healthcare
    { label: 'Patients', value: '/healthcare/patients', icon: '/icon/user.png', moduleId: 'patients', isCore: false },
    { label: 'Visites', value: '/healthcare/visits', icon: '/icon/support.png', moduleId: 'visits', isCore: false },
    { label: 'Laboratoire', value: '/healthcare/laboratory', icon: '/icon/analysis.png', moduleId: 'laboratory', isCore: false },
    { label: 'Pharmacie', value: '/products', icon: '/icon/product.png', moduleId: 'pharmacy', isCore: false },
    { label: 'Consultations', value: '/healthcare/consultations', icon: '/icon/contract.png', moduleId: 'consultations', isCore: false },
  ];

  const aiItem = {
    label: t('navigation:mobile.ai'),
    value: '/ai-chat',
    icon: '/icon/ai-assistant.png',
    moduleId: 'dashboard',
    isCore: true
  };

  const navigationItems = allNavigationItems.filter(item => {
    if (item.isCore) return true;
    return enabledModules.includes(item.moduleId);
  });

  const visibleItems = navigationItems.slice(0, MAX_VISIBLE_ITEMS);
  const overflowItems = navigationItems.slice(MAX_VISIBLE_ITEMS);
  const hasOverflow = overflowItems.length > 0;

  const currentPath = location.pathname.startsWith(aiItem.value)
    ? aiItem.value
    : navigationItems.find(item => location.pathname.startsWith(item.value))?.value || '/dashboard';

  const isOverflowActive = hasOverflow && overflowItems.some(item => location.pathname.startsWith(item.value));

  // Icon wrapper component avec neumorphisme doux
  const NavIcon = ({ src, alt, isSelected, customIcon }) => (
    <Box
      component="span"
      sx={{
        width: 32,
        height: 32,
        borderRadius: '10px',
        backgroundColor: isDark ? bgColor : theme.palette.background.paper,
        // Ombres neumorphiques douces
        boxShadow: isSelected
          ? (isDark
            ? 'inset 2px 2px 5px rgba(0,0,0,0.3), inset -2px -2px 5px rgba(255,255,255,0.1)'
            : 'inset 2px 2px 5px rgba(0,0,0,0.1), inset -2px -2px 5px rgba(255,255,255,0.7)')
          : (isDark
            ? '3px 3px 6px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.05)'
            : '3px 3px 6px rgba(0,0,0,0.08), -2px -2px 6px rgba(255,255,255,0.9)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        color: isSelected ? 'primary.main' : 'text.secondary',
        '&:hover': {
          transform: 'scale(1.08)',
        }
      }}
    >
      {customIcon || (
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            width: 22,
            height: 22,
            objectFit: 'contain',
            filter: isSelected ? 'brightness(1.2)' : 'none',
            transition: 'filter 0.3s ease',
          }}
        />
      )}
    </Box>
  );

  return (
    <Paper
      data-tutorial="mobile-nav"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', md: 'none' },
        zIndex: 1000,
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.98) : alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(20px)',
        borderTop: 'none',
        // Ombres neumorphiques douces pour la barre
        boxShadow: isDark
          ? '0 -4px 24px rgba(0, 0, 0, 0.5), 0 -2px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 -4px 20px rgba(0, 0, 0, 0.08), 0 -2px 10px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        // Bordure subtile en haut
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: isDark
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)',
        }
      }}
      elevation={0}
    >
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 0.5,
        py: 0.75,
        maxWidth: 500,
        mx: 'auto',
      }}>
        <BottomNavigation
          value={isOverflowActive ? '__more__' : currentPath}
          onChange={(_event, newValue) => {
            if (newValue === '__more__') {
              setMoreMenuOpen(true);
            } else {
              navigate(newValue);
            }
          }}
          showLabels
          sx={{
            backgroundColor: 'transparent',
            width: '100%',
            height: 'auto',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '4px 2px',
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.625rem',
              marginTop: '2px',
              opacity: 0.8,
              '&.Mui-selected': {
                fontSize: '0.65rem',
                fontWeight: 600,
                opacity: 1,
              },
            },
          }}
        >
          {visibleItems.map((item) => {
            const isSelected = currentPath === item.value;
            return (
              <SafeBottomNavigationAction
                key={item.value}
                label={item.label || ''}
                value={item.value}
                icon={<NavIcon src={item.icon} alt={item.label || ''} isSelected={isSelected} />}
                data-tutorial={`menu-${item.moduleId}`}
              />
            );
          })}
          {hasOverflow && (
            <SafeBottomNavigationAction
              key="__more__"
              label="Plus"
              value="__more__"
              icon={<NavIcon src={null} alt="Plus" isSelected={isOverflowActive} customIcon={<MoreIcon sx={{ fontSize: 20 }} />} />}
              data-tutorial="menu-more"
            />
          )}
        </BottomNavigation>
      </Box>

      {/* Tiroir "Plus" — modules au-delà de MAX_VISIBLE_ITEMS, pour ne jamais surcharger la barre */}
      <SwipeableDrawer
        anchor="bottom"
        open={moreMenuOpen}
        onOpen={() => setMoreMenuOpen(true)}
        onClose={() => setMoreMenuOpen(false)}
        disableSwipeToOpen
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, pb: 'env(safe-area-inset-bottom)' } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mb: 1.5 }} />
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
            Autres modules
          </Typography>
        </Box>
        <List sx={{ pt: 0 }}>
          {overflowItems.map((item) => (
            <ListItemButton
              key={item.value}
              selected={currentPath === item.value}
              onClick={() => { setMoreMenuOpen(false); navigate(item.value); }}
            >
              <ListItemIcon sx={{ minWidth: 44 }}>
                <NavIcon src={item.icon} alt={item.label || ''} isSelected={currentPath === item.value} />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </SwipeableDrawer>
    </Paper>
  );
}

export default MobileBottomNav;
