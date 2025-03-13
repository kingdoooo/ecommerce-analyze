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
    // 获取JWT令牌
    const token = localStorage.getItem('token');
    
    // 将分析参数序列化为URL查询参数
    const paramsWithThinking = {
      ...params,
      // 确保enableThinking参数传递给后端
      enableThinking: params.enableThinking || false
    };
    const paramsJson = encodeURIComponent(JSON.stringify(paramsWithThinking));
    
    // 创建带有令牌和参数的EventSource
    // 使用API基础URL的域名和端口，确保与后端一致
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:7001/api';
    const eventSource = new EventSource(`${baseUrl}/analysis/stream?token=${token}&params=${paramsJson}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'thinking_start':
          callbacks.onThinkingStart?.();
          break;
          
        case 'thinking_progress':
          // 添加对reasoning内容的支持
          callbacks.onThinkingProgress?.(data.progress, data.message, data.isReasoning);
          break;
          
        case 'thinking_end':
          callbacks.onThinkingEnd?.(data.autoCollapse);
          break;
          
        case 'analysis_result':
          console.log('Received analysis_result event:', data);
          
          // 处理结果
          let processedResult;
          
          // 检查是否是对象类型的结果（已经处理过的）
          if (typeof data.result === 'object' && data.result !== null) {
            // 如果对象中有markdownContent，检查并移除<output>标签
            if (data.result.markdownContent) {
              const content = data.result.markdownContent;
              // 移除开头的<output>标签
              const cleanedContent = content.replace(/<output>/, '').replace(/<\/output>$/, '');
              processedResult = {
                ...data.result,
                markdownContent: cleanedContent
              };
            } else {
              processedResult = data.result;
            }
          } else if (typeof data.result === 'string') {
            // 如果是字符串，移除<output>标签并作为markdown内容处理
            const cleanedContent = data.result.replace(/<output>/, '').replace(/<\/output>$/, '');
            processedResult = {
              markdownContent: cleanedContent,
              rawResponse: data.result
            };
          } else {
            // 其他情况，创建一个错误对象
            processedResult = {
              markdownContent: "无法处理的结果格式",
              rawResponse: JSON.stringify(data.result)
            };
          }
          
          callbacks.onResult?.(processedResult);
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
