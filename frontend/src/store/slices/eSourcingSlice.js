import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { eSourcingAPI } from '../../services/api';

// Async thunks for Sourcing Events
export const fetchSourcingEvents = createAsyncThunk(
  'eSourcing/fetchSourcingEvents',
  async (params = {}) => {
    const response = await eSourcingAPI.events.list(params);
    return response.data;
  }
);

export const fetchSourcingEvent = createAsyncThunk(
  'eSourcing/fetchSourcingEvent',
  async (id) => {
    const response = await eSourcingAPI.events.get(id);
    return response.data;
  }
);

export const createSourcingEvent = createAsyncThunk(
  'eSourcing/createSourcingEvent',
  async (data) => {
    const response = await eSourcingAPI.events.create(data);
    return response.data;
  }
);

export const updateSourcingEvent = createAsyncThunk(
  'eSourcing/updateSourcingEvent',
  async ({ id, data }) => {
    const response = await eSourcingAPI.events.update(id, data);
    return response.data;
  }
);

export const deleteSourcingEvent = createAsyncThunk(
  'eSourcing/deleteSourcingEvent',
  async (id) => {
    await eSourcingAPI.events.delete(id);
    return id;
  }
);

export const publishSourcingEvent = createAsyncThunk(
  'eSourcing/publishSourcingEvent',
  async (id) => {
    const response = await eSourcingAPI.events.publish(id);
    return response.data;
  }
);

export const closeSourcingEvent = createAsyncThunk(
  'eSourcing/closeSourcingEvent',
  async (id) => {
    const response = await eSourcingAPI.events.close(id);
    return response.data;
  }
);

export const cancelSourcingEvent = createAsyncThunk(
  'eSourcing/cancelSourcingEvent',
  async (id) => {
    const response = await eSourcingAPI.events.cancel(id);
    return response.data;
  }
);

export const compareBids = createAsyncThunk(
  'eSourcing/compareBids',
  async (eventId) => {
    const response = await eSourcingAPI.events.compareBids(eventId);
    return response.data;
  }
);

export const fetchEventStatistics = createAsyncThunk(
  'eSourcing/fetchEventStatistics',
  async (eventId) => {
    const response = await eSourcingAPI.events.statistics(eventId);
    return response.data;
  }
);

// Async thunks for Bids
export const fetchBids = createAsyncThunk(
  'eSourcing/fetchBids',
  async (params = {}) => {
    const response = await eSourcingAPI.bids.list(params);
    return response.data;
  }
);

export const fetchBid = createAsyncThunk(
  'eSourcing/fetchBid',
  async (id) => {
    const response = await eSourcingAPI.bids.get(id);
    return response.data;
  }
);

export const createBid = createAsyncThunk(
  'eSourcing/createBid',
  async (data) => {
    const response = await eSourcingAPI.bids.create(data);
    return response.data;
  }
);

export const updateBid = createAsyncThunk(
  'eSourcing/updateBid',
  async ({ id, data }) => {
    const response = await eSourcingAPI.bids.update(id, data);
    return response.data;
  }
);

export const submitBid = createAsyncThunk(
  'eSourcing/submitBid',
  async (id) => {
    const response = await eSourcingAPI.bids.submit(id);
    return response.data;
  }
);

export const withdrawBid = createAsyncThunk(
  'eSourcing/withdrawBid',
  async (id) => {
    const response = await eSourcingAPI.bids.withdraw(id);
    return response.data;
  }
);

export const evaluateBid = createAsyncThunk(
  'eSourcing/evaluateBid',
  async ({ id, data }) => {
    const response = await eSourcingAPI.bids.evaluate(id, data);
    return response.data;
  }
);

export const awardBid = createAsyncThunk(
  'eSourcing/awardBid',
  async (id) => {
    const response = await eSourcingAPI.bids.award(id);
    return response.data;
  }
);

// Async thunks for Invitations
export const fetchInvitations = createAsyncThunk(
  'eSourcing/fetchInvitations',
  async (params = {}) => {
    const response = await eSourcingAPI.invitations.list(params);
    return response.data;
  }
);

export const createInvitation = createAsyncThunk(
  'eSourcing/createInvitation',
  async (data) => {
    const response = await eSourcingAPI.invitations.create(data);
    return response.data;
  }
);

export const sendInvitation = createAsyncThunk(
  'eSourcing/sendInvitation',
  async (id) => {
    const response = await eSourcingAPI.invitations.send(id);
    return response.data;
  }
);

export const declineInvitation = createAsyncThunk(
  'eSourcing/declineInvitation',
  async ({ id, reason }) => {
    const response = await eSourcingAPI.invitations.decline(id, reason);
    return response.data;
  }
);

const initialState = {
  // Sourcing Events
  events: [],
  currentEvent: null,
  eventStatistics: null,

  // Bids
  bids: [],
  currentBid: null,
  bidComparison: null,

  // Invitations
  invitations: [],

  // UI State
  loading: false,
  error: null,
  totalCount: 0,
};

