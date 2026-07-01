import { apiClient } from "../../shared/api";
import type {
  AdminDashboardSummaryResponse,
  DashboardAlerts,
  DashboardBranchSummary,
  DashboardFunnel,
  DashboardKpis,
  DashboardRisks,
  DashboardTodaySchedule,
  DashboardWeeklyDynamics,
} from "./dashboard-summary.types";

type DashboardDateParams = {
  branchId: string;
  date: string;
  timezone?: string;
};

type DashboardPeriodParams = {
  branchId: string;
  date?: string;
  from?: string;
  to?: string;
  timezone?: string;
};

const toParams = (input: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
};

export const DashboardSummaryApi = {
  get(branchId: string, date: string, timezone?: string) {
    return this.summary({ branchId, date, timezone });
  },

  summary(params: DashboardDateParams) {
    return apiClient.get<AdminDashboardSummaryResponse>(`/admin/dashboard/summary?${toParams(params)}`);
  },

  alerts(params: DashboardDateParams) {
    return apiClient.get<DashboardAlerts>(`/admin/dashboard/alerts?${toParams(params)}`);
  },

  kpis(params: DashboardDateParams) {
    return apiClient.get<DashboardKpis>(`/admin/dashboard/kpis?${toParams(params)}`);
  },

  branchSummary(params: DashboardDateParams) {
    return apiClient.get<DashboardBranchSummary>(`/admin/dashboard/branch-summary?${toParams(params)}`);
  },

  funnel(params: DashboardPeriodParams) {
    return apiClient.get<DashboardFunnel>(`/admin/dashboard/funnel?${toParams(params)}`);
  },

  risks(params: DashboardDateParams) {
    return apiClient.get<DashboardRisks>(`/admin/dashboard/risks?${toParams(params)}`);
  },

  todaySchedule(params: DashboardDateParams) {
    return apiClient.get<DashboardTodaySchedule>(`/admin/dashboard/today-schedule?${toParams(params)}`);
  },

  weeklyDynamics(params: DashboardPeriodParams) {
    return apiClient.get<DashboardWeeklyDynamics>(`/admin/dashboard/weekly-dynamics?${toParams(params)}`);
  },
};
