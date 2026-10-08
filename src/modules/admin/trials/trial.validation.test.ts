import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resultSchema } from "./trial.validation";

describe("trial result validation", () => {
  const input = {result:"FOLLOW_UP",groupId:"",feedback:"",nextActionType:"CALL",nextActionAt:"2026-09-11T10:01"};
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-11T05:00:00Z")); });
  afterEach(() => vi.useRealTimers());
  it.each(["", "invalid", "2026-09-11T09:59", "2026-09-11T10:00"])("rejects missing/invalid/past follow-up: %s", nextActionAt => {
    expect(resultSchema.safeParse({...input,nextActionAt}).success).toBe(false);
  });
  it("interprets the future deadline in Almaty, not the device timezone", () => expect(resultSchema.safeParse(input).success).toBe(true));
  it("does not require follow-up for an interested client", () => expect(resultSchema.safeParse({...input,result:"INTERESTED",nextActionAt:""}).success).toBe(true));
  it("rejects arbitrary text in place of a group identifier", () => expect(resultSchema.safeParse({...input,groupId:"Mamyr"}).success).toBe(false));
});
