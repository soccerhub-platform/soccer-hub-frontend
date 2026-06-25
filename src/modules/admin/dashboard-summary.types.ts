export type DashboardAttentionTone = "danger" | "warning" | "info" | "success";

export type DashboardRiskTone = "danger" | "warning" | "success";

export type DashboardMeta = {
  branchId: string;
  branchName: string;
  date: string;
  timezone: string;
  generatedAt: string;
};

export type DashboardHero = {
  title: string;
  subtitle: string;
  urgentCount: number;
};

export type DashboardAction = {
  label: string;
  target: string;
};

export type DashboardAttentionItem = {
  id: string;
  tone: DashboardAttentionTone;
  area: string;
  title: string;
  description: string;
  action: DashboardAction;
};

export type DashboardKpiItem = {
  value: number;
  label: string;
  hint: string;
};

export type DashboardKpis = {
  newLeads: DashboardKpiItem;
  activeGroups: DashboardKpiItem;
  trainingsToday: DashboardKpiItem;
  paymentsToday: DashboardKpiItem;
};

export type DashboardBranchToday = {
  trainersOnDuty: number;
  groupsWithoutCoach: number;
  groupsWithoutSchedule: number;
  avgFirstResponseMinutes: number;
};

export type DashboardRiskItem = {
  code: string;
  label: string;
  value: number;
  tone: DashboardRiskTone | "info";
};

export type DashboardLeadFunnel = {
  totals: Record<string, number>;
};

export type DashboardSession = {
  sessionId: string;
  groupId: string;
  groupName: string;
  coachId: string;
  coachName: string;
  startAt: string;
  endAt: string;
  status: string;
  scheduleType: string;
};

export type DashboardTodayScheduleSummary = {
  total: number;
  active: number;
  cancelled: number;
};

export type DashboardTodaySchedule = {
  summary: DashboardTodayScheduleSummary;
  nextSession: DashboardSession | null;
  items: DashboardSession[];
};

export type DashboardWeeklyTrendItem = {
  bucket: string;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
};

export type DashboardWeeklyTrend = {
  items: DashboardWeeklyTrendItem[];
};

export type AdminDashboardSummaryResponse = {
  meta: DashboardMeta;
  hero: DashboardHero;
  attention: DashboardAttentionItem[];
  kpis: DashboardKpis;
  branchToday: DashboardBranchToday;
  risks: DashboardRiskItem[];
  leadFunnel: DashboardLeadFunnel;
  todaySchedule: DashboardTodaySchedule;
  weeklyTrend: DashboardWeeklyTrend;
};
