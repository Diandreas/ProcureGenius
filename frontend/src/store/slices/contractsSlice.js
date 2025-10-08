import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contractsAPI } from '../../services/api';

// Async thunks for Contracts
export const fetchContracts = createAsyncThunk(
  'contracts/fetchContracts',
  async (params = {}) => {
    const response = await contractsAPI.list(params);
    return response.data;
  }
);

export const fetchContract = createAsyncThunk(
  'contracts/fetchContract',
  async (id) => {
    const response = await contractsAPI.get(id);
    return response.data;
  }
);

export const createContract = createAsyncThunk(
  'contracts/createContract',
  async (data) => {
    const response = await contractsAPI.create(data);
    return response.data;
  }
);

export const updateContract = createAsyncThunk(
  'contracts/updateContract',
  async ({ id, data }) => {
    const response = await contractsAPI.update(id, data);
    return response.data;
  }
);

export const deleteContract = createAsyncThunk(
  'contracts/deleteContract',
  async (id) => {
    await contractsAPI.delete(id);
    return id;
  }
);

export const approveContract = createAsyncThunk(
  'contracts/approveContract',
  async ({ id, notes }) => {
    const response = await contractsAPI.approve(id, notes);
    return response.data;
  }
);

export const activateContract = createAsyncThunk(
  'contracts/activateContract',
  async (id) => {
    const response = await contractsAPI.activate(id);
    return response.data;
  }
);

export const terminateContract = createAsyncThunk(
  'contracts/terminateContract',
  async (id) => {
    const response = await contractsAPI.terminate(id);
    return response.data;
  }
);

export const renewContract = createAsyncThunk(
  'contracts/renewContract',
  async ({ id, data }) => {
    const response = await contractsAPI.renew(id, data);
    return response.data;
  }
);

export const extractClauses = createAsyncThunk(
  'contracts/extractClauses',
  async ({ id, contractText, language }) => {
    const response = await contractsAPI.extractClauses(id, contractText, language);
    return response.data;
  }
);

export const fetchContractStatistics = createAsyncThunk(
  'contracts/fetchStatistics',
  async () => {
    const response = await contractsAPI.statistics();
    return response.data;
  }
);

// Async thunks for Clauses
export const fetchClauses = createAsyncThunk(
  'contracts/fetchClauses',
  async (params = {}) => {
    const response = await contractsAPI.clauses.list(params);
    return response.data;
  }
);

export const verifyClause = createAsyncThunk(
  'contracts/verifyClause',
  async (id) => {
    const response = await contractsAPI.clauses.verify(id);
    return response.data;
  }
);

export const analyzeClauseRisk = createAsyncThunk(
  'contracts/analyzeClauseRisk',
  async ({ id, language }) => {
    const response = await contractsAPI.clauses.analyzeRisk(id, language);
    return response.data;
  }
);

// Async thunks for Milestones
export const fetchMilestones = createAsyncThunk(
  'contracts/fetchMilestones',
  async (params = {}) => {
    const response = await contractsAPI.milestones.list(params);
    return response.data;
  }
);

export const createMilestone = createAsyncThunk(
  'contracts/createMilestone',
  async (data) => {
    const response = await contractsAPI.milestones.create(data);
    return response.data;
  }
);

export const completeMilestone = createAsyncThunk(
  'contracts/completeMilestone',
  async (id) => {
    const response = await contractsAPI.milestones.complete(id);
    return response.data;
  }
);

const initialState = {
  // Contracts
  contracts: [],
  currentContract: null,
  statistics: null,

  // Clauses
  clauses: [],
  extractionResult: null,

  // Milestones
  milestones: [],

  // UI State
  loading: false,
  error: null,
  totalCount: 0,
};

const contractsSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentContract: (state) => {
      state.currentContract = null;
    },
    clearExtractionResult: (state) => {
      state.extractionResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contracts
      .addCase(fetchContracts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContracts.fulfilled, (state, action) => {
        state.loading = false;
        state.contracts = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchContracts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Fetch single contract
      .addCase(fetchContract.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContract.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContract = action.payload;
      })
      .addCase(fetchContract.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Create contract
      .addCase(createContract.fulfilled, (state, action) => {
        state.contracts.unshift(action.payload);
      })

      // Update contract
      .addCase(updateContract.fulfilled, (state, action) => {
        const index = state.contracts.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.contracts[index] = action.payload;
        }
        if (state.currentContract?.id === action.payload.id) {
          state.currentContract = action.payload;
        }
      })

      // Delete contract
      .addCase(deleteContract.fulfilled, (state, action) => {
        state.contracts = state.contracts.filter(c => c.id !== action.payload);
      })

      // Approve contract
      .addCase(approveContract.fulfilled, (state, action) => {
        const index = state.contracts.findIndex(c => c.id === action.payload.data.id);
        if (index !== -1) {
          state.contracts[index] = action.payload.data;
        }
        if (state.currentContract?.id === action.payload.data.id) {
          state.currentContract = action.payload.data;
        }
      })

      // Activate contract
      .addCase(activateContract.fulfilled, (state, action) => {
        const index = state.contracts.findIndex(c => c.id === action.payload.data.id);
        if (index !== -1) {
          state.contracts[index] = action.payload.data;
        }
        if (state.currentContract?.id === action.payload.data.id) {
          state.currentContract = action.payload.data;
        }
      })

      // Terminate contract
      .addCase(terminateContract.fulfilled, (state, action) => {
        const index = state.contracts.findIndex(c => c.id === action.payload.data.id);
        if (index !== -1) {
          state.contracts[index] = action.payload.data;
        }
        if (state.currentContract?.id === action.payload.data.id) {
          state.currentContract = action.payload.data;
        }
      })

      // Renew contract
      .addCase(renewContract.fulfilled, (state, action) => {
        // Update old contract
        const oldIndex = state.contracts.findIndex(c => c.id === action.payload.old_contract.id);
        if (oldIndex !== -1) {
          state.contracts[oldIndex] = action.payload.old_contract;
        }
        // Add new contract
        state.contracts.unshift(action.payload.new_contract);
      })

      // Extract clauses
      .addCase(extractClauses.pending, (state) => {
        state.loading = true;
      })
      .addCase(extractClauses.fulfilled, (state, action) => {
        state.loading = false;
        state.extractionResult = action.payload.data;
        // Update current contract with extracted clauses
        if (state.currentContract) {
          state.currentContract.clauses = action.payload.data.clauses;
        }
      })
      .addCase(extractClauses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Fetch statistics
      .addCase(fetchContractStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      })

      // Fetch clauses
      .addCase(fetchClauses.fulfilled, (state, action) => {
        state.clauses = action.payload.results || action.payload;
      })

      // Verify clause
      .addCase(verifyClause.fulfilled, (state, action) => {
        const index = state.clauses.findIndex(c => c.id === action.payload.data.id);
        if (index !== -1) {
          state.clauses[index] = action.payload.data;
        }
        // Update in current contract if present
        if (state.currentContract?.clauses) {
          const clauseIndex = state.currentContract.clauses.findIndex(
            c => c.id === action.payload.data.id
          );
          if (clauseIndex !== -1) {
            state.currentContract.clauses[clauseIndex] = action.payload.data;
          }
        }
      })

      // Analyze clause risk
      .addCase(analyzeClauseRisk.fulfilled, (state, action) => {
        const index = state.clauses.findIndex(c => c.id === action.payload.data.id);
        if (index !== -1) {
          state.clauses[index] = action.payload.data;
        }
        if (state.currentContract?.clauses) {
          const clauseIndex = state.currentContract.clauses.findIndex(
            c => c.id === action.payload.data.id
          );
          if (clauseIndex !== -1) {
            state.currentContract.clauses[clauseIndex] = action.payload.data;
          }
        }
      })

      // Fetch milestones
      .addCase(fetchMilestones.fulfilled, (state, action) => {
        state.milestones = action.payload.results || action.payload;
      })

      // Create milestone
      .addCase(createMilestone.fulfilled, (state, action) => {
        state.milestones.push(action.payload);
        if (state.currentContract?.milestones) {
          state.currentContract.milestones.push(action.payload);
        }
      })

      // Complete milestone
      .addCase(completeMilestone.fulfilled, (state, action) => {
        const index = state.milestones.findIndex(m => m.id === action.payload.data.id);
        if (index !== -1) {
          state.milestones[index] = action.payload.data;
        }
        if (state.currentContract?.milestones) {
          const milestoneIndex = state.currentContract.milestones.findIndex(
            m => m.id === action.payload.data.id
          );
          if (milestoneIndex !== -1) {
            state.currentContract.milestones[milestoneIndex] = action.payload.data;
          }
        }
      });
  },
});

export const { clearError, clearCurrentContract, clearExtractionResult } = contractsSlice.actions;
export default contractsSlice.reducer;
