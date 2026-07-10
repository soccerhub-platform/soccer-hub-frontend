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
  studentsCount?: number;
  activeStudentsCount?: number;
  weeklySlotsCount?: number;
  nextSession?: CoachGroupNextSession | null;
  riskFlags?: CoachGroupRiskFlag[];
}

export interface CoachGroupNextSession {
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
  reportDone: boolean;
}

export interface CoachGroupRiskFlag {
  code: "NO_STUDENTS" | "NO_SCHEDULE" | "NO_UPCOMING_SESSIONS" | "OVERDUE_REPORTS" | string;
  label: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
}

export interface CoachLoad {
  usedSlots: number;
  maxSlots: number;
  status: "LOW" | "NORMAL" | "HIGH" | "OVERLOADED" | string;
  completed?: number;
  planned?: number;
  used?: number;
  limit?: number;
  percentage?: number;
}

export interface CoachOverviewReports {
  overdueCount: number;
  pendingCount?: number;
  lastReportAt: string | null;
}

export interface CoachOverviewItem {
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
  accountStatus?: AccountStatus;
  workStatus?: WorkStatus;
  vacationFrom?: string | null;
  vacationTo?: string | null;
  workStatusReason?: string | null;
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

export interface PageSort {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface Page<T> {
  content: T[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: PageSort;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  sort?: PageSort;
  numberOfElements?: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CoachOverviewResponse {
  summary: CoachOverviewSummary;
  coaches: Page<CoachOverviewItem>;
}

export type CoachOverviewStatus =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE"
  | "WITHOUT_GROUPS"
  | "OVERLOADED"
  | "TODAY";

export type CoachOverviewSortKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "active"
  | "groupsCount"
  | "todaySessionsCount"
  | "weeklySessionsCount"
  | "loadUsed"
  | "loadMax"
  | "loadPercent"
  | "loadStatus"
  | "lastReportAt"
  | "overdueReportsCount"
  | "createdAt";

export type SortDirection = "asc" | "desc";

export interface CoachOverviewParams {
  page?: number;
  size?: number;
  search?: string;
  status?: CoachOverviewStatus;
  sort?: Array<{ key: CoachOverviewSortKey; direction: SortDirection }>;
  accountStatuses?: AccountStatus[];
  workStatuses?: WorkStatus[];
  groupFilter?: GroupFilter;
  workloadStatus?: WorkloadStatus;
  reportStatus?: ReportStatus;
  hasSessionToday?: boolean;
}

export type AccountStatus = "ACTIVE" | "INACTIVE";
export type WorkStatus = "AVAILABLE" | "BUSY" | "VACATION";
export type GroupFilter = "WITHOUT_GROUP" | "ONE_GROUP" | "TWO_OR_THREE_GROUPS" | "FOUR_OR_MORE_GROUPS";
export type WorkloadStatus = "LOW" | "MEDIUM" | "HIGH" | "FULL" | "OVERLOADED";
export type ReportStatus = "NO_REPORTS" | "PENDING" | "OVERDUE" | "SUBMITTED";

interface TrainerListResponse {
  content: Array<{
    id: string; firstName: string; lastName: string; email: string; phone: string;
    specialization?: string | null; accountStatus: AccountStatus; workStatus: WorkStatus;
    groupCount: number; todaySessionsCount: number; load: CoachLoad; reports: CoachOverviewReports;
  }>;
  page: number; size: number; totalElements: number; totalPages: number;
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
  coachName?: string | null;
  scheduleStatus?: string | null;
  scheduleStatusLabel?: string | null;
  conflicts?: CoachScheduleConflict[];
}

export interface CoachScheduleConflict {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  coachId: string;
  coachName: string;
  conflictingGroupId: string;
  conflictingGroupName: string;
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
  eventType?: string | null;
  previousAccountStatus?: string | null;
  newAccountStatus?: string | null;
  previousWorkStatus?: string | null;
  newWorkStatus?: string | null;
  reason?: string | null;
}

export interface CoachProfile {
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string | null;
  active: boolean;
  accountStatus?: AccountStatus;
  workStatus?: WorkStatus;
  vacationFrom?: string | null;
  vacationTo?: string | null;
  workStatusReason?: string | null;
  groups: CoachGroupRef[];
  weeklySchedule: CoachWeeklyScheduleItem[];
  upcomingSessions: CoachUpcomingSession[];
  reports: CoachProfileReports;
  statusHistory: CoachStatusHistoryItem[];
  load?: CoachLoad;
}

export type CoachStatus = "ACTIVE" | "INACTIVE";

export interface CoachAvailability { days: string[]; timeFrom: string; timeTo: string; timezone: string; }

const normalizeAvailabilityDayForApi = (day: unknown): string => {
  const text = String(day).trim().toUpperCase();
  const map: Record<string, string> = {
    MONDAY: "MON",
    TUESDAY: "TUE",
    WEDNESDAY: "WED",
    THURSDAY: "THU",
    FRIDAY: "FRI",
    SATURDAY: "SAT",
    SUNDAY: "SUN",
    MON: "MON",
    TUE: "TUE",
    WED: "WED",
    THU: "THU",
    FRI: "FRI",
    SAT: "SAT",
    SUN: "SUN",
  };
  return map[text] ?? text;
};

const normalizeAvailabilityDaysForApi = (days: unknown): string[] => {
  const flatten = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === "string") return value.split(",");
    return [];
  };

