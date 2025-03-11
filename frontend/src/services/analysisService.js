import api from './api';

const analysisService = {
  createAnalysis: async (params) => {
    const response = await api.post('/analysis/create', params);
    return response.data;
  },
  
  getAnalysis: async (reportId) => {
    const response = await api.get(`/analysis/${reportId}`);
    return response.data;
  },
  
  getAnalysisHistory: async () => {
    const response = await api.get('/analysis/history');
    return response.data;
  },
  
  deleteAnalysis: async (reportId) => {
    const response = await api.delete(`/analysis/${reportId}`);
    return response.data;
  },
  
  // Stream analysis with SSE
  streamAnalysis: (params, callbacks) => {
    const eventSource = new EventSource('/api/analysis/stream');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'thinking_start':
          callbacks.onThinkingStart?.();
          break;
          
        case 'thinking_progress':
          callbacks.onThinkingProgress?.(data.progress, data.message);
          break;
          
        case 'thinking_end':
          callbacks.onThinkingEnd?.(data.autoCollapse);
          break;
          
        case 'analysis_result':
          callbacks.onResult?.(data.result);
          eventSource.close();
          break;
          
        case 'error':
          callbacks.onError?.(data.message);
          eventSource.close();
          break;
          
        default:
          break;
      }
    };
    
    eventSource.onerror = (error) => {
      callbacks.onError?.('Connection error');
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  },
};

export default analysisService;