import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import suppliersReducer from './slices/suppliersSlice';
import purchaseOrdersReducer from './slices/purchaseOrdersSlice';
import invoicesReducer from './slices/invoicesSlice';
import productsReducer from './slices/productsSlice';
import clientsReducer from './slices/clientsSlice';
import aiChatReducer from './slices/aiChatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    suppliers: suppliersReducer,
    purchaseOrders: purchaseOrdersReducer,
    invoices: invoicesReducer,
    products: productsReducer,
    clients: clientsReducer,
    aiChat: aiChatReducer,
  },
});