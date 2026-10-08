import { describe, expect, it } from "vitest";
import { buildLoginPayload } from "./AuthContext";

describe("default login payload", () => {
  it("does not force ADMIN for a dispatcher", () => {
    expect(buildLoginPayload("dispatcher@example.test", "test-only-password")).toEqual({ email: "dispatcher@example.test", password: "test-only-password" });
  });
  it("keeps an explicitly requested role for compatibility", () => {
    expect(buildLoginPayload("admin@example.test", "test-only-password", "ADMIN")).toEqual({ email: "admin@example.test", password: "test-only-password", role: "ADMIN" });
  });
});
