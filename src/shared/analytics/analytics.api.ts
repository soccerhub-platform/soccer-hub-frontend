import { apiClient } from "../api";

export type AnalyticsRoleScope = "admin" | "dispatcher";
export type AnalyticsGroupBy = "DAY" | "WEEK" | "MONTH";
export type AnalyticsEndpoint =
  | "funnel"
  | "coach-load"
  | "retention"
  | "sla"
  | "loss-reasons"
  | "kpi";

export type AnalyticsMeta = {
  dateFrom: string;
  dateTo: string;
  timezone: string;
  generatedAt: string;
  branchId: string;
  filtersApplied?: {
    groupBy?: AnalyticsGroupBy;
    coachId?: string;
    groupId?: string;
    page?: number;
    size?: number;
    sort?: string;
  };
};

export type AnalyticsEmptyState = {
  isEmpty: boolean;
  reason: string | null;
};

export type AnalyticsResponse<TSummary = Record<string, unknown>, TSeries = unknown, TTotals = Record<string, unknown>> = {
  meta: AnalyticsMeta;
  summary: TSummary;
  series: TSeries;
  totals: TTotals;
  empty: AnalyticsEmptyState;
};

export type FunnelSeriesRow = {
  bucket: string;
  [status: string]: string | number;
};

export type FunnelSummary = {
  newToQualified?: number;
  qualifiedToTrialScheduled?: number;
  trialScheduledToWon?: number;
  winRateOnClosed?: number;
  [key: string]: unknown;
};

export type FunnelAnalytics = AnalyticsResponse<FunnelSummary, FunnelSeriesRow[], Record<string, number>>;

export type CoachLoadRow = {
  coachId: string;
  coachName: string;
  groups?: number;
  scheduledSlots?: number;
  completedSessions?: number;
  plannedSessions?: number;
  students?: number;
  attendanceRate?: number;
  utilizationRate?: number;
  overdueReports?: number;
  [key: string]: unknown;
};

export type CoachLoadAnalytics = AnalyticsResponse<Record<string, unknown>, CoachLoadRow[], Record<string, number>>;

export type RetentionGroupRow = {
  groupId?: string;
  groupName: string;
  totalSchedules?: number;
  cancelled?: number;
  retentionIndex?: number;
  activeStudents?: number;
  retainedStudents?: number;
  [key: string]: unknown;
};

export type RetentionCohortPoint = {
  periodIndex: number;
  retentionRate: number;
};

export type RetentionCohort = {
  cohort: string;
  points: RetentionCohortPoint[];
};

export type RetentionSeries = {
  cohorts?: RetentionCohort[];
  groups?: RetentionGroupRow[];
};

export type RetentionAnalytics = AnalyticsResponse<Record<string, unknown>, RetentionSeries, Record<string, number>>;

export type SlaSeries = {
  leadTiming?: Record<string, unknown>;
  breaches?: Record<string, unknown>;
};

export type SlaAnalytics = AnalyticsResponse<Record<string, number>, SlaSeries, Record<string, number>>;

export type LossReasonRow = {
  lostReasonCode: string;
  name: string;
  count: number;
  share: number;
  trend?: number;
};

export type LossReasonsAnalytics = AnalyticsResponse<Record<string, unknown>, LossReasonRow[], { totalLost?: number }>;

export type KpiSummary = {
  totalLeads?: number;
  newLeads?: number;
  wonLeads?: number;
  lostLeads?: number;
  winRateOnClosed?: number;
  trialScheduledToWon?: number;
  averageFirstResponseMinutes?: number;
  overdueReports?: number;
  [key: string]: unknown;
};

export type KpiAnalytics = AnalyticsResponse<KpiSummary, [], Record<string, number>>;

export type AnalyticsQuery = {
  branchId: string;
  dateFrom: string;
  dateTo: string;
  groupBy?: AnalyticsGroupBy;
  timezone?: string;
  coachId?: string;
  groupId?: string;
  page?: number;
  size?: number;
  sort?: string;
};

const buildAnalyticsQuery = (query: AnalyticsQuery) => {
  const params = new URLSearchParams({
    branchId: query.branchId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });

  Object.entries({
    groupBy: query.groupBy,
    timezone: query.timezone,
    coachId: query.coachId,
    groupId: query.groupId,
    page: query.page,
    size: query.size,
    sort: query.sort,
  }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString();
};

const getAnalytics = <T>(scope: AnalyticsRoleScope, endpoint: AnalyticsEndpoint, query: AnalyticsQuery) =>
  apiClient.get<T>(`/${scope}/analytics/${endpoint}?${buildAnalyticsQuery(query)}`, { suppressErrorToast: true });

export const AnalyticsApi = {
  getKpi: (scope: AnalyticsRoleScope, query: AnalyticsQuery) =>
    getAnalytics<KpiAnalytics>(scope, "kpi", query),
  getFunnel: (scope: AnalyticsRoleScope, query: AnalyticsQuery) =>
    getAnalytics<FunnelAnalytics>(scope, "funnel", query),
  getCoachLoad: (scope: AnalyticsRoleScope, query: AnalyticsQuery) =>
    getAnalytics<CoachLoadAnalytics>(scope, "coach-load", query),
  getRetention: (scope: AnalyticsRoleScope, query: AnalyticsQuery) =>
    getAnalytics<RetentionAnalytics>(scope, "retention", query),
  getSla: (scope: AnalyticsRoleScope, query: AnalyticsQuery) =>
    getAnalytics<SlaAnalytics>(scope, "sla", query),
  getLossReasons: (scope: AnalyticsRoleScope, query: AnalyticsQuery) =>
    getAnalytics<LossReasonsAnalytics>(scope, "loss-reasons", query),
};
