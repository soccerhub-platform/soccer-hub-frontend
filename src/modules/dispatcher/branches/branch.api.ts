import { apiClient } from "../../../shared/api";
import { BranchDetailsPayload, BranchManager, DispatcherBranch } from "./branch.types";

export const BranchManagementApi = {
  list: () => apiClient.get<{ branches: DispatcherBranch[] }>("/dispatcher/branch?includeArchived=true"),
  managers: () => apiClient.get<{ admins: BranchManager[] }>("/dispatcher/admin"),
  create: (clubId: string, payload: BranchDetailsPayload) => apiClient.post("/dispatcher/branch/create", { clubId, ...payload }),
  update: (id: string, payload: BranchDetailsPayload) => apiClient.put(`/dispatcher/branch/${id}`, payload),
  archive: (id: string) => apiClient.post(`/dispatcher/branch/${id}/archive`),
  restore: (id: string) => apiClient.post(`/dispatcher/branch/${id}/restore`),
};
