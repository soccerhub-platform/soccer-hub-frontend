import { addBusinessDays, businessDate, sessionTimestamp } from "../../shared/business-time";
import type { AdminSessionEffectiveStatus, AdminSessionListItem } from "./groups/session.api";

export const sessionStatusLabels: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "Запланировано", IN_PROGRESS: "Идёт занятие", COMPLETED: "Завершено", CANCELLED: "Отменено", OVERDUE: "Не закрыто",
};
export const validCalendarDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value);
export function sessionWeek(date: string) {
  const safe = validCalendarDate(date) ? date : businessDate();
  const weekday = new Date(`${safe}T12:00:00Z`).getUTCDay();
  const start = addBusinessDays(safe, -((weekday + 6) % 7));
  return Array.from({length: 7}, (_, i) => addBusinessDays(start, i));
}
export type WorkspaceSession = AdminSessionListItem & {groupId: string; groupName: string};
export function filterSessions(items: WorkspaceSession[], filters: {status: string; coach: string; query: string; group?: string; place?: string; day?: string}) {
  const query = filters.query.trim().toLocaleLowerCase("ru-RU");
  return items.filter(s => (filters.status === "ALL" || s.effectiveStatus === filters.status)
    && (!filters.group || s.groupId === filters.group)
    && (!filters.day || s.sessionDate === filters.day)
    && (!filters.place || (filters.place === "none" ? !s.location : s.location?.id === filters.place))
    && (!filters.coach || s.coaches.some(c => c.id === filters.coach))
    && (!query || [s.groupName, s.location?.name, ...s.coaches.map(c => c.fullName)].filter(Boolean).join(" ").toLocaleLowerCase("ru-RU").includes(query)))
    .sort((a,b) => sessionTimestamp(a.startsAt) - sessionTimestamp(b.startsAt) || a.groupName.localeCompare(b.groupName));
}
export const calendarDateLabel = (date: string) => new Intl.DateTimeFormat("ru-RU", {weekday:"short", day:"numeric", month:"short", timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`));
export const sessionTimeLabel = (value: string) => new Intl.DateTimeFormat("ru-RU", {hour:"2-digit", minute:"2-digit", timeZone:"Asia/Almaty"}).format(new Date(sessionTimestamp(value)));
