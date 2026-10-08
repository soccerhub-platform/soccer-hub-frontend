import { describe, expect, it } from "vitest";
import { availableTrialSessions, formatTrialDate, formatTrialTime, trialInputDateTime, trialMatches, trialNextStep, trialReturnTo } from "./trial.workspace";
import { attendanceSchema, cancelSchema } from "./trial.validation";
import type { TrialBookingListItem } from "./trials.types";
import type { AdminSessionListItem } from "../groups/session.api";

const now = Date.parse("2026-09-13T07:00:00Z");
const scheduled = { status: "SCHEDULED", attendanceStatus: "UNMARKED", result: "PENDING", sessionStartsAt: "2026-09-13T13:00:00" } as const;
describe("trial record presentation", () => {
  it("uses Almaty for UTC and local times", () => { expect(formatTrialTime("2026-09-13T07:00:00Z")).toBe("12:00"); expect(formatTrialTime("2026-09-13T12:00:00")).toBe("12:00"); });
  it("formats midnight across a UTC date boundary", () => { expect(formatTrialDate("2026-09-12T21:00:00Z")).toContain("13"); });
  it("prefills the result deadline in Almaty", () => expect(trialInputDateTime("2026-09-13T07:00:00Z")).toBe("2026-09-13T12:00"));
  it("handles absent and malformed dates", () => { expect(formatTrialDate("broken")).toBe("Не указана"); expect(formatTrialTime(null)).toBe("—"); expect(trialInputDateTime("broken")).toBe(""); });
  it("does not flag future unmarked trials as overdue", () => expect(trialNextStep(scheduled, now).attention).toBe(false));
  it("flags a started unmarked trial", () => expect(trialNextStep({ ...scheduled, sessionStartsAt: "2026-09-13T11:00:00" }, now).attention).toBe(true));
  it("does not request attendance for canceled records", () => expect(trialNextStep({ ...scheduled, status: "CANCELED", sessionStartsAt: "2026-09-01T10:00:00" }, now).attention).toBe(false));
  it("requests result only after attendance", () => expect(trialNextStep({ ...scheduled, status: "COMPLETED", attendanceStatus: "ATTENDED" }, now).title).toBe("Записать результат"));
  it("directs a no-show toward a new booking", () => expect(trialNextStep({ ...scheduled, status: "COMPLETED", attendanceStatus: "NO_SHOW" }, now).title).toContain("неявки"));
  it("flags overdue follow-up with Almaty semantics", () => expect(trialNextStep({ ...scheduled, result: "FOLLOW_UP", nextActionAt: "2026-09-13T11:00:00" }, now).attention).toBe(true));
  it("searches names, groups and contacts case-insensitively", () => { const item = { studentName: "Арсен", groupName: "Tangy", leadPhone: "+77001234567" } as TrialBookingListItem; expect(trialMatches(item, " ТANGY ")).toBe(false); expect(trialMatches(item, " tangy ")).toBe(true); expect(trialMatches(item, "АРСЕН")).toBe(true); expect(trialMatches(item, "1234567")).toBe(true); });
  it("preserves safe list navigation", () => expect(trialReturnTo("/admin/trials?status=COMPLETED&page=2")).toContain("page=2"));
  it.each(["https://evil.example", "//evil.example", "/admin/trials/123", "/admin/trials?x=1\\evil", "/admin/trials#fragment"])("rejects unsafe return target %s", value => expect(trialReturnTo(value)).toBe("/admin/trials"));
  it("sorts only future planned alternatives", () => { const item = (id: string, startsAt: string, status = "PLANNED") => ({ id, startsAt, status } as AdminSessionListItem); expect(availableTrialSessions([item("current", "2026-09-14T12:00:00"), item("past", "2026-09-13T10:00:00"), item("canceled", "2026-09-14T12:00:00", "CANCELLED"), item("later", "2026-09-15T12:00:00"), item("first", "2026-09-14T12:00:00")], "current", now).map(s => s.id)).toEqual(["first", "later"]); });
  it("requires a meaningful cancellation reason", () => { expect(cancelSchema.safeParse({ reason: "  " }).success).toBe(false); expect(cancelSchema.parse({ reason: " причина " }).reason).toBe("причина"); });
  it("does not allow an unmarked attendance command", () => expect(attendanceSchema.safeParse({ status: "UNMARKED", comment: "" }).success).toBe(false));
});
