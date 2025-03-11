import api from './api';

const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  logout: async () => {
    // Clear token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return true;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },
  
  // Admin only
  registerUser: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
};

export default authService;