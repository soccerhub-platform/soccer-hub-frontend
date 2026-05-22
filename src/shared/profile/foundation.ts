export type UserAvailability = {
  days: string[];
  timeFrom: string;
  timeTo: string;
  timezone: string;
};

export type UserProfileStatus = "ACTIVE" | "INACTIVE" | string;

export type UserWorkspaceBranch = {
  branchId: string;
  branchName: string;
};

export type UserWorkspaceGroup = {
  groupId: string;
  groupName: string;
  branchId: string;
  branchName: string;
  role: string;
};

export type BaseUserProfile = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: UserProfileStatus;
  branches: UserWorkspaceBranch[];
  groups: UserWorkspaceGroup[];
  createdAt: string;
};

export type BaseUserProfileUpdate = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  specialization?: string;
  bio?: string;
};

export type UserNotificationSettings = {
  todaySessions: boolean;
  overdueReports: boolean;
  scheduleChanges: boolean;
};

export type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const validateAvailability = (availability: UserAvailability): string | null => {
  if (availability.days.length === 0) {
    return "Выберите хотя бы один рабочий день";
  }
  if (availability.timeFrom >= availability.timeTo) {
    return "Время окончания должно быть позже начала";
  }
  return null;
};

export const validatePasswordForm = (form: ChangePasswordForm): string | null => {
  if (!form.currentPassword || !form.newPassword) {
    return "Заполните текущий и новый пароль";
  }
  if (form.newPassword.length < 8) {
    return "Новый пароль должен быть минимум 8 символов";
  }
  if (form.newPassword !== form.confirmPassword) {
    return "Пароли не совпадают";
  }
  return null;
};
