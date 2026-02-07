import React, { useMemo, createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store/store';
import { ModuleProvider } from './contexts/ModuleContext';
import { SharedElementProvider } from './contexts/SharedElementContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { fetchSettings } from './store/slices/settingsSlice';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';

// Healthcare Analytics
import ExamStatusAnalytics from './pages/healthcare/analytics/ExamStatusAnalytics';
import ExamTypesAnalytics from './pages/healthcare/analytics/ExamTypesAnalytics';
import DemographicAnalytics from './pages/healthcare/analytics/DemographicAnalytics';
import RevenueAnalytics from './pages/healthcare/analytics/RevenueAnalytics';
import HealthcareAnalyticsDashboard from './pages/healthcare/analytics/HealthcareAnalyticsDashboard';
import ServiceRevenueAnalytics from './pages/healthcare/analytics/ServiceRevenueAnalytics';
import ActivityIndicatorsPage from './pages/healthcare/analytics/ActivityIndicatorsPage';

// Inventory Analytics
import ReorderAnalytics from './pages/inventory/analytics/ReorderAnalytics';
import StockoutRiskAnalytics from './pages/inventory/analytics/StockoutRiskAnalytics';
import RiskProductsAnalytics from './pages/inventory/analytics/RiskProductsAnalytics';
import MovementAnalytics from './pages/inventory/analytics/MovementAnalytics';
import StockAnalytics from './pages/analytics/StockAnalytics';
import Suppliers from './pages/suppliers/Suppliers';
import SupplierDetail from './pages/suppliers/SupplierDetail';
import SupplierForm from './pages/suppliers/SupplierForm';
import PurchaseOrders from './pages/purchase-orders/PurchaseOrders';
import PurchaseOrderDetail from './pages/purchase-orders/PurchaseOrderDetail';
import PurchaseOrderForm from './pages/purchase-orders/PurchaseOrderForm';
import Invoices from './pages/invoices/Invoices';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoiceForm from './pages/invoices/InvoiceForm';
import Products from './pages/products/Products';
import ProductDetail from './pages/products/ProductDetail';
import ProductForm from './pages/products/ProductForm';
import Clients from './pages/clients/Clients';
import ClientDetail from './pages/clients/ClientDetail';
import ClientForm from './pages/clients/ClientForm';
import AIChat from './pages/ai-chat/AIChat';
import ImportReviews from './pages/ai-chat/ImportReviews';
import DocumentImport from './pages/ai-chat/DocumentImport';
import Settings from './pages/settings/Settings';
import UserManagement from './pages/settings/UserManagement';
import MigrationJobs from './pages/migration/MigrationJobs';
import MigrationWizard from './pages/migration/MigrationWizard';
import DataImportPage from './pages/settings/DataImportPage';
import Pricing from './pages/Pricing';
import Register from './pages/auth/Register';
import LoginEnhanced from './pages/auth/LoginEnhanced';
import OnboardingSetup from './pages/auth/OnboardingSetup';
import Help from './pages/Help';
import FAQ from './pages/FAQ';
import KeyboardShortcuts from './pages/KeyboardShortcuts';
import Support from './pages/Support';

// Healthcare Pages
import PatientList from './pages/healthcare/patients/PatientList';
import PatientForm from './pages/healthcare/patients/PatientForm';
import PatientDetail from './pages/healthcare/patients/PatientDetail';
import VisitForm from './pages/healthcare/patients/VisitForm';
import ReceptionDashboard from './pages/healthcare/reception/ReceptionDashboard';
import LabOrderList from './pages/healthcare/laboratory/LabOrderList';
import LabOrderDetail from './pages/healthcare/laboratory/LabOrderDetail';
import LabOrderForm from './pages/healthcare/laboratory/LabOrderForm';
import LabOrderDispatch from './pages/healthcare/laboratory/LabOrderDispatch';
import LabTestCatalog from './pages/healthcare/laboratory/LabTestCatalog';
import InventoryList from './pages/healthcare/pharmacy/InventoryList';
import DispensingList from './pages/healthcare/pharmacy/DispensingList';
import DispensingForm from './pages/healthcare/pharmacy/DispensingForm';
import DispensingDetail from './pages/healthcare/pharmacy/DispensingDetail';
import MedicationDetail from './pages/healthcare/pharmacy/MedicationDetail';
import ConsultationList from './pages/healthcare/consultations/ConsultationList';
import ConsultationForm from './pages/healthcare/consultations/ConsultationForm';
import ConsultationDetail from './pages/healthcare/consultations/ConsultationDetail';

// Guards
import PrivateRoute from './components/guards/PrivateRoute';
import ModuleRoute from './components/guards/ModuleRoute';
import HomeRedirect from './components/HomeRedirect';

// PWA
import PWAInstallPrompt from './components/PWAInstallPrompt';

// AdSense
import { AdSenseScript } from './components/AdSense';

// Theme Context for dark mode
export const ColorModeContext = createContext({
  toggleColorMode: () => { },
  mode: 'light'
});

export const useColorMode = () => useContext(ColorModeContext);

// Get design tokens based on mode
const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
        // Light mode - Clean & Professional (based on mascot theme)
        primary: {
          main: '#2563eb',
          light: '#3b82f6',
          dark: '#1d4ed8',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#64748b',
          light: '#94a3b8',
          dark: '#475569',
          contrastText: '#ffffff',
        },
        // Golden accent from mascot earring
        accent: {
          main: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        error: {
          main: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        warning: {
          main: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
        },
        info: {
          main: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
        success: {
          main: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        background: {
          default: '#e6e9ef',
          paper: '#e6e9ef',
          subtle: '#e6e9ef',
        },
        text: {
          primary: '#0f172a',
          secondary: '#64748b',
          disabled: '#94a3b8',
        },
        divider: 'rgba(0, 0, 0, 0.06)',
        action: {
          hover: 'rgba(0, 0, 0, 0.04)',
          selected: 'rgba(37, 99, 235, 0.08)',
          selectedOpacity: 0.08,
        },
      }
      : {
        // Dark mode - Deep & Immersive (based on mascot theme)
        primary: {
          main: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
          contrastText: '#ffffff',
        },
        secondary: {
          main: '#94a3b8',
          light: '#cbd5e1',
          dark: '#64748b',
          contrastText: '#0f172a',
        },
        // Golden accent from mascot earring
        accent: {
          main: '#fbbf24',
          light: '#fcd34d',
          dark: '#f59e0b',
        },
        error: {
          main: '#f87171',
          light: '#fca5a5',
          dark: '#ef4444',
        },
        warning: {
          main: '#fbbf24',
          light: '#fcd34d',
          dark: '#f59e0b',
        },
        info: {
          main: '#60a5fa',
          light: '#93c5fd',
          dark: '#3b82f6',
        },
        success: {
          main: '#34d399',
          light: '#6ee7b7',
          dark: '#10b981',
        },
        background: {
          default: '#1e2530',
          paper: '#1e2530',
          subtle: '#1e2530',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          disabled: '#64748b',
        },
        divider: 'rgba(255, 255, 255, 0.06)',
        action: {
          hover: 'rgba(255, 255, 255, 0.05)',
          selected: 'rgba(59, 130, 246, 0.15)',
          selectedOpacity: 0.15,
        },
      }),
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: { fontWeight: 600, fontSize: '2rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.4 },
    h4: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.5 },
    subtitle1: { fontSize: '0.938rem', lineHeight: 1.5, fontWeight: 500 },
    subtitle2: { fontSize: '0.813rem', lineHeight: 1.5, fontWeight: 500 },
    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
    body2: { fontSize: '0.813rem', lineHeight: 1.6 },
    button: { fontWeight: 500, fontSize: '0.813rem', lineHeight: 1.5, letterSpacing: '0.01em' },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  shadows: [
    'none',
    mode === 'light' ? '5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff' : '5px 5px 10px #151820, -5px -5px 10px #272e3d',
    mode === 'light' ? '8px 8px 16px #c1c5cc, -8px -8px 16px #ffffff' : '8px 8px 16px #151820, -8px -8px 16px #272e3d',
    mode === 'light' ? '12px 12px 24px #c1c5cc, -12px -12px 24px #ffffff' : '12px 12px 24px #151820, -12px -12px 24px #272e3d',
    mode === 'light' ? '16px 16px 32px #c1c5cc, -16px -16px 32px #ffffff' : '16px 16px 32px #151820, -16px -16px 32px #272e3d',
    mode === 'light' ? '20px 20px 40px #c1c5cc, -20px -20px 40px #ffffff' : '20px 20px 40px #151820, -20px -20px 40px #272e3d',
    ...Array(19).fill(mode === 'light' ? '12px 12px 24px #c1c5cc, -12px -12px 24px #ffffff' : '12px 12px 24px #151820, -12px -12px 24px #272e3d'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: mode === 'light' ? '#cbd5e1 #f1f5f9' : '#475569 #1e293b',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': {
            background: mode === 'light' ? '#f1f5f9' : '#1e293b'
          },
          '&::-webkit-scrollbar-thumb': {
            background: mode === 'light' ? '#cbd5e1' : '#475569',
            borderRadius: '3px',
            '&:hover': { background: mode === 'light' ? '#94a3b8' : '#64748b' },
          },
        },
      }),
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 12,
          padding: '6px 14px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          boxShadow: mode === 'light'
            ? '5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff'
            : '5px 5px 10px #151820, -5px -5px 10px #272e3d',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '3px 3px 6px #c1c5cc, -3px -3px 6px #ffffff'
              : '3px 3px 6px #151820, -3px -3px 6px #272e3d',
            transform: 'translateY(1px)',
          },
          '&:active': {
            boxShadow: mode === 'light'
              ? 'inset 4px 4px 8px #c1c5cc, inset -4px -4px 8px #ffffff'
              : 'inset 4px 4px 8px #151820, inset -4px -4px 8px #272e3d',
            transform: 'translateY(2px)',
          },
        },
        outlined: {
          boxShadow: mode === 'light'
            ? '5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff'
            : '5px 5px 10px #151820, -5px -5px 10px #272e3d',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '3px 3px 6px #c1c5cc, -3px -3px 6px #ffffff'
              : '3px 3px 6px #151820, -3px -3px 6px #272e3d',
            transform: 'translateY(1px)',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'transparent',
            transform: 'scale(1.02)',
          },
        },
        sizeSmall: { padding: '4px 10px', fontSize: '0.75rem' },
        sizeLarge: { padding: '8px 18px', fontSize: '0.875rem' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: 'none',
          background: mode === 'light' ? '#e6e9ef' : '#1e2530',
          boxShadow: mode === 'light'
            ? '8px 8px 16px #c1c5cc, -8px -8px 16px #ffffff'
            : '8px 8px 16px #151820, -8px -8px 16px #272e3d',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff'
              : '5px 5px 10px #151820, -5px -5px 10px #272e3d',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': { paddingBottom: '16px' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundImage: 'none',
          background: mode === 'light' ? '#e6e9ef' : '#1e2530',
        },
        elevation0: { boxShadow: 'none' },
        elevation1: {
          boxShadow: mode === 'light'
            ? '5px 5px 10px #c1c5cc, -5px -5px 10px #ffffff'
            : '5px 5px 10px #151820, -5px -5px 10px #272e3d'
        },
        elevation2: {
          boxShadow: mode === 'light'
            ? '8px 8px 16px #c1c5cc, -8px -8px 16px #ffffff'
            : '8px 8px 16px #151820, -8px -8px 16px #272e3d'
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '2px 6px',
          padding: '8px 12px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&.Mui-selected': {
            backgroundColor: mode === 'light' ? '#e6e9ef' : '#1e2530',
            boxShadow: mode === 'light'
              ? 'inset 5px 5px 10px #c1c5cc, inset -5px -5px 10px #ffffff'
              : 'inset 5px 5px 10px #151820, inset -5px -5px 10px #272e3d',
            '&:hover': {
              boxShadow: mode === 'light'
                ? 'inset 6px 6px 12px #c1c5cc, inset -6px -6px 12px #ffffff'
                : 'inset 6px 6px 12px #151820, inset -6px -6px 12px #272e3d',
            },
          },
          '&:hover': {
            backgroundColor: mode === 'light' ? '#e6e9ef' : '#1e2530',
            boxShadow: mode === 'light'
              ? '3px 3px 6px #c1c5cc, -3px -3px 6px #ffffff'
              : '3px 3px 6px #151820, -3px -3px 6px #272e3d',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, borderRadius: 6, height: 26 },
        sizeSmall: { height: 22, fontSize: '0.75rem' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: mode === 'light' ? '#e6e9ef' : '#1e2530',
            boxShadow: mode === 'light'
              ? 'inset 5px 5px 10px #c1c5cc, inset -5px -5px 10px #ffffff'
              : 'inset 5px 5px 10px #151820, inset -5px -5px 10px #272e3d',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': { border: 'none' },
            '&:hover': {
              boxShadow: mode === 'light'
                ? 'inset 6px 6px 12px #c1c5cc, inset -6px -6px 12px #ffffff'
                : 'inset 6px 6px 12px #151820, inset -6px -6px 12px #272e3d',
            },
            '&.Mui-focused': {
              boxShadow: mode === 'light'
                ? '0 0 0 3px rgba(37, 99, 235, 0.2), inset 5px 5px 10px #c1c5cc, inset -5px -5px 10px #ffffff'
                : '0 0 0 3px rgba(59, 130, 246, 0.2), inset 5px 5px 10px #151820, inset -5px -5px 10px #272e3d',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'light'
            ? '1px solid rgba(0,0,0,0.05)'
            : '1px solid rgba(255,255,255,0.05)',
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: mode === 'light' ? '#f8fafc' : '#0f172a',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'light'
              ? 'rgba(0,0,0,0.02)'
              : 'rgba(255,255,255,0.02)',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: mode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 3, height: 4 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: mode === 'light'
            ? '0 4px 20px rgba(0,0,0,0.1)'
            : '0 4px 20px rgba(0,0,0,0.5)',
          border: mode === 'light'
            ? '1px solid rgba(0,0,0,0.05)'
            : '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: mode === 'light' ? '#1e293b' : '#f1f5f9',
          color: mode === 'light' ? '#f1f5f9' : '#1e293b',
          fontSize: '0.75rem',
          borderRadius: 4,
          padding: '4px 8px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: mode === 'light'
            ? '0 25px 50px rgba(0,0,0,0.15)'
            : '0 25px 50px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          borderRadius: 1,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 40,
        },
      },
    },
  },
});

