import { apiClient } from "../../../shared/api";
import type {
  AdminStudentDetails,
  AdminStudentMembershipHistoryResponse,
  AdminStudentsPageResponse,
  AdminStudentsQuery,
} from "./student.types";
import type { MediaAsset } from "../../../shared/media.types";

const buildStudentsQuery = (query: AdminStudentsQuery) => {
  const qs = new URLSearchParams();
  qs.set("branchId", query.branchId);
  if (query.search?.trim()) qs.set("search", query.search.trim());
  if (query.paymentStatus && query.paymentStatus !== "all") qs.set("paymentStatus", query.paymentStatus);
  if (query.contractStatus && query.contractStatus !== "all") qs.set("contractStatus", query.contractStatus);
  if (query.risk && query.risk !== "all") qs.set("risk", query.risk);
  if (query.groupId) qs.set("groupId", query.groupId);
  if (typeof query.page === "number") qs.set("page", String(query.page));
  if (typeof query.size === "number") qs.set("size", String(query.size));
  if (query.sort?.trim()) qs.set("sort", query.sort.trim());
  return qs.toString();
};

export const StudentApi = {
  list(query: AdminStudentsQuery): Promise<AdminStudentsPageResponse> {
    return apiClient.get<AdminStudentsPageResponse>(`/admin/students?${buildStudentsQuery(query)}`);
  },

  get(playerId: string): Promise<AdminStudentDetails> {
    return apiClient.get<AdminStudentDetails>(`/admin/students/${playerId}`);
  },

  getMemberships(playerId: string): Promise<AdminStudentMembershipHistoryResponse> {
    return apiClient.get<AdminStudentMembershipHistoryResponse>(`/admin/students/${playerId}/memberships`);
  },

  uploadAvatar(playerId: string, file: File): Promise<MediaAsset> {
    const formData = new FormData();
    formData.set("file", file);
    return apiClient.postForm<MediaAsset>(`/admin/students/${playerId}/avatar`, formData);
  },

  deleteAvatar(playerId: string): Promise<void> {
    return apiClient.delete<void>(`/admin/students/${playerId}/avatar`);
  },

  getAvatarDownloadUrl(playerId: string): Promise<{ url: string }> {
    return apiClient.get<{ url: string }>(`/admin/students/${playerId}/avatar/download-url`);
  },
};
