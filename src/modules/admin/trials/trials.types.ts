export type TrialBookingStatus = "SCHEDULED" | "CONFIRMED" | "CANCELED" | "COMPLETED";
export type TrialAttendanceStatus = "UNMARKED" | "ATTENDED" | "NO_SHOW";
export type TrialResult = "PENDING" | "INTERESTED" | "FOLLOW_UP" | "NOT_INTERESTED" | "CONVERTED";

export interface TrialBookingListItem {
  id: string;
  leadId?: string | null;
  clientId?: string | null;
  participantId?: string | null;
  studentId?: string | null;
  trainingSessionId: string;
  status: TrialBookingStatus;
  attendanceStatus: TrialAttendanceStatus;
  result: TrialResult;
}

export interface TrialsPageResponse {
  content: TrialBookingListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface TrialDetails {
  id: string;
  status: TrialBookingStatus;
  attendanceStatus: TrialAttendanceStatus;
  result: TrialResult;
  student?: { id: string; fullName: string; birthDate?: string | null; age?: number | null } | null;
  lead?: { id: string; fullName: string; phone?: string | null; email?: string | null } | null;
  session?: { id: string; date: string; startsAt: string; endsAt: string; status: string } | null;
  group?: { id: string; name: string } | null;
  coach?: { id: string; fullName: string } | null;
  location?: { id: string; name: string } | null;
  attendance?: { status: TrialAttendanceStatus; markedAt?: string | null; markedBy?: string | null; comment?: string | null } | null;
  outcome?: { result: TrialResult; coachFeedback?: string | null; recommendedGroupId?: string | null; recommendedGroupName?: string | null } | null;
  nextAction?: { type: string; dueAt?: string | null } | null;
  capabilities: {
    canConfirm: boolean;
    canCancel: boolean;
    canReschedule: boolean;
    canMarkAttendance: boolean;
    canRecordResult: boolean;
  };
}

export interface TrialListQuery {
  status?: TrialBookingStatus | "all";
  leadId?: string;
  page?: number;
  size?: number;
}
