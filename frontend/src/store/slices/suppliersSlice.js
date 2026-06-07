import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { suppliersAPI } from '../../services/api';
import { readListWithCache, readOneWithCache, createWithQueue, updateWithQueue, deleteWithQueue } from '../../services/offline';

// Async thunks
export const fetchSuppliers = createAsyncThunk(
  'suppliers/fetchSuppliers',
  async (params = {}) => {
    return await readListWithCache('suppliers', () => suppliersAPI.list(params));
  }
);

export const fetchSupplier = createAsyncThunk(
  'suppliers/fetchSupplier',
  async (id) => {
    return await readOneWithCache('suppliers', id, () => suppliersAPI.get(id));
  }
);

export const createSupplier = createAsyncThunk(
  'suppliers/createSupplier',
  async (data) => {
    return await createWithQueue('suppliers', data, (d) => suppliersAPI.create(d));
  }
);

export const updateSupplier = createAsyncThunk(
  'suppliers/updateSupplier',
  async ({ id, data }) => {
    return await updateWithQueue('suppliers', id, data, (i, d) => suppliersAPI.update(i, d));
  }
);

export const deleteSupplier = createAsyncThunk(
  'suppliers/deleteSupplier',
  async (id) => {
    await deleteWithQueue('suppliers', id, (i) => suppliersAPI.delete(i));
    return id;
  }
);

export const toggleSupplierStatus = createAsyncThunk(
  'suppliers/toggleStatus',
  async (id) => {
    const response = await suppliersAPI.toggleStatus(id);
    return response.data;
  }
);

const initialState = {
  suppliers: [],
  currentSupplier: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const suppliersSlice = createSlice({
  name: 'suppliers',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch suppliers
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch single supplier
      .addCase(fetchSupplier.fulfilled, (state, action) => {
        state.currentSupplier = action.payload;
      })
      // Create supplier
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.suppliers.push(action.payload);
      })
      // Update supplier
      .addCase(updateSupplier.fulfilled, (state, action) => {
        const index = state.suppliers.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.suppliers[index] = action.payload;
        }
        if (state.currentSupplier?.id === action.payload.id) {
          state.currentSupplier = action.payload;
        }
      })
      // Delete supplier
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.suppliers = state.suppliers.filter(s => s.id !== action.payload);
      })
      // Toggle status
      .addCase(toggleSupplierStatus.fulfilled, (state, action) => {
        const index = state.suppliers.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.suppliers[index] = action.payload;
        }
      });
  },
});

export const { clearError } = suppliersSlice.actions;
export default suppliersSlice.reducer;