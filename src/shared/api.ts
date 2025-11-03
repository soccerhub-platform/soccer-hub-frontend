import axios from 'axios';
import { User } from './AuthContext';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('football-crm:user');
    if (raw) {
      const user = JSON.parse(raw) as User;
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${user.username}`;
    }
  } catch {
    // ignore
  }
  return config;
});

export default api;