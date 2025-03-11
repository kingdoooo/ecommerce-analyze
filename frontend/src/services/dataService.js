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
};

export default dataService;