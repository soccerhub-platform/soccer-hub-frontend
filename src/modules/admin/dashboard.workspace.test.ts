import { describe, expect, it } from "vitest";
import { businessDate } from "../../shared/business-time";
import { matchesCreatedPeriod } from "./leads/lead.workspace";
import { dashboardMoney, dashboardNumber, dashboardSessionState, dashboardSignals, dashboardTarget, dashboardTime } from "./dashboard.workspace";
import type { AdminDashboardSummaryResponse, DashboardSession } from "./dashboard-summary.types";

const session = (status = "PLANNED"): DashboardSession => ({ sessionId: "one", groupId: "g", groupName: "Group", coachId: "c", coachName: "Coach", startAt: "2026-09-14T18:00:00+05:00", endAt: "2026-09-14T19:00:00+05:00", status, scheduleType: "REGULAR" });
describe("dashboard workspace", () => {
  it("keeps zero distinct from unavailable figures", () => {
    expect(dashboardMoney(null)).toBe("—"); expect(dashboardNumber(undefined)).toBe("—");
    expect(dashboardMoney(0)).toBe("0 ₸"); expect(dashboardNumber(NaN)).toBe("—");
    expect(dashboardMoney(20000)).toContain("₸");
  });
  it("uses Almaty day at UTC midnight boundary", () => {
    expect(businessDate(new Date("2026-09-13T20:15:00Z"))).toBe("2026-09-14");
    expect(dashboardTime("2026-09-13T20:15:00Z")).toBe("01:15");
    expect(dashboardTime("2026-09-14T01:15:00")).toBe("01:15");
  });
  it("computes live and overdue status with exact end boundary", () => {
    expect(dashboardSessionState(session(), Date.parse("2026-09-14T12:59:00Z")).code).toBe("PLANNED");
    expect(dashboardSessionState(session(), Date.parse("2026-09-14T13:00:00Z")).code).toBe("IN_PROGRESS");
    expect(dashboardSessionState(session(), Date.parse("2026-09-14T14:00:00Z")).code).toBe("OVERDUE");
  });
  it("does not reopen completed or cancelled sessions as live/overdue", () => {
    const now = Date.parse("2026-09-14T13:30:00Z");
    expect(dashboardSessionState(session("COMPLETED"), now).code).toBe("COMPLETED");
    expect(dashboardSessionState(session("CANCELLED"), now).code).toBe("CANCELLED");
    expect(dashboardSessionState(session("FUTURE_ENUM"), now).code).toBe("UNKNOWN");
  });
  it("fixes old destinations and rejects external targets", () => {
    expect(dashboardTarget("/admin/dashboard/today-schedule?branchId=x", "2026-09-14")).toBe("/admin/schedule?date=2026-09-14&day=2026-09-14");
    expect(dashboardTarget("//evil.test", "2026-09-14")).toBe("/admin/dashboard");
    expect(dashboardTarget("/admin/contracts?filter=ending-soon", "2026-09-14")).toBe("/admin/contracts?status=ACTIVE");
  });
  it("deduplicates signals but preserves separate groups and all priorities", () => {
    const data = { meta: { date: "2026-09-14" }, alerts: { attention: [
      { id: "all-clear", tone: "success", title: "Clear", action: { target: "/admin", label: "Open" } },
      { id: "overdue-reports", tone: "warning", title: "Overdue", action: { target: "/admin/coaches", label: "Open" } },
      { id: "group-coverage", tone: "warning", title: "Coverage", action: { target: "/admin/groups", label: "Open" } },
    ] }, risks: { items: [
      { code: "overdue-reports", tone: "danger", label: "Overdue", target: "/admin/coaches" },
      { code: "low-attendance", tone: "danger", label: "Group one", target: "/admin/groups/one" },
      { code: "low-attendance", tone: "danger", label: "Group two", target: "/admin/groups/two" },
      { code: "groups-without-coach", tone: "warning", label: "No coach", target: "/admin/groups" },
      { code: "groups-without-schedule", tone: "warning", label: "No schedule", target: "/admin/groups" },
    ] } } as AdminDashboardSummaryResponse;
    const rows = dashboardSignals(data);
    expect(rows).toHaveLength(5); expect(rows[0].tone).toBe("danger");
    expect(rows.filter(r => r.id === "overdue-reports")).toHaveLength(1);
    expect(rows.some(r => r.id === "all-clear" || r.id === "group-coverage")).toBe(false);
  });
  it("opens a matching created-at cohort including the first day and not future leads", () => {
    expect(matchesCreatedPeriod("2026-09-13T20:00:00Z", "TODAY", "2026-09-14")).toBe(true);
    expect(matchesCreatedPeriod("2026-09-13T18:59:00Z", "TODAY", "2026-09-14")).toBe(false);
    expect(matchesCreatedPeriod("2026-08-18T12:00:00Z", "LAST_28_DAYS", "2026-09-14")).toBe(true);
    expect(matchesCreatedPeriod("2026-08-17T12:00:00Z", "LAST_28_DAYS", "2026-09-14")).toBe(false);
    expect(matchesCreatedPeriod("2026-09-15T12:00:00Z", "LAST_28_DAYS", "2026-09-14")).toBe(false);
  });
});
