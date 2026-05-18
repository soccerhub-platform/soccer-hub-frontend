import { apiClient } from "../../../shared/api";

/* ================= TYPES ================= */

export interface GroupApiModel {
  groupId: string;
  name: string;
  branchId: string;
  ageFrom: number;
  ageTo: number;
  level: string;
  capacity: number;
  description: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
}

export interface GroupCreatePayload {
  name: string;
  description?: string;
  branchId: string;
  ageFrom?: number;
  ageTo?: number;
  capacity?: number;
  level: string;
}

export interface GroupCoachApiModel {
  groupCoachId: string;
  coachId: string;
  groupId: string;

  coachFirstName: string;
  coachLastName: string;
  email: string;
  phone: string;
  active: boolean;

  coachRole: "MAIN" | "ASSISTANT";

  assignedFrom: string;
  assignedTo: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface GroupCoachesResponse {
  groupId: string;
  coaches: GroupCoachApiModel[];
}

export interface GroupSummaryModel {
  groupId: string;
  coachesCount: number;
  sessionPerWeek: number;
  nextSession: string | null;
  studentsCount: number;
  capacity: number;
  scheduleActive: boolean;
}

/* ================= API ================= */

export const GroupApi = {
  /* ===== READ (organization) ===== */

  listByBranch(
    branchId: string,
    _token: string
  ): Promise<GroupApiModel[]> {
    return apiClient.get<GroupApiModel[]>(`/organization/groups/branches/${branchId}`);
  },

  getById(
    groupId: string,
    _token: string
  ): Promise<GroupApiModel> {
    return apiClient.get<GroupApiModel>(`/organization/groups/${groupId}`);
  },

  /* ===== WRITE (admin) ===== */

  async create(
    payload: GroupCreatePayload,
    _token: string
  ): Promise<void> {
    await apiClient.post<void>("/admin/groups/create", payload);
  },

  updateStatus(
    groupId: string,
    status: "ACTIVE" | "PAUSED" | "STOPPED",
    _token: string
  ): Promise<void> {
    return apiClient.patch<void>(`/admin/groups/${groupId}/status`, { status });
  },

  // ✅ GET /admin/groups/{groupId}/coaches
  getCoaches(groupId: string, _token: string): Promise<GroupCoachesResponse> {
    return apiClient.get<GroupCoachesResponse>(`/admin/groups/${groupId}/coaches`);
  },

  // ✅ DELETE /admin/groups/coaches/{groupCoachId}
  unassignCoach(groupCoachId: string, _token: string): Promise<void> {
    return apiClient.delete<void>(`/admin/groups/coaches/${groupCoachId}`);
  },

  // ✅ POST /admin/groups/{groupId}/coaches/{coachId}
  async assignCoach(
    groupId: string,
    coachId: string,
    role: "MAIN" | "ASSISTANT",
    _token: string
  ): Promise<{ groupCoachId: string }> {
    return apiClient.post<{ groupCoachId: string }>(`/admin/groups/${groupId}/coaches`, {
      coachId,
      role,
    });
  },

  // ✅ GET /organization/groups/{groupId}/summary
  getSummary(groupId: string, _token: string): Promise<GroupSummaryModel> {
    return apiClient.get<GroupSummaryModel>(`/organization/groups/${groupId}/summary`);
  },
};
