import {
  CoachSessionStatus,
  CoachStudentAttendance,
  CoachTrialAttendanceStatus,
  CoachTrialRecommendation,
} from "./coach.api";

export const SESSION_STATUS_META: Record<CoachSessionStatus, { label: string; action: string; tone: string }> = {
  PLANNED: { label: "Запланирована", action: "Начать тренировку", tone: "bg-slate-100 text-slate-700" },
  IN_PROGRESS: { label: "Идет сейчас", action: "Открыть посещаемость", tone: "bg-blue-50 text-admin-600" },
  COMPLETED: { label: "Завершена", action: "Посмотреть отчет", tone: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Отменена", action: "Посмотреть причину", tone: "bg-rose-100 text-rose-700" },
  OVERDUE: { label: "Нужен отчет", action: "Заполнить отчет", tone: "bg-amber-100 text-amber-700" },
};

export const ATTENDANCE_LABELS: Record<CoachStudentAttendance["attendance"], string> = {
  PRESENT: "Был",
  ABSENT: "Не был",
  LATE: "Опоздал",
  EXCUSED: "Уважительная причина",
};

export const TRIAL_ATTENDANCE_LABELS: Record<
  CoachTrialAttendanceStatus,
  string
> = {
  UNMARKED: "Не отмечено",
  ATTENDED: "Был",
  NO_SHOW: "Не пришёл",
};

export const TRIAL_RECOMMENDATION_LABELS: Record<
  CoachTrialRecommendation,
  string
> = {
  RECOMMEND_ENROLLMENT: "Рекомендовать зачисление",
  RECOMMEND_ANOTHER_GROUP: "Рекомендовать другую группу",
  RECOMMEND_REPEAT_TRIAL: "Рекомендовать повторное пробное",
  NOT_RECOMMENDED: "Не рекомендовать зачисление",
};