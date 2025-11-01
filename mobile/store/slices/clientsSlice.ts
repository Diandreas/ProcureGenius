import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  // Add other fields as needed
}

interface ClientsState {
  clients: Client[];
  selectedClient: Client | null;
  loading: boolean;
  error: string | null;
}

const initialState: ClientsState = {
  clients: [],
  selectedClient: null,
  loading: false,
  error: null,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload;
    },
    setSelectedClient: (state, action: PayloadAction<Client | null>) => {
      state.selectedClient = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setClients, setSelectedClient, setLoading, setError } = clientsSlice.actions;
export default clientsSlice.reducer;
