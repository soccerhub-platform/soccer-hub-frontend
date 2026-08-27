export type TrialBookingStatus = "SCHEDULED" | "CANCELED" | "COMPLETED";
export type TrialAttendanceStatus = "UNMARKED" | "ATTENDED" | "NO_SHOW";
export type TrialResult = "PENDING" | "INTERESTED" | "FOLLOW_UP" | "NOT_INTERESTED" | "CONVERTED";
export type TrialCoachRecommendation = "RECOMMEND_ENROLLMENT" | "RECOMMEND_ANOTHER_GROUP" | "RECOMMEND_REPEAT_TRIAL" | "NOT_RECOMMENDED";
export type TrialNextActionType =
  | "CALL"
  | "MESSAGE"
  | "SEND_OFFER"
  | "WAIT_FOR_DECISION"
  | "OTHER";

export interface TrialBookingListItem {
  id: string;
  leadId?: string | null;
  clientId?: string | null;
  participantId?: string | null;
  studentId?: string | null;
  trainingSessionId: string;
  studentName?: string | null;
  leadName?: string | null;
  sessionDate?: string | null;
  sessionStartsAt?: string | null;
  sessionEndsAt?: string | null;
  groupName?: string | null;
  coachName?: string | null;
  locationName?: string | null;
  leadPhone?: string | null;
  leadEmail?: string | null;
  status: TrialBookingStatus;
  attendanceStatus: TrialAttendanceStatus;
  result: TrialResult;
  nextActionType?: TrialNextActionType | null;
  nextActionAt?: string | null;
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
  nextAction?: { type: TrialNextActionType; dueAt?: string | null } | null;
  capabilities: {
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
