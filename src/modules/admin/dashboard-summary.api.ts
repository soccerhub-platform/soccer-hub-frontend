import { apiClient } from "../../shared/api";
import type { AdminDashboardSummaryResponse } from "./dashboard-summary.types";

export const DashboardSummaryApi = {
  get(branchId: string, date: string, timezone: string) {
    const params = new URLSearchParams({
      branchId,
      date,
      timezone,
    });
    return apiClient.get<AdminDashboardSummaryResponse>(`/admin/dashboard/summary?${params.toString()}`);
  },
};
