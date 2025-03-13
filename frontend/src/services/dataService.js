import api from './api';

const dataService = {
  getCategories: async () => {
    const response = await api.get('/data/categories');
    return response.data;
  },
  
  getChannels: async () => {
    const response = await api.get('/data/channels');
    return response.data;
  },
  
  getMetrics: async () => {
    const response = await api.get('/data/metrics');
    return response.data;
  },
  
  getCampaigns: async () => {
    const response = await api.get('/data/campaigns');
    return response.data;
  },
  
  getDashboardData: async () => {
    const response = await api.get('/data/dashboard');
    return response.data;
  },
  
  /**
   * 获取AI模型配置
   * 从后端获取可用的AI模型配置
   */
  getModelConfig: async () => {
    const response = await api.get('/data/model-config');
    return response.data;
  },
};

export default dataService;
