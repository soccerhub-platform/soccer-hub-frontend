import { apiClient } from "../../../shared/api";
import type {
  ClientDetails,
  ClientActivityPage,
  ClientFormInput,
  ClientRelationInput,
  ClientRelationUpdateInput,
  ClientStudentCreateInput,
  ClientsListQuery,
  ClientsPageResponse,
  ClientStatus,
  ClientStudentRelation,
} from "./client.types";

export const ClientApi = {
  list(query: ClientsListQuery): Promise<ClientsPageResponse> {
    const params = new URLSearchParams({ branchId: query.branchId });
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.status && query.status !== "ALL") params.set("status", query.status);
    if (query.students && query.students !== "ALL") params.set("students", query.students);
    if (query.contracts && query.contracts !== "ALL") params.set("contracts", query.contracts);
    if (query.payment && query.payment !== "ALL") params.set("payment", query.payment);
    params.set("page", String(query.page ?? 0));
    params.set("size", String(query.size ?? 20));
    params.set("sort", query.sort ?? "fullName,asc");
    return apiClient.get(`/admin/clients?${params}`);
  },

  get(clientId: string): Promise<ClientDetails> {
    return apiClient.get(`/admin/clients/${clientId}`);
  },

  create(input: ClientFormInput & { branchId: string }): Promise<ClientDetails> {
    return apiClient.post("/admin/clients", input);
  },

  update(clientId: string, input: ClientFormInput): Promise<ClientDetails> {
    return apiClient.patch(`/admin/clients/${clientId}`, input);
  },

  changeStatus(clientId: string, status: ClientStatus): Promise<ClientDetails> {
    return apiClient.patch(`/admin/clients/${clientId}/status`, { status });
  },

  linkStudent(clientId: string, input: ClientRelationInput): Promise<ClientStudentRelation> {
    return apiClient.post(`/admin/clients/${clientId}/students`, input);
  },

  createStudent(clientId: string, input: ClientStudentCreateInput): Promise<ClientStudentRelation> {
    return apiClient.post(`/admin/clients/${clientId}/students/create`, input);
  },

  getStudentClients(playerId: string): Promise<ClientStudentRelation[]> {
    return apiClient.get(`/admin/students/${playerId}/clients`);
  },

  updateRelation(relationId: string, input: ClientRelationUpdateInput): Promise<ClientStudentRelation> {
    return apiClient.patch(`/admin/client-student-relations/${relationId}`, input);
  },

  endRelation(relationId: string, endedAt: string): Promise<ClientStudentRelation> {
    return apiClient.post(`/admin/client-student-relations/${relationId}/end`, { endedAt });
  },

  getActivity(clientId: string, page = 0): Promise<ClientActivityPage> {
    return apiClient.get(`/admin/clients/${clientId}/activity?page=${page}&size=20&sort=occurredAt,desc`);
  },
};
