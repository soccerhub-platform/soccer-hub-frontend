import { apiClient } from "../../../shared/api";
import {
  AdminPaymentsListQuery,
  AdminPaymentsPageResponse,
  CancelContractRequest,
  CancelPaymentRequest,
  ContractDetails,
  ContractPaymentItem,
  ContractPaymentSummary,
  ContractGroupOption,
  ContractParticipantOption,
  ContractValidationResult,
  ContractsListQuery,
  ContractsPageResponse,
  CreateContractPaymentRequest,
  CreateContractRequest,
  ExtendContractRequest,
  UpdateContractRequest,
} from "./contracts.types";

const buildQueryString = (query: ContractsListQuery) => {
  const qs = new URLSearchParams();
  if (query.branchId) qs.set("branchId", query.branchId);
  if (query.clientId) qs.set("clientId", query.clientId);
  if (query.status && query.status !== "all") qs.set("status", query.status);
  if (query.leadType && query.leadType !== "all") qs.set("leadType", query.leadType);
  if (query.search?.trim()) qs.set("search", query.search.trim());
  if (typeof query.page === "number") qs.set("page", String(query.page));
  if (typeof query.size === "number") qs.set("size", String(query.size));
  return qs.toString();
};

const buildPaymentsQueryString = (query: AdminPaymentsListQuery) => {
  const qs = new URLSearchParams();
  if (query.branchId) qs.set("branchId", query.branchId);
  if (query.search?.trim()) qs.set("search", query.search.trim());
  if (query.contractId?.trim()) qs.set("contractId", query.contractId.trim());
  if (query.clientId?.trim()) qs.set("clientId", query.clientId.trim());
  if (query.status && query.status !== "all") qs.set("status", query.status);
  if (query.method && query.method !== "all") qs.set("method", query.method);
  if (query.paidFrom) qs.set("paidFrom", query.paidFrom);
  if (query.paidTo) qs.set("paidTo", query.paidTo);
  if (typeof query.page === "number") qs.set("page", String(query.page));
  if (typeof query.size === "number") qs.set("size", String(query.size));
  if (query.sort?.trim()) qs.set("sort", query.sort.trim());
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

  async listParticipants(branchId: string, _token: string, clientId?: string): Promise<ContractParticipantOption[]> {
    const qs = new URLSearchParams({ branchId });
    if (clientId) qs.set("clientId", clientId);
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

  async getPaymentSummary(contractId: string, _token: string): Promise<ContractPaymentSummary> {
    return apiClient.get<ContractPaymentSummary>(`/admin/contracts/${contractId}/payment-summary`);
  },

  async listPayments(contractId: string, _token: string): Promise<ContractPaymentItem[]> {
    const data = await apiClient.get<{ content?: ContractPaymentItem[] } | ContractPaymentItem[]>(
      `/admin/contracts/${contractId}/payments`
    );
    return Array.isArray(data) ? data : data.content ?? [];
  },

  async createPayment(payload: CreateContractPaymentRequest, _token: string): Promise<unknown> {
    return apiClient.post(`/admin/payments`, payload);
  },

  async cancelPayment(paymentId: string, payload: CancelPaymentRequest, _token: string): Promise<unknown> {
    return apiClient.post(`/admin/payments/${paymentId}/cancel`, payload);
  },

  async listAdminPayments(query: AdminPaymentsListQuery, _token: string): Promise<AdminPaymentsPageResponse> {
    const qs = buildPaymentsQueryString(query);
    return apiClient.get<AdminPaymentsPageResponse>(`/admin/payments${qs ? `?${qs}` : ""}`);
  },

  async getAdminPayment(paymentId: string, _token: string): Promise<ContractPaymentItem> {
    return apiClient.get<ContractPaymentItem>(`/admin/payments/${paymentId}`);
  },
};
