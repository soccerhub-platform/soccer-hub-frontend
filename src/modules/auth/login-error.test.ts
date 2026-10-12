import { describe, expect, it } from "vitest";
import { ApiError } from "../../shared/api";
import { loginErrorMessage } from "./login-error";

describe("login error classification", () => {
  it.each([500, 502, 503])( "explains service failure %s without blaming credentials", status => {
    expect(loginErrorMessage(new ApiError("internal", status))).toContain("временно недоступен");
  });
  it("explains a network failure", () => {
    expect(loginErrorMessage(new TypeError("Failed to fetch"))).toContain("Нет соединения");
  });
  it("explains wrong credentials", () => {
    expect(loginErrorMessage(new ApiError("bad credentials", 401))).toContain("Проверьте email и пароль");
  });
  it("distinguishes restricted access and rate limiting", () => {
    expect(loginErrorMessage(new ApiError("forbidden", 403))).toContain("ограничен");
    expect(loginErrorMessage(new ApiError("rate limited", 429))).toContain("Слишком много попыток");
  });
});