const eSourcingSlice = createSlice({
  name: 'eSourcing',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
      state.eventStatistics = null;
    },
    clearCurrentBid: (state) => {
      state.currentBid = null;
    },
    clearBidComparison: (state) => {
      state.bidComparison = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sourcing events
      .addCase(fetchSourcingEvents.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSourcingEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchSourcingEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Fetch single sourcing event
      .addCase(fetchSourcingEvent.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSourcingEvent.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchSourcingEvent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Create sourcing event
      .addCase(createSourcingEvent.fulfilled, (state, action) => {
        state.events.unshift(action.payload);
      })

      // Update sourcing event
      .addCase(updateSourcingEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        if (state.currentEvent?.id === action.payload.id) {
          state.currentEvent = action.payload;
        }
      })

      // Delete sourcing event
      .addCase(deleteSourcingEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(e => e.id !== action.payload);
      })

      // Publish sourcing event
      .addCase(publishSourcingEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.data.id);
        if (index !== -1) {
          state.events[index] = action.payload.data;
        }
        if (state.currentEvent?.id === action.payload.data.id) {
          state.currentEvent = action.payload.data;
        }
      })

      // Close sourcing event
      .addCase(closeSourcingEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.data.id);
        if (index !== -1) {
          state.events[index] = action.payload.data;
        }
        if (state.currentEvent?.id === action.payload.data.id) {
          state.currentEvent = action.payload.data;
        }
      })

      // Cancel sourcing event
      .addCase(cancelSourcingEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.data.id);
        if (index !== -1) {
          state.events[index] = action.payload.data;
        }
        if (state.currentEvent?.id === action.payload.data.id) {
          state.currentEvent = action.payload.data;
        }
      })

      // Compare bids
      .addCase(compareBids.fulfilled, (state, action) => {
        state.bidComparison = action.payload;
      })

      // Fetch event statistics
      .addCase(fetchEventStatistics.fulfilled, (state, action) => {
        state.eventStatistics = action.payload;
      })

      // Fetch bids
      .addCase(fetchBids.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBids.fulfilled, (state, action) => {
        state.loading = false;
        state.bids = action.payload.results || action.payload;
      })
      .addCase(fetchBids.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Fetch single bid
      .addCase(fetchBid.fulfilled, (state, action) => {
        state.currentBid = action.payload;
      })

      // Create bid
      .addCase(createBid.fulfilled, (state, action) => {
        state.bids.unshift(action.payload);
      })

      // Update bid
      .addCase(updateBid.fulfilled, (state, action) => {
        const index = state.bids.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bids[index] = action.payload;
        }
        if (state.currentBid?.id === action.payload.id) {
          state.currentBid = action.payload;
        }
      })

      // Submit bid
      .addCase(submitBid.fulfilled, (state, action) => {
        const index = state.bids.findIndex(b => b.id === action.payload.data.id);
        if (index !== -1) {
          state.bids[index] = action.payload.data;
        }
        if (state.currentBid?.id === action.payload.data.id) {
          state.currentBid = action.payload.data;
        }
      })

      // Withdraw bid
      .addCase(withdrawBid.fulfilled, (state, action) => {
        const index = state.bids.findIndex(b => b.id === action.payload.data.id);
        if (index !== -1) {
          state.bids[index] = action.payload.data;
        }
        if (state.currentBid?.id === action.payload.data.id) {
          state.currentBid = action.payload.data;
        }
      })

      // Evaluate bid
      .addCase(evaluateBid.fulfilled, (state, action) => {
        const index = state.bids.findIndex(b => b.id === action.payload.data.id);
        if (index !== -1) {
          state.bids[index] = action.payload.data;
        }
        if (state.currentBid?.id === action.payload.data.id) {
          state.currentBid = action.payload.data;
        }
      })

      // Award bid
      .addCase(awardBid.fulfilled, (state, action) => {
        const index = state.bids.findIndex(b => b.id === action.payload.data.id);
        if (index !== -1) {
          state.bids[index] = action.payload.data;
        }
        if (state.currentBid?.id === action.payload.data.id) {
          state.currentBid = action.payload.data;
        }
      })

      // Fetch invitations
      .addCase(fetchInvitations.fulfilled, (state, action) => {
        state.invitations = action.payload.results || action.payload;
      })

      // Create invitation
      .addCase(createInvitation.fulfilled, (state, action) => {
        state.invitations.push(action.payload);
      })

      // Send invitation
      .addCase(sendInvitation.fulfilled, (state, action) => {
        const index = state.invitations.findIndex(i => i.id === action.payload.data.id);
        if (index !== -1) {
          state.invitations[index] = action.payload.data;
        }
      })

      // Decline invitation
      .addCase(declineInvitation.fulfilled, (state, action) => {
        const index = state.invitations.findIndex(i => i.id === action.payload.data.id);
        if (index !== -1) {
          state.invitations[index] = action.payload.data;
        }
      });
  },
});

export const { clearError, clearCurrentEvent, clearCurrentBid, clearBidComparison } = eSourcingSlice.actions;
export default eSourcingSlice.reducer;
