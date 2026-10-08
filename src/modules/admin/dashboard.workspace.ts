import { sessionTimestamp } from "../../shared/business-time";
import type { AdminDashboardSummaryResponse, DashboardSession, DashboardTone } from "./dashboard-summary.types";

export const dashboardNumber = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("ru-RU");
export const dashboardMoney = (value?: number | null) => value == null || !Number.isFinite(value) ? "—" : `${dashboardNumber(value)} ₸`;
export function dashboardTime(value: string, timezone = "Asia/Almaty") {
  const time = sessionTimestamp(value);
  return Number.isFinite(time) ? new Intl.DateTimeFormat("ru-RU", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(time) : "—";
}
export function dashboardDate(value: string, long = false) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", day: "numeric", month: long ? "long" : "short", ...(long ? { weekday: "long" as const } : {}) }).format(new Date(`${value}T12:00:00Z`));
}
export function dashboardSessionState(session: DashboardSession, now = Date.now()): { label: string; tone: DashboardTone; code: string } {
  if (session.status === "CANCELLED") return { code: "CANCELLED", label: "Отменено", tone: "danger" };
  if (session.status === "COMPLETED") return { code: "COMPLETED", label: "Завершено", tone: "success" };
  if (session.status === "OVERDUE" || (session.status === "PLANNED" && sessionTimestamp(session.endAt) <= now)) return { code: "OVERDUE", label: "Не закрыто", tone: "warning" };
  if (session.status === "IN_PROGRESS" || (session.status === "PLANNED" && sessionTimestamp(session.startAt) <= now && sessionTimestamp(session.endAt) > now)) return { code: "IN_PROGRESS", label: "Идёт сейчас", tone: "info" };
  if (session.status === "PLANNED") return { code: "PLANNED", label: "Запланировано", tone: "info" };
  return { code: "UNKNOWN", label: "Статус уточняется", tone: "warning" };
}

export type DashboardSignal = { id: string; title: string; description: string; target: string; action: string; tone: DashboardTone; deadline: string };
const tone = (value: string): DashboardTone => ["danger", "warning", "success"].includes(value) ? value as DashboardTone : "info";
// Older API versions returned API-only routes and unsupported filter parameters.
export function dashboardTarget(target: string, date: string) {
  if (target.startsWith("/admin/dashboard/today-schedule")) return `/admin/schedule?date=${date}&day=${date}`;
  if (target.includes("filter=waiting-response")) return "/admin/leads?status=NEW&view=list";
  if (target.includes("filter=ending-soon")) return "/admin/contracts?status=ACTIVE";
  return /^\/admin(?:\/|\?|$)/.test(target) && !/[\\\r\n]/.test(target) ? target : "/admin/dashboard";
}
export function dashboardSignals(data: AdminDashboardSummaryResponse): DashboardSignal[] {
  const aliases: Record<string, string> = { "coach-overload": "overloaded-coaches" };
  const signals = new Map<string, DashboardSignal>();
  const deadline = (id: string) => id === "waiting-leads" ? "Более 2 часов" : id === "contracts-ending-soon" ? "Ближайшие 7 дней" : ["overdue-reports", "overdue-lead-tasks"].includes(id) ? "Срок прошёл" : id === "today-cancellations" ? "Сегодня" : "Проверить";
  for (const item of data.alerts.attention) {
    if (item.id === "all-clear" || (item.id === "group-coverage" && data.risks.items.some(r => r.code === "groups-without-coach" || r.code === "groups-without-schedule"))) continue;
    signals.set(item.id, { id: item.id, title: item.title, description: item.description, tone: tone(item.tone), target: dashboardTarget(item.action.target, data.meta.date), action: item.action.label, deadline: deadline(item.id) });
  }
  for (const item of data.risks.items) {
    const id = aliases[item.code] || item.code;
    // Low-attendance signals repeat their code for different groups; keep each group.
    const key = id === "low-attendance" ? `${id}:${item.target}` : id;
    const existing = signals.get(key);
    signals.set(key, { id: key, title: item.label, description: item.description, tone: tone(item.tone), target: dashboardTarget(item.target, data.meta.date), action: existing?.action || "Перейти к записям", deadline: deadline(id) });
  }
  const rank = { danger: 0, warning: 1, info: 2, success: 3 };
  return [...signals.values()].sort((a, b) => rank[a.tone] - rank[b.tone]);
}
