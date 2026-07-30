import { describe, expect, it } from "vitest";
import { normalizeDispatcherLead } from "./leads.api";

describe("normalizeDispatcherLead", () => {
  it("keeps the legacy dispatcher lead shape", () => {
    const lead = normalizeDispatcherLead({
      id: "lead-1",
      parentName: "Анна",
      phone: "+77010000000",
      children: [{ childName: "Арман", childAge: 9 }],
      status: "NEW",
      assignedAdminId: null,
      comment: "",
      createdAt: "2026-07-29T10:00:00Z",
    });

    expect(lead.parentName).toBe("Анна");
    expect(lead.children).toHaveLength(1);
  });

  it("maps the current lead contract and guarantees children", () => {
    const lead = normalizeDispatcherLead({
      id: "lead-2",
      primaryContact: { fullName: "Мария", phone: "+77020000000" },
      participants: [{ fullName: "Али", birthDate: "2016-05-10" }],
      status: "IN_PROGRESS",
      createdAt: "2026-07-29T10:00:00Z",
    });

    expect(lead.parentName).toBe("Мария");
    expect(lead.phone).toBe("+77020000000");
    expect(lead.children[0]?.childName).toBe("Али");
  });

  it("uses an empty children array when both fields are absent", () => {
    const lead = normalizeDispatcherLead({ id: "lead-3" });

    expect(lead.children).toEqual([]);
  });
});
