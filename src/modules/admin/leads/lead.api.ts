import { getApiUrl } from "../../../shared/api";
import {
  LeadDetails,
  LeadEvent,
  LeadKanbanColumns,
  QualifyLeadPayload,
  ScheduleTrialPayload,
} from "./types";

const LEADS_BASE = getApiUrl("/admin/leads");

const parseJsonResponse = async <T,>(response: Response): Promise<T | null> => {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
};

const assertOk = async (response: Response) => {
  if (response.ok) return;
  const payload = await parseJsonResponse<{ message?: string }>(response);
  throw new Error(payload?.message || "Request failed");
};

export const LeadApi = {
  async getKanban(branchId: string, token: string): Promise<LeadKanbanColumns> {
    const response = await fetch(getApiUrl(`/leads/kanban?branchId=${branchId}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await assertOk(response);
    return (await parseJsonResponse<LeadKanbanColumns>(response)) ?? {};
  },

  async getById(leadId: string, token: string): Promise<LeadDetails> {
    const response = await fetch(getApiUrl(`/leads/${leadId}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await assertOk(response);
    const payload = await parseJsonResponse<LeadDetails>(response);
    if (!payload) {
      throw new Error("Не удалось загрузить лид");
    }
    return payload;
  },

  async qualify(
    leadId: string,
    payload: QualifyLeadPayload,
    token: string
  ): Promise<void> {
    const response = await fetch(`${LEADS_BASE}/${leadId}/qualify`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    await assertOk(response);
  },

  async sendLeadEvent(
    leadId: string,
    event: LeadEvent,
    token: string
  ): Promise<void> {
    const response = await fetch(`${LEADS_BASE}/${leadId}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event }),
    });

    await assertOk(response);
  },

  async scheduleTrial(
    leadId: string,
    payload: ScheduleTrialPayload,
    token: string
  ): Promise<void> {
    const response = await fetch(`${LEADS_BASE}/${leadId}/trial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    await assertOk(response);
  },
};
