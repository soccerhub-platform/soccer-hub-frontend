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

export type LeadType = "CHILDREN" | "ADULT";
export type TimePreference = "MORNING" | "AFTERNOON" | "EVENING";
export type Gender = "MALE" | "FEMALE";
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface LeadPrimaryContact {
  fullName: string;
  phone: string;
  email?: string;
}

export interface LeadParticipant {
  id?: string;
  fullName: string;
  birthDate?: string;
  gender?: Gender;
  experience?: ExperienceLevel;
}

export interface LeadTrial {
  id: string;
  leadId: string;
  participantId: string;
  groupId?: string;
  coachId?: string;
  trialDate: string;
  startTime: string;
  endTime: string;
  comment?: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED";
}

export interface LeadQualificationData {
  participants: Array<
    Pick<LeadParticipant, "fullName" | "birthDate" | "gender" | "experience">
  >;
  preferredDays?: string | null;
  timePreference?: TimePreference | null;
  experience?: string | null;
  notes?: string | null;
}

export type LeadActionType =
  | "CONTACT"
  | "QUALIFY"
  | "SCHEDULE_TRIAL"
  | "COMPLETE_TRIAL"
  | "CONVERT"
  | "NO_SHOW"
  | "REQUEST_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "POST_TRIAL_REJECT"
  | "LOST"
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
  leadType: LeadType;
  primaryContact: LeadPrimaryContact;
  participants: LeadParticipant[];
  status: LeadStatus;
  actions: LeadAction[];
  assignedAdminId?: string;
  assignedAdmin?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
  comment?: string;
  lostReasonCode?: string | null;
  lostReasonName?: string | null;
  lostComment?: string | null;
  lostAt?: string | null;
  clientId?: string | null;
  playerId?: string | null;
  contractId?: string | null;
  trial?: LeadTrial;
  preferredDays?: string | null;
  timePreference?: TimePreference | null;
  experience?: ExperienceLevel | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadKanbanColumns = Record<string, Lead[]>;

export interface LeadDetails extends Lead {
  source?: string | null;
  qualificationData?: LeadQualificationData | null;
}

export interface QualifyLeadPayload {
  participants: Array<
    Pick<LeadParticipant, "fullName" | "birthDate"> & {
      gender: Gender;
      experience: ExperienceLevel;
    }
  >;
  preferredDays: string;
  timePreference: TimePreference;
  experience: ExperienceLevel;
  notes: string;
}

export interface ScheduleTrialPayload {
  participantId: string;
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

export interface CreateLeadParticipantInput {
  fullName: string;
  birthDate: string;
  gender?: Gender;
  experience?: ExperienceLevel;
}

export interface CreateAdminLeadPayload {
  leadType: LeadType;
  primaryContact: LeadPrimaryContact;
  branchId: string;
  comment?: string;
  participants: CreateLeadParticipantInput[];
}

export type LeadLossReason = {
  code: string;
  name: string;
};

export type LeadTransitionRequest = {
  event: LeadActionType | string;
  lostReasonCode?: string;
  lostComment?: string;
};

export type ConvertLeadRequest = {
  participantId: string;
  groupId: string;
  participantBirthDate: string;
  contractStartDate: string;
  contractEndDate?: string | null;
  amount?: number | null;
};

export type ConvertLeadResponse = {
  leadId: string;
  clientId: string;
  playerId: string;
  contractId: string;
  status: string;
};
