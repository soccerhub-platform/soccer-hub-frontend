import { apiClient } from "../../../shared/api";
import type {
  TrialAttendanceStatus,
  TrialBookingListItem,
  TrialBookingStatus,
  TrialDetails,
  TrialListQuery,
  TrialResult,
  TrialsPageResponse,
  TrialNextActionType
} from "./trials.types";

const queryString = (query: TrialListQuery) => {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.leadId) params.set("leadId", query.leadId);
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  params.set("sort", "createdAt,desc");
  return params.toString();
};

export const TrialsApi = {
  create(payload: { leadId?: string; clientId?: string | null; participantId?: string; studentId?: string | null; trainingSessionId: string }): Promise<{ id: string }> {
    return apiClient.post("/admin/trials", payload);
  },

  list(query: TrialListQuery): Promise<TrialsPageResponse> {
    return apiClient.get(`/admin/trials?${queryString(query)}`);
  },

  async findByLead(leadId: string): Promise<TrialBookingListItem | null> {
    const page = await this.list({ leadId, page: 0, size: 1 });
    return page.content[0] ?? null;
  },

  getById(trialId: string): Promise<TrialDetails> {
    return apiClient.get(`/admin/trials/${trialId}`);
  },

  confirm(trialId: string): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/confirm`, {});
  },

  cancel(trialId: string, reason: string): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/cancel`, { reason });
  },

  markAttendance(trialId: string, status: TrialAttendanceStatus, comment?: string): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/attendance`, { status, comment });
  },

  recordResult(
    trialId: string,
    result: TrialResult,
    recommendedGroupId?: string,
    coachFeedback?: string,
    nextActionType?: TrialNextActionType,
    nextActionAt?: string,
  ): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/result`, {
      result,
      recommendedGroupId,
      coachFeedback,
      nextActionType,
      nextActionAt,
    });
  },
};

export const trialStatusLabels: Record<TrialBookingStatus, string> = {
  SCHEDULED: "Запланировано",
  CONFIRMED: "Подтверждено",
  CANCELED: "Отменено",
  COMPLETED: "Завершено",
};

export const trialStatusTone: Record<TrialBookingStatus, string> = {
  SCHEDULED: "bg-cyan-50 text-cyan-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELED: "bg-rose-50 text-rose-700",
  COMPLETED: "bg-slate-100 text-slate-600",
};

export const attendanceLabels: Record<TrialAttendanceStatus, string> = {
  UNMARKED: "Не отмечено",
  ATTENDED: "Был на занятии",
  NO_SHOW: "Не пришёл",
};

export const resultLabels: Record<TrialResult, string> = {
  PENDING: "Ожидает результата",
  INTERESTED: "Заинтересован",
  FOLLOW_UP: "Нужен follow-up",
  NOT_INTERESTED: "Не заинтересован",
  CONVERTED: "Конвертирован",
};
