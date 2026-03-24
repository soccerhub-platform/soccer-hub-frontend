import { getApiUrl } from "../../../shared/api";
import {
  CreateDispatcherLeadPayload,
  DispatcherBranchOption,
  DispatcherLead,
} from "./types";

const parseJsonResponse = async <T,>(response: Response): Promise<T | null> => {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
};

const assertOk = async (response: Response) => {
  if (response.ok) return;
  const payload = await parseJsonResponse<{ message?: string }>(response);
  throw new Error(payload?.message || "Request failed");
};

export const DispatcherLeadsApi = {
  async list(branchId: string, token: string): Promise<DispatcherLead[]> {
    const response = await fetch(getApiUrl(`/leads?branchId=${branchId}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await assertOk(response);
    const payload = await parseJsonResponse<DispatcherLead[] | { content?: DispatcherLead[] }>(response);
    if (Array.isArray(payload)) return payload;
    return payload?.content ?? [];
  },

  async create(payload: CreateDispatcherLeadPayload, token: string): Promise<void> {
    const response = await fetch(getApiUrl("/dispatcher/leads"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    await assertOk(response);
  },

  async listBranches(token: string): Promise<DispatcherBranchOption[]> {
    const response = await fetch(getApiUrl("/dispatcher/branch"), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await assertOk(response);
    const payload = await parseJsonResponse<
      { branches?: Array<{ branchId: string; name: string }> } | Array<{ branchId: string; name: string }>
    >(response);

    const raw = Array.isArray(payload) ? payload : payload?.branches ?? [];
    return raw.map((branch) => ({
      id: branch.branchId,
      name: branch.name,
    }));
  },
};
