import { describe, expect, it } from "vitest";
import { API_BASE_URL, getApiUrl, resolveApiUrl } from "./api";

describe("api url helpers", () => {
  it("returns base url for empty path", () => {
    expect(getApiUrl("")).toBe(API_BASE_URL);
  });

  it("normalizes path prefix", () => {
    expect(getApiUrl("auth/login")).toBe(`${API_BASE_URL}/auth/login`);
    expect(getApiUrl("/auth/login")).toBe(`${API_BASE_URL}/auth/login`);
  });

  it("resolves relative media urls against api base", () => {
    const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
    const expectedApiMediaUrl = normalizedBase.endsWith("/api")
      ? `${normalizedBase}/media/asset/content?variant=thumb`
      : `${normalizedBase}/api/media/asset/content?variant=thumb`;

    expect(resolveApiUrl("/api/media/asset/content?variant=thumb")).toBe(expectedApiMediaUrl);
    expect(resolveApiUrl("/media/asset/content?variant=thumb")).toBe(
      `${normalizedBase}/media/asset/content?variant=thumb`
    );
  });

  it("keeps absolute media urls unchanged", () => {
    expect(resolveApiUrl("https://cdn.example.com/avatar.jpg")).toBe("https://cdn.example.com/avatar.jpg");
  });
});
