import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { store } from './store/store';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
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
import Clients from './pages/clients/Clients';
import AIChat from './pages/ai-chat/AIChat';
import Settings from './pages/settings/Settings';

// Guards
import PrivateRoute from './components/guards/PrivateRoute';

// PWA
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5', // Indigo
    },
    secondary: {
      main: '#10B981', // Emerald
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* Suppliers */}
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/suppliers/new" element={<SupplierForm />} />
                  <Route path="/suppliers/:id" element={<SupplierDetail />} />
                  <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
                  
                  {/* Purchase Orders */}
                  <Route path="/purchase-orders" element={<PurchaseOrders />} />
                  <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
                  <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
                  <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
                  
                  {/* Invoices */}
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/invoices/new" element={<InvoiceForm />} />
                  <Route path="/invoices/:id" element={<InvoiceDetail />} />
                  <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                  
                  {/* Products */}
                  <Route path="/products" element={<Products />} />
                  
                  {/* Clients */}
                  <Route path="/clients" element={<Clients />} />
                  
                  {/* AI Chat */}
                  <Route path="/ai-chat" element={<AIChat />} />
                  
                  {/* Settings */}
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
          </Router>
        </SnackbarProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;