// App Initializer component
function AppInitializer({ children }) {
  const dispatch = useDispatch();
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    const initializeApp = async () => {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        try {
          await dispatch(fetchSettings()).unwrap();
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
      setInitialized(true);
    };
    initializeApp();
  }, [dispatch]);

  if (!initialized) return null;
  return children;
}

function App() {
  // Theme mode state - persisted to localStorage
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) return savedMode;
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Apply theme to document body for CSS variables
  useEffect(() => {
    document.body.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
    if (mode === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('themeMode')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  const [onboardingChecked, setOnboardingChecked] = React.useState(false);

  React.useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Fonction pour déterminer si l'onboarding est nécessaire
  const checkIfOnboardingNeeded = (userData) => {
    // 1. Vérifier si onboarding_completed n'est pas explicitement true
    if (userData.preferences?.onboarding_completed === true) {
      return false;
    }

    // 2. Vérifier si les informations essentielles sont vides
    const organization = userData.organization;

    // Si pas d'organisation, onboarding nécessaire
    if (!organization) {
      return true;
    }

    // Si le nom de l'organisation est vide ou générique, onboarding nécessaire
    if (!organization.name || organization.name.startsWith('Organization ')) {
      return true;
    }

    // 3. Vérifier les informations de l'utilisateur
    const user = userData;

    // Si le prénom ou nom est vide/générique, onboarding nécessaire
    if (!user.first_name || !user.last_name ||
      user.first_name === 'User' || user.last_name === 'User') {
      return true;
    }

    // 4. Si toutes les vérifications passent, pas besoin d'onboarding
    return false;
  };

  const checkOnboardingStatus = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        setOnboardingChecked(true);
        return;
      }

      const response = await fetch('/api/v1/accounts/profile/', {
        headers: { 'Authorization': `Token ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();

        // Vérifier si l'onboarding est nécessaire
        const needsOnboarding = checkIfOnboardingNeeded(data);

        if (needsOnboarding && window.location.pathname !== '/onboarding') {
          window.location.href = '/onboarding';
          return;
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setOnboardingChecked(true);
    }
  };

  return (
    <ColorModeContext.Provider value={colorMode}>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              autoHideDuration={3000}
            >
              <AppInitializer>
                <ModuleProvider>
                  <SharedElementProvider>
                    <AdSenseScript />
                    {onboardingChecked && (
                      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <Routes>
                          {/* Public Routes */}
                          <Route path="/pricing" element={<Pricing />} />

                          {/* Auth Routes */}
                          <Route element={<AuthLayout />}>
                            <Route path="/login" element={<LoginEnhanced />} />
                            <Route path="/register" element={<Register />} />
                          </Route>

                          {/* Onboarding */}
                          <Route element={<PrivateRoute />}>
                            <Route path="/onboarding" element={<OnboardingSetup />} />
                          </Route>

                          {/* Protected Routes */}
                          <Route element={<PrivateRoute />}>
                            <Route element={<MainLayout />}>
                              <Route path="/" element={<HomeRedirect />} />
                              <Route path="/dashboard" element={<ModuleRoute module="dashboard"><Dashboard /></ModuleRoute>} />

                              {/* Healthcare Analytics */}
                              <Route path="/healthcare/analytics" element={<HealthcareAnalyticsDashboard />} />
                              <Route path="/healthcare/analytics/exam-status" element={<ExamStatusAnalytics />} />
                              <Route path="/healthcare/analytics/exam-types" element={<ExamTypesAnalytics />} />
                              <Route path="/healthcare/analytics/demographics" element={<DemographicAnalytics />} />
                              <Route path="/healthcare/analytics/revenue" element={<RevenueAnalytics />} />
                              <Route path="/healthcare/analytics/services" element={<ServiceRevenueAnalytics />} />
                              <Route path="/healthcare/analytics/activity-indicators" element={<ActivityIndicatorsPage />} />

                              {/* Inventory Analytics */}
                              <Route path="/inventory/analytics" element={<StockAnalytics />} />
                              <Route path="/inventory/analytics/reorder" element={<ReorderAnalytics />} />
                              <Route path="/inventory/analytics/stockout-risk" element={<StockoutRiskAnalytics />} />
                              <Route path="/inventory/analytics/at-risk" element={<RiskProductsAnalytics />} />
                              <Route path="/inventory/analytics/movements" element={<MovementAnalytics />} />

                              {/* Suppliers */}
                              <Route path="/suppliers" element={<ModuleRoute module="suppliers"><Suppliers /></ModuleRoute>} />
                              <Route path="/suppliers/new" element={<ModuleRoute module="suppliers"><SupplierForm /></ModuleRoute>} />
                              <Route path="/suppliers/:id" element={<ModuleRoute module="suppliers"><SupplierDetail /></ModuleRoute>} />
                              <Route path="/suppliers/:id/edit" element={<ModuleRoute module="suppliers"><SupplierForm /></ModuleRoute>} />

                              {/* Purchase Orders */}
                              <Route path="/purchase-orders" element={<ModuleRoute module="purchase-orders"><PurchaseOrders /></ModuleRoute>} />
                              <Route path="/purchase-orders/new" element={<ModuleRoute module="purchase-orders"><PurchaseOrderForm /></ModuleRoute>} />
                              <Route path="/purchase-orders/:id" element={<ModuleRoute module="purchase-orders"><PurchaseOrderDetail /></ModuleRoute>} />
                              <Route path="/purchase-orders/:id/edit" element={<ModuleRoute module="purchase-orders"><PurchaseOrderForm /></ModuleRoute>} />

                              {/* Invoices */}
                              <Route path="/invoices" element={<ModuleRoute module="invoices"><Invoices /></ModuleRoute>} />
                              <Route path="/invoices/new" element={<ModuleRoute module="invoices"><InvoiceForm /></ModuleRoute>} />
                              <Route path="/invoices/:id" element={<ModuleRoute module="invoices"><InvoiceDetail /></ModuleRoute>} />
                              <Route path="/invoices/:id/edit" element={<ModuleRoute module="invoices"><InvoiceForm /></ModuleRoute>} />

                              {/* Products */}
                              <Route path="/products" element={<ModuleRoute module="products"><Products /></ModuleRoute>} />
                              <Route path="/products/new" element={<ModuleRoute module="products"><ProductForm /></ModuleRoute>} />
                              <Route path="/products/:id" element={<ModuleRoute module="products"><ProductDetail /></ModuleRoute>} />
                              <Route path="/products/:id/edit" element={<ModuleRoute module="products"><ProductForm /></ModuleRoute>} />

                              {/* Clients */}
                              <Route path="/clients" element={<ModuleRoute module="clients"><Clients /></ModuleRoute>} />
                              <Route path="/clients/new" element={<ModuleRoute module="clients"><ClientForm /></ModuleRoute>} />
                              <Route path="/clients/:id" element={<ModuleRoute module="clients"><ClientDetail /></ModuleRoute>} />
                              <Route path="/clients/:id/edit" element={<ModuleRoute module="clients"><ClientForm /></ModuleRoute>} />

                              {/* Data Migration */}
                              <Route path="/migration/jobs" element={<MigrationJobs />} />
                              <Route path="/migration/wizard" element={<MigrationWizard />} />

                              {/* AI Chat */}
                              <Route path="/ai-chat" element={<AIChat />} />
                              <Route path="/ai-chat/import-reviews" element={<ImportReviews />} />
                              <Route path="/ai-chat/document-import" element={<DocumentImport />} />

                              {/* Settings */}
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/settings/users" element={<UserManagement />} />
                              <Route path="/settings/import" element={<DataImportPage />} />

                              {/* Help & Documentation */}
                              <Route path="/help" element={<Help />} />
                              <Route path="/help/:articleId" element={<Help />} />
                              <Route path="/help/faq" element={<FAQ />} />
                              <Route path="/help/shortcuts" element={<KeyboardShortcuts />} />
                              <Route path="/support" element={<Support />} />

                              {/* Healthcare Modules */}
                              <Route path="/healthcare/patients" element={<ModuleRoute module="patients"><PatientList /></ModuleRoute>} />
                              <Route path="/healthcare/patients/new" element={<ModuleRoute module="patients"><PatientForm /></ModuleRoute>} />
                              <Route path="/healthcare/patients/:id" element={<ModuleRoute module="patients"><PatientDetail /></ModuleRoute>} />
                              <Route path="/healthcare/patients/:id/edit" element={<ModuleRoute module="patients"><PatientForm /></ModuleRoute>} />
                              <Route path="/healthcare/visits/new" element={<ModuleRoute module="patients"><VisitForm /></ModuleRoute>} />
                              <Route path="/healthcare/reception" element={<ModuleRoute module="patients"><ReceptionDashboard /></ModuleRoute>} />

                              {/* Laboratory */}
                              <Route path="/healthcare/laboratory" element={<ModuleRoute module="laboratory"><LabOrderList /></ModuleRoute>} />
                              <Route path="/healthcare/laboratory/new" element={<ModuleRoute module="laboratory"><LabOrderForm /></ModuleRoute>} />
                              <Route path="/healthcare/laboratory/:id/dispatch" element={<ModuleRoute module="laboratory"><LabOrderDispatch /></ModuleRoute>} />
                              <Route path="/healthcare/laboratory/catalog" element={<ModuleRoute module="laboratory"><LabTestCatalog /></ModuleRoute>} />
                              <Route path="/healthcare/laboratory/:id" element={<ModuleRoute module="laboratory"><LabOrderDetail /></ModuleRoute>} />

                              {/* Pharmacy */}
                              <Route path="/healthcare/pharmacy/inventory" element={<ModuleRoute module="pharmacy"><InventoryList /></ModuleRoute>} />
                              <Route path="/healthcare/pharmacy/medications/:id" element={<ModuleRoute module="pharmacy"><MedicationDetail /></ModuleRoute>} />
                              <Route path="/healthcare/pharmacy/dispensing" element={<ModuleRoute module="pharmacy"><DispensingList /></ModuleRoute>} />
                              <Route path="/healthcare/pharmacy/dispense/new" element={<ModuleRoute module="pharmacy"><DispensingForm /></ModuleRoute>} />
                              <Route path="/healthcare/pharmacy/dispensing/:id" element={<ModuleRoute module="pharmacy"><DispensingDetail /></ModuleRoute>} />

                              {/* Consultations */}
                              <Route path="/healthcare/consultations" element={<ModuleRoute module="consultations"><ConsultationList /></ModuleRoute>} />
                              <Route path="/healthcare/consultations/new" element={<ModuleRoute module="consultations"><ConsultationForm /></ModuleRoute>} />
                              <Route path="/healthcare/consultations/:id" element={<ModuleRoute module="consultations"><ConsultationDetail /></ModuleRoute>} />
                              <Route path="/healthcare/consultations/:id/edit" element={<ModuleRoute module="consultations"><ConsultationForm /></ModuleRoute>} />
                            </Route>
                          </Route>

                          {/* 404 */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                        <PWAInstallPrompt />
                      </Router>
                    )}
                  </SharedElementProvider>
                </ModuleProvider>
              </AppInitializer>
            </SnackbarProvider>
          </ThemeProvider>
        </I18nextProvider>
      </Provider>
    </ColorModeContext.Provider>
  );
}

export default App;
