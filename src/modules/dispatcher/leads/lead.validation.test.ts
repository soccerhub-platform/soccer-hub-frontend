import { afterEach, describe, expect, it, vi } from "vitest";
import { validateDispatcherParticipant } from "./lead.validation";

describe("dispatcher participant validation", () => {
  afterEach(() => vi.useRealTimers());
  it("requires a named participant and an actual birth date", () => {
    expect(validateDispatcherParticipant({fullName:"   ",birthDate:"2018-05-10"})).toBeTruthy();
    expect(validateDispatcherParticipant({fullName:"QA ученик"})).toBeTruthy();
    expect(validateDispatcherParticipant({fullName:"QA ученик",birthDate:"2018-02-30"})).toBeTruthy();
  });
  it("rejects today and future dates using the club timezone", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T22:00:00Z"));
    expect(validateDispatcherParticipant({fullName:"QA ученик",birthDate:"2026-10-08"})).toBeTruthy();
    expect(validateDispatcherParticipant({fullName:"QA ученик",birthDate:"2026-10-09"})).toBeTruthy();
    expect(validateDispatcherParticipant({fullName:"QA ученик",birthDate:"2018-05-10"})).toBe("");
  });
});
