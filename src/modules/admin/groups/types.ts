export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  active: boolean;
}

export interface GroupScheduleDto {
  scheduleId: string;

  groupId: string;
  coachId: string;
  branchId: string;

  dayOfWeek:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";

  startTime: string; // "17:00"
  endTime: string;   // "18:30"

  startDate: string; // ISO
  endDate: string;   // ISO

  scheduleType: string;
  status: "ACTIVE" | "CANCELLED";

  substitution: boolean;
  substitutionCoachId?: string | null;
}

export const DAY_LABELS: Record<GroupScheduleDto["dayOfWeek"], string> = {
  MONDAY: "Пн",
  TUESDAY: "Вт",
  WEDNESDAY: "Ср",
  THURSDAY: "Чт",
  FRIDAY: "Пт",
  SATURDAY: "Сб",
  SUNDAY: "Вс",
};