  return Array.from(new Set(flatten(days).map(normalizeAvailabilityDayForApi))).filter((day) =>
    ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(day)
  );
};

export interface TrainerOverview {
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialization?: string | null;
    accountStatus: AccountStatus;
    workStatus: WorkStatus;
  };
  load: CoachLoad;
  attentionItems: TrainerAttentionItem[];
  groups: TrainerOverviewGroup[];
  availability: CoachAvailability;
  nextSession: TrainerNextSession | null;
  lastReport: TrainerLastReport | null;
}

export interface TrainerAttentionItem {
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
  title: string;
  description: string;
  entityId?: string | null;
  action?: {
    type: string;
    label: string;
  } | null;
}

export interface TrainerOverviewGroup {
  groupId: string;
  groupName: string;
  role: "MAIN" | "ASSISTANT" | string | null;
}

export interface TrainerNextSession {
  sessionId: string;
  groupId: string;
  groupName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface TrainerLastReport {
  sessionId: string;
  groupId: string;
  groupName: string;
  submittedAt: string;
}

export interface TrainerGroupAssignmentRequest {
  groupId: string;
  role: "MAIN" | "ASSISTANT";
  assignedFrom?: string | null;
  assignedTo?: string | null;
}

export interface TrainerActivityResponse {
  content: TrainerActivityItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface TrainerActivityItem {
  id: string;
  occurredAt: string;
  type: "ACCOUNT_STATUS_CHANGED" | "WORK_STATUS_CHANGED" | string;
  title: string;
  actor: {
    id: string | null;
    name: string;
  };
  changes: TrainerActivityChange[];
}

export interface TrainerActivityChange {
  field: "accountStatus" | "workStatus" | string;
  label: string;
  from: string | null;
  to: string | null;
  fromLabel: string | null;
  toLabel: string | null;
}

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

export const CoachApi = {
  async overview(branchId: string, _token: string, params: CoachOverviewParams = {}): Promise<CoachOverviewResponse> {
    const quick: Partial<CoachOverviewParams> = params.status === "ACTIVE" ? { accountStatuses: ["ACTIVE"] }
      : params.status === "INACTIVE" ? { accountStatuses: ["INACTIVE"] }
      : params.status === "WITHOUT_GROUPS" ? { groupFilter: "WITHOUT_GROUP" }
      : params.status === "OVERLOADED" ? { workloadStatus: "OVERLOADED" }
      : params.status === "TODAY" ? { hasSessionToday: true } : {};
    const effective = { ...params, ...quick };
    const sortItem = effective.sort?.[0];
    const sortMap: Partial<Record<CoachOverviewSortKey, string>> = {
      firstName: "NAME", lastName: "NAME", groupsCount: "GROUP_COUNT",
      todaySessionsCount: "TODAY_SESSION_COUNT", loadPercent: "WORKLOAD", lastReportAt: "LAST_REPORT_AT",
    };
    const qs = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    });
    const search = effective.search?.trim();
    if (search) qs.set("search", search);
    effective.accountStatuses?.forEach((value) => qs.append("accountStatuses", value));
    effective.workStatuses?.forEach((value) => qs.append("workStatuses", value));
    if (effective.groupFilter) qs.set("groupFilter", effective.groupFilter);
    if (effective.workloadStatus) qs.set("workloadStatus", effective.workloadStatus);
    if (effective.reportStatus) qs.set("reportStatus", effective.reportStatus);
    if (effective.hasSessionToday !== undefined) qs.set("hasSessionToday", String(effective.hasSessionToday));
    if (sortItem?.key && sortMap[sortItem.key]) qs.set("sort", sortMap[sortItem.key]!);
    if (sortItem) qs.set("direction", sortItem.direction.toUpperCase());
    const [list, summary] = await Promise.all([
      apiClient.get<TrainerListResponse>(`/api/admin/branches/${branchId}/trainers?${qs}`),
      apiClient.get<CoachOverviewSummary>(`/api/admin/branches/${branchId}/trainers/summary`),
    ]);
    return {
      summary,
      coaches: {
        content: list.content.map((item) => ({
          coachId: item.id, firstName: item.firstName, lastName: item.lastName, email: item.email,
          phone: item.phone, specialization: item.specialization, active: item.accountStatus === "ACTIVE",
          accountStatus: item.accountStatus, workStatus: item.workStatus, groups: Array.from({ length: item.groupCount }, (_, index) => ({ groupId: `count-${index}`, groupName: "", branchId })),
          weeklySessionsCount: item.load.used ?? item.load.completed ?? 0, todaySessionsCount: item.todaySessionsCount,
          load: item.load, reports: item.reports,
        })),
        totalElements: list.totalElements, totalPages: list.totalPages, number: list.page, size: list.size,
        first: list.page === 0, last: list.page + 1 >= list.totalPages, empty: list.content.length === 0,
      },
    };
  },

