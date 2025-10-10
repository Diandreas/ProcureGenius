import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Dashboard,
  Business,
  ShoppingCart,
  Receipt,
  Chat,
  Inventory,
  People,
  Settings,
} from '@mui/icons-material';

// Tous les items possibles avec leur module associé
const allNavigationItems = [
  { label: 'Tableau', value: '/dashboard', icon: <Dashboard />, moduleId: 'dashboard', isCore: true },
  { label: 'Fournisseurs', value: '/suppliers', icon: <Business />, moduleId: 'suppliers', isCore: false },
  { label: 'Commandes', value: '/purchase-orders', icon: <ShoppingCart />, moduleId: 'purchase-orders', isCore: false },
  { label: 'Factures', value: '/invoices', icon: <Receipt />, moduleId: 'invoices', isCore: false },
  { label: 'Produits', value: '/products', icon: <Inventory />, moduleId: 'products', isCore: false },
  { label: 'Clients', value: '/clients', icon: <People />, moduleId: 'clients', isCore: false },
  { label: 'IA', value: '/ai-chat', icon: <Chat />, moduleId: 'dashboard', isCore: true }, // Toujours visible
];

function MobileBottomNav({ enabledModules = ['dashboard'] }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Filtrer les items : modules core (toujours) + modules activés
  const navigationItems = allNavigationItems.filter(item => {
    if (item.isCore) return true; // Les modules core sont toujours affichés
    return enabledModules.includes(item.moduleId);
  });

  const currentPath = navigationItems.find(item =>
    location.pathname.startsWith(item.value)
  )?.value || '/dashboard';

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', sm: 'none' },
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={currentPath}
        onChange={(event, newValue) => {
          navigate(newValue);
        }}
        showLabels
      >
        {navigationItems.map((item) => (
          <BottomNavigationAction
            key={item.value}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

export default MobileBottomNav;