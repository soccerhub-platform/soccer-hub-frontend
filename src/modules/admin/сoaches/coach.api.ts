import { apiClient } from '../../../shared/api';

/* ================= TYPES ================= */

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
  specialization?: string | null;
}

export interface CoachGroupRef {
  groupId: string;
  groupName: string;
  branchId: string;
  groupCoachId?: string | null;
  role?: "MAIN" | "ASSISTANT" | null;
}

export interface CoachLoad {
  usedSlots: number;
  maxSlots: number;
  status: "LOW" | "NORMAL" | "HIGH" | "OVERLOADED" | string;
}

export interface CoachOverviewReports {
  overdueCount: number;
  lastReportAt: string | null;
}

export interface CoachOverviewItem {
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
  specialization?: string | null;
  groups: CoachGroupRef[];
  weeklySessionsCount: number;
  todaySessionsCount: number;
  load: CoachLoad;
  reports: CoachOverviewReports;
}

export interface CoachOverviewSummary {
  total: number;
  active: number;
  inactive: number;
  withoutGroups: number;
  overloaded: number;
  withSessionsToday: number;
}

export interface CoachOverviewResponse {
  summary: CoachOverviewSummary;
  coaches: CoachOverviewItem[];
}

export interface CoachWeeklyScheduleItem {
  scheduleId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  groupId: string;
  groupName: string;
  startDate: string;
  endDate: string | null;
}

export interface CoachUpcomingSession {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  groupId: string;
  groupName: string;
  status: string;
  reportDone: boolean;
}

export interface CoachRecentReport {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  groupId: string;
  groupName: string;
  reportedAt: string;
}

export interface CoachProfileReports {
  overdueCount: number;
  lastReportAt: string | null;
  recent: CoachRecentReport[];
}

export interface CoachStatusHistoryItem {
  status: string;
  changedAt: string;
  changedBy: string;
}

export interface CoachProfile {
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string | null;
  active: boolean;
  groups: CoachGroupRef[];
  weeklySchedule: CoachWeeklyScheduleItem[];
  upcomingSessions: CoachUpcomingSession[];
  reports: CoachProfileReports;
  statusHistory: CoachStatusHistoryItem[];
  load?: CoachLoad;
}

export type CoachStatus = "ACTIVE" | "INACTIVE";

export interface CreateCoachRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchId: string;
  specialization?: string;
}

export interface CoachUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string;
}

export interface CoachResetPasswordOutput {
  tempPassword?: string;
  temporaryPassword?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export const CoachApi = {
  overview(branchId: string, _token: string): Promise<CoachOverviewResponse> {
    const qs = new URLSearchParams({ branchId });
    return apiClient.get<CoachOverviewResponse>(`/admin/coach/overview?${qs}`);
  },

  profile(coachId: string, _token: string): Promise<CoachProfile> {
    return apiClient.get<CoachProfile>(`/admin/coach/${coachId}/profile`);
  },

  create(
    payload: CreateCoachRequest,
    _token: string
  ): Promise<Coach & { tempPassword?: string; temporaryPassword?: string }> {
    return apiClient.post<Coach & { tempPassword?: string; temporaryPassword?: string }>(
      '/admin/coach',
      payload
    );
  },

  update(coachId: string, payload: CoachUpdateRequest, _token: string): Promise<void> {
    return apiClient.patch<void>(`/admin/coach/${coachId}`, payload);
  },

  resetPassword(coachId: string, _token: string): Promise<CoachResetPasswordOutput> {
    return apiClient.post<CoachResetPasswordOutput>(`/admin/coach/${coachId}/reset-password`);
  },

  listByBranch(
    branchId: string,
    _token: string,
    page = 0,
    size = 10,
    search?: string
  ): Promise<Page<Coach>> {
    const qs = new URLSearchParams({
      page: String(page),
      size: String(size),
      ...(search ? { search } : {}),
    });

    return apiClient.get<Page<Coach>>(`/admin/coach/all/branch/${branchId}?${qs}`);
  },

  assignBranch(coachId: string, branchId: string, _token: string): Promise<void> {
    return apiClient.post<void>(`/admin/coach/${coachId}/assign-branch`, { branchId });
  },

  unassignBranch(coachId: string, branchId: string, _token: string): Promise<void> {
    return apiClient.post<void>(`/admin/coach/${coachId}/unassign-branch`, { branchId });
  },

  updateStatus(coachId: string, status: CoachStatus, _token: string): Promise<void> {
    return apiClient.patch<void>(`/admin/coach/${coachId}/status`, { status });
  },
};
