import {expect,it} from "vitest";
import {calendarReturnTo} from "./navigation";
it("preserves only local calendar routes, including their filters",()=>{
  expect(calendarReturnTo("/admin/schedule?date=2026-09-12&coach=c&view=week")).toBe("/admin/schedule?date=2026-09-12&coach=c&view=week");
  expect(calendarReturnTo("/admin/groups/g/schedule?month=2026-09","g")).toBe("/admin/groups/g/schedule?month=2026-09");
  for(const value of ["https://example.com","//example.com","/admin/schedule/other","/admin/groups/other/schedule","/admin/schedule#fragment"]){expect(calendarReturnTo(value,"g")).toBeNull();}
});
