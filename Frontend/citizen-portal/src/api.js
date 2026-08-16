import axios from 'axios';

// Use the Render URL if defined in .env, otherwise default to localhost for local development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
