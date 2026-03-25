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
  id: string;
  childName: string;
  childAge: number;
  gender?: "MALE" | "FEMALE";
  experience?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

export interface LeadTrial {
  id: string;
  childId: string;
  groupId?: string;
  coachId?: string;
  trialDate: string;
  startTime: string;
  endTime?: string;
  comment?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED";
}

export interface LeadQualificationData {
  children: Array<
    Pick<LeadChild, "childName" | "childAge" | "gender" | "experience">
  >;
  preferredDays?: string | null;
  experience?: string | null;
  notes?: string | null;
}

export interface Lead {
  id: string;
  parentName: string;
  phone: string;
  email?: string;
  children: LeadChild[];
  status: LeadStatus;
  assignedAdminId?: string;
  comment?: string;
  trial?: LeadTrial;
  createdAt: string;
  updatedAt: string;
}

export type LeadKanbanColumns = Record<string, Lead[]>;

export interface LeadDetails extends Lead {
  source?: string | null;
  qualificationData?: LeadQualificationData | null;
}

export interface QualifyLeadPayload {
  children: Array<
    Pick<LeadChild, "childName" | "childAge"> & {
      gender: "MALE" | "FEMALE";
      experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    }
  >;
  preferredDays: string;
  experience: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
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
