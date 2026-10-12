import {describe,it,expect} from "vitest";
import {businessInput,inputInstant,dateTime} from "./operations.format";
describe("dispatcher business time",()=>{
 it("round trips an instant through Almaty form fields independently of device timezone",()=>{expect(businessInput("2099-10-12T06:30:00Z")).toBe("2099-10-12T11:30");expect(inputInstant("2099-10-12T11:30")).toBe("2099-10-12T06:30:00.000Z");});
 it("treats local server session time as Almaty time",()=>{expect(businessInput("2099-10-12T11:30:00")).toBe("2099-10-12T11:30");});
 it("keeps missing and malformed timestamps visible as unknown",()=>{expect(inputInstant("")).toBeNull();expect(businessInput("broken")).toBe("");expect(dateTime("broken")).toBe("—");expect(dateTime()).toBe("—");});
});
