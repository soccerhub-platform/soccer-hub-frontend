export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONTACTED: "Связались",
  QUALIFIED: "Квалифицирован",
  TRIAL_SCHEDULED: "Пробное назначено",
  TRIAL_DONE: "Пробное проведено",
  WAITING_PAYMENT: "Ожидает оплату",
  WON: "Клиент",
  LOST: "Отказ",
};

export const formatLeadDateTime = (value?: string | null) => {
  if (!value) return "Не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
};

export const formatLeadCardDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};

export const formatTrialPreview = (trialDate?: string, startTime?: string) => {
  if (!trialDate || !startTime) return null;
  const date = new Date(`${trialDate}T${startTime}`);
  if (Number.isNaN(date.getTime())) return `${trialDate} ${startTime.slice(0, 5)}`;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(date);
};

export const formatTrialTime = (trialDate?: string, startTime?: string, endTime?: string) => {
  if (!trialDate || !startTime) return "Не указано";
  const start = startTime.slice(0, 5);
  const end = endTime ? ` - ${endTime.slice(0, 5)}` : "";
  const date = new Date(`${trialDate}T${startTime}`);
  if (Number.isNaN(date.getTime())) return `${trialDate} ${start}${end}`;
  return `${new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "long", year: "numeric" }).format(date)} ${start}${end}`;
};

export const trialStatusClassName = (status?: string) => {
  switch (status) {
    case "SCHEDULED": return "border-amber-200 bg-amber-50 text-amber-800";
    case "COMPLETED": return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "CANCELED": return "border-rose-200 bg-rose-50 text-rose-800";
    default: return "border-admin-100 bg-admin-50 text-admin-800";
  }
};

export const trialStatusLabel = (status?: string) => {
  switch (status) {
    case "SCHEDULED": return "Назначено";
    case "COMPLETED": return "Проведено";
    case "CANCELED": return "Отменено";
    default: return status || "Не указано";
  }
};

export const experienceLabel = (value?: string | null) => {
  switch (value) {
    case "BEGINNER": return "Начинающий";
    case "INTERMEDIATE": return "Средний";
    case "ADVANCED": return "Продвинутый";
    default: return value || "Не указано";
  }
};

export const childGenderLabel = (value?: string | null) => {
  switch (value) {
    case "MALE": return "Мальчик";
    case "FEMALE": return "Девочка";
    default: return "Не указано";
  }
};

export const formatPreferredDays = (value?: string | null) => {
  if (!value) return "Не указано";
  const dayMap: Record<string, string> = { MON: "Пн", TUE: "Вт", WED: "Ср", THU: "Чт", FRI: "Пт", SAT: "Сб", SUN: "Вс" };
  const timeMap: Record<string, string> = { MORNING: "утро", DAY: "день", EVENING: "вечер" };
  const parts = value.split(";").map((part) => part.trim()).filter(Boolean);
  const rawDays = parts[0]?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const rawTime = parts[1]?.trim();
  const days = rawDays.map((day) => dayMap[day] ?? day).join(", ");
  const time = rawTime ? timeMap[rawTime] ?? rawTime : "";
  return [days, time].filter(Boolean).join(", ");
};
