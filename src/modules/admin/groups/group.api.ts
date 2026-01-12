const BASE = "http://localhost:8080/organization/groups";

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

export const GroupApi = {
  listByBranch(branchId: string, token: string): Promise<GroupApiModel[]> {
    return fetchJson<GroupApiModel[]>(
      `${BASE}/branches/${branchId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
  getById(groupId: string, token: string): Promise<GroupApiModel> {
    return fetchJson<GroupApiModel>(
      `${BASE}/${groupId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};