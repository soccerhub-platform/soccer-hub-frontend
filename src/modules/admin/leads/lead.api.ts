import { apiClient } from "../../../shared/api";
import {
  AvailableSlot,
  ConvertLeadRequest,
  ConvertLeadResponse,
  CreateAdminLeadPayload,
  LeadLossReason,
  LeadTransitionRequest,
  LeadEventResponse,
  LeadActivity,
  LeadDetails,
  LeadKanbanColumns,
  QualifyLeadPayload,
  ScheduleTrialPayload,
  LeadWorkCommand,
  TimePreference,
  ExperienceLevel,
} from "./types";

export const LeadApi = {
  updatePreferences(leadId: string, payload: {version: number; preferredDays: string[]; timePreference: TimePreference | null; experience: ExperienceLevel | ""; notes: string}): Promise<LeadDetails> {
    return apiClient.patch(`/admin/leads/${leadId}/preferences`, payload);
  },
  async create(payload: CreateAdminLeadPayload): Promise<void> {
    await apiClient.post("/admin/leads/create", payload);
  },

  async getKanban(branchId: string, _token: string): Promise<LeadKanbanColumns> {
    const data = await apiClient.get<{ columns: LeadKanbanColumns }>(`/admin/leads/workspace?branchId=${encodeURIComponent(branchId)}`);
    return data.columns;
  },

  async getById(leadId: string, _token: string): Promise<LeadDetails> {
    const payload = await apiClient.get<LeadDetails | null>(`/admin/leads/${leadId}/workspace`);
    if (!payload) {
      throw new Error("Не удалось загрузить лид");
    }
    return payload;
  },

  async getActivities(leadId: string, _token: string): Promise<LeadActivity[]> {
    return (await apiClient.get<LeadActivity[]>(`/admin/leads/${leadId}/activities`)) ?? [];
  },

  async updateWork(leadId: string, command: LeadWorkCommand): Promise<LeadDetails> {
    return apiClient.patch(`/admin/leads/${leadId}/work`, command);
  },

  async getLeadLossReasons(
    _token: string,
    stage?: string | null
  ): Promise<LeadLossReason[]> {
    const query = stage ? `?stage=${encodeURIComponent(stage)}` : "";
    return (await apiClient.get<LeadLossReason[]>(`/admin/leads/loss-reasons${query}`)) ?? [];
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
    payload: LeadTransitionRequest,
    _token: string
  ): Promise<LeadEventResponse | null> {
    return await apiClient.post<LeadEventResponse | null>(
      `/admin/leads/${leadId}/events`,
      payload
    );
  },

  async scheduleTrial(
    leadId: string,
    payload: ScheduleTrialPayload,
    _token: string
  ): Promise<void> {
    await apiClient.post(`/admin/leads/${leadId}/trial`, payload);
  },

  async convertLeadToClient(
    leadId: string,
    payload: ConvertLeadRequest,
    _token: string
  ): Promise<ConvertLeadResponse> {
    return await apiClient.post<ConvertLeadResponse>(
      `/admin/leads/${leadId}/convert`,
      payload
    );
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
