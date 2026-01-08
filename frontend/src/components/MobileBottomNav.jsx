import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper, Box, useTheme, alpha, Badge } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { aiChatAPI } from '../services/api';
import IconImage from './IconImage';

function MobileBottomNav({ enabledModules = ['dashboard'] }) {
  const { t } = useTranslation(['navigation']);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [notificationsCount, setNotificationsCount] = useState(0);

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
    { label: t('navigation:mobile.suppliers'), value: '/suppliers', icon: '/icon/supplier.png', moduleId: 'suppliers', isCore: false },
    { label: t('navigation:mobile.orders'), value: '/purchase-orders', icon: '/icon/purchase-order.png', moduleId: 'purchase-orders', isCore: false },
    { label: t('navigation:mobile.invoices'), value: '/invoices', icon: '/icon/bill.png', moduleId: 'invoices', isCore: false },
    { label: t('navigation:mobile.products'), value: '/products', icon: '/icon/product.png', moduleId: 'products', isCore: false },
    { label: t('navigation:mobile.clients'), value: '/clients', icon: '/icon/user.png', moduleId: 'clients', isCore: false },
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

  const halfLength = Math.ceil(navigationItems.length / 2);
  const leftItems = navigationItems.slice(0, halfLength);
  const rightItems = navigationItems.slice(halfLength);

  const currentPath = location.pathname.startsWith(aiItem.value)
    ? aiItem.value
    : navigationItems.find(item => location.pathname.startsWith(item.value))?.value || '/dashboard';

  const isAIActive = location.pathname.startsWith(aiItem.value);

  // Icon wrapper component avec neumorphisme doux
  const NavIcon = ({ src, alt, isSelected }) => (
    <Box
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
        '&:hover': {
          transform: 'scale(1.08)',
        }
      }}
    >
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
        {/* Items de gauche */}
        <Box sx={{ display: 'flex', flex: 1 }}>
          <BottomNavigation
            value={currentPath}
            onChange={(_event, newValue) => navigate(newValue)}
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
            {leftItems.map((item) => {
              const isSelected = currentPath === item.value;
              return (
                <BottomNavigationAction
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  icon={<NavIcon src={item.icon} alt={item.label} isSelected={isSelected} />}
                  data-tutorial={`menu-${item.moduleId}`}
                />
              );
            })}
          </BottomNavigation>
        </Box>

        {/* IA au centre avec design neumorphique élégant */}
        <Box
          sx={{
            mx: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:active': { transform: 'scale(0.92)' },
          }}
          onClick={() => navigate(aiItem.value)}
          data-tutorial="ai-button"
        >
          <Badge
            badgeContent={notificationsCount}
            color="error"
            max={9}
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.625rem',
                height: 18,
                minWidth: 18,
                padding: '0 4px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
              },
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isAIActive
                  ? 'primary.main'
                  : (isDark ? bgColor : theme.palette.background.paper),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                // Ombres neumorphiques douces pour le bouton IA central
                boxShadow: isAIActive
                  ? `0 6px 20px ${alpha(theme.palette.primary.main, 0.45)}, 0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`
                  : (isDark
                      ? '4px 4px 10px rgba(0,0,0,0.5), -3px -3px 10px rgba(255,255,255,0.08)'
                      : '5px 5px 12px rgba(0,0,0,0.1), -3px -3px 10px rgba(255,255,255,1)'),
                transform: isAIActive ? 'translateY(-6px) scale(1.05)' : 'translateY(0)',
                '&:hover': {
                  transform: isAIActive ? 'translateY(-7px) scale(1.08)' : 'translateY(-2px) scale(1.03)',
                  boxShadow: isAIActive
                    ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.5)}`
                    : (isDark
                        ? '6px 6px 14px rgba(0,0,0,0.6), -4px -4px 12px rgba(255,255,255,0.1)'
                        : '6px 6px 16px rgba(0,0,0,0.12), -4px -4px 12px rgba(255,255,255,1)'),
                }
              }}
            >
              <Box
                component="img"
                src={aiItem.icon}
                alt="Assistant IA"
                sx={{
                  width: 28,
                  height: 28,
                  objectFit: 'contain',
                  filter: isAIActive && !isDark ? 'brightness(0) invert(1) drop-shadow(0 0 4px rgba(255,255,255,0.5))' : 'none',
                  transition: 'filter 0.3s ease',
                }}
              />
            </Box>
          </Badge>
          <Box
            component="span"
            sx={{
              fontSize: '0.625rem',
              mt: 0.5,
              color: isAIActive ? 'primary.main' : 'text.secondary',
              fontWeight: isAIActive ? 700 : 500,
              transition: 'all 0.3s ease',
              textShadow: isAIActive ? `0 0 8px ${alpha(theme.palette.primary.main, 0.3)}` : 'none',
            }}
          >
            {aiItem.label}
          </Box>
        </Box>

        {/* Items de droite */}
        <Box sx={{ display: 'flex', flex: 1 }}>
          <BottomNavigation
            value={currentPath}
            onChange={(_event, newValue) => navigate(newValue)}
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
            {rightItems.map((item) => {
              const isSelected = currentPath === item.value;
              return (
                <BottomNavigationAction
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  icon={<NavIcon src={item.icon} alt={item.label} isSelected={isSelected} />}
                  data-tutorial={`menu-${item.moduleId}`}
                />
              );
            })}
          </BottomNavigation>
        </Box>
      </Box>
    </Paper>
  );
}

export default MobileBottomNav;
