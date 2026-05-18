import { describe, expect, it } from "vitest";
import { API_BASE_URL, getApiUrl } from "./api";

describe("api url helpers", () => {
  it("returns base url for empty path", () => {
    expect(getApiUrl("")).toBe(API_BASE_URL);
  });

  it("normalizes path prefix", () => {
    expect(getApiUrl("auth/login")).toBe(`${API_BASE_URL}/auth/login`);
    expect(getApiUrl("/auth/login")).toBe(`${API_BASE_URL}/auth/login`);
  });
});
