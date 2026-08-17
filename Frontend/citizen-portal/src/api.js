import axios from 'axios';

// When connecting to the Central API Gateway, all citizen endpoints are under /citizen
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hexaware-mavericks.onrender.com/citizen';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatic Bearer Token Authorization Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
