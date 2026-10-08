import { describe, expect, it } from "vitest";
import { addBusinessDays, birthDateError, businessDate, contactLinks, isActiveLead, matchesSearch, nextStep, overdue, sessionSearchRanges, sessionTimestamp, sourceLabel, summarize } from "./lead.workspace";
import type { Lead } from "./types";
import type { TrialBookingListItem } from "../trials/trials.types";

const lead = (overrides: Partial<Lead> = {}): Lead => ({
  id: "lead-1", leadType: "CHILDREN", primaryContact: { fullName: "Иван Петров", phone: "+7 (777) 123-45-67", email: "ivan@example.com" },
  participants: [{ id: "child-1", fullName: "Анна Петрова" }], actions: [], status: "NEW",
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", ...overrides,
});
const trial = (overrides: Partial<TrialBookingListItem> = {}): TrialBookingListItem => ({
  id: "trial-1", trainingSessionId: "session-1", status: "SCHEDULED", attendanceStatus: "UNMARKED", result: "PENDING", sessionDate: "2026-09-10", ...overrides,
});

describe("lead workspace", () => {
  it.each(["", "not-a-date", "2026-02-30", "2026-09-11", "2099-01-01"])("rejects missing, invalid and future birth dates: %s", value => expect(birthDateError(value,"2026-09-11")).not.toBe(""));
  it("accepts valid past birth dates, including a leap day", () => expect(birthDateError("2016-02-29","2026-09-11")).toBe(""));
  it("calculates conversion across all statuses, including losses", () => {
    const result = summarize([lead(), lead({status:"CONVERTED"}), lead({status:"CONVERTED"}), lead({status:"LOST"})]);
    expect(result.conversion).toBe(50);
    expect(result.active).toBe(1);
  });
  it("does not invent conversion for an empty cohort", () => expect(summarize([]).conversion).toBeNull());
  it("counts bookings today, not all scheduled leads", () => {
    const result = summarize([lead({currentTrials:[trial(),trial({id:"second"}),trial({status:"CANCELED"}),trial({sessionDate:"2026-09-11"})]})],"2026-09-10");
    expect(result.trialsToday).toBe(2);
  });
  it("excludes closed leads from overdue and missing-task queues", () => {
    const closed = lead({status:"LOST",work:{priority:"URGENT",version:1,nextAction:"Позвонить",nextActionAt:"2020-01-01T00:00:00Z"}});
    expect(overdue(closed)).toBe(false);
    expect(isActiveLead(closed)).toBe(false);
    expect(nextStep(closed)).not.toBe("Позвонить");
    expect(summarize([closed,lead({status:"CONVERTED"})]).withoutTask).toBe(0);
  });
  it("marks active overdue tasks and prioritizes the planned action", () => {
    const value = lead({work:{priority:"HIGH",version:1,nextAction:"Позвонить",nextActionAt:"2026-09-10T09:00:00Z"}});
    expect(overdue(value,Date.parse("2026-09-10T10:00:00Z"))).toBe(true);
    expect(overdue(value,Date.parse("2026-09-10T08:00:00Z"))).toBe(false);
    expect(nextStep(value)).toBe("Позвонить");
  });
  it.each(["ИВАН", "анна", "ivan@example", "+7 777 123-45", "7771234567", ""])('searches name, child, email or normalized phone: %s', query => expect(matchesSearch(lead(),query)).toBe(true));
  it("searches source and owner without treating arbitrary text as phone digits", () => {
    const value = lead({source:"CALL",assignedAdmin:{id:"admin",name:"Мария"}});
    expect(matchesSearch(value,"телефон")).toBe(true);
    expect(matchesSearch(value,"мария")).toBe(true);
    expect(matchesSearch(value,"abc777")).toBe(false);
    expect(sourceLabel("UNKNOWN")).toBe("Другой источник");
  });
  it("generates contact links without sending messages", () => {
    expect(contactLinks(lead())).toEqual({phone:"tel:+77771234567",whatsapp:"https://wa.me/77771234567",email:"mailto:ivan%40example.com"});
    expect(contactLinks(lead({primaryContact:{fullName:"Test",phone:"123"}})).whatsapp).toBeNull();
  });
  it("uses the Almaty calendar day around UTC midnight", () => {
    expect(businessDate(new Date("2026-09-09T19:30:00Z"))).toBe("2026-09-10");
    expect(businessDate(new Date("2026-09-09T18:59:00Z"))).toBe("2026-09-09");
  });
  it.each(["2026-09-10T10:00:00", "2026-09-10T10:00:00+05:00", "2026-09-10T10:00:00+0500", "2026-09-10T05:00:00Z"])("parses local and timezone-aware session dates: %s", value => {
    expect(sessionTimestamp(value)).toBe(Date.parse("2026-09-10T05:00:00Z"));
  });
  it("does not accept malformed scheduling dates", () => expect(sessionTimestamp("bad-date")).toBeNaN());
  it("splits a 60-day lookup into API-compatible ranges without gaps", () => {
    expect(sessionSearchRanges("2026-09-01")).toEqual([{from:"2026-09-01",to:"2026-09-30"},{from:"2026-10-01",to:"2026-10-30"}]);
  });
  it("handles leap days and year boundaries", () => {
    expect(addBusinessDays("2028-02-28",1)).toBe("2028-02-29");
    expect(addBusinessDays("2026-12-31",1)).toBe("2027-01-01");
  });
});
