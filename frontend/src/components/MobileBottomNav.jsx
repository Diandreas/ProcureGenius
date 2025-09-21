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
} from '@mui/icons-material';

const navigationItems = [
  { label: 'Tableau', value: '/dashboard', icon: <Dashboard /> },
  { label: 'Fournisseurs', value: '/suppliers', icon: <Business /> },
  { label: 'Commandes', value: '/purchase-orders', icon: <ShoppingCart /> },
  { label: 'Factures', value: '/invoices', icon: <Receipt /> },
  { label: 'IA', value: '/ai-chat', icon: <Chat /> },
];

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

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