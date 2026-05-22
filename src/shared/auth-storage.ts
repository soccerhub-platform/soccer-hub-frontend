import type { User } from "./AuthContext";

export const AUTH_STORAGE_KEY = "football-crm:user";
const AUTH_EVENT = "auth:user-changed";

const emitAuthChange = () => {
  window.dispatchEvent(new Event(AUTH_EVENT));
};

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
  emitAuthChange();
};

export const clearStoredUser = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
};

export const subscribeAuthChanges = (onChange: () => void) => {
  window.addEventListener(AUTH_EVENT, onChange);
  return () => window.removeEventListener(AUTH_EVENT, onChange);
};
