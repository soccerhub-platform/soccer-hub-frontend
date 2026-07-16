import { apiClient } from "../../../shared/api";
import type { MediaAsset } from "../../../shared/media.types";

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
  avatar?: MediaAsset | null;
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

export interface GroupUpdatePayload {
  name: string;
  description?: string;
  audienceType: "CHILDREN" | "ADULT";
  ageFrom?: number;
  ageTo?: number;
  capacity: number;
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

export interface AdminGroupDetailsSummary {
  studentsCount: number;
  coachesCount: number;
  sessionsPerWeek?: number;
  sessionPerWeek?: number;
  occupancyPercent?: number;
  averageAttendancePercent?: number | null;
  capacity?: number;
  scheduleActive?: boolean;
}

export interface AdminGroupNextSession {
  id?: string;
  sessionId?: string;
  startsAt?: string;
  endsAt?: string;
  startAt?: string;
  endAt?: string;
}

export interface AdminGroupCapabilities {
  canEdit?: boolean;
  canPause?: boolean;
  canResume?: boolean;
  canStop?: boolean;
  canArchive?: boolean;
  canAddStudent?: boolean;
}

export interface AdminGroupDetailsModel {
  id?: string;
  groupId?: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
  audienceType?: "CHILDREN" | "ADULT";
  ageFrom?: number | null;
  ageTo?: number | null;
  level: string;
  capacity: number;
  branchId?: string | null;
  branch?: {
    id?: string;
    branchId?: string;
    name?: string;
  } | null;
  summary?: AdminGroupDetailsSummary | null;
  health?: GroupHealthResponse | null;
  nextSession?: AdminGroupNextSession | string | null;
  capabilities?: AdminGroupCapabilities | null;
  avatar?: MediaAsset | null;
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
  avatar?: MediaAsset | null;
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
  membershipId?: string | null;
  clientId: string;
  playerId: string;
  childName: string;
  avatar?: MediaAsset | null;
  birthDate: string;
  attendanceRate: number;
  membershipStatus?: "UPCOMING" | "ACTIVE" | "TRANSFERRED" | "COMPLETED" | "REMOVED" | string;
  contractStatus: "ACTIVE" | "UPCOMING" | "EXPIRED" | string;
  joinedAt: string;
  leftAt?: string | null;
  capabilities?: {
    canTransfer?: boolean;
    canRemove?: boolean;
  } | null;
}

export interface GroupMembersResponse {
  content: GroupMemberItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type GroupMembershipReason =
  | "NEW_ENROLLMENT"
  | "TRANSFER"
  | "SCHEDULE_CHANGE"
  | "PARENT_REQUEST"
  | "MOVED_TO_ANOTHER_CITY"
  | "MEDICAL"
  | "PAYMENT_ISSUES"
  | "DISCIPLINE"
  | "OTHER"
  | string;

export interface GroupMemberCommandOutput {
  membershipId: string;
  group: {
    id: string;
    name: string;
  };
  player: {
    id: string;
    fullName: string;
    birthDate?: string | null;
  };
  status: string;
  joinedAt: string;
  leftAt?: string | null;
  joinReason?: string | null;
  leaveReason?: string | null;
  comment?: string | null;
  sourceContractId?: string | null;
}

export interface GroupMemberTransferOutput {
  previousMembership: GroupMemberCommandOutput;
  newMembership: GroupMemberCommandOutput;
}

export interface AddGroupMemberPayload {
  playerId: string;
  joinedAt: string;
  reason: GroupMembershipReason;
  comment?: string | null;
}

export interface TransferGroupMemberPayload {
  targetGroupId: string;
  transferDate: string;
  reason: GroupMembershipReason;
  comment?: string | null;
}

export interface RemoveGroupMemberPayload {
  leftAt: string;
  reason: GroupMembershipReason;
  comment?: string | null;
}

export interface GroupMemberCandidateWarning {
  code: string;
  message: string;
}

export interface GroupMemberCandidateMembership {
  membershipId?: string;
  groupId: string;
  groupName: string;
  status: string;
  joinedAt: string;
  leftAt?: string | null;
}

export interface GroupMemberCandidate {
  playerId: string;
  fullName: string;
  birthDate?: string | null;
  age?: number | null;
  eligible: boolean;
  earliestAvailableJoinDate?: string | null;
  warnings?: GroupMemberCandidateWarning[];
  currentMemberships?: GroupMemberCandidateMembership[];
}

export interface GroupMemberCandidatesResponse {
  groupId: string;
  items: GroupMemberCandidate[];
  total: number;
  page: number;
  size: number;
}

export type GroupActivityType =
  | "GROUP_UPDATED"
  | "GROUP_STATUS_CHANGED"
  | "STUDENT_ADDED"
  | "STUDENT_TRANSFERRED"
  | "STUDENT_REMOVED"
  | "SESSION_CANCELLED"
  | "SESSION_RESCHEDULED"
  | "SESSION_COACH_SUBSTITUTED"
  | "ATTENDANCE_UPDATED"
  | "COACH_ASSIGNED"
  | "COACH_UNASSIGNED"
  | string;

export interface GroupActivityActor {
  id?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
}

export interface GroupActivityItem {
  id: string;
  type?: GroupActivityType;
  activityType?: GroupActivityType;
  occurredAt?: string | null;
  createdAt?: string | null;
  actor?: GroupActivityActor | null;
  actorName?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface GroupActivityResponse {
  content: GroupActivityItem[];
  totalElements?: number;
  totalPages?: number;
  page?: number;
  size?: number;
  number?: number;
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

  getDetails(groupId: string, _token: string): Promise<AdminGroupDetailsModel> {
    return apiClient.get<AdminGroupDetailsModel>(`/admin/groups/${groupId}`);
  },

  getHealth(groupId: string, _token: string): Promise<GroupHealthResponse> {
    return apiClient.get<GroupHealthResponse>(`/admin/groups/${groupId}/health`);
  },

  getMembers(groupId: string, page: number, size: number, _token: string): Promise<GroupMembersResponse> {
    const qs = new URLSearchParams({ page: String(page), size: String(size) });
    return apiClient.get<GroupMembersResponse>(`/admin/groups/${groupId}/members?${qs}`);
  },

  getMemberCandidates(
    groupId: string,
    params: { search?: string; page?: number; size?: number },
    _token: string
  ): Promise<GroupMemberCandidatesResponse> {
    const qs = new URLSearchParams({
      search: params.search ?? "",
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    });
    return apiClient.get<GroupMemberCandidatesResponse>(`/admin/groups/${groupId}/member-candidates?${qs}`);
  },

  getActivity(
    groupId: string,
    params: { page?: number; size?: number },
    _token: string
  ): Promise<GroupActivityResponse> {
    const qs = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 5),
    });
    return apiClient.get<GroupActivityResponse>(`/admin/groups/${groupId}/activity?${qs}`);
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

