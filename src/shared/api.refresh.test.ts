import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { API_BASE_URL, apiRequest, getApiUrl } from "./api";
import { AUTH_STORAGE_KEY } from "./auth-storage";

const initialUser = {
  email: "coach@test.kz",
  roles: ["COACH"],
  accessToken: "old-access",
  refreshToken: "refresh-1",
};

class MemoryStorage {
  private storage = new Map<string, string>();

  getItem(key: string) {
    return this.storage.has(key) ? this.storage.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.storage.set(key, value);
  }

  removeItem(key: string) {
    this.storage.delete(key);
  }

  clear() {
    this.storage.clear();
  }
}

const eventTarget = new EventTarget();

const readAuthHeader = (init?: RequestInit) => {
  const headers = new Headers(init?.headers ?? {});
  return headers.get("Authorization");
};

describe("refresh token flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {
        dispatchEvent: (event: Event) => eventTarget.dispatchEvent(event),
        addEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
          eventTarget.addEventListener(type, listener),
        removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
          eventTarget.removeEventListener(type, listener),
      },
      configurable: true,
      writable: true,
    });
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(initialUser));
  });

  it("refreshes token on 401 and retries request", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 })
      )
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({ accessToken: "new-access", refreshToken: "refresh-2" }), {
          status: 200,
        })
      )
      .mockImplementationOnce(async (input, init) => {
        expect(String(input)).toBe(`${API_BASE_URL}/secure-endpoint`);
        expect(readAuthHeader(init)).toBe("Bearer new-access");
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

    const data = await apiRequest<{ ok: boolean }>(getApiUrl("/secure-endpoint"), { method: "GET" });

    expect(data.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const storedUser = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}");
    expect(storedUser.accessToken).toBe("new-access");
    expect(storedUser.refreshToken).toBe("refresh-2");
  });

  it("uses single refresh request for parallel 401 responses", async () => {
    let refreshCalls = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const auth = readAuthHeader(init);

      if (url.includes("/auth/refresh")) {
        refreshCalls += 1;
        return new Response(JSON.stringify({ accessToken: "new-access", refreshToken: "refresh-2" }), {
          status: 200,
        });
      }

      if (url.includes("/secure-endpoint") && auth === "Bearer old-access") {
        return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
      }

      if (url.includes("/secure-endpoint") && auth === "Bearer new-access") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      return new Response(null, { status: 500 });
    });

    const [a, b] = await Promise.all([
      apiRequest<{ ok: boolean }>(getApiUrl("/secure-endpoint"), { method: "GET" }),
      apiRequest<{ ok: boolean }>(getApiUrl("/secure-endpoint"), { method: "GET" }),
    ]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
