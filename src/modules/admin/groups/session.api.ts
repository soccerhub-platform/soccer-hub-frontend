import { apiClient } from "../../../shared/api";

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
}

export interface AdminSessionAttendanceSummary {
  total: number;
  marked: number;
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
};