  update(groupId: string, payload: GroupUpdatePayload, _token: string): Promise<AdminGroupDetailsModel> {
    return apiClient.patch<AdminGroupDetailsModel>(`/admin/groups/${groupId}`, payload);
  },

  uploadAvatar(groupId: string, file: File, _token: string): Promise<MediaAsset> {
    const formData = new FormData();
    formData.set("file", file);
    return apiClient.postForm<MediaAsset>(`/admin/groups/${groupId}/avatar`, formData);
  },

  deleteAvatar(groupId: string, _token: string): Promise<void> {
    return apiClient.delete<void>(`/admin/groups/${groupId}/avatar`);
  },

  addMember(groupId: string, payload: AddGroupMemberPayload, _token: string): Promise<GroupMemberCommandOutput> {
    return apiClient.post<GroupMemberCommandOutput>(`/admin/groups/${groupId}/members`, payload);
  },

  transferMember(
    membershipId: string,
    payload: TransferGroupMemberPayload,
    _token: string
  ): Promise<GroupMemberTransferOutput> {
    return apiClient.post<GroupMemberTransferOutput>(`/admin/groups/group-memberships/${membershipId}/transfer`, payload);
  },

  removeMember(
    membershipId: string,
    payload: RemoveGroupMemberPayload,
    _token: string
  ): Promise<GroupMemberCommandOutput> {
    return apiClient.post<GroupMemberCommandOutput>(`/admin/groups/group-memberships/${membershipId}/remove`, payload);
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
