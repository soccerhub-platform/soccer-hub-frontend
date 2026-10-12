import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../../shared/api";
import { CompanyApi, companyParams, dateLabel, money } from "./company.api";

afterEach(() => vi.restoreAllMocks());

describe("dispatcher company API regression", () => {
  it("omits an empty branch for company scope and preserves page zero", () => {
    const params = new URLSearchParams(companyParams({ branchId: "", page: 0, status: undefined }));
    expect(params.has("branchId")).toBe(false);
    expect(params.get("page")).toBe("0");
    expect(params.has("status")).toBe(false);
  });

  it("encodes a search without turning its contents into filters", () => {
    const params = new URLSearchParams(companyParams({ search: "Анна & status=PAID + 10%" }));
    expect(params.get("search")).toBe("Анна & status=PAID + 10%");
    expect(params.has("status")).toBe(false);
  });

  it("requests a branch-scoped payment page with status and inclusive period", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });
    await CompanyApi.page("payments", { branchId: "qa-branch", page: 1, status: "PAID", dateFrom: "2026-10-01", dateTo: "2026-10-10" });
    const url = new URL(String(get.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/dispatcher/company/payments");
    expect(Object.fromEntries(url.searchParams)).toEqual({ branchId: "qa-branch", page: "1", status: "PAID", dateFrom: "2026-10-01", dateTo: "2026-10-10", size: "25" });
  });

  it("requests company summary without a branch restriction", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue({ branches: [], metrics: [] });
    await CompanyApi.summary({ dateFrom: "2026-10-01", dateTo: "2026-10-10" });
    const url = new URL(String(get.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/dispatcher/company/summary");
    expect(url.searchParams.has("branchId")).toBe(false);
    expect(url.searchParams.get("dateTo")).toBe("2026-10-10");
  });

  it("distinguishes a zero amount from an unknown amount", () => {
    expect(money(0, "KZT")).toBe("0 KZT");
    expect(money(undefined, "KZT")).toBe("—");
  });

  it("keeps each currency visible", () => {
    expect(money(100, "KZT")).toBe("100 KZT");
    expect(money(100, "USD")).toBe("100 USD");
  });

  it("renders a missing date without constructing an invalid date", () => {
    expect(dateLabel(undefined)).toBe("—");
    expect(dateLabel("bad")).toBe("—");
    expect(dateLabel("2026-02-30")).toBe("—");
  });

  it("keeps a calendar date stable regardless of the timestamp time", () => {
    expect(dateLabel("2026-10-10T23:59:59")).toBe(dateLabel("2026-10-10"));
  });
});
