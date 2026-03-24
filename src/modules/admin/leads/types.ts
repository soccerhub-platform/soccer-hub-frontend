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
  childName: string;
  childAge: number;
  groupId?: string;
  coachId?: string;
  trialDate: string;
  startTime: string;
  duration: number;
  comment?: string;
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
