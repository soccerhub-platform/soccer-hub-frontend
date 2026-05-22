import { apiClient } from "../../shared/api";
import type {
  BaseUserProfile,
  BaseUserProfileUpdate,
  UserAvailability,
  UserNotificationSettings,
  UserWorkspaceBranch,
  UserWorkspaceGroup,
} from "../../shared/profile/foundation";

export type CoachSessionStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "OVERDUE";

export type CoachAttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface CoachSessionCard {
  id: string;
  groupName: string;
  date: string;
  time: string;
  studentCount: number;
  status: CoachSessionStatus;
  cancelReason?: string | null;
  reportDone: boolean;
  attendanceSummary: string;
}

export interface CoachStudentAttendance {
  id: string;
  name: string;
  attendance: CoachAttendanceStatus;
}

export interface CoachSessionReport {
  topic: string;
  coachComment: string;
  incidents: string;
  homework: string;
}

export interface CoachSessionDetailsResponse extends CoachSessionCard {
  students: CoachStudentAttendance[];
  report: CoachSessionReport;
}

export interface CoachTodaySessionsResponse {
  date: string;
  timezone: string;
  sessions: CoachSessionCard[];
}

export interface CoachScheduleDay {
  date: string;
  sessions: Array<Pick<CoachSessionCard, "id" | "time" | "groupName" | "status">>;
}

export interface CoachScheduleResponse {
  timezone: string;
  days: CoachScheduleDay[];
}

export interface CoachHistoryItem {
  id: string;
  date: string;
  groupName: string;
  status: CoachSessionStatus;
  attendanceSummary: string;
  reportDone: boolean;
}

export interface CoachHistoryResponse {
  content: CoachHistoryItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CoachAttendanceUpdateResponse {
  ok: boolean;
  attendanceSummary: string;
}

export interface CoachReportSaveResponse {
  ok: boolean;
  reportDone: boolean;
}

export interface CoachSimpleStatusResponse {
  ok: boolean;
  status: CoachSessionStatus;
}

export type CoachProfileBranch = UserWorkspaceBranch;
export type CoachProfileGroup = UserWorkspaceGroup;

export interface CoachProfileResponse extends BaseUserProfile {
  coachId: string;
  specialization?: string | null;
  bio?: string | null;
}

export type CoachProfileUpdateRequest = BaseUserProfileUpdate;
export type CoachAvailabilityResponse = UserAvailability;
export type CoachNotificationSettings = UserNotificationSettings;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Almaty";

export const CoachApi = {
  getTodaySessions: (date: string) =>
    apiClient.get<CoachTodaySessionsResponse>(
      `/coach/sessions/today?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
    ),

  getSessionDetails: (sessionId: string) =>
    apiClient.get<CoachSessionDetailsResponse>(
      `/coach/sessions/${sessionId}?timezone=${encodeURIComponent(timezone)}`
    ),

  getSchedule: (dateFrom: string, dateTo: string) =>
    apiClient.get<CoachScheduleResponse>(
      `/coach/schedule?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(
        dateTo
      )}&timezone=${encodeURIComponent(timezone)}`
    ),

  getHistory: (dateFrom: string, dateTo: string, page = 0, size = 20) =>
    apiClient.get<CoachHistoryResponse>(
      `/coach/history?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(
        dateTo
      )}&page=${page}&size=${size}`
    ),

  updateAttendance: (sessionId: string, students: Array<{ studentId: string; attendance: CoachAttendanceStatus }>) =>
    apiClient.patch<CoachAttendanceUpdateResponse>(`/coach/sessions/${sessionId}/attendance`, { students }),

  markAllPresent: (sessionId: string) =>
    apiClient.post<CoachAttendanceUpdateResponse>(`/coach/sessions/${sessionId}/attendance/mark-all-present`),

  saveReport: (
    sessionId: string,
    report: { topic: string; coachComment: string; incidents: string; homework: string }
  ) => apiClient.put<CoachReportSaveResponse>(`/coach/sessions/${sessionId}/report`, report),

  startSession: (sessionId: string) => apiClient.post<CoachSimpleStatusResponse>(`/coach/sessions/${sessionId}/start`),
  completeSession: (sessionId: string) =>
    apiClient.post<CoachSimpleStatusResponse>(`/coach/sessions/${sessionId}/complete`),
  cancelSession: (sessionId: string, reason: string) =>
    apiClient.post<CoachSimpleStatusResponse>(`/coach/sessions/${sessionId}/cancel`, { reason }),

  getProfile: () => apiClient.get<CoachProfileResponse>("/coach/profile", { suppressErrorToast: true }),
  updateProfile: (payload: CoachProfileUpdateRequest) =>
    apiClient.patch<CoachProfileResponse>("/coach/profile", payload, { suppressErrorToast: true }),
  getAvailability: () =>
    apiClient.get<CoachAvailabilityResponse>("/coach/profile/availability", { suppressErrorToast: true }),
  updateAvailability: (payload: CoachAvailabilityResponse) =>
    apiClient.put<CoachAvailabilityResponse>("/coach/profile/availability", payload, { suppressErrorToast: true }),
  getNotificationSettings: () =>
    apiClient.get<CoachNotificationSettings>("/coach/profile/notification-settings", { suppressErrorToast: true }),
  updateNotificationSettings: (payload: CoachNotificationSettings) =>
    apiClient.put<CoachNotificationSettings>("/coach/profile/notification-settings", payload, { suppressErrorToast: true }),
  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.post<{ success: boolean }>("/auth/change-password", payload, { suppressErrorToast: true }),
};
