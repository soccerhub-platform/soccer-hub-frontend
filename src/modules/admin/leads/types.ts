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

export type LeadActionType =
  | "CONTACT"
  | "QUALIFY"
  | "SCHEDULE_TRIAL"
  | "COMPLETE_TRIAL"
  | "NO_SHOW"
  | "REQUEST_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "POST_TRIAL_REJECT"
  | "REJECT";

export interface LeadAction {
  type: LeadActionType;
  label: string;
  primary: boolean;
  danger: boolean;
  enabled: boolean;
}

export interface LeadActivity {
  id?: string;
  type: string;
  description: string;
  actorName?: string | null;
  createdAt?: string;
  occurredAt?: string;
  time?: string;
}

export interface Lead {
  id: string;
  parentName: string;
  phone: string;
  email?: string;
  children: LeadChild[];
  status: LeadStatus;
  actions: LeadAction[];
  assignedAdminId?: string;
  assignedAdmin?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
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
