import { describe, expect, it } from "vitest";
import { filterSessions, sessionTimeLabel, sessionWeek, validCalendarDate, type WorkspaceSession } from "./sessions.workspace";

describe("sessions calendar", () => {
  it("uses Monday to Sunday for a Sunday anchor", () => expect(sessionWeek("2026-09-13")).toEqual(["2026-09-07","2026-09-08","2026-09-09","2026-09-10","2026-09-11","2026-09-12","2026-09-13"]));
  it("crosses year boundaries", () => expect(sessionWeek("2027-01-01")).toEqual(["2026-12-28","2026-12-29","2026-12-30","2026-12-31","2027-01-01","2027-01-02","2027-01-03"]));
  it("rejects invalid URL dates", () => {for (const date of [null,"2026-02-30","bad","2026-13-01"]) expect(validCalendarDate(date)).toBe(false);});
  it("accepts leap dates", () => expect(validCalendarDate("2028-02-29")).toBe(true));
  it("uses club time for UTC and local session timestamps", () => {
    expect(sessionTimeLabel("2026-09-12T10:30:00Z")).toBe("15:30");
    expect(sessionTimeLabel("2026-09-12T15:30:00")).toBe("15:30");
  });
  const items = [
    {id:"late",groupName:"Юниоры",effectiveStatus:"PLANNED",startsAt:"2026-09-12T17:00:00",coaches:[{id:"a",fullName:"Анна"}],location:{name:"Арена"}},
    {id:"early",groupName:"Взрослые",effectiveStatus:"OVERDUE",startsAt:"2026-09-12T10:00:00",coaches:[{id:"b",fullName:"Иван"}],location:null},
  ] as WorkspaceSession[];
  it("combines status, coach and normalized search", () => expect(filterSessions(items,{status:"PLANNED",coach:"a",query:" АРЕНА "}).map(s=>s.id)).toEqual(["late"]));
  it("sorts chronologically without mutating input", () => {
    expect(filterSessions(items,{status:"ALL",coach:"",query:""}).map(s=>s.id)).toEqual(["early","late"]);
    expect(items[0].id).toBe("late");
  });
  it("matches effective overdue status", () => expect(filterSessions(items,{status:"OVERDUE",coach:"",query:""}).map(s=>s.id)).toEqual(["early"]));
});
