import { sessionTimestamp } from "../../../shared/business-time";
import type { TrialBookingListItem, TrialDetails, TrialNextActionType } from "./trials.types";
import type { AdminSessionListItem } from "../groups/session.api";

export const nextActionLabels: Record<TrialNextActionType, string> = {
  CALL: "Позвонить", MESSAGE: "Написать сообщение", SEND_OFFER: "Отправить предложение",
  WAIT_FOR_DECISION: "Уточнить решение", OTHER: "Другое действие",
};
export type TrialAction = "attendance" | "result" | "reschedule" | "cancel";
export const actionLabels: Record<TrialAction, string> = {
  attendance: "Отметить посещение", result: "Записать результат", reschedule: "Перенести пробное", cancel: "Отменить пробное",
};
export const actionCapability = {
  attendance: "canMarkAttendance", result: "canRecordResult", reschedule: "canReschedule", cancel: "canCancel",
} as const;

export function formatTrialDate(value?: string | null, withTime = false) {
  if (!value) return "Не указана";
  const timestamp = sessionTimestamp(value.length === 10 ? `${value}T12:00:00` : value);
  if (!Number.isFinite(timestamp)) return "Не указана";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } as const : {}) }).format(timestamp);
}
export function formatTrialTime(value?: string | null) {
  if (!value) return "—";
  const timestamp = sessionTimestamp(value);
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit" }).format(timestamp) : "—";
}
export const trialInterval = (start?: string | null, end?: string | null) => `${formatTrialTime(start)}–${formatTrialTime(end)}`;
export function trialInputDateTime(value?: string | null) {
  if (!value || !Number.isFinite(sessionTimestamp(value))) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(sessionTimestamp(value));
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function trialNextStep(item: Pick<TrialBookingListItem, "status" | "attendanceStatus" | "result"> & { sessionStartsAt?: string | null; nextActionAt?: string | null }, now = Date.now()) {
  if (item.status === "CANCELED") return { title: "Запись отменена", description: "Сохранена в истории", attention: false };
  if (item.result === "FOLLOW_UP") {
    const overdue = Boolean(item.nextActionAt && sessionTimestamp(item.nextActionAt) < now);
    return { title: overdue ? "Связаться с клиентом" : "Повторный контакт", description: overdue ? "Срок контакта прошёл" : "Уточнить решение после пробного", attention: overdue };
  }
  if (item.attendanceStatus === "NO_SHOW") return { title: "Уточнить причину неявки", description: "Согласовать новую запись с клиентом", attention: true };
  if (item.attendanceStatus === "ATTENDED" && item.result === "PENDING") return { title: "Записать результат", description: "Посещение отмечено, итог ещё не сохранён", attention: true };
  if (item.attendanceStatus === "UNMARKED") {
    const started = Boolean(item.sessionStartsAt && sessionTimestamp(item.sessionStartsAt) <= now);
    return { title: started ? "Отметить посещение" : "Ожидаем занятие", description: started ? "Проверьте, был ли ученик на занятии" : "После занятия отметьте присутствие", attention: started };
  }
  return { title: item.result === "INTERESTED" ? "Обсудить зачисление" : "Результат записан", description: item.result === "INTERESTED" ? "Продолжите работу с клиентом" : "Итог пробного сохранён", attention: false };
}
export function detailsNextStep(trial: TrialDetails) {
  return trialNextStep({ ...trial, sessionStartsAt: trial.session?.startsAt, nextActionAt: trial.nextAction?.dueAt });
}
export function trialMatches(item: TrialBookingListItem, query: string) {
  const needle = query.trim().toLocaleLowerCase("ru");
  return !needle || [item.studentName, item.leadName, item.leadPhone, item.leadEmail, item.groupName, item.coachName, item.locationName].filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(needle);
}
export function trialReturnTo(value: string | null) {
  return value && /^\/admin\/trials(?:\?[^#\\\r\n]*)?$/.test(value) ? value : "/admin/trials";
}
export function availableTrialSessions(items: AdminSessionListItem[], currentId?: string, now = Date.now()) {
  return items.filter(s => s.id !== currentId && s.status === "PLANNED" && sessionTimestamp(s.startsAt) > now)
    .sort((a, b) => sessionTimestamp(a.startsAt) - sessionTimestamp(b.startsAt));
}
