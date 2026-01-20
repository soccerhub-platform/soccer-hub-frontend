const BASE = 'http://localhost:8080/admin/coach';

/* ================= TYPES ================= */

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface CreateCoachRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branchId: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/* ================= API ================= */

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return res.json();
}

export const CoachApi = {
  create(payload: CreateCoachRequest, token: string): Promise<Coach> {
    return fetchJson<Coach>(BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  listByBranch(
    branchId: string,
    token: string,
    page = 0,
    size = 10,
    search?: string
  ): Promise<Page<Coach>> {
    const qs = new URLSearchParams({
      page: String(page),
      size: String(size),
      ...(search ? { search } : {}),
    });

    return fetchJson<Page<Coach>>(
      `${BASE}/all/branch/${branchId}?${qs}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },

  assignBranch(coachId: string, branchId: string, token: string): Promise<void> {
    return fetchJson<void>(`${BASE}/${coachId}/assign-branch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ branchId }),
    });
  },

  unassignBranch(coachId: string, branchId: string, token: string): Promise<void> {
    return fetchJson<void>(`${BASE}/${coachId}/unassign-branch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ branchId }),
    });
  },
};