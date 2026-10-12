import {describe,it,expect} from "vitest";
import {businessDate,businessLocalDateTime,sessionTimestamp} from "./business-time";
describe("Almaty business calendar",()=>{
 it("uses the next business day before UTC midnight",()=>{const date=new Date("2026-10-11T21:30:00Z");expect(businessDate(date)).toBe("2026-10-12");expect(businessLocalDateTime(date)).toBe("2026-10-12T02:30");});
 it("parses a local session timestamp as Almaty and preserves explicit offsets",()=>{expect(sessionTimestamp("2026-10-12T11:30:00")).toBe(Date.parse("2026-10-12T06:30:00Z"));expect(sessionTimestamp("2026-10-12T11:30:00+03:00")).toBe(Date.parse("2026-10-12T08:30:00Z"));});
});
