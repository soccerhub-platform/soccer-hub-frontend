const BASE = "http://localhost:8080/organization";

/* ================= TYPES ================= */

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
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  scheduleType: string;
  status: "ACTIVE" | "CANCELLED";
  substitution: boolean;
  substitutionCoachId: string | null;
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

/* ================= API ================= */

export const ScheduleApi = {
  listByGroup(groupId: string, token: string): Promise<GroupScheduleDto[]> {
    return fetchJson<GroupScheduleDto[]>(
      `${BASE}/schedules?group-id=${groupId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};