import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  invoices: [],
  currentInvoice: null,
  loading: false,
  error: null,
};

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {},
});

export default invoicesSlice.reducer;