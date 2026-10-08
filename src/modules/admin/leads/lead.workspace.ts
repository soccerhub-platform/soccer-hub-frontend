import type { Lead, LeadStatus } from "./types";
import { addBusinessDays, businessDate, sessionTimestamp } from "../../../shared/business-time";
export { addBusinessDays, businessDate, sessionTimestamp } from "../../../shared/business-time";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Новые", IN_PROGRESS: "В работе", TRIAL_SCHEDULED: "Пробное назначено",
  DECISION_PENDING: "Ожидают решения", CONTRACT_PENDING: "Оформление договора",
  PAYMENT_PENDING: "Ожидают оплату", CONVERTED: "Успешно завершены", LOST: "Закрыты с отказом",
};
export const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Сайт", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", WHATSAPP: "WhatsApp",
  PHONE: "Телефон", CALL: "Телефон", REFERRAL: "Рекомендация", WALK_IN: "Личное обращение", OTHER: "Другой",
  LANDING: "Сайт", ADMIN: "Администратор",
};
export const sourceLabel = (source?: string | null) => source ? SOURCE_LABELS[source] || "Другой источник" : "Не указан";
export const PRIORITY_LABELS = { NORMAL: "Обычный", HIGH: "Высокий", URGENT: "Срочный" };
export const isActiveLead = (lead: Lead) => !["LOST", "CONVERTED"].includes(lead.status);
export function matchesCreatedPeriod(createdAt: string, period: string, today = businessDate()) {
  if (!["TODAY", "MONTH", "LAST_28_DAYS"].includes(period)) return true;
  const timestamp = sessionTimestamp(createdAt);
  if (!Number.isFinite(timestamp)) return false;
  const date = businessDate(new Date(timestamp));
  if (period === "TODAY") return date === today;
  if (period === "MONTH") return date.slice(0, 7) === today.slice(0, 7) && date <= today;
  return date >= addBusinessDays(today, -27) && date <= today;
}
export function birthDateError(value: string, today = businessDate()) {
  if (!value) return "Укажите дату рождения";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return "Проверьте дату рождения";
  return value >= today ? "Дата рождения должна быть в прошлом" : "";
}
// Session API accepts at most 31 inclusive days. Two bounded requests cover the 60-day picker.
export const sessionSearchRanges = (start: string) => [
  { from: start, to: addBusinessDays(start, 29) },
  { from: addBusinessDays(start, 30), to: addBusinessDays(start, 59) },
];
export const overdue = (lead: Lead, now = Date.now()) =>
  isActiveLead(lead) && Boolean(lead.work?.nextActionAt && Date.parse(lead.work.nextActionAt) < now);
export const nextStep = (lead: Lead) => (isActiveLead(lead) && lead.work?.nextAction) || ({
  NEW: "Связаться и уточнить потребность", IN_PROGRESS: "Выбрать пробное или оформить без него",
  TRIAL_SCHEDULED: "Открыть пробное и проверить посещение", DECISION_PENDING: "Уточнить решение и оформить клиента",
  CONTRACT_PENDING: "Создать или завершить договор", PAYMENT_PENDING: "Принять первую оплату",
  CONVERTED: "Клиент оформлен и первый платёж получен", LOST: "Лид закрыт с указанием причины",
}[lead.status]);
export function matchesSearch(lead: Lead, search: string) {
  const q = search.trim().toLocaleLowerCase("ru");
  if (!q) return true;
  const text = [lead.primaryContact.fullName, lead.primaryContact.email, lead.primaryContact.phone,
    ...lead.participants.map(p => p.fullName), lead.assignedAdmin?.name, lead.assignedAdmin?.email,
    sourceLabel(lead.source)].filter(Boolean).join(" ").toLocaleLowerCase("ru");
  const digits = q.replace(/\D/g, "");
  return text.includes(q) || (digits.length >= 3 && /^[+\d\s()\-]+$/.test(q)
    && lead.primaryContact.phone.replace(/\D/g, "").includes(digits));
}
export function summarize(leads: Lead[], today = businessDate(), now = Date.now()) {
  const converted = leads.filter(l => l.status === "CONVERTED").length;
  return {
    total: leads.length, active: leads.filter(isActiveLead).length,
    newCount: leads.filter(l => l.status === "NEW").length,
    overdue: leads.filter(l => overdue(l, now)).length,
    withoutTask: leads.filter(l => isActiveLead(l) && !l.work?.nextAction).length,
    trialsToday: leads.flatMap(l => l.currentTrials ?? []).filter(t => t.status === "SCHEDULED" && t.sessionDate === today).length,
    converted, conversion: leads.length ? Math.round(converted / leads.length * 100) : null,
  };
}
export function contactLinks(lead: Lead) {
  const phone = lead.primaryContact.phone.replace(/[^+\d]/g, "");
  const digits = phone.replace(/\D/g, "");
  return { phone: `tel:${phone}`, whatsapp: digits.length >= 10 ? `https://wa.me/${digits}` : null,
    email: lead.primaryContact.email ? `mailto:${encodeURIComponent(lead.primaryContact.email)}` : null };
}
