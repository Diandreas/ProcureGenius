import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      const { token } = response.data;
      localStorage.setItem('authToken', token);
      return { token, user: credentials.username }; // TODO: Get user data from API
    } catch (error) {
      // Extract meaningful error message from response
      if (error.response?.data) {
        const errorData = error.response.data;
        // Handle different error formats from Django REST Framework
        if (errorData.non_field_errors) {
          return rejectWithValue('Email ou mot de passe incorrect');
        }
        if (errorData.detail) {
          return rejectWithValue(errorData.detail);
        }
        if (errorData.error) {
          return rejectWithValue(errorData.error);
        }
        // Generic error from validation
        const firstError = Object.values(errorData)[0];
        if (Array.isArray(firstError)) {
          return rejectWithValue(firstError[0]);
        }
        if (typeof firstError === 'string') {
          return rejectWithValue(firstError);
        }
      }
      return rejectWithValue('Erreur de connexion. Veuillez réessayer.');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (token, { rejectWithValue }) => {
    try {
      const response = await authAPI.googleLogin(token);
      const { token: authToken } = response.data;
      localStorage.setItem('authToken', authToken);
      return { token: authToken, user: response.data.user || 'Google User' };
    } catch (error) {
      return rejectWithValue(error.response?.data?.detail || 'Google login failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await authAPI.logout();
  }
);

const initialState = {
  isAuthenticated: !!localStorage.getItem('authToken'),
  user: null,
  token: localStorage.getItem('authToken'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthenticated: (state, action) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Erreur de connexion';
      })
      // Google Login
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Erreur de connexion Google';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { clearError, setAuthenticated } = authSlice.actions;
export default authSlice.reducer;