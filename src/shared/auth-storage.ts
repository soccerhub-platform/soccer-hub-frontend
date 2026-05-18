import type { User } from "./AuthContext";

export const AUTH_STORAGE_KEY = "football-crm:user";

export const readStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const writeStoredUser = (user: User) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
