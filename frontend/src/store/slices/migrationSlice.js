import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { migrationAPI } from '../../services/api';

// Async thunks
export const fetchMigrationJobs = createAsyncThunk(
  'migration/fetchJobs',
  async (params = {}) => {
    const response = await migrationAPI.list(params);
    return response.data;
  }
);

export const fetchMigrationJob = createAsyncThunk(
  'migration/fetchJob',
  async (id) => {
    const response = await migrationAPI.get(id);
    return response.data;
  }
);

export const createMigrationJob = createAsyncThunk(
  'migration/createJob',
  async (data) => {
    const response = await migrationAPI.create(data);
    console.log('📦 Réponse complète createMigrationJob:', response);
    console.log('📦 response.data:', response.data);
    // Le backend peut retourner l'objet directement ou dans une structure imbriquée
    const jobData = response.data.id ? response.data : (response.data.data || response.data);
    console.log('📦 Job data extrait:', jobData);
    return jobData;
  }
);

export const previewMigrationData = createAsyncThunk(
  'migration/preview',
  async (id) => {
    const response = await migrationAPI.preview(id);
    // Le backend retourne { status: 'success', data: {...} }
    return response.data.data || response.data;
  }
);

export const configureMigration = createAsyncThunk(
  'migration/configure',
  async ({ id, config }) => {
    const response = await migrationAPI.configure(id, config);
    // Le backend retourne { status: 'success', data: {...} }
    return response.data.data || response.data;
  }
);

export const startMigration = createAsyncThunk(
  'migration/start',
  async (id) => {
    const response = await migrationAPI.start(id);
    // Le backend retourne { status: 'success', data: {...} }
    return response.data.data || response.data;
  }
);

export const cancelMigration = createAsyncThunk(
  'migration/cancel',
  async (id) => {
    const response = await migrationAPI.cancel(id);
    return response.data;
  }
);

export const fetchMigrationLogs = createAsyncThunk(
  'migration/fetchLogs',
  async (id) => {
    const response = await migrationAPI.logs(id);
    return response.data;
  }
);

const initialState = {
  jobs: [],
  currentJob: null,
  previewData: null,
  availableFields: null,
  logs: [],
  loading: false,
  error: null,
  totalCount: 0,
};

const migrationSlice = createSlice({
  name: 'migration',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPreview: (state) => {
      state.previewData = null;
      state.availableFields = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch jobs
      .addCase(fetchMigrationJobs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMigrationJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchMigrationJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch single job
      .addCase(fetchMigrationJob.fulfilled, (state, action) => {
        state.currentJob = action.payload;
      })
      // Create job
      .addCase(createMigrationJob.fulfilled, (state, action) => {
        state.jobs.unshift(action.payload);
        state.currentJob = action.payload;
      })
      // Preview
      .addCase(previewMigrationData.pending, (state) => {
        state.loading = true;
      })
      .addCase(previewMigrationData.fulfilled, (state, action) => {
        state.loading = false;
        // Le backend retourne preview_rows, pas preview
        state.previewData = action.payload.preview_rows || action.payload.preview;
        state.availableFields = action.payload.available_fields;
        if (state.currentJob) {
          state.currentJob.preview_data = action.payload.preview_rows || action.payload.preview;
          state.currentJob.total_rows = action.payload.total_rows;
        }
      })
      .addCase(previewMigrationData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Configure
      .addCase(configureMigration.fulfilled, (state, action) => {
        state.currentJob = action.payload;
      })
      // Start
      .addCase(startMigration.fulfilled, (state, action) => {
        state.currentJob = action.payload;
      })
      // Cancel
      .addCase(cancelMigration.fulfilled, (state, action) => {
        state.currentJob = action.payload;
      })
      // Logs
      .addCase(fetchMigrationLogs.fulfilled, (state, action) => {
        state.logs = action.payload;
      });
  },
});

export const { clearError, clearPreview } = migrationSlice.actions;
export default migrationSlice.reducer;
