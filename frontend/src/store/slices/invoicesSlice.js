import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoicesAPI } from '../../services/api';

// Async thunks
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (params = {}) => {
    const response = await invoicesAPI.list(params);
    return response.data;
  }
);

export const fetchInvoice = createAsyncThunk(
  'invoices/fetchInvoice',
  async (id) => {
    const response = await invoicesAPI.get(id);
    return response.data;
  }
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (data) => {
    const response = await invoicesAPI.create(data);
    return response.data;
  }
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, data }) => {
    const response = await invoicesAPI.update(id, data);
    return response.data;
  }
);

export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (id) => {
    await invoicesAPI.delete(id);
    return id;
  }
);

export const addItemToInvoice = createAsyncThunk(
  'invoices/addItem',
  async ({ id, item }) => {
    const response = await invoicesAPI.addItem(id, item);
    return response.data;
  }
);

export const sendInvoice = createAsyncThunk(
  'invoices/sendInvoice',
  async (id) => {
    const response = await invoicesAPI.send(id);
    return response.data;
  }
);

export const markInvoicePaid = createAsyncThunk(
  'invoices/markPaid',
  async ({ id, data }) => {
    const response = await invoicesAPI.markPaid(id, data);
    return response.data;
  }
);

const initialState = {
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch single invoice
      .addCase(fetchInvoice.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
      })
      // Create invoice
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.invoices.push(action.payload);
      })
      // Update invoice
      .addCase(updateInvoice.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }
      })
      // Delete invoice
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.invoices = state.invoices.filter(i => i.id !== action.payload);
      })
      // Add item
      .addCase(addItemToInvoice.fulfilled, (state, action) => {
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }
      })
      // Send invoice
      .addCase(sendInvoice.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }
      })
      // Mark paid
      .addCase(markInvoicePaid.fulfilled, (state, action) => {
        const index = state.invoices.findIndex(i => i.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
        if (state.currentInvoice?.id === action.payload.id) {
          state.currentInvoice = action.payload;
        }
      });
  },
});

export const { clearError } = invoicesSlice.actions;
export default invoicesSlice.reducer;