import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper, Box, useTheme, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import IconImage from './IconImage';

function MobileBottomNav({ enabledModules = ['dashboard'] }) {
  const { t } = useTranslation(['navigation']);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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

  // Icon wrapper component pour dark mode avec fond beige
  const NavIcon = ({ src, alt, isSelected }) => (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '8px',
        backgroundColor: isDark ? bgColor : 'transparent',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
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
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.95) : 'background.paper',
        backdropFilter: 'blur(12px)',
        borderTop: 'none',
        boxShadow: isDark 
          ? '0 -2px 20px rgba(0, 0, 0, 0.4)' 
          : '0 -2px 10px rgba(0, 0, 0, 0.05)',
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

        {/* IA au centre */}
        <Box
          sx={{
            mx: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:active': { transform: 'scale(0.95)' },
          }}
          onClick={() => navigate(aiItem.value)}
          data-tutorial="ai-button"
        >
          <Box
            sx={{
              width: 50,
              height: 50,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isAIActive 
                ? 'primary.main' 
                : (isDark ? bgColor : alpha(theme.palette.primary.main, 0.08)),
              transition: 'all 0.2s ease',
              boxShadow: isAIActive 
                ? '0 4px 14px rgba(37, 99, 235, 0.35)' 
                : (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'),
              transform: isAIActive ? 'translateY(-4px)' : 'translateY(0)',
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
                filter: isAIActive && !isDark ? 'brightness(0) invert(1)' : 'none',
              }}
            />
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: '0.625rem',
              mt: 0.5,
              color: isAIActive ? 'primary.main' : 'text.secondary',
              fontWeight: isAIActive ? 600 : 500,
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
