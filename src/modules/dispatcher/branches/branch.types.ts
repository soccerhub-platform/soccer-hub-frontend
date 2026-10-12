export const WEEK_DAYS = [
  ["MONDAY", "Понедельник"], ["TUESDAY", "Вторник"], ["WEDNESDAY", "Среда"],
  ["THURSDAY", "Четверг"], ["FRIDAY", "Пятница"], ["SATURDAY", "Суббота"], ["SUNDAY", "Воскресенье"],
] as const;

export type WeekDay = typeof WEEK_DAYS[number][0];
export interface WorkingDay { day: WeekDay; closed: boolean; opensAt: string | null; closesAt: string | null }
export interface DispatcherBranch {
  branchId: string;
  clubId: string;
  name: string;
  address?: string | null;
  active: boolean;
  phone?: string | null;
  email?: string | null;
  managerAdminId?: string | null;
  managerName?: string | null;
  workingHours?: WorkingDay[];
  archivedAt?: string | null;
}
export interface BranchManager { id: string; firstName: string; lastName: string; email: string; isActive?: boolean; active?: boolean }
export interface BranchDetailsPayload {
  name: string;
  address: string;
  phone: string;
  email: string;
  managerAdminId: string | null;
  workingHours: WorkingDay[];
}
