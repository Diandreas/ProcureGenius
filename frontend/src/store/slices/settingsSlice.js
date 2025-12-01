import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import settingsAPI from '../../services/settingsAPI';
import i18n from '../../i18n/config';

// Thunks asynchrones
export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.getAll();
      return response.data; // Retourner seulement les données, pas l'objet Axios complet
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateSettings = createAsyncThunk(
  'settings/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await settingsAPI.updateAll(settings);
      return response.data; // Retourner seulement les données
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const changeLanguage = createAsyncThunk(
  'settings/changeLanguage',
  async (language, { dispatch, rejectWithValue }) => {
    try {
      // 1. Mettre à jour la langue dans i18n
      await i18n.changeLanguage(language);

      // 2. Sauvegarder dans localStorage
      localStorage.setItem('appLanguage', language);

      // 3. Mettre à jour dans le backend
      const response = await settingsAPI.updateAll({ language });

      return response.data; // Retourner seulement les données
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    data: {
      organization_name: '',
      language: 'fr',
      currency: 'CAD',
      tax_rate: 0,
      logo: null,
      address: '',
      phone: '',
      email: '',
      website: '',
      default_payment_terms: 30,
      invoice_prefix: 'INV',
      invoice_template: 'modern',
      quote_prefix: 'QUO',
      po_prefix: 'PO',
      brand_color: '#1976d2',
      invoice_footer_text: '',
      bank_details: '',
    },
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    setLanguage: (state, action) => {
      state.data.language = action.payload;
    },
    clearSettings: (state) => {
      state.data = settingsSlice.getInitialState().data;
      state.initialized = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch settings
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = { ...state.data, ...action.payload };
        state.initialized = true;

        // Synchroniser la langue avec i18n
        const language = action.payload.language || 'fr';
        if (i18n.language !== language) {
          i18n.changeLanguage(language);
          localStorage.setItem('appLanguage', language);
        }
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update settings
      .addCase(updateSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.data = { ...state.data, ...action.payload };
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Change language
      .addCase(changeLanguage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeLanguage.fulfilled, (state, action) => {
        state.loading = false;
        state.data.language = action.payload.language;
      })
      .addCase(changeLanguage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setLanguage, clearSettings } = settingsSlice.actions;

// Selectors
export const selectSettings = (state) => state.settings.data;
export const selectLanguage = (state) => state.settings.data.language;
export const selectSettingsLoading = (state) => state.settings.loading;
export const selectSettingsError = (state) => state.settings.error;
export const selectSettingsInitialized = (state) => state.settings.initialized;

export default settingsSlice.reducer;
