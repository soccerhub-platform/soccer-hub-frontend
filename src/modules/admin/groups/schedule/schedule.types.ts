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
  status: "ACTIVE" | "CANCELLED" | "DELETED";

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

export interface GroupScheduleValidationCommand extends ScheduleBatchCommand {
  excludeScheduleIds?: string[];
}

export type ScheduleValidationConflictCode =
  | "EMPTY_SLOTS"
  | "INVALID_DATE_RANGE"
  | "INVALID_TIME_RANGE"
  | "OVERLAPPING_INPUT_SLOTS"
  | "GROUP_SCHEDULE_CONFLICT"
  | "COACH_SCHEDULE_CONFLICT";

export interface ScheduleValidationConflict {
  code: ScheduleValidationConflictCode | string;
  coachId?: string | null;
  dayOfWeek?: DayOfWeek | null;
  startTime?: string | null;
  endTime?: string | null;
  overlapStart?: string | null;
  overlapEnd?: string | null;
  conflictingGroupId?: string | null;
  conflictingGroupName?: string | null;
  conflictingScheduleId?: string | null;
  conflictingPeriodStart?: string | null;
  conflictingPeriodEnd?: string | null;
  message?: string | null;
}

export interface ScheduleValidationResult {
  valid: boolean;
  conflicts: ScheduleValidationConflict[];
}

export interface ScheduleBatch {
  key: string;
  coachId: string;
  type: ScheduleType;
  startDate: string;
  endDate: string;
  schedules: GroupScheduleDto[];
}

export interface GroupScheduleOverview {
  groupId: string;
  from: string;
  to: string;
  summary: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  risk: {
    hasConflicts: boolean;
    conflictsCount: number;
    nextSessionAt: string | null;
  };
  currentPeriods: Array<{
    key: string;
    coachId: string;
    type: ScheduleType;
    startDate: string;
    endDate: string;
    sessionsPerWeek: number;
    slots: Array<DayScheduleSlot & { scheduleId: string }>;
    capabilities: { canEdit: boolean; canFinish: boolean };
  }>;
}
