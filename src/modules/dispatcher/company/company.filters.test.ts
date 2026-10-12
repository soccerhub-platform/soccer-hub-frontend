import { describe, expect, it } from "vitest";
import { creationBranch, isCalendarDate, isValidPeriod, issuePath, lastValidPage, receivedPaymentsPath } from "./company.filters";

describe("dispatcher regression fixes", () => {
  it.each(["bad", "2026-02-30", "2026-13-01", "2026-00-01", "2026-2-01", ""])("rejects invalid calendar date %s", value => {
    expect(isCalendarDate(value)).toBe(false);
  });
  it("accepts leap days only in leap years", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
  });
  it("validates optional periods, ordering and maximum length", () => {
    expect(isValidPeriod("", "", true)).toBe(true);
    expect(isValidPeriod("", "2026-10-10", true)).toBe(false);
    expect(isValidPeriod("2026-10-10", "2026-10-01")).toBe(false);
    expect(isValidPeriod("2025-01-01", "2026-01-02")).toBe(true);
    expect(isValidPeriod("2025-01-01", "2026-01-03")).toBe(false);
  });
  it("recovers a removed last page and an empty list", () => {
    expect(lastValidPage(3, 2)).toBe(1);
    expect(lastValidPage(1, 0)).toBe(0);
    expect(lastValidPage(0, 3)).toBe(0);
  });
  it("does not silently replace an archived scope with an active branch", () => {
    expect(creationBranch("archived", [{ id: "active" }])).toBe("");
    expect(creationBranch("active", [{ id: "active" }])).toBe("active");
    expect(creationBranch("", [{ id: "active" }])).toBe("active");
    expect(creationBranch("", [])).toBe("");
  });
  it.each([
    ["leads", "unassignedLeads", "leads?attention=UNASSIGNED"],
    ["leads", "overdueTasks", "leads?attention=OVERDUE"],
    ["contracts", "endingContracts", "contracts?attention=ENDING"],
    ["debts", "debt", "debts"],
  ])("preserves the issue %s / %s in its drilldown", (path, key, expected) => {
    expect(issuePath(path, key)).toBe(expected);
  });
  it("opens only received payments for revenue and receipt metrics", () => {
    const url = new URL(receivedPaymentsPath("2026-10-01", "2026-10-10"), "http://localhost/");
    expect(url.searchParams.get("status")).toBe("PAID");
    expect(url.searchParams.get("dateFrom")).toBe("2026-10-01");
    expect(url.searchParams.get("dateTo")).toBe("2026-10-10");
  });
});
