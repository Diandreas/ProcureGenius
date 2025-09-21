import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  purchaseOrders: [],
  currentOrder: null,
  loading: false,
  error: null,
};

const purchaseOrdersSlice = createSlice({
  name: 'purchaseOrders',
  initialState,
  reducers: {},
});

export default purchaseOrdersSlice.reducer;