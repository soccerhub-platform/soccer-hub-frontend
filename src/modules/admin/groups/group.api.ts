import { apiClient } from "../../../shared/api";

/* ================= TYPES ================= */

export interface GroupApiModel {
  groupId: string;
  name: string;
  branchId: string;
  audienceType?: "CHILDREN" | "ADULT";
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
  audienceType: "CHILDREN" | "ADULT";
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

export type GroupHealth =
  | "OK"
  | "NO_COACH"
  | "NO_SCHEDULE"
  | "OVER_CAPACITY"
  | "PAUSED"
  | "STOPPED";

export interface GroupOverviewSummary {
  total: number;
  active: number;
  paused: number;
  stopped: number;
  withoutCoach: number;
  withoutSchedule: number;
  overCapacity: number;
}

export interface GroupOverviewItem {
  groupId: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  audienceType?: "CHILDREN" | "ADULT";
  ageFrom: number;
  ageTo: number;
  level: string;
  capacity: number;
  studentsCount: number;
  coachesCount: number;
  scheduleActive: boolean;
  nextSessionAt: string | null;
  health: GroupHealth;
}

export interface GroupOverviewResponse {
  summary: GroupOverviewSummary;
  groups: GroupOverviewItem[];
}

export interface GroupHealthIssue {
  code: "NO_MAIN_COACH" | "NO_SCHEDULE_PERIOD" | "OVER_CAPACITY" | "NO_UPCOMING_SESSION" | string;
  message: string;
}

export interface GroupHealthResponse {
  groupId: string;
  health: GroupHealth;
  issues: GroupHealthIssue[];
  recommendedActions: string[];
}

export interface GroupMemberItem {
  clientId: string;
  playerId: string;
  childName: string;
  birthDate: string;
  attendanceRate: number;
  contractStatus: "ACTIVE" | "UPCOMING" | "EXPIRED" | string;
  joinedAt: string;
}

export interface GroupMembersResponse {
  content: GroupMemberItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface GroupScheduleRisksResponse {
  hasConflicts: boolean;
  conflictsCount: number;
  emptyDaysCount: number;
  nextSessionAt: string | null;
}

/* ================= API ================= */

export const GroupApi = {
  /* ===== READ (organization) ===== */

  overview(branchId: string, _token: string): Promise<GroupOverviewResponse> {
    const qs = new URLSearchParams({ branchId });
    return apiClient.get<GroupOverviewResponse>(`/admin/groups/overview?${qs}`);
  },

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

  getHealth(groupId: string, _token: string): Promise<GroupHealthResponse> {
    return apiClient.get<GroupHealthResponse>(`/admin/groups/${groupId}/health`);
  },

  getMembers(groupId: string, page: number, size: number, _token: string): Promise<GroupMembersResponse> {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    return apiClient.get<GroupMembersResponse>(`/admin/groups/${groupId}/members?${qs}`);
  },

  getScheduleRisks(groupId: string, _token: string): Promise<GroupScheduleRisksResponse> {
    return apiClient.get<GroupScheduleRisksResponse>(`/admin/groups/${groupId}/schedule/risks`);
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
