import { Coach } from "../сoaches/coach.api";
import { getApiUrl } from "../../../shared/api";

const ORG_GROUP_BASE = getApiUrl("/organization/groups");
const ADMIN_GROUP_BASE = getApiUrl("/admin/groups");

/* ================= TYPES ================= */

export interface GroupApiModel {
  groupId: string;
  name: string;
  branchId: string;
  ageFrom: number;
  ageTo: number;
  level: string;
  capacity: number;
  description: string;
  status: "ACTIVE" | "PAUSED" | "STOPPED";
}

export interface GroupCreatePayload {
  name: string;
  description?: string;
  branchId: string;
  ageFrom?: number;
  ageTo?: number;
  capacity?: number;
  level: string;
}

export interface GroupCoachApiModel {
  groupCoachId: string;
  coachId: string;
  groupId: string;

  coachFirstName: string;
  coachLastName: string;
  email: string;
  phone: string;
  active: boolean;

  coachRole: "MAIN" | "ASSISTANT";

  assignedFrom: string;
  assignedTo: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface GroupCoachesResponse {
  groupId: string;
  coaches: GroupCoachApiModel[];
}

export interface GroupSummaryModel {
  groupId: string;
  coachesCount: number;
  sessionPerWeek: number;
  nextSession: string | null;
  studentsCount: number;
  capacity: number;
  scheduleActive: boolean;
}

/* ================= HELPERS ================= */

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  // 👇 ВАЖНО
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text);
}

/* ================= API ================= */

export const GroupApi = {
  /* ===== READ (organization) ===== */

  listByBranch(
    branchId: string,
    token: string
  ): Promise<GroupApiModel[]> {
    return fetchJson<GroupApiModel[]>(
      `${ORG_GROUP_BASE}/branches/${branchId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  getById(
    groupId: string,
    token: string
  ): Promise<GroupApiModel> {
    return fetchJson<GroupApiModel>(
      `${ORG_GROUP_BASE}/${groupId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  /* ===== WRITE (admin) ===== */

  async create(
    payload: GroupCreatePayload,
    token: string
  ): Promise<void> {
    const res = await fetch(`${ADMIN_GROUP_BASE}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create group");
    }
  },

  updateStatus(
    groupId: string,
    status: "ACTIVE" | "PAUSED" | "STOPPED",
    token: string
  ): Promise<void> {
    return fetchJson<void>(
      `${ADMIN_GROUP_BASE}/${groupId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }
    );
  },

  // ✅ GET /admin/groups/{groupId}/coaches
  getCoaches(groupId: string, token: string): Promise<GroupCoachesResponse> {
    return fetchJson<GroupCoachesResponse>(`${ADMIN_GROUP_BASE}/${groupId}/coaches`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // ✅ DELETE /admin/groups/coaches/{groupCoachId}
  unassignCoach(groupCoachId: string, token: string): Promise<void> {
    return fetchJson<void>(
      `${ADMIN_GROUP_BASE}/coaches/${groupCoachId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  // ✅ POST /admin/groups/{groupId}/coaches/{coachId}
  async assignCoach(
    groupId: string,
    coachId: string,
    role: "MAIN" | "ASSISTANT",
    token: string
  ): Promise<{ groupCoachId: string }> {
    const res = await fetch(
      `${ADMIN_GROUP_BASE}/${groupId}/coaches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coachId, role }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to assign coach");
    }

    return res.json();
  },

  // ✅ GET /organization/groups/{groupId}/summary
  getSummary(groupId: string, token: string): Promise<GroupSummaryModel> {
    return fetchJson<GroupSummaryModel>(
      `${ORG_GROUP_BASE}/${groupId}/summary`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};
