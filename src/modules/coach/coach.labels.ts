import { CoachSessionStatus, CoachStudentAttendance } from "./mock/coach.mock";

export const SESSION_STATUS_META: Record<CoachSessionStatus, { label: string; action: string; tone: string }> = {
  PLANNED: { label: "Запланирована", action: "Начать тренировку", tone: "bg-stone-100 text-stone-800" },
  IN_PROGRESS: { label: "Идет сейчас", action: "Открыть посещаемость", tone: "bg-teal-100 text-teal-800" },
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
