import { apiClient } from '../../../shared/api';

/* ================= TYPES ================= */

export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: boolean;
}

export type CoachStatus = "ACTIVE" | "INACTIVE";

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

export const CoachApi = {
  create(payload: CreateCoachRequest, _token: string): Promise<Coach> {
    return apiClient.post<Coach>('/admin/coach', payload);
  },

  listByBranch(
    branchId: string,
    _token: string,
    page = 0,
    size = 10,
    search?: string
  ): Promise<Page<Coach>> {
    const qs = new URLSearchParams({
      page: String(page),
      size: String(size),
      ...(search ? { search } : {}),
    });

    return apiClient.get<Page<Coach>>(`/admin/coach/all/branch/${branchId}?${qs}`);
  },

  assignBranch(coachId: string, branchId: string, _token: string): Promise<void> {
    return apiClient.post<void>(`/admin/coach/${coachId}/assign-branch`, { branchId });
  },

  unassignBranch(coachId: string, branchId: string, _token: string): Promise<void> {
    return apiClient.post<void>(`/admin/coach/${coachId}/unassign-branch`, { branchId });
  },

  updateStatus(coachId: string, status: CoachStatus, _token: string): Promise<void> {
    return apiClient.patch<void>(`/admin/coach/${coachId}/status`, { status });
  },
};
