import { apiClient } from "../../../shared/api";
import { MediaAsset } from "../../../shared/media.types";

export type AdminSessionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AdminSessionEffectiveStatus = AdminSessionStatus | "OVERDUE";
export type AdminSessionCoachRole = "MAIN" | "ASSISTANT" | string;

export interface AdminSessionLocation {
  id: string;
  name: string;
}

export interface AdminSessionCoach {
  id: string;
  fullName: string;
  role: AdminSessionCoachRole;
  avatar?: MediaAsset | null;
}

export interface AdminSessionAttendanceSummary {
  total: number;
  marked: number;
  present?: number;
  absent?: number;
  excused?: number;
  late?: number;
  unmarked?: number;
  presentLike: number;
}

export interface AdminSessionCapabilities {
  canCancel: boolean;
  canReschedule: boolean;
  canSubstituteCoach: boolean;
  canOpenAttendance: boolean;
}

export interface AdminSessionListItem {
  id: string;
  scheduleId: string;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  status: AdminSessionStatus;
  effectiveStatus: AdminSessionEffectiveStatus;
  cancelReason: string | null;
  location: AdminSessionLocation | null;
  coaches: AdminSessionCoach[];
  participantsCount: number;
  attendance: AdminSessionAttendanceSummary;
  capabilities: AdminSessionCapabilities;
}

export interface AdminGroupSessionsOutput {
  groupId: string;
  from: string;
  to: string;
  items: AdminSessionListItem[];
}

export interface AdminSessionDetailsOutput extends AdminSessionListItem {
  group: {
    id: string;
    name: string;
  };
  actualStartAt: string | null;
  actualEndAt: string | null;
}

export interface AdminGroupSessionsParams {
  from: string;
  to: string;
  status?: AdminSessionEffectiveStatus;
  coachId?: string;
}

export interface AdminCancelSessionInput {
  reasonCode: "COACH_UNAVAILABLE" | "LOCATION_UNAVAILABLE" | "WEATHER" | "HOLIDAY" | "ADMIN_DECISION" | "OTHER";
  comment?: string;
}

export interface AdminRescheduleSessionInput {
  startsAt: string;
  endsAt: string;
  locationId?: string;
  reason?: string;
}

export interface AdminSubstituteCoachInput {
  replacedCoachId: string;
  substituteCoachId: string;
  reason?: string;
}

export type AdminAttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED" | "LATE" | "UNMARKED";
export type AdminPersistedAttendanceStatus = Exclude<AdminAttendanceStatus, "UNMARKED">;

export interface AdminSessionAttendanceParticipant {
  playerId: string;
  fullName: string;
  status: AdminPersistedAttendanceStatus | null;
  comment: string | null;
  avatar?: MediaAsset | null;
}

export interface AdminSessionAttendanceOutput {
  sessionId: string;
  group: {
    id: string;
    name: string;
  };
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  status: AdminSessionStatus;
  effectiveStatus: AdminSessionEffectiveStatus;
  summary: Required<AdminSessionAttendanceSummary>;
  participants: AdminSessionAttendanceParticipant[];
  capabilities: {
    canEdit: boolean;
  };
}

export interface AdminSessionAttendanceUpdateInput {
  entries: Array<{
    playerId: string;
    status: AdminPersistedAttendanceStatus;
    comment?: string | null;
  }>;
}

export interface AdminGroupAttendanceSummary {
  sessionsCount: number;
  recordedSessionsCount: number;
  totalParticipants: number;
  totalMarked: number;
  totalPresent: number;
  totalAbsent: number;
  totalExcused: number;
  totalLate: number;
  totalUnmarked: number;
  totalPresentLike: number;
  averageAttendanceRate: number;
}

export interface AdminGroupAttendanceSession {
  sessionId: string;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  status: AdminSessionStatus;
  effectiveStatus: AdminSessionEffectiveStatus;
  summary: Required<AdminSessionAttendanceSummary>;
  capabilities: {
    canOpenAttendance: boolean;
    canEditAttendance: boolean;
  };
}

export interface AdminGroupAttendanceOutput {
  groupId: string;
  from: string;
  to: string;
  summary: AdminGroupAttendanceSummary;
  sessions: AdminGroupAttendanceSession[];
}

export const AdminSessionApi = {
  listByGroup(groupId: string, params: AdminGroupSessionsParams, _token: string): Promise<AdminGroupSessionsOutput> {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    if (params.status) qs.set("status", params.status);
    if (params.coachId) qs.set("coachId", params.coachId);
    return apiClient.get<AdminGroupSessionsOutput>(`/admin/groups/${groupId}/sessions?${qs}`);
  },

  getDetails(sessionId: string, _token: string): Promise<AdminSessionDetailsOutput> {
    return apiClient.get<AdminSessionDetailsOutput>(`/admin/sessions/${sessionId}`);
  },

  cancel(sessionId: string, payload: AdminCancelSessionInput, _token: string): Promise<AdminSessionDetailsOutput> {
    return apiClient.post<AdminSessionDetailsOutput>(`/admin/sessions/${sessionId}/cancel`, payload);
  },

  reschedule(sessionId: string, payload: AdminRescheduleSessionInput, _token: string): Promise<AdminSessionDetailsOutput> {
    return apiClient.post<AdminSessionDetailsOutput>(`/admin/sessions/${sessionId}/reschedule`, payload);
  },

  substituteCoach(sessionId: string, payload: AdminSubstituteCoachInput, _token: string): Promise<AdminSessionDetailsOutput> {
    return apiClient.post<AdminSessionDetailsOutput>(`/admin/sessions/${sessionId}/substitute-coach`, payload);
  },

  getAttendance(sessionId: string, _token: string): Promise<AdminSessionAttendanceOutput> {
    return apiClient.get<AdminSessionAttendanceOutput>(`/admin/sessions/${sessionId}/attendance`);
  },

  updateAttendance(sessionId: string, payload: AdminSessionAttendanceUpdateInput, _token: string): Promise<AdminSessionAttendanceOutput> {
    return apiClient.put<AdminSessionAttendanceOutput>(`/admin/sessions/${sessionId}/attendance`, payload);
  },

  getGroupAttendance(groupId: string, params: { from: string; to: string }, _token: string): Promise<AdminGroupAttendanceOutput> {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    return apiClient.get<AdminGroupAttendanceOutput>(`/admin/groups/${groupId}/attendance?${qs}`);
  },
};