  profile(coachId: string, _token: string): Promise<CoachProfile> {
    return apiClient.get<CoachProfile>(`/admin/coach/${coachId}/profile`);
  },

  trainerOverview(coachId: string, _token: string): Promise<TrainerOverview> {
    return apiClient.get<TrainerOverview>(`/api/admin/trainers/${coachId}/overview`);
  },

  getTrainerActivity(coachId: string, _token: string, params: { page?: number; size?: number } = {}): Promise<TrainerActivityResponse> {
    const qs = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    });
    return apiClient.get<TrainerActivityResponse>(`/api/admin/trainers/${coachId}/activity?${qs}`);
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

  updateWorkStatus(coachId: string, workStatus: WorkStatus, vacationFrom: string | null, vacationTo: string | null, reason: string | null, _token: string): Promise<void> {
    return apiClient.patch<void>(`/admin/coach/${coachId}/status`, { workStatus, vacationFrom, vacationTo, reason });
  },

  getAvailability(coachId: string, _token: string): Promise<CoachAvailability> {
    return apiClient.get<CoachAvailability>(`/api/admin/trainers/${coachId}/availability`);
  },

  updateAvailability(coachId: string, value: CoachAvailability, _token: string): Promise<CoachAvailability> {
    return apiClient.put<CoachAvailability>(`/api/admin/trainers/${coachId}/availability`, {
      ...value,
      days: normalizeAvailabilityDaysForApi(value.days),
    });
  },

  assignTrainerToGroup(coachId: string, payload: TrainerGroupAssignmentRequest, _token: string): Promise<{ assignmentId: string }> {
    return apiClient.post<{ assignmentId: string }>(`/api/admin/trainers/${coachId}/group-assignments`, payload);
  },
};
