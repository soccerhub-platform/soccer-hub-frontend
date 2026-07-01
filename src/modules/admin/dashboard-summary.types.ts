export type DashboardTone = "danger" | "warning" | "info" | "success";
export type DashboardDeltaTone = "success" | "warning" | "info";
export type DashboardSeriesCode = "leads" | "trainings" | "payments";
export type DashboardSeriesUnit = "count" | "amount";
export type DashboardFunnelStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "TRIAL_SCHEDULED"
  | "WAITING_PAYMENT"
  | "WON";

export type DashboardMeta = {
  branchId: string;
  branchName: string;
  date: string;
  timezone: string;
  generatedAt: string;
};

export type DashboardAction = {
  label: string;
  target: string;
};

export type DashboardTopCard = {
  id: string;
  tone: DashboardTone | string;
  icon: string;
  title: string;
  description: string;
  action: DashboardAction;
  details: Array<{ label: string; value: string }>;
};

export type DashboardAttentionItem = {
  id: string;
  tone: DashboardTone | string;
  area: string;
  title: string;
  description: string;
  action: DashboardAction;
};

export type DashboardAlerts = {
  topCards: DashboardTopCard[];
  attention: DashboardAttentionItem[];
};

export type DashboardKpiItem = {
  code: string;
  label: string;
  value: number;
  displayValue: string;
  delta: {
    value: number;
    unit: string;
    tone: DashboardDeltaTone | string;
    label: string;
  };
  hint: string | null;
  target: string | null;
  count: number | null;
  amount: number | null;
};

export type DashboardKpis = {
  items: DashboardKpiItem[];
};

export type DashboardBranchSummary = {
  studentsTotal: number | null;
  studentsDelta: number | null;
  trainingsVisited: number | null;
  trainingsTotal: number | null;
  attendancePercent: number | null;
  newStudents: number | null;
  newStudentsDelta: number | null;
  trainersOnDuty: number | null;
  groupsWithoutCoach: number | null;
  groupsWithoutSchedule: number | null;
  avgFirstResponseMinutes: number | null;
  unavailableReasons: Record<string, string>;
};

export type DashboardRiskItem = {
  code: string;
  label: string;
  description: string;
  value: number;
  unit: string;
  tone: DashboardTone | string;
  target: string;
};

export type DashboardRisks = {
  items: DashboardRiskItem[];
};

export type DashboardFunnelRow = {
  status: DashboardFunnelStatus;
  label: string;
  count: number;
  percent: number;
};

export type DashboardFunnel = {
  rows: DashboardFunnelRow[];
  conversionToClientPercent: number;
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

export type DashboardWeeklyDynamicsPoint = {
  date: string;
  value: number;
};

export type DashboardWeeklyDynamicsSeries = {
  code: DashboardSeriesCode;
  label: string;
  unit: DashboardSeriesUnit;
  points: DashboardWeeklyDynamicsPoint[];
};

export type DashboardWeeklyDynamics = {
  period: {
    from: string;
    to: string;
  };
  series: DashboardWeeklyDynamicsSeries[];
  isEmpty: boolean;
  emptyReason: string | null;
};

export type AdminDashboardSummaryResponse = {
  meta: DashboardMeta;
  alerts: DashboardAlerts;
  kpis: DashboardKpis;
  branchSummary: DashboardBranchSummary;
  risks: DashboardRisks;
  funnel: DashboardFunnel;
  todaySchedule: DashboardTodaySchedule;
  weeklyDynamics: DashboardWeeklyDynamics;
};
