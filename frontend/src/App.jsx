import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ModuleProvider } from './contexts/ModuleContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/auth/Login';
import CustomizableDashboard from './pages/CustomizableDashboard';
import OldDashboard from './pages/Dashboard';
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
import Settings from './pages/settings/Settings';
import ModuleSettings from './pages/settings/ModuleSettings';
import UserManagement from './pages/settings/UserManagement';
import SourcingEvents from './pages/e-sourcing/SourcingEvents';
import SourcingEventForm from './pages/e-sourcing/SourcingEventForm';
import SourcingEventDetail from './pages/e-sourcing/SourcingEventDetail';
import BidComparison from './pages/e-sourcing/BidComparison';
import BidDetail from './pages/e-sourcing/BidDetail';
import PublicBidSubmission from './pages/e-sourcing/PublicBidSubmission';
import Contracts from './pages/contracts/Contracts';
import ContractDetail from './pages/contracts/ContractDetail';
import ContractForm from './pages/contracts/ContractForm';
import MigrationJobs from './pages/migration/MigrationJobs';
import MigrationWizard from './pages/migration/MigrationWizard';

// Guards
import PrivateRoute from './components/guards/PrivateRoute';
import ModuleRoute from './components/guards/ModuleRoute';

// PWA
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Onboarding
import OnboardingWizard from './components/OnboardingWizard';

// Theme configuration - Material Design 3 inspired
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e40af', // Deep Blue - Professional & Trustworthy
      light: '#3b82f6',
      dark: '#1e3a8a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#059669', // Emerald Green - Success & Growth
      light: '#10b981',
      dark: '#047857',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626',
      light: '#ef4444',
      dark: '#b91c1c',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#0284c7',
      light: '#0ea5e9',
      dark: '#0369a1',
    },
    success: {
      main: '#059669',
      light: '#10b981',
      dark: '#047857',
    },
    background: {
      default: '#f8fafc', // Subtle gray
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Near black for clarity
      secondary: '#64748b', // Medium gray
      disabled: '#cbd5e1',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.938rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 12, // More modern rounded corners
  },
  spacing: 8, // Base spacing unit
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)', // Subtle
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)', // Deep
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f5f9',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: '4px',
            '&:hover': {
              background: '#94a3b8',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 10,
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-0.5px)',
          },
        },
        contained: {
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        sizeSmall: {
          padding: '6px 16px',
          fontSize: '0.813rem',
        },
        sizeLarge: {
          padding: '10px 24px',
          fontSize: '0.938rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
          border: '1px solid #f1f5f9',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px 0 rgb(0 0 0 / 0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e2e8f0',
          boxShadow: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '4px 8px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&.Mui-selected': {
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            '&:hover': {
              backgroundColor: '#dbeafe',
            },
            '& .MuiListItemIcon-root': {
              color: '#1e40af',
            },
          },
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 8,
        },
        filled: {
          border: '1px solid transparent',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#94a3b8',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
      },
    },
  },
});

