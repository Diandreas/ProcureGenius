import React, { useMemo, createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import { Provider, useDispatch } from 'react-redux';
import { store } from './store/store';
import { ModuleProvider } from './contexts/ModuleContext';
import { SharedElementProvider } from './contexts/SharedElementContext';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { isNativePlatform } from './utils/platform';

// Sur l'app mobile native, on demarre sur /login (puis /dashboard si connecte)
// au lieu de la page marketing /landing, et /landing est bloque -> /login.
const NATIVE_APP = isNativePlatform();
const ROOT_REDIRECT = NATIVE_APP ? '/login' : '/landing';
import { fetchSettings } from './store/slices/settingsSlice';
import { HeaderProvider } from './contexts/HeaderContext';
import { AccountingHelpProvider } from './contexts/AccountingHelpContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Lazy-loaded pages — chaque module est chargé à la demande
const Login         = React.lazy(() => import('./pages/auth/Login'));
const LoginEnhanced = React.lazy(() => import('./pages/auth/LoginEnhanced'));
const Register      = React.lazy(() => import('./pages/auth/Register'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword  = React.lazy(() => import('./pages/auth/ResetPassword'));
const OnboardingSetup = React.lazy(() => import('./pages/auth/OnboardingSetup'));

const Landing          = React.lazy(() => import('./pages/Landing'));
const Pricing             = React.lazy(() => import('./pages/Pricing'));
const SubscriptionSuccess = React.lazy(() => import('./pages/SubscriptionSuccess'));
const InternalPricing      = React.lazy(() => import('./pages/subscription/InternalPricing'));
const Help             = React.lazy(() => import('./pages/Help'));
const FAQ              = React.lazy(() => import('./pages/FAQ'));
const KeyboardShortcuts = React.lazy(() => import('./pages/KeyboardShortcuts'));
const Support          = React.lazy(() => import('./pages/Support'));
const PublicSupport    = React.lazy(() => import('./pages/public/Support'));
const Documentation    = React.lazy(() => import('./pages/public/Documentation'));
const PrivacyPolicy    = React.lazy(() => import('./pages/public/PrivacyPolicy'));
const TermsOfService   = React.lazy(() => import('./pages/public/TermsOfService'));
const PublicBidSubmission = React.lazy(() => import('./pages/e-sourcing/PublicBidSubmission'));

const DashboardEnhanced = React.lazy(() => import('./pages/DashboardEnhanced'));

const Suppliers      = React.lazy(() => import('./pages/suppliers/Suppliers'));
const SupplierDetail = React.lazy(() => import('./pages/suppliers/SupplierDetail'));
const SupplierForm   = React.lazy(() => import('./pages/suppliers/SupplierForm'));

const PurchaseOrders      = React.lazy(() => import('./pages/purchase-orders/PurchaseOrders'));
const PurchaseOrderDetail = React.lazy(() => import('./pages/purchase-orders/PurchaseOrderDetail'));
const PurchaseOrderForm   = React.lazy(() => import('./pages/purchase-orders/PurchaseOrderForm'));

const Invoices      = React.lazy(() => import('./pages/invoices/Invoices'));
const InvoiceDetail = React.lazy(() => import('./pages/invoices/InvoiceDetail'));
const InvoiceForm   = React.lazy(() => import('./pages/invoices/InvoiceForm'));

const Products      = React.lazy(() => import('./pages/products/Products'));
const ProductDetail = React.lazy(() => import('./pages/products/ProductDetail'));
const ProductForm   = React.lazy(() => import('./pages/products/ProductForm'));
const ProductMargins = React.lazy(() => import('./pages/products/ProductMargins'));
const RestockForecast = React.lazy(() => import('./pages/products/RestockForecast'));

const Clients      = React.lazy(() => import('./pages/clients/Clients'));
const ClientDetail = React.lazy(() => import('./pages/clients/ClientDetail'));
const ClientForm   = React.lazy(() => import('./pages/clients/ClientForm'));

const Contracts      = React.lazy(() => import('./pages/contracts/Contracts'));
const ContractDetail = React.lazy(() => import('./pages/contracts/ContractDetail'));
const ContractForm   = React.lazy(() => import('./pages/contracts/ContractForm'));
const ContractAnalyzer = React.lazy(() => import('./pages/contracts/ContractAnalyzer'));

const SourcingEvents      = React.lazy(() => import('./pages/e-sourcing/SourcingEvents'));
const SourcingEventForm   = React.lazy(() => import('./pages/e-sourcing/SourcingEventForm'));
const SourcingEventDetail = React.lazy(() => import('./pages/e-sourcing/SourcingEventDetail'));
const BidComparison       = React.lazy(() => import('./pages/e-sourcing/BidComparison'));
const BidDetail           = React.lazy(() => import('./pages/e-sourcing/BidDetail'));

const AIChat        = React.lazy(() => import('./pages/ai-chat/AIChat'));
const ImportReviews = React.lazy(() => import('./pages/ai-chat/ImportReviews'));
const DocumentImport = React.lazy(() => import('./pages/ai-chat/DocumentImport'));

const Settings       = React.lazy(() => import('./pages/settings/Settings'));
const UserManagement = React.lazy(() => import('./pages/settings/UserManagement'));
const DataImportPage = React.lazy(() => import('./pages/settings/DataImportPage'));

const MigrationJobs   = React.lazy(() => import('./pages/migration/MigrationJobs'));
const MigrationWizard = React.lazy(() => import('./pages/migration/MigrationWizard'));

// Accounting — chargé uniquement si l'utilisateur visite /accounting
const AccountingDashboard = React.lazy(() => import('./pages/accounting/AccountingDashboard'));
const ChartOfAccounts     = React.lazy(() => import('./pages/accounting/ChartOfAccounts'));
const JournalEntries      = React.lazy(() => import('./pages/accounting/JournalEntries'));
const JournalEntryForm    = React.lazy(() => import('./pages/accounting/JournalEntryForm'));
const JournalEntryDetail  = React.lazy(() => import('./pages/accounting/JournalEntryDetail'));
const TrialBalance        = React.lazy(() => import('./pages/accounting/TrialBalance'));
const GeneralLedger       = React.lazy(() => import('./pages/accounting/GeneralLedger'));
const IncomeStatement     = React.lazy(() => import('./pages/accounting/IncomeStatement'));
const BalanceSheet        = React.lazy(() => import('./pages/accounting/BalanceSheet'));
const SIG                 = React.lazy(() => import('./pages/accounting/SIG'));

// Guards
import PrivateRoute from './components/guards/PrivateRoute';
import GuestRoute from './components/guards/GuestRoute';
import ModuleRoute from './components/guards/ModuleRoute';

import PublicLayout from './layouts/PublicLayout';

// PWA
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { usePWA } from './hooks/usePWA';

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
          default: '#eef1f6',
          paper: '#ffffff',
          subtle: '#f8fafc',
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
          default: '#111827',
          paper: '#1e2a3a',
          subtle: '#1a2235',
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
    mode === 'light' ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : '0 1px 3px rgba(0,0,0,0.3)',
    mode === 'light' ? '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)' : '0 2px 8px rgba(0,0,0,0.35)',
    mode === 'light' ? '0 4px 12px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.04)' : '0 4px 12px rgba(0,0,0,0.4)',
    mode === 'light' ? '0 6px 16px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05)' : '0 6px 16px rgba(0,0,0,0.45)',
    mode === 'light' ? '0 8px 24px rgba(0,0,0,0.1), 0 3px 8px rgba(0,0,0,0.05)' : '0 8px 24px rgba(0,0,0,0.5)',
    mode === 'light' ? '0 12px 32px rgba(0,0,0,0.11)' : '0 12px 32px rgba(0,0,0,0.55)',
    mode === 'light' ? '0 14px 36px rgba(0,0,0,0.12)' : '0 14px 36px rgba(0,0,0,0.55)',
    mode === 'light' ? '0 16px 40px rgba(0,0,0,0.12)' : '0 16px 40px rgba(0,0,0,0.6)',
    mode === 'light' ? '0 18px 44px rgba(0,0,0,0.13)' : '0 18px 44px rgba(0,0,0,0.6)',
    mode === 'light' ? '0 20px 48px rgba(0,0,0,0.13)' : '0 20px 48px rgba(0,0,0,0.6)',
    mode === 'light' ? '0 22px 52px rgba(0,0,0,0.14)' : '0 22px 52px rgba(0,0,0,0.65)',
    mode === 'light' ? '0 24px 56px rgba(0,0,0,0.14)' : '0 24px 56px rgba(0,0,0,0.65)',
    mode === 'light' ? '0 26px 60px rgba(0,0,0,0.15)' : '0 26px 60px rgba(0,0,0,0.65)',
    mode === 'light' ? '0 28px 64px rgba(0,0,0,0.15)' : '0 28px 64px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 30px 68px rgba(0,0,0,0.16)' : '0 30px 68px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 32px 72px rgba(0,0,0,0.16)' : '0 32px 72px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 34px 76px rgba(0,0,0,0.17)' : '0 34px 76px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 36px 80px rgba(0,0,0,0.17)' : '0 36px 80px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 38px 84px rgba(0,0,0,0.18)' : '0 38px 84px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 40px 88px rgba(0,0,0,0.18)' : '0 40px 88px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 42px 92px rgba(0,0,0,0.18)' : '0 42px 92px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 44px 96px rgba(0,0,0,0.18)' : '0 44px 96px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 46px 100px rgba(0,0,0,0.19)' : '0 46px 100px rgba(0,0,0,0.7)',
    mode === 'light' ? '0 48px 104px rgba(0,0,0,0.2)' : '0 48px 104px rgba(0,0,0,0.7)',
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
          borderRadius: 10,
          padding: '6px 14px',
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            transform: 'translateY(0)',
          },
        },
        outlined: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            transform: 'translateY(-1px)',
          },
        },
        text: {
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          },
        },
        sizeSmall: { padding: '4px 10px', fontSize: '0.75rem' },
        sizeLarge: { padding: '8px 18px', fontSize: '0.875rem' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: 'none',
          backgroundImage: 'none',
          background: mode === 'light' ? '#ffffff' : '#1e2530',
          // Neumorphisme premium (charte #cdd4e0 / #fff)
          boxShadow: mode === 'light'
            ? '6px 6px 16px #cdd4e0, -6px -6px 16px #ffffff'
            : '6px 6px 16px #14191f, -6px -6px 16px #283041',
          transition: 'box-shadow 0.3s cubic-bezier(0.22,1,0.36,1)',
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
          borderRadius: 16,
          backgroundImage: 'none',
          background: mode === 'light' ? '#ffffff' : '#1e2a3a',
        },
        elevation0: { boxShadow: 'none' },
        elevation1: {
          boxShadow: mode === 'light'
            ? '0 2px 8px rgba(0,0,0,0.07)'
            : '0 2px 8px rgba(0,0,0,0.3)',
        },
        elevation2: {
          boxShadow: mode === 'light'
            ? '0 4px 16px rgba(0,0,0,0.09)'
            : '0 4px 16px rgba(0,0,0,0.4)',
        },
        elevation3: {
          boxShadow: mode === 'light'
            ? '0 6px 24px rgba(0,0,0,0.1)'
            : '0 6px 24px rgba(0,0,0,0.5)',
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
          borderRadius: 10,
          margin: '2px 6px',
          padding: '8px 12px',
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            backgroundColor: mode === 'light'
              ? 'rgba(37, 99, 235, 0.1)'
              : 'rgba(59, 130, 246, 0.15)',
            boxShadow: 'none',
            '& .MuiListItemIcon-root': {
              color: mode === 'light' ? '#2563eb' : '#3b82f6',
            },
            '& .MuiTypography-root': {
              color: mode === 'light' ? '#2563eb' : '#3b82f6',
              fontWeight: 600,
            },
            '&:hover': {
              backgroundColor: mode === 'light'
                ? 'rgba(37, 99, 235, 0.14)'
                : 'rgba(59, 130, 246, 0.2)',
            },
          },
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
            transform: 'translateX(2px)',
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
            borderRadius: 10,
            background: mode === 'light' ? '#ffffff' : '#252f3e',
            boxShadow: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            '& fieldset': {
              borderColor: mode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
              transition: 'border-color 0.2s ease',
            },
            '&:hover fieldset': {
              borderColor: mode === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.25)',
            },
            '&.Mui-focused fieldset': {
              borderColor: mode === 'light' ? '#2563eb' : '#3b82f6',
              borderWidth: '1.5px',
            },
            '&.Mui-focused': {
              boxShadow: mode === 'light'
                ? '0 0 0 3px rgba(37, 99, 235, 0.12)'
                : '0 0 0 3px rgba(59, 130, 246, 0.18)',
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
          borderRadius: 16,
          background: mode === 'light' ? '#ffffff' : '#1a2235',
          boxShadow: mode === 'light'
            ? '0 20px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08)'
            : '0 20px 60px rgba(0,0,0,0.7), 0 8px 20px rgba(0,0,0,0.4)',
          border: mode === 'light'
            ? '1px solid rgba(0,0,0,0.06)'
            : '1px solid rgba(255,255,255,0.06)',
        },
        root: {
          // TextFields inside dialogs: override neumorphic bg to match dialog
          '& .MuiOutlinedInput-root': {
            background: mode === 'light' ? '#f8fafc' : '#252f3e',
          },
          // Cards inside dialogs should not have neumorphic shadow
          '& .MuiCard-root': {
            boxShadow: mode === 'light'
              ? '0 1px 4px rgba(0,0,0,0.08)'
              : '0 1px 4px rgba(0,0,0,0.3)',
            background: mode === 'light' ? '#f8fafc' : '#252f3e',
          },
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
  usePWA(); // Enregistre le service worker au démarrage

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

// Skeleton léger affiché pendant le chargement lazy d'une page
function PageSkeleton() {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      p: { xs: 2, md: 3 },
      maxWidth: 1200,
      mx: 'auto',
      mt: 2,
    }}>
      {/* Barre de titre */}
      <Box sx={{
        height: 32,
        width: '35%',
        borderRadius: 2,
        bgcolor: 'action.hover',
        animation: 'pulse 1.4s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }} />
      {/* Ligne de cartes */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3].map(i => (
          <Box key={i} sx={{
            flex: 1,
            height: 90,
            borderRadius: 3,
            bgcolor: 'action.hover',
            animation: 'pulse 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.4 },
            },
          }} />
        ))}
      </Box>
      {/* Bloc principal */}
      <Box sx={{
        height: 340,
        borderRadius: 3,
        bgcolor: 'action.hover',
        animation: 'pulse 1.4s ease-in-out 0.3s infinite',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      }} />
      {/* Lignes de texte */}
      {[80, 60, 70].map((w, i) => (
        <Box key={i} sx={{
          height: 14,
          width: `${w}%`,
          borderRadius: 1,
          bgcolor: 'action.hover',
          animation: 'pulse 1.4s ease-in-out infinite',
          animationDelay: `${0.4 + i * 0.1}s`,
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.4 },
          },
        }} />
      ))}
    </Box>
  );
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
    // Règle principale : si onboarding_completed est explicitement true → pas besoin
    if (userData.preferences?.onboarding_completed === true) {
      return false;
    }
    // Dans tous les autres cas (undefined, false, null) → afficher l'onboarding
    // Cela couvre les nouveaux comptes et les comptes qui n'ont jamais fini l'onboarding
    return true;
  };

  const checkOnboardingStatus = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        setOnboardingChecked(true);
        return;
      }

      // Si on est déjà sur /onboarding, ne pas re-checker
      if (window.location.pathname === '/onboarding') {
        setOnboardingChecked(true);
        return;
      }

      const response = await fetch('/api/v1/accounts/profile/', {
        headers: { 'Authorization': `Token ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        const needsOnboarding = checkIfOnboardingNeeded(data);

        if (needsOnboarding) {
          // Mettre onboardingChecked à true D'ABORD pour que le Router soit monté,
          // puis rediriger — sinon la route /onboarding n'existe pas encore
          setOnboardingChecked(true);
          window.location.replace('/onboarding');
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
                    <HeaderProvider>
                      <AccountingHelpProvider>
                      <AdSenseScript />
                      {onboardingChecked && (
                        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                      <React.Suspense fallback={<PageSkeleton />}>
                      <Routes>
                        {/* Public Routes */}
                        <Route element={<PublicLayout />}>
                          <Route path="/" element={<Navigate to={ROOT_REDIRECT} replace />} />
                          {/* Sur l'app mobile, pas de landing marketing : on renvoie vers /login. */}
                          <Route
                            path="/landing"
                            element={NATIVE_APP ? <Navigate to="/login" replace /> : <Landing />}
                          />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/sourcing/public/:token" element={<PublicBidSubmission />} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/subscription/success" element={<SubscriptionSuccess />} />
                          <Route path="/subscription/cancel" element={<Navigate to="/pricing" replace />} />
                          <Route path="/terms" element={<TermsOfService />} />
                          <Route path="/support" element={<PublicSupport />} />
                          <Route path="/documentation" element={<Documentation />} />
                          <Route path="/docs" element={<Documentation />} />
                          <Route path="/privacy" element={<PrivacyPolicy />} />
                          <Route path="/help" element={<Help />} />
                          <Route path="/help/:articleId" element={<Help />} />
                          <Route path="/help/faq" element={<FAQ />} />
                          <Route path="/help/shortcuts" element={<KeyboardShortcuts />} />
                        </Route>

                        {/* Auth Routes — inaccessibles si déjà connecté (-> dashboard) */}
                        <Route element={<GuestRoute />}>
                          <Route element={<AuthLayout />}>
                            <Route path="/login" element={<LoginEnhanced />} />
                            <Route path="/register" element={<Register />} />
                          </Route>
                        </Route>

                        {/* Onboarding */}
                        <Route element={<PrivateRoute />}>
                          <Route path="/onboarding" element={<OnboardingSetup />} />
                        </Route>

                        {/* Protected Routes */}
                        <Route element={<PrivateRoute />}>
                          <Route element={<MainLayout />}>
                            <Route path="/dashboard" element={<DashboardEnhanced />} />
                            <Route path="/subscription/plans" element={<InternalPricing />} />

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
                            <Route path="/products/margins" element={<ModuleRoute module="products"><ProductMargins /></ModuleRoute>} />
                            <Route path="/products/restock" element={<ModuleRoute module="products"><RestockForecast /></ModuleRoute>} />
                            <Route path="/products/:id" element={<ModuleRoute module="products"><ProductDetail /></ModuleRoute>} />
                            <Route path="/products/:id/edit" element={<ModuleRoute module="products"><ProductForm /></ModuleRoute>} />

                            {/* Clients */}
                            <Route path="/clients" element={<ModuleRoute module="clients"><Clients /></ModuleRoute>} />
                            <Route path="/clients/new" element={<ModuleRoute module="clients"><ClientForm /></ModuleRoute>} />
                            <Route path="/clients/:id" element={<ModuleRoute module="clients"><ClientDetail /></ModuleRoute>} />
                            <Route path="/clients/:id/edit" element={<ModuleRoute module="clients"><ClientForm /></ModuleRoute>} />

                            {/* E-Sourcing */}
                            <Route path="/e-sourcing/events" element={<ModuleRoute module="e-sourcing"><SourcingEvents /></ModuleRoute>} />
                            <Route path="/e-sourcing/events/new" element={<ModuleRoute module="e-sourcing"><SourcingEventForm /></ModuleRoute>} />
                            <Route path="/e-sourcing/events/:id" element={<ModuleRoute module="e-sourcing"><SourcingEventDetail /></ModuleRoute>} />
                            <Route path="/e-sourcing/events/:id/edit" element={<ModuleRoute module="e-sourcing"><SourcingEventForm /></ModuleRoute>} />
                            <Route path="/e-sourcing/events/:eventId/compare" element={<ModuleRoute module="e-sourcing"><BidComparison /></ModuleRoute>} />
                            <Route path="/e-sourcing/bids/:id" element={<ModuleRoute module="e-sourcing"><BidDetail /></ModuleRoute>} />

                            {/* Contracts */}
                            <Route path="/contracts" element={<ModuleRoute module="contracts"><Contracts /></ModuleRoute>} />
                            <Route path="/contracts/analyze" element={<ModuleRoute module="contracts"><ContractAnalyzer /></ModuleRoute>} />
                            <Route path="/contracts/new" element={<ModuleRoute module="contracts"><ContractForm /></ModuleRoute>} />
                            <Route path="/contracts/:id" element={<ModuleRoute module="contracts"><ContractDetail /></ModuleRoute>} />
                            <Route path="/contracts/:id/edit" element={<ModuleRoute module="contracts"><ContractForm /></ModuleRoute>} />

                            {/* Comptabilité */}
                            <Route path="/accounting" element={<AccountingDashboard />} />
                            <Route path="/accounting/chart-of-accounts" element={<ChartOfAccounts />} />
                            <Route path="/accounting/entries" element={<JournalEntries />} />
                            <Route path="/accounting/entries/new" element={<JournalEntryForm />} />
                            <Route path="/accounting/entries/:id" element={<JournalEntryDetail />} />
                            <Route path="/accounting/reports/trial-balance" element={<TrialBalance />} />
                            <Route path="/accounting/reports/general-ledger" element={<GeneralLedger />} />
                            <Route path="/accounting/reports/income-statement" element={<IncomeStatement />} />
                            <Route path="/accounting/reports/balance-sheet" element={<BalanceSheet />} />
                            <Route path="/accounting/reports/sig" element={<SIG />} />

                            {/* Data Migration */}
                            <Route path="/migration/jobs" element={<MigrationJobs />} />
                            <Route path="/migration/wizard" element={<MigrationWizard />} />

                            {/* AI Chat */}
                            <Route path="/ai-chat" element={<AIChat />} />
                            <Route path="/ai-chat/:chatId" element={<AIChat />} />
                            <Route path="/ai-chat/import-reviews" element={<ImportReviews />} />
                            <Route path="/ai-chat/document-import" element={<DocumentImport />} />

                            {/* Settings */}
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/settings/users" element={<UserManagement />} />
                            <Route path="/settings/import" element={<DataImportPage />} />
                          </Route>
                        </Route>

                        {/* 404 */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                      </React.Suspense>
                      <PWAInstallPrompt />
                    </Router>
                      )}
                      </AccountingHelpProvider>
                    </HeaderProvider>
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
