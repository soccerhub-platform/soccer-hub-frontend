export const LEAD_STATUSES = [
  "NEW", "IN_PROGRESS", "TRIAL_SCHEDULED", "DECISION_PENDING",
  "CONTRACT_PENDING", "PAYMENT_PENDING", "CONVERTED", "LOST",
] as const;

export const LEAD_STATUS_LABELS: Record<typeof LEAD_STATUSES[number], string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  TRIAL_SCHEDULED: "Пробное назначено",
  DECISION_PENDING: "Ожидает решения",
  CONTRACT_PENDING: "Оформление договора",
  PAYMENT_PENDING: "Ожидает оплату",
  CONVERTED: "Клиент",
  LOST: "Отказ",
};

export function leadStatusLabel(status: string): string {
  return Object.prototype.hasOwnProperty.call(LEAD_STATUS_LABELS, status)
    ? LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS]
    : "Неизвестный статус";
}

export function leadStatusTone(status: string): "danger" | "success" | "warning" | "info" | "neutral" {
  if (status === "LOST") return "danger";
  if (status === "CONVERTED") return "success";
  if (status === "PAYMENT_PENDING") return "warning";
  return LEAD_STATUSES.includes(status as typeof LEAD_STATUSES[number]) ? "info" : "neutral";
}
