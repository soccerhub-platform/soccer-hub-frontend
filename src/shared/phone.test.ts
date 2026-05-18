import { describe, expect, it } from "vitest";
import {
  formatPhoneInput,
  isValidFormattedPhone,
  normalizePhoneDigits,
  normalizePhoneForSubmit,
} from "./phone";

describe("phone helpers", () => {
  it("formats phone input by groups", () => {
    expect(formatPhoneInput("77771234567")).toBe("+7 777 123 45 67");
  });

  it("normalizes phone for submit", () => {
    expect(normalizePhoneForSubmit("+7 (777) 123-45-67")).toBe("+77771234567");
  });

  it("validates formatted phone for KZ numbers", () => {
    expect(isValidFormattedPhone("+7 777 123 45 67")).toBe(true);
    expect(isValidFormattedPhone("87001234567")).toBe(false);
  });

  it("truncates extra digits", () => {
    expect(normalizePhoneDigits("77771234567899")).toBe("77771234567");
  });
});
