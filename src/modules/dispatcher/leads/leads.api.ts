import { apiClient } from "../../../shared/api";
import {
  CreateDispatcherLeadPayload,
  DispatcherBranchOption,
  DispatcherLead,
} from "./types";

export const DispatcherLeadsApi = {
  async list(branchId: string): Promise<DispatcherLead[]> {
    const payload = await apiClient.get<DispatcherLead[] | { content?: DispatcherLead[] }>(`/leads?branchId=${branchId}`);
    if (Array.isArray(payload)) return payload;
    return payload?.content ?? [];
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
