import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { purchaseOrdersAPI } from '../../services/api';

// Async thunks
export const fetchPurchaseOrders = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrders',
  async (params = {}) => {
    const response = await purchaseOrdersAPI.list(params);
    return response.data;
  }
);

export const fetchPurchaseOrder = createAsyncThunk(
  'purchaseOrders/fetchPurchaseOrder',
  async (id) => {
    const response = await purchaseOrdersAPI.get(id);
    return response.data;
  }
);

export const createPurchaseOrder = createAsyncThunk(
  'purchaseOrders/createPurchaseOrder',
  async (data) => {
    const response = await purchaseOrdersAPI.create(data);
    return response.data;
  }
);

export const updatePurchaseOrder = createAsyncThunk(
  'purchaseOrders/updatePurchaseOrder',
  async ({ id, data }) => {
    const response = await purchaseOrdersAPI.update(id, data);
    return response.data;
  }
);

export const deletePurchaseOrder = createAsyncThunk(
  'purchaseOrders/deletePurchaseOrder',
  async (id) => {
    await purchaseOrdersAPI.delete(id);
    return id;
  }
);

export const addItemToPurchaseOrder = createAsyncThunk(
  'purchaseOrders/addItem',
  async ({ id, item }) => {
    const response = await purchaseOrdersAPI.addItem(id, item);
    return response.data;
  }
);

export const approvePurchaseOrder = createAsyncThunk(
  'purchaseOrders/approve',
  async (id) => {
    const response = await purchaseOrdersAPI.approve(id);
    return response.data;
  }
);

export const receivePurchaseOrder = createAsyncThunk(
  'purchaseOrders/receive',
  async (id) => {
    const response = await purchaseOrdersAPI.receive(id);
    return response.data;
  }
);

const initialState = {
  purchaseOrders: [],
  currentOrder: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const purchaseOrdersSlice = createSlice({
  name: 'purchaseOrders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch purchase orders
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseOrders = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch single purchase order
      .addCase(fetchPurchaseOrder.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })
      // Create purchase order
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrders.push(action.payload);
      })
      // Update purchase order
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        const index = state.purchaseOrders.findIndex(po => po.id === action.payload.id);
        if (index !== -1) {
          state.purchaseOrders[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })
      // Delete purchase order
      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.purchaseOrders = state.purchaseOrders.filter(po => po.id !== action.payload);
      })
      // Add item
      .addCase(addItemToPurchaseOrder.fulfilled, (state, action) => {
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })
      // Approve purchase order
      .addCase(approvePurchaseOrder.fulfilled, (state, action) => {
        const index = state.purchaseOrders.findIndex(po => po.id === action.payload.id);
        if (index !== -1) {
          state.purchaseOrders[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      })
      // Receive purchase order
      .addCase(receivePurchaseOrder.fulfilled, (state, action) => {
        const index = state.purchaseOrders.findIndex(po => po.id === action.payload.id);
        if (index !== -1) {
          state.purchaseOrders[index] = action.payload;
        }
        if (state.currentOrder?.id === action.payload.id) {
          state.currentOrder = action.payload;
        }
      });
  },
});

export const { clearError } = purchaseOrdersSlice.actions;
export default purchaseOrdersSlice.reducer;