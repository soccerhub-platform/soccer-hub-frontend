// src/admin/branches/branch.api.ts

const BASE = "http://localhost:8080/admin/branches";

/* ================= API TYPES ================= */

export interface Branch {
  branchId: string;
  name: string;
  address: string;
  clubId: string;
}

/* ================= HELPER ================= */

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

export const BranchApi = {
  list(token: string): Promise<Branch[]> {
    return fetchJson<{ branches: Branch[] }>(BASE, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((r) => r.branches ?? []);
  },
};