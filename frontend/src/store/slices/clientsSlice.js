import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientsAPI } from '../../services/api';
import { offlineData } from '../../services/offline/entities';

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (params = {}) => {
    // Lecture avec cache hors-ligne (natif) ; en web, appel direct.
    return (await offlineData.clients.list(params)).data;
  }
);

export const fetchClient = createAsyncThunk(
  'clients/fetchClient',
  async (id) => {
    return (await offlineData.clients.get(id)).data;
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (data) => {
    // Offline (natif) : ecrit en local + file de synchro ; online : API directe.
    return (await offlineData.clients.create(data)).data;
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, data }) => {
    return (await offlineData.clients.update(id, data)).data;
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (id) => {
    await offlineData.clients.delete(id);
    return id;
  }
);

const initialState = {
  clients: [],
  currentClient: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch clients
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch single client
      .addCase(fetchClient.fulfilled, (state, action) => {
        state.currentClient = action.payload;
      })
      // Create client
      .addCase(createClient.fulfilled, (state, action) => {
        state.clients.push(action.payload);
      })
      // Update client
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.clients.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
        if (state.currentClient?.id === action.payload.id) {
          state.currentClient = action.payload;
        }
      })
      // Delete client
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter(c => c.id !== action.payload);
      });
  },
});

export const { clearError } = clientsSlice.actions;
export default clientsSlice.reducer;