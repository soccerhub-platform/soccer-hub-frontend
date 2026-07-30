import { apiClient } from "../../../shared/api";
import {
  CreateDispatcherLeadPayload,
  DispatcherBranchOption,
  DispatcherLead,
} from "./types";

type DispatcherLeadResponse = Partial<DispatcherLead> & {
  primaryContact?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  participants?: Array<{
    fullName?: string | null;
    birthDate?: string | null;
  }> | null;
};

const ageFromBirthDate = (birthDate?: string | null) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 0);
};

export const normalizeDispatcherLead = (lead: DispatcherLeadResponse): DispatcherLead => ({
  id: lead.id ?? "",
  parentName: lead.parentName ?? lead.primaryContact?.fullName ?? "Без имени",
  phone: lead.phone ?? lead.primaryContact?.phone ?? "",
  email: lead.email ?? lead.primaryContact?.email ?? null,
  children: Array.isArray(lead.children)
    ? lead.children
    : (lead.participants ?? []).map((participant) => ({
      childName: participant.fullName ?? "Без имени",
      childAge: ageFromBirthDate(participant.birthDate),
    })),
  status: lead.status ?? "NEW",
  assignedAdminId: lead.assignedAdminId ?? null,
  comment: lead.comment ?? "",
  createdAt: lead.createdAt ?? "",
});

export const DispatcherLeadsApi = {
  async list(branchId: string): Promise<DispatcherLead[]> {
    const payload = await apiClient.get<DispatcherLeadResponse[] | { content?: DispatcherLeadResponse[] }>(`/leads?branchId=${branchId}`);
    const items = Array.isArray(payload) ? payload : payload?.content ?? [];
    return items.map(normalizeDispatcherLead);
  },

  async create(payload: CreateDispatcherLeadPayload): Promise<void> {
    await apiClient.post("/dispatcher/leads", payload);
  },

  async listBranches(): Promise<DispatcherBranchOption[]> {
    const payload = await apiClient.get<
      { branches?: Array<{ branchId: string; name: string }> } | Array<{ branchId: string; name: string }>
    >("/dispatcher/branch");

    const raw = Array.isArray(payload) ? payload : payload?.branches ?? [];
    return raw.map((branch) => ({
      id: branch.branchId,
      name: branch.name,
    }));
  },
};
