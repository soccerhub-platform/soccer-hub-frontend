export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ScheduleType = "REGULAR" | "TEMPORARY";

export interface GroupScheduleDto {
  scheduleId: string;
  groupId: string;
  coachId: string;
  branchId: string;

  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;

  startDate: string;
  endDate: string;

  scheduleType: ScheduleType;
  status: "ACTIVE" | "CANCELLED";

  substitution: boolean;
  substitutionCoachId: string | null;
}

export interface DayScheduleSlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface ScheduleBatchCommand {
  coachId: string;
  startDate: string;
  endDate: string;
  type: ScheduleType;
  slots: DayScheduleSlot[];
}

export type CreateScheduleBatchCommand = ScheduleBatchCommand;
export type UpdateScheduleBatchCommand = ScheduleBatchCommand;

export interface ScheduleBatch {
  key: string;
  coachId: string;
  type: ScheduleType;
  startDate: string;
  endDate: string;
  schedules: GroupScheduleDto[];
}