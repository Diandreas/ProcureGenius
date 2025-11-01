import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Invoice {
  id: number;
  client: any;
  total_amount: number;
  status: string;
  due_date: string;
  // Add other fields as needed
}

interface InvoicesState {
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
}

const initialState: InvoicesState = {
  invoices: [],
  selectedInvoice: null,
  loading: false,
  error: null,
};

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setInvoices: (state, action: PayloadAction<Invoice[]>) => {
      state.invoices = action.payload;
    },
    setSelectedInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.selectedInvoice = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setInvoices, setSelectedInvoice, setLoading, setError } = invoicesSlice.actions;
export default invoicesSlice.reducer;
