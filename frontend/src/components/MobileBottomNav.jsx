import { useNavigate, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Paper, Box } from '@mui/material';
import IconImage from './IconImage';

// Tous les items possibles avec leur module associé (sans IA)
const allNavigationItems = [
  { label: 'Tableau', value: '/dashboard', icon: '/icon/dashboard.png', moduleId: 'dashboard', isCore: true },
  { label: 'Fournisseurs', value: '/suppliers', icon: '/icon/supplier.png', moduleId: 'suppliers', isCore: false },
  { label: 'Commandes', value: '/purchase-orders', icon: '/icon/purchase-order.png', moduleId: 'purchase-orders', isCore: false },
  { label: 'Factures', value: '/invoices', icon: '/icon/bill.png', moduleId: 'invoices', isCore: false },
  { label: 'Produits', value: '/products', icon: '/icon/product.png', moduleId: 'products', isCore: false },
  { label: 'Clients', value: '/clients', icon: '/icon/user.png', moduleId: 'clients', isCore: false },
];

// Item IA (séparé pour le mettre au centre)
const aiItem = {
  label: 'IA',
  value: '/ai-chat',
  icon: '/icon/ai-assistant.png',
  moduleId: 'dashboard',
  isCore: true
};

function MobileBottomNav({ enabledModules = ['dashboard'] }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Filtrer les items : modules core (toujours) + modules activés
  const navigationItems = allNavigationItems.filter(item => {
    if (item.isCore) return true;
    return enabledModules.includes(item.moduleId);
  });

  // Diviser les items en deux groupes pour placer l'IA au centre
  const halfLength = Math.ceil(navigationItems.length / 2);
  const leftItems = navigationItems.slice(0, halfLength);
  const rightItems = navigationItems.slice(halfLength);

  const currentPath = location.pathname.startsWith(aiItem.value)
    ? aiItem.value
    : navigationItems.find(item => location.pathname.startsWith(item.value))?.value || '/dashboard';

  const isAIActive = location.pathname.startsWith(aiItem.value);

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', sm: 'none' },
        zIndex: 1000,
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
      elevation={3}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 1 }}>
        {/* Items de gauche */}
        <Box sx={{ display: 'flex', flex: 1 }}>
          <BottomNavigation
            value={currentPath}
            onChange={(_event, newValue) => {
              navigate(newValue);
            }}
            showLabels
            sx={{
              backgroundColor: 'transparent',
              width: '100%',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                padding: '6px 4px',
                color: 'text.secondary',
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  color: 'primary.main',
                  transform: 'translateY(-4px)',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem',
                marginTop: '4px',
                '&.Mui-selected': {
                  fontSize: '0.7rem',
                  fontWeight: 600,
                },
              },
            }}
          >
            {leftItems.map((item) => (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                icon={<IconImage src={item.icon} alt={item.label} size={24} />}
              />
            ))}
          </BottomNavigation>
        </Box>

        {/* IA au centre - Sur la même ligne mais légèrement surélevé */}
        <Box
          sx={{
            mx: 0.5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: isAIActive ? 'translateY(-6px)' : 'translateY(0)',
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
          onClick={() => navigate(aiItem.value)}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: isAIActive ? 'primary.main' : 'background.default',
              border: '2px solid',
              borderColor: isAIActive ? 'primary.main' : 'divider',
              transition: 'all 0.3s ease',
              boxShadow: isAIActive ? '0 4px 12px rgba(30, 64, 175, 0.3)' : 'none',
            }}
          >
            <IconImage src={aiItem.icon} alt="Assistant IA" size={28} />
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: '0.65rem',
              mt: 0.5,
              color: isAIActive ? 'primary.main' : 'text.secondary',
              fontWeight: isAIActive ? 600 : 500,
              transition: 'all 0.3s ease',
            }}
          >
            {aiItem.label}
          </Box>
        </Box>

        {/* Items de droite */}
        <Box sx={{ display: 'flex', flex: 1 }}>
          <BottomNavigation
            value={currentPath}
            onChange={(_event, newValue) => {
              navigate(newValue);
            }}
            showLabels
            sx={{
              backgroundColor: 'transparent',
              width: '100%',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                padding: '6px 4px',
                color: 'text.secondary',
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  color: 'primary.main',
                  transform: 'translateY(-4px)',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem',
                marginTop: '4px',
                '&.Mui-selected': {
                  fontSize: '0.7rem',
                  fontWeight: 600,
                },
              },
            }}
          >
            {rightItems.map((item) => (
              <BottomNavigationAction
                key={item.value}
                label={item.label}
                value={item.value}
                icon={<IconImage src={item.icon} alt={item.label} size={24} />}
              />
            ))}
          </BottomNavigation>
        </Box>
      </Box>
    </Paper>
  );
}

export default MobileBottomNav;
