// src/admin/branches/branch.api.ts
import { apiClient } from "../../../shared/api";

/* ================= API TYPES ================= */

export interface Branch {
  branchId: string;
  name: string;
  address: string;
  clubId: string;
}

/* ================= API ================= */

export const BranchApi = {
  async list(): Promise<Branch[]> {
    const response = await apiClient.get<{ branches?: Branch[] }>("/admin/branches");
    return response.branches ?? [];
  },
};
