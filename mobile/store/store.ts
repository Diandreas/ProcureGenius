import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import invoicesReducer from './slices/invoicesSlice';
import productsReducer from './slices/productsSlice';
import clientsReducer from './slices/clientsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    invoices: invoicesReducer,
    products: productsReducer,
    clients: clientsReducer,
    // Add other reducers as we create them:
    // suppliers: suppliersReducer,
    // purchaseOrders: purchaseOrdersReducer,
    // eSourcing: eSourcingReducer,
    // contracts: contractsReducer,
    // aiChat: aiChatReducer,
    // migration: migrationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled', 'auth/logout/fulfilled'],
      },
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
