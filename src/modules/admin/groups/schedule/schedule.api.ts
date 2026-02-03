import {
  GroupScheduleDto,
  CreateScheduleBatchCommand,
  UpdateScheduleBatchCommand,
} from "./schedule.types";

const ORG_BASE = "http://localhost:8080/organization";
const ADMIN_BASE = "http://localhost:8080/admin";

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw data ?? { message: "Unknown error" };
  }

  return data as T;
}

export const ScheduleApi = {
  listByGroup(groupId: string, token: string) {
    return fetchJson<GroupScheduleDto[]>(
      `${ORG_BASE}/schedules?group-id=${groupId}&status=ACTIVE`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  createGroupSchedule(groupId: string, payload: CreateScheduleBatchCommand, token: string) {
    return fetchJson<void>(`${ADMIN_BASE}/groups/${groupId}/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  updateGroupSchedule(groupId: string, payload: UpdateScheduleBatchCommand, token: string) {
    return fetchJson<void>(`${ADMIN_BASE}/groups/${groupId}/schedule`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  deleteBatch(
    groupId: string,
    payload: Pick<
      UpdateScheduleBatchCommand,
      "coachId" | "startDate" | "endDate" | "type"
    >,
    token: string
  ): Promise<void> {
    return fetchJson<void>(`${ADMIN_BASE}/groups/${groupId}/schedule`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

};