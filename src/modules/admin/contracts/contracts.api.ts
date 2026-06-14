import { apiClient } from "../../../shared/api";
import {
  CancelContractRequest,
  ContractDetails,
  ContractGroupOption,
  ContractParticipantOption,
  ContractValidationResult,
  ContractsListQuery,
  ContractsPageResponse,
  CreateContractRequest,
  ExtendContractRequest,
  UpdateContractRequest,
} from "./contracts.types";

const buildQueryString = (query: ContractsListQuery) => {
  const qs = new URLSearchParams();
  if (query.branchId) qs.set("branchId", query.branchId);
  if (query.status && query.status !== "all") qs.set("status", query.status);
  if (query.leadType && query.leadType !== "all") qs.set("leadType", query.leadType);
  if (query.search?.trim()) qs.set("search", query.search.trim());
  if (typeof query.page === "number") qs.set("page", String(query.page));
  if (typeof query.size === "number") qs.set("size", String(query.size));
  return qs.toString();
};

export const ContractsApi = {
  async list(query: ContractsListQuery, _token: string): Promise<ContractsPageResponse> {
    const qs = buildQueryString(query);
    return apiClient.get<ContractsPageResponse>(`/admin/contracts${qs ? `?${qs}` : ""}`);
  },

  async getById(contractId: string, _token: string): Promise<ContractDetails> {
    return apiClient.get<ContractDetails>(`/admin/contracts/${contractId}`);
  },

  async listParticipants(branchId: string, _token: string): Promise<ContractParticipantOption[]> {
    const qs = new URLSearchParams({ branchId });
    const data = await apiClient.get<{ content?: ContractParticipantOption[] } | ContractParticipantOption[]>(
      `/admin/contracts/lookups/participants?${qs.toString()}`
    );
    return Array.isArray(data) ? data : data.content ?? [];
  },

  async listGroups(
    branchId: string,
    leadType: string,
    _token: string
  ): Promise<ContractGroupOption[]> {
    const qs = new URLSearchParams({ branchId, leadType });
    const data = await apiClient.get<{ content?: ContractGroupOption[] } | ContractGroupOption[]>(
      `/admin/contracts/lookups/groups?${qs.toString()}`
    );
    return Array.isArray(data) ? data : data.content ?? [];
  },

  async create(payload: CreateContractRequest, _token: string): Promise<ContractDetails | ContractValidationResult> {
    return apiClient.post(`/admin/contracts`, payload);
  },

  async update(
    contractId: string,
    payload: UpdateContractRequest,
    _token: string
  ): Promise<ContractDetails | ContractValidationResult> {
    return apiClient.patch(`/admin/contracts/${contractId}`, payload);
  },

  async extend(contractId: string, payload: ExtendContractRequest, _token: string): Promise<ContractDetails> {
    return apiClient.post(`/admin/contracts/${contractId}/extend`, payload);
  },

  async cancel(contractId: string, payload: CancelContractRequest, _token: string): Promise<ContractDetails> {
    return apiClient.post(`/admin/contracts/${contractId}/cancel`, payload);
  },
};
