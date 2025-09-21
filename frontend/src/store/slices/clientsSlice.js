import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  clients: [],
  currentClient: null,
  loading: false,
  error: null,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {},
});

export default clientsSlice.reducer;