import { apiClient } from "../../../shared/api";
import {
  AvailableSlot,
  LeadActivity,
  LeadDetails,
  LeadKanbanColumns,
  QualifyLeadPayload,
  ScheduleTrialPayload,
} from "./types";

export const LeadApi = {
  async getKanban(branchId: string, _token: string): Promise<LeadKanbanColumns> {
    return (await apiClient.get<LeadKanbanColumns>(`/leads/kanban?branchId=${branchId}`)) ?? {};
  },

  async getById(leadId: string, _token: string): Promise<LeadDetails> {
    const payload = await apiClient.get<LeadDetails | null>(`/leads/${leadId}`);
    if (!payload) {
      throw new Error("Не удалось загрузить лид");
    }
    return payload;
  },

  async getActivities(leadId: string, _token: string): Promise<LeadActivity[]> {
    return (await apiClient.get<LeadActivity[]>(`/admin/leads/${leadId}/activities`)) ?? [];
  },

  async qualify(
    leadId: string,
    payload: QualifyLeadPayload,
    _token: string
  ): Promise<void> {
    await apiClient.patch(`/admin/leads/${leadId}/qualify`, payload);
  },

  async sendLeadEvent(
    leadId: string,
    event: string,
    _token: string
  ): Promise<void> {
    await apiClient.post(`/admin/leads/${leadId}/events`, { event });
  },

  async scheduleTrial(
    leadId: string,
    payload: ScheduleTrialPayload,
    _token: string
  ): Promise<void> {
    await apiClient.post(`/admin/leads/${leadId}/trial`, payload);
  },

  async getAvailableGroupSlots(
    groupId: string,
    date: string,
    _token: string
  ): Promise<AvailableSlot[]> {
    return (
      (await apiClient.get<AvailableSlot[]>(
        `/admin/groups/${groupId}/available-slots?date=${encodeURIComponent(date)}`
      )) ?? []
    );
  },

  async getAvailableCoachSlots(
    coachId: string,
    date: string,
    _token: string
  ): Promise<AvailableSlot[]> {
    return (
      (await apiClient.get<AvailableSlot[]>(
        `/admin/coaches/${coachId}/available-slots?date=${encodeURIComponent(date)}`
      )) ?? []
    );
  },

  async getCoachById(
    coachId: string,
    _token: string
  ): Promise<{ id: string; firstName: string; lastName: string } | null> {
    return await apiClient.get<{
      id: string;
      firstName: string;
      lastName: string;
    } | null>(`/coaches/${coachId}`);
  },
};
