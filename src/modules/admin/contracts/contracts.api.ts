import { apiClient } from "../../../shared/api";
import type {
  AdminPaymentsListQuery,
  AdminPaymentsPageResponse,
  CancelContractRequest,
  CancelPaymentRequest,
  ContractDetails,
  ContractParticipantOption,
  ContractsListQuery,
  ContractsPageResponse,
  ContractPaymentItem,
  ContractPaymentSummary,
  CreateContractPaymentRequest,
  CreateContractRequest,
  ExtendContractRequest,
  UpdateContractRequest,
} from "./contracts.types";

const contractsQuery = (query: ContractsListQuery) => {
  const params = new URLSearchParams();
  if (query.branchId) params.set("branchId", query.branchId);
  if (query.clientId) params.set("clientId", query.clientId);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.leadType && query.leadType !== "all") params.set("leadType", query.leadType);
  if (query.search?.trim()) params.set("search", query.search.trim());
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  return params.toString();
};

const paymentsQuery = (query: AdminPaymentsListQuery) => {
  const params = new URLSearchParams();
  if (query.branchId) params.set("branchId", query.branchId);
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.contractId) params.set("contractId", query.contractId);
  if (query.clientId) params.set("clientId", query.clientId);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.method && query.method !== "all") params.set("method", query.method);
  if (query.paidFrom) params.set("paidFrom", query.paidFrom);
  if (query.paidTo) params.set("paidTo", query.paidTo);
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  if (query.sort) params.set("sort", query.sort);
  return params.toString();
};

export const ContractsApi = {
  list(query: ContractsListQuery, _token?: string): Promise<ContractsPageResponse> {
    return apiClient.get(`/admin/contracts?${contractsQuery(query)}`);
  },

  getById(contractId: string, _token?: string): Promise<ContractDetails> {
    return apiClient.get(`/admin/contracts/${contractId}`);
  },

  listParticipants(branchId: string, clientId: string): Promise<ContractParticipantOption[]> {
    const params = new URLSearchParams({ branchId, clientId });
    return apiClient.get(`/admin/contracts/lookups/participants?${params}`);
  },

  create(payload: CreateContractRequest, _token?: string): Promise<ContractDetails> {
    return apiClient.post("/admin/contracts", payload);
  },

  update(contractId: string, payload: UpdateContractRequest, _token?: string): Promise<ContractDetails> {
    return apiClient.patch(`/admin/contracts/${contractId}`, payload);
  },

  activate(contractId: string): Promise<ContractDetails> {
    return apiClient.post(`/admin/contracts/${contractId}/activate`, {});
  },

  extend(contractId: string, payload: ExtendContractRequest, _token?: string): Promise<ContractDetails> {
    return apiClient.post(`/admin/contracts/${contractId}/extend`, payload);
  },

  cancel(contractId: string, payload: CancelContractRequest, _token?: string): Promise<ContractDetails> {
    return apiClient.post(`/admin/contracts/${contractId}/cancel`, payload);
  },

  getPaymentSummary(contractId: string, _token?: string): Promise<ContractPaymentSummary> {
    return apiClient.get(`/admin/contracts/${contractId}/payment-summary`);
  },

  listPayments(contractId: string, _token?: string): Promise<ContractPaymentItem[]> {
    return apiClient.get(`/admin/contracts/${contractId}/payments`);
  },

  createPayment(payload: CreateContractPaymentRequest, _token?: string): Promise<unknown> {
    return apiClient.post("/admin/payments", payload);
  },

  cancelPayment(paymentId: string, payload: CancelPaymentRequest, _token?: string): Promise<unknown> {
    return apiClient.post(`/admin/payments/${paymentId}/cancel`, payload);
  },

  listAdminPayments(query: AdminPaymentsListQuery, _token?: string): Promise<AdminPaymentsPageResponse> {
    return apiClient.get(`/admin/payments?${paymentsQuery(query)}`);
  },

  getAdminPayment(paymentId: string, _token?: string): Promise<ContractPaymentItem> {
    return apiClient.get(`/admin/payments/${paymentId}`);
  },
};
