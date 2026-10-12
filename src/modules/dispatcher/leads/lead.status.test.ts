import { describe, expect, it } from "vitest";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, leadStatusLabel, leadStatusTone } from "./lead.status";
import { STATUS_LABELS } from "../company/company.api";

describe("dispatcher lead statuses", () => {
  it.each(LEAD_STATUSES)("translates backend status %s in lists and filters", status => {
    expect(leadStatusLabel(status)).toMatch(/[А-Яа-яЁё]/);
    expect(leadStatusLabel(status)).not.toBe(status);
    expect(STATUS_LABELS[status]).toBe(LEAD_STATUS_LABELS[status]);
  });
  it("includes contract and payment stages in the filter options", () => {
    expect(Object.keys(LEAD_STATUS_LABELS)).toEqual([...LEAD_STATUSES]);
    expect(leadStatusLabel("CONTRACT_PENDING")).toBe("Оформление договора");
    expect(leadStatusLabel("PAYMENT_PENDING")).toBe("Ожидает оплату");
  });
  it("does not expose unknown technical codes or inherited properties", () => {
    expect(leadStatusLabel("FUTURE_BACKEND_STATUS")).toBe("Неизвестный статус");
    expect(leadStatusLabel("constructor")).toBe("Неизвестный статус");
    expect(leadStatusTone("FUTURE_BACKEND_STATUS")).toBe("neutral");
  });
  it("uses the same semantic tones in the list and preview", () => {
    expect(leadStatusTone("LOST")).toBe("danger");
    expect(leadStatusTone("CONVERTED")).toBe("success");
    expect(leadStatusTone("PAYMENT_PENDING")).toBe("warning");
  });
});
