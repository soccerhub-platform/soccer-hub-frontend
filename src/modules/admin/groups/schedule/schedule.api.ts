import {
  GroupScheduleDto,
  CreateScheduleBatchCommand,
  GroupScheduleValidationCommand,
  ScheduleValidationResult,
  UpdateScheduleBatchCommand,
} from "./schedule.types";
import { apiClient } from "../../../../shared/api";

export const ScheduleApi = {
  listByGroup(groupId: string, _token: string) {
    return apiClient.get<GroupScheduleDto[]>(
      `/organization/schedules?group-id=${groupId}&status=ACTIVE`
    );
  },

  listByGroupAndBranch(
    groupId: string,
    branchId: string,
    _token: string,
    status?: "ACTIVE" | "CANCELLED"
  ) {
    const qs = new URLSearchParams({
      "group-id": groupId,
      "branch-id": branchId,
      ...(status ? { status } : {}),
    });
    return apiClient.get<GroupScheduleDto[]>(`/organization/schedules?${qs.toString()}`);
  },

  validateGroupSchedule(
    groupId: string,
    payload: GroupScheduleValidationCommand,
    _token: string
  ) {
    return apiClient.post<ScheduleValidationResult>(
      `/admin/groups/${groupId}/schedule/validate`,
      payload
    );
  },

  createGroupSchedule(groupId: string, payload: CreateScheduleBatchCommand, _token: string) {
    return apiClient.post<void>(`/admin/groups/${groupId}/schedule`, payload);
  },

  updateGroupSchedule(groupId: string, payload: UpdateScheduleBatchCommand, _token: string) {
    return apiClient.put<void>(`/admin/groups/${groupId}/schedule`, payload);
  },

  deleteBatch(
    groupId: string,
    payload: Pick<
      UpdateScheduleBatchCommand,
      "coachId" | "startDate" | "endDate" | "type"
    >,
    _token: string
  ): Promise<void> {
    return apiClient.delete<void>(`/admin/groups/${groupId}/schedule`, {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  cancelSchedule(scheduleId: string, _token: string): Promise<void> {
    return apiClient.patch<void>(`/admin/groups/schedule/${scheduleId}/cancel`);
  },

  activateSchedule(scheduleId: string, _token: string): Promise<void> {
    return apiClient.patch<void>(`/admin/groups/schedule/${scheduleId}/activate`);
  },

};
