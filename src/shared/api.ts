import axios from 'axios';
import { User } from './AuthContext';

/**
 * A configured Axios instance for making HTTP requests to the
 * backend.  The baseURL can be adjusted to point to the API
 * server.  The request interceptor attaches a dummy Authorization
 * header if a user is present in localStorage.  */
const api = axios.create({
  baseURL: '/api',
});

// Attach a token (if any) to outgoing requests.  In a real
// application this would be a JWT received during authentication.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('football-crm:user');
    if (raw) {
      const user = JSON.parse(raw) as User;
      // Use the username as a stand‑in token.  Replace with a real
      // JWT for production use.
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${user.username}`;
    }
  } catch (err) {
    // ignore parsing errors
  }
  return config;
});

export default api;