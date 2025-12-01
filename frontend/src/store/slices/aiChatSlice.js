import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { aiChatAPI } from '../../services/api';

// Async thunks
export const sendMessage = createAsyncThunk(
  'aiChat/sendMessage',
  async (data) => {
    const response = await aiChatAPI.sendMessage(data);
    return response.data;
  }
);

export const fetchHistory = createAsyncThunk(
  'aiChat/fetchHistory',
  async () => {
    const response = await aiChatAPI.getHistory();
    return response.data;
  }
);

export const fetchConversation = createAsyncThunk(
  'aiChat/fetchConversation',
  async (id) => {
    const response = await aiChatAPI.getConversation(id);
    return response.data;
  }
);

export const deleteConversation = createAsyncThunk(
  'aiChat/deleteConversation',
  async (id) => {
    await aiChatAPI.deleteConversation(id);
    return id;
  }
);

export const analyzeDocument = createAsyncThunk(
  'aiChat/analyzeDocument',
  async (data) => {
    const response = await aiChatAPI.analyzeDocument(data);
    return response.data;
  }
);

export const fetchQuickActions = createAsyncThunk(
  'aiChat/fetchQuickActions',
  async (category) => {
    const response = await aiChatAPI.getQuickActions(category);
    return response.data;
  }
);

const initialState = {
  messages: [],
  conversations: [],
  currentConversation: null,
  quickActions: [],
  analysisResult: null,
  loading: false,
  error: null,
};

const aiChatSlice = createSlice({
  name: 'aiChat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAnalysisResult: (state) => {
      state.analysisResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch history
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.conversations = action.payload;
      })
      // Fetch conversation
      .addCase(fetchConversation.fulfilled, (state, action) => {
        state.currentConversation = action.payload;
        state.messages = action.payload.messages || [];
      })
      // Delete conversation
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.conversations = state.conversations.filter(c => c.id !== action.payload);
        if (state.currentConversation?.id === action.payload) {
          state.currentConversation = null;
          state.messages = [];
        }
      })
      // Analyze document
      .addCase(analyzeDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(analyzeDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.analysisResult = action.payload;
      })
      .addCase(analyzeDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // Fetch quick actions
      .addCase(fetchQuickActions.fulfilled, (state, action) => {
        state.quickActions = action.payload;
      });
  },
});

export const { addMessage, clearMessages, clearError, clearAnalysisResult } = aiChatSlice.actions;
export default aiChatSlice.reducer;