export const LEAD_COLUMN_ORDER = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "TRIAL_SCHEDULED",
  "TRIAL_DONE",
  "WAITING_PAYMENT",
  "WON",
  "LOST",
] as const;

export type LeadStatus = (typeof LEAD_COLUMN_ORDER)[number];

export interface LeadChild {
  id?: string;
  childName: string;
  childAge: number;
}

export interface Lead {
  id: string;
  parentName: string;
  phone: string;
  children: LeadChild[];
  status: string;
  assignedAdminId: string | null;
  comment: string;
  createdAt: string;
}

export type LeadKanbanColumns = Record<string, Lead[]>;

export interface LeadDetails extends Lead {
  email?: string | null;
  preferredDays?: string | null;
  experience?: string | null;
  notes?: string | null;
}

export interface QualifyLeadPayload {
  children: LeadChild[];
  preferredDays: string;
  experience: string;
  notes: string;
}

export interface ScheduleTrialPayload {
  childId: string;
  groupId?: string;
  coachId?: string;
  slot: {
    date: string;
    startTime: string;
  };
  comment?: string;
}

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime?: string | null;
}

export type LeadQuickAction =
  | "CONTACTED"
  | "QUALIFY"
  | "SCHEDULE_TRIAL"
  | "REQUEST_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "REJECT";

export type LeadEvent =
  | "CONTACT"
  | "QUALIFY"
  | "REJECT"
  | "REQUEST_PAYMENT"
  | "CONFIRM_PAYMENT";
