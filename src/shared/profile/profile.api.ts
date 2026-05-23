import { apiClient } from "../api";
import type {
  UserNotificationSettings,
} from "./foundation";

export type ProfileScope = "admin" | "dispatcher";

export interface RoleBranchRef {
  branchId: string;
  branchName: string;
}

export interface AdminProfileResponse {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
  branches: RoleBranchRef[];
  permissions: string[];
  createdAt: string;
}

export interface DispatcherProfileResponse {
  dispatcherId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
  branches: RoleBranchRef[];
  responsibilities: string[];
  createdAt: string;
}

export type RoleProfileResponse = AdminProfileResponse | DispatcherProfileResponse;

export interface RoleProfileUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const suppress = { suppressErrorToast: true };

export const RoleProfileApi = {
  getProfile: (scope: ProfileScope) =>
    apiClient.get<RoleProfileResponse>(`/${scope}/profile`, suppress),

  updateProfile: (scope: ProfileScope, payload: RoleProfileUpdateRequest) =>
    apiClient.patch<RoleProfileResponse>(`/${scope}/profile`, payload, suppress),

  getNotificationSettings: (scope: ProfileScope) =>
    apiClient.get<UserNotificationSettings>(`/${scope}/profile/notification-settings`, suppress),

  updateNotificationSettings: (scope: ProfileScope, payload: UserNotificationSettings) =>
    apiClient.put<UserNotificationSettings>(`/${scope}/profile/notification-settings`, payload, suppress),

  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.post<{ success: boolean }>("/auth/change-password", payload, suppress),
};

