import toast from "react-hot-toast";
import { clearStoredUser, readStoredUser, writeStoredUser } from "./auth-storage";
import type { User } from "./AuthContext";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const getApiUrl = (path: string) => {
  if (!path) return API_BASE_URL;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

export const resolveApiUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  if (normalizedBase.endsWith("/api") && normalizedUrl.startsWith("/api/")) {
    return `${normalizedBase}${normalizedUrl.slice(4)}`;
  }
  return `${normalizedBase}${normalizedUrl}`;
};

interface ApiErrorPayload {
  message?: string;
  code?: string;
  fields?: Record<string, string>;
  metadata?: unknown;
}

interface ApiRequestInit extends RequestInit {
  suppressErrorToast?: boolean;
  showErrorToast?: boolean;
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
}

let refreshInFlight: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  metadata?: unknown;

  constructor(message: string, status: number, code = "N/A", fields?: Record<string, string>, metadata?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.metadata = metadata;
  }
}

export const getApiErrorMessage = (error: unknown, fallback = "Не удалось выполнить действие") => {
  if (error instanceof ApiError || error instanceof Error) {
    switch (error.message) {
      case "Current password is incorrect":
        return "Текущий пароль указан неверно";
      case "Validation failed":
        return "Проверьте заполнение полей";
      case "Coach has schedule conflict":
        return "У тренера конфликт расписания на выбранные день и время";
      case "Произошла ошибка":
        return fallback;
      default:
        return error.message || fallback;
    }
  }
  return fallback;
};

const withAuthHeader = (init?: RequestInit): RequestInit => {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Authorization")) {
    const user = readStoredUser();
    if (user?.accessToken) {
      headers.set("Authorization", `Bearer ${user.accessToken}`);
    }
  }
  return { ...init, headers };
};

const parseResponseBody = async <T>(res: Response): Promise<T | null> => {
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as T;
};

const refreshAccessToken = async (): Promise<boolean> => {
  const currentUser = readStoredUser();
  const refreshToken = currentUser?.refreshToken;
  if (!currentUser || !refreshToken) return false;

  try {
    const res = await fetch(getApiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearStoredUser();
      return false;
    }

    const payload = (await parseResponseBody<RefreshResponse>(res)) ?? {};
    const nextAccessToken = payload.accessToken ?? payload.token;
    if (!nextAccessToken) {
      clearStoredUser();
      return false;
    }

    const nextUser: User = {
      ...currentUser,
      accessToken: nextAccessToken,
      refreshToken: payload.refreshToken ?? currentUser.refreshToken,
    };
    writeStoredUser(nextUser);
    return true;
  } catch {
    clearStoredUser();
    return false;
  }
};

const tryRefreshOnce = async (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestInit = {},
  success?: string,
  retriedAfterRefresh = false
): Promise<T> {
  try {
    const { suppressErrorToast, showErrorToast, ...fetchOptions } = options;
    const res = await fetch(url, withAuthHeader(fetchOptions));

    if (!res.ok) {
      const payload = await parseResponseBody<ApiErrorPayload>(res).catch(() => null);
      const message = payload?.message || "Произошла ошибка";
      const code = payload?.code ?? "N/A";

      if (res.status === 401) {
        const canRefresh =
          !retriedAfterRefresh &&
          !url.includes("/auth/login") &&
          !url.includes("/auth/refresh");

        if (canRefresh) {
          const refreshed = await tryRefreshOnce();
          if (refreshed) {
            return apiRequest<T>(url, options, success, true);
          }
        }
        clearStoredUser();
      }

      if (showErrorToast && !suppressErrorToast) {
        toast.error(getApiErrorMessage(new ApiError(message, res.status, code, payload?.fields, payload?.metadata)), {
          style: {
            whiteSpace: "pre-line",
            background: "#fee2e2",
            color: "#b91c1c",
          },
        });
      }
      throw new ApiError(message, res.status, code, payload?.fields, payload?.metadata);
    }

    if (success) {
      toast.success(success);
    }

    const data = await parseResponseBody<T>(res);
    return (data ?? ({} as T));
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      toast.error("Нет соединения с сервером");
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, init?: ApiRequestInit) => apiRequest<T>(getApiUrl(path), { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiRequest<T>(getApiUrl(path), {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  postForm: <T>(path: string, body: FormData, init?: ApiRequestInit) =>
    apiRequest<T>(getApiUrl(path), {
      ...init,
      method: "POST",
      body,
    }),
  put: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiRequest<T>(getApiUrl(path), {
      ...init,
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiRequest<T>(getApiUrl(path), {
      ...init,
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string, init?: ApiRequestInit) =>
    apiRequest<T>(getApiUrl(path), { ...init, method: "DELETE" }),
};
