import { apiClient } from "../../../shared/api";
import type {
  TrialAttendanceStatus,
  TrialBookingListItem,
  TrialBookingStatus,
  TrialDetails,
  TrialListQuery,
  TrialResult,
  TrialsPageResponse,
  TrialNextActionType,
  TrialCoachRecommendation
} from "./trials.types";

const queryString = (query: TrialListQuery) => {
  const params = new URLSearchParams();
  let branch: string | undefined;
  try { branch=JSON.parse(localStorage.getItem("admin.branch")||"{}").branchId; } catch { /* BranchGuard resolves the branch before requests. */ }
  if (branch) params.set("branchId", branch);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.leadId) params.set("leadId", query.leadId);
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  if(query.dateFrom)params.set("dateFrom",query.dateFrom);if(query.dateTo)params.set("dateTo",query.dateTo);
  params.set("sort",query.leadId?"createdAt,desc":query.sort||"NEWEST");
  return params.toString();
};

export const TrialsApi = {
  create(payload: { leadId?: string; clientId?: string | null; participantId?: string; studentId?: string | null; trainingSessionId: string }): Promise<{ id: string }> {
    return apiClient.post("/admin/trials", payload);
  },

  list(query: TrialListQuery): Promise<TrialsPageResponse> {
    return apiClient.get(`${query.leadId?"/admin/trials":"/admin/operations/trials"}?${queryString(query)}`);
  },

  async findByLead(leadId: string): Promise<TrialBookingListItem | null> {
    const page = await this.list({ leadId, page: 0, size: 1 });
    return page.content[0] ?? null;
  },

  getById(trialId: string): Promise<TrialDetails> {
    return apiClient.get(`/admin/trials/${trialId}`);
  },

  cancel(trialId: string, reason: string, version: number): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/cancel`, { reason, version });
  },

  async reschedule(
    trialId: string,
    trainingSessionId: string, version?: number,
  ): Promise<TrialDetails> {
    return apiClient.post(
      `/admin/trials/${trialId}/reschedule`,
      { trainingSessionId, version: version ?? (await this.getById(trialId)).version },
    );
  },

  async markAttendance(trialId: string, status: TrialAttendanceStatus, comment?: string, version?: number): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/attendance`, { status, comment, version: version ?? (await this.getById(trialId)).version });
  },

  recordResult(
    trialId: string,
    result: TrialResult,
    recommendedGroupId: string | undefined,
    coachFeedback: string | undefined,
    nextActionType: TrialNextActionType | undefined,
    nextActionAt: string | undefined,
    version: number,
  ): Promise<TrialDetails> {
    return apiClient.post(`/admin/trials/${trialId}/result`, {
      result,
      recommendedGroupId,
      coachFeedback,
      nextActionType,
      nextActionAt, version,
    });
  },
};

export const trialStatusLabels: Record<TrialBookingStatus, string> = {
  SCHEDULED: "Запланировано",
  CANCELED: "Отменено",
  COMPLETED: "Завершено",
};

export const trialStatusTone = {
  SCHEDULED: "info",
  CANCELED: "danger",
  COMPLETED: "success",
} as const satisfies Record<TrialBookingStatus, "info" | "success" | "danger" | "neutral">;

export const attendanceLabels: Record<TrialAttendanceStatus, string> = {
  UNMARKED: "Не отмечено",
  ATTENDED: "Был на занятии",
  NO_SHOW: "Не пришёл",
};

export const resultLabels: Record<TrialResult, string> = {
  PENDING: "Ожидает результата",
  INTERESTED: "Заинтересован",
  FOLLOW_UP: "Повторный контакт",
  NOT_INTERESTED: "Не заинтересован",
  CONVERTED: "Конвертирован",
};

export const coachRecommendationLabels: Record<TrialCoachRecommendation, string> = {
  RECOMMEND_ENROLLMENT: "Рекомендует зачисление",
  RECOMMEND_ANOTHER_GROUP: "Рекомендует другую группу",
  RECOMMEND_REPEAT_TRIAL: "Рекомендует повторное пробное",
  NOT_RECOMMENDED: "Не рекомендует зачисление",
};
