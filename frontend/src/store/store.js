import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import suppliersReducer from './slices/suppliersSlice';
import purchaseOrdersReducer from './slices/purchaseOrdersSlice';
import invoicesReducer from './slices/invoicesSlice';
import productsReducer from './slices/productsSlice';
import clientsReducer from './slices/clientsSlice';
import aiChatReducer from './slices/aiChatSlice';
import eSourcingReducer from './slices/eSourcingSlice';
import contractsReducer from './slices/contractsSlice';
import migrationReducer from './slices/migrationSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    suppliers: suppliersReducer,
    purchaseOrders: purchaseOrdersReducer,
    invoices: invoicesReducer,
    products: productsReducer,
    clients: clientsReducer,
    aiChat: aiChatReducer,
    eSourcing: eSourcingReducer,
    contracts: contractsReducer,
    migration: migrationReducer,
    settings: settingsReducer,
  },
});