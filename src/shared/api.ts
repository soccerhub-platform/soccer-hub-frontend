import axios from 'axios';
import { User } from './AuthContext';
import toast from "react-hot-toast";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const getApiUrl = (path: string) => {
  if (!path) return API_BASE_URL;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

export async function apiRequest(url: string, options: RequestInit = {}, success?: string) {
  try {
    const headers = new Headers(options.headers ?? {});
    if (!headers.has('Authorization')) {
      try {
        const raw = localStorage.getItem('football-crm:user');
        if (raw) {
          const user = JSON.parse(raw) as User;
          if (user?.accessToken) {
            headers.set('Authorization', `Bearer ${user.accessToken}`);
          }
        }
      } catch {
        // ignore auth parse errors
      }
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let msg = "Произошла ошибка";

      try {
        const errorData = await res.json();
        msg = errorData.message || msg;

        toast.error(
          `⚠️ Ошибка\n${errorData.message}\n\nКод: ${errorData.code ?? "N/A"}`,
          {
            style: {
              whiteSpace: "pre-line",
              background: "#fee2e2",
              color: "#b91c1c",
            },
          }
        );
      } catch {
        toast.error(msg);
      }

      throw new Error(msg);
    }

    if (success) {
      toast.success(success);
    }

    return res.json().catch(() => ({}));
  } catch (err: any) {
    if (err.name === "TypeError") {
      toast.error("❌ Нет соединения с сервером");
    }
    throw err;
  }
}

/**
 * A configured Axios instance for making HTTP requests to the
 * backend.  The baseURL can be adjusted to point to the API
 * server.  The request interceptor attaches a dummy Authorization
 * header if a user is present in localStorage.  */
const api = axios.create({
  baseURL: API_BASE_URL,
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
      config.headers['Authorization'] = `Bearer ${user.email}`;
    }
  } catch (err) {
    // ignore parsing errors
  }
  return config;
});

export default api;
