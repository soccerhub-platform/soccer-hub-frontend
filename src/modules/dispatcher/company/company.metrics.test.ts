import { describe, expect, it } from "vitest";
import { metricAmounts, metricCount } from "./company.metrics";

describe("company summary aggregation", () => {
  const metrics = [
    { branchId: "a", key: "receipts", count: 30, amount: 3000, currency: "KZT" },
    { branchId: "b", key: "receipts", count: 12, amount: 1000, currency: "KZT" },
    { branchId: "b", key: "receipts", count: 2, amount: 10, currency: "USD" },
    { branchId: "a", key: "cancelledPayments", count: 8, currency: "KZT" },
  ];
  it("includes all branches and currency groups in the count, excluding other metrics", () => {
    expect(metricCount(metrics, "receipts")).toBe(44);
  });
  it("adds amounts within each currency without combining different currencies", () => {
    expect(metricAmounts(metrics, "receipts").replace(/\s/g, " ")).toBe("4 000 KZT · 10 USD");
  });
  it("preserves a zero amount and handles an empty scope", () => {
    expect(metricAmounts([{ branchId: "a", key: "debt", count: 0, amount: 0, currency: "KZT" }], "debt")).toBe("0 KZT");
    expect(metricCount([], "receipts")).toBe(0);
    expect(metricAmounts([], "debt")).toBe("0");
  });
});
