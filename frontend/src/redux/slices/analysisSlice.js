import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import analysisService from '../../services/analysisService';

const initialState = {
  currentAnalysis: null,
  analysisHistory: [],
  streamData: {
    thinking: false,
    thinkingCollapsed: false,
    progress: 0,
    messages: [],
    hasReasoningContent: false,
  },
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// Async thunks
export const createAnalysis = createAsyncThunk(
  'analysis/create',
  async (params, { rejectWithValue }) => {
    try {
      const response = await analysisService.createAnalysis(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create analysis');
    }
  }
);

export const getAnalysis = createAsyncThunk(
  'analysis/get',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await analysisService.getAnalysis(reportId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get analysis');
    }
  }
);

export const getAnalysisHistory = createAsyncThunk(
  'analysis/getHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await analysisService.getAnalysisHistory();
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get analysis history');
    }
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setStreamData: (state, action) => {
      switch (action.payload.type) {
        case 'thinking_start':
          state.streamData.thinking = true;
          state.streamData.thinkingCollapsed = false;
          state.streamData.progress = 0;
          state.streamData.messages = [];
          state.streamData.hasReasoningContent = false;
          break;
          
        case 'thinking_progress':
          state.streamData.progress = action.payload.progress;
          if (action.payload.message) {
            // 标记是否为reasoning内容
            const isReasoning = action.payload.isReasoning || false;
            
            // 如果是reasoning内容，设置hasReasoningContent标志
            if (isReasoning) {
              state.streamData.hasReasoningContent = true;
            }
            
            // 检查消息是否包含换行符
            if (action.payload.message.includes('\n')) {
              // 如果包含换行符，按换行符分割
              const lines = action.payload.message.split('\n');
              
              // 处理第一行 - 追加到最后一条消息（如果有的话）
              if (lines[0].trim() && state.streamData.messages.length > 0) {
                state.streamData.messages[state.streamData.messages.length - 1] += lines[0];
              } else if (lines[0].trim()) {
                state.streamData.messages.push(lines[0]);
              }
              
              // 处理剩余行 - 添加为新消息
              for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                  state.streamData.messages.push(lines[i]);
                }
              }
            } else {
              // 如果没有换行符，检查是否有现有消息
              if (state.streamData.messages.length > 0) {
                // 将新消息附加到最后一条消息
                state.streamData.messages[state.streamData.messages.length - 1] += action.payload.message;
              } else {
                // 如果没有现有消息，创建一个新消息
                state.streamData.messages.push(action.payload.message);
              }
            }
          }
          break;
          
        case 'thinking_end':
          state.streamData.thinking = false;
          state.streamData.thinkingCollapsed = action.payload.autoCollapse;
          break;
          
        case 'toggle_thinking_collapse':
          state.streamData.thinkingCollapsed = !state.streamData.thinkingCollapsed;
          break;
          
        default:
          break;
      }
    },
    clearAnalysis: (state) => {
      state.currentAnalysis = null;
      state.streamData = {
        thinking: false,
        thinkingCollapsed: false,
        progress: 0,
        messages: [],
        hasReasoningContent: false,
      };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Analysis
      .addCase(createAnalysis.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createAnalysis.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentAnalysis = action.payload;
      })
      .addCase(createAnalysis.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Get Analysis
      .addCase(getAnalysis.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getAnalysis.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentAnalysis = action.payload;
      })
      .addCase(getAnalysis.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Get Analysis History
      .addCase(getAnalysisHistory.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(getAnalysisHistory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.analysisHistory = action.payload;
      })
      .addCase(getAnalysisHistory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectCurrentAnalysis = (state) => state.analysis.currentAnalysis;
export const selectAnalysisHistory = (state) => state.analysis.analysisHistory;
export const selectStreamData = (state) => state.analysis.streamData;
export const selectAnalysisStatus = (state) => state.analysis.status;
export const selectAnalysisError = (state) => state.analysis.error;

export const { setStreamData, clearAnalysis, clearError } = analysisSlice.actions;

export default analysisSlice.reducer;
