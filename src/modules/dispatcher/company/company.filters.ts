export const ATTENTION_LABELS: Record<string, string> = {
  NO_CONTACT:"Без контакта",NO_ACTION:"Без следующего шага",UNASSIGNED: "Лиды без администратора",
  OVERDUE: "Просроченные задачи",
  ENDING: "Договоры заканчиваются за 14 дней",
};

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidPeriod(from: string, to: string, optional = false): boolean {
  if (optional && !from && !to) return true;
  return isCalendarDate(from) && isCalendarDate(to) && from <= to &&
    (Date.parse(to) - Date.parse(from)) / 86400000 <= 366;
}

export function lastValidPage(page: number, totalPages: number): number {
  return Math.max(0, Math.min(page, totalPages - 1));
}

export function creationBranch(scopeId: string, activeBranches: Array<{ id: string }>): string {
  return scopeId ? activeBranches.some(branch => branch.id === scopeId) ? scopeId : "" : activeBranches[0]?.id || "";
}

export function issuePath(path: string, key: string): string {
  const attention = ({ unassignedLeads: "UNASSIGNED", overdueTasks: "OVERDUE", endingContracts: "ENDING" } as Record<string, string>)[key];
  return `${path}${attention ? `?attention=${attention}` : ""}`;
}

export function receivedPaymentsPath(from: string, to: string): string {
  return `payments?${new URLSearchParams({ status: "PAID", ...(!from && !to ? {period:"ALL"} : {dateFrom: from, dateTo: to}) })}`;
}