function App() {
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [onboardingChecked, setOnboardingChecked] = React.useState(false);

  React.useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        setOnboardingChecked(true);
        return;
      }

      const response = await fetch('/api/v1/accounts/profile/', {
        headers: {
          'Authorization': `Token ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setShowOnboarding(!data.preferences?.onboarding_completed);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setOnboardingChecked(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    window.location.reload(); // Recharger pour mettre à jour la navigation
  };

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <ModuleProvider>
            {onboardingChecked && (
              <>
                <Router>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/sourcing/public/:token" element={<PublicBidSubmission />} />

                    {/* Auth Routes */}
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<Login />} />
                    </Route>

                    {/* Protected Routes */}
                    <Route element={<PrivateRoute />}>
                      <Route element={<MainLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<CustomizableDashboard />} />
                        <Route path="/dashboard-old" element={<OldDashboard />} />

                        {/* Suppliers - Module Protected */}
                        <Route path="/suppliers" element={<ModuleRoute module="suppliers"><Suppliers /></ModuleRoute>} />
                        <Route path="/suppliers/new" element={<ModuleRoute module="suppliers"><SupplierForm /></ModuleRoute>} />
                        <Route path="/suppliers/:id" element={<ModuleRoute module="suppliers"><SupplierDetail /></ModuleRoute>} />
                        <Route path="/suppliers/:id/edit" element={<ModuleRoute module="suppliers"><SupplierForm /></ModuleRoute>} />

                        {/* Purchase Orders - Module Protected */}
                        <Route path="/purchase-orders" element={<ModuleRoute module="purchase-orders"><PurchaseOrders /></ModuleRoute>} />
                        <Route path="/purchase-orders/new" element={<ModuleRoute module="purchase-orders"><PurchaseOrderForm /></ModuleRoute>} />
                        <Route path="/purchase-orders/:id" element={<ModuleRoute module="purchase-orders"><PurchaseOrderDetail /></ModuleRoute>} />
                        <Route path="/purchase-orders/:id/edit" element={<ModuleRoute module="purchase-orders"><PurchaseOrderForm /></ModuleRoute>} />

                        {/* Invoices - Module Protected */}
                        <Route path="/invoices" element={<ModuleRoute module="invoices"><Invoices /></ModuleRoute>} />
                        <Route path="/invoices/new" element={<ModuleRoute module="invoices"><InvoiceForm /></ModuleRoute>} />
                        <Route path="/invoices/:id" element={<ModuleRoute module="invoices"><InvoiceDetail /></ModuleRoute>} />
                        <Route path="/invoices/:id/edit" element={<ModuleRoute module="invoices"><InvoiceForm /></ModuleRoute>} />

                        {/* Products - Module Protected */}
                        <Route path="/products" element={<ModuleRoute module="products"><Products /></ModuleRoute>} />
                        <Route path="/products/new" element={<ModuleRoute module="products"><ProductForm /></ModuleRoute>} />
                        <Route path="/products/:id" element={<ModuleRoute module="products"><ProductDetail /></ModuleRoute>} />
                        <Route path="/products/:id/edit" element={<ModuleRoute module="products"><ProductForm /></ModuleRoute>} />

                        {/* Clients - Module Protected */}
                        <Route path="/clients" element={<ModuleRoute module="clients"><Clients /></ModuleRoute>} />
                        <Route path="/clients/new" element={<ModuleRoute module="clients"><ClientForm /></ModuleRoute>} />
                        <Route path="/clients/:id" element={<ModuleRoute module="clients"><ClientDetail /></ModuleRoute>} />
                        <Route path="/clients/:id/edit" element={<ModuleRoute module="clients"><ClientForm /></ModuleRoute>} />

                        {/* E-Sourcing - Module Protected */}
                        <Route path="/e-sourcing/events" element={<ModuleRoute module="e-sourcing"><SourcingEvents /></ModuleRoute>} />
                        <Route path="/e-sourcing/events/new" element={<ModuleRoute module="e-sourcing"><SourcingEventForm /></ModuleRoute>} />
                        <Route path="/e-sourcing/events/:id" element={<ModuleRoute module="e-sourcing"><SourcingEventDetail /></ModuleRoute>} />
                        <Route path="/e-sourcing/events/:id/edit" element={<ModuleRoute module="e-sourcing"><SourcingEventForm /></ModuleRoute>} />
                        <Route path="/e-sourcing/events/:eventId/compare" element={<ModuleRoute module="e-sourcing"><BidComparison /></ModuleRoute>} />
                        <Route path="/e-sourcing/bids/:id" element={<ModuleRoute module="e-sourcing"><BidDetail /></ModuleRoute>} />

                        {/* Contracts - Module Protected */}
                        <Route path="/contracts" element={<ModuleRoute module="contracts"><Contracts /></ModuleRoute>} />
                        <Route path="/contracts/new" element={<ModuleRoute module="contracts"><ContractForm /></ModuleRoute>} />
                        <Route path="/contracts/:id" element={<ModuleRoute module="contracts"><ContractDetail /></ModuleRoute>} />
                        <Route path="/contracts/:id/edit" element={<ModuleRoute module="contracts"><ContractForm /></ModuleRoute>} />

                        {/* Data Migration - Admin only */}
                        <Route path="/migration/jobs" element={<MigrationJobs />} />
                        <Route path="/migration/wizard" element={<MigrationWizard />} />

                        {/* AI Chat - Admin only */}
                        <Route path="/ai-chat" element={<AIChat />} />

                        {/* Settings */}
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/settings/modules" element={<ModuleSettings />} />
                        <Route path="/settings/users" element={<UserManagement />} />
                      </Route>
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>

                  {/* PWA Install Prompt */}
                  <PWAInstallPrompt />
                </Router>

                {/* Onboarding Wizard */}
                <OnboardingWizard
                  open={showOnboarding}
                  onComplete={handleOnboardingComplete}
                />
              </>
            )}
          </ModuleProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;