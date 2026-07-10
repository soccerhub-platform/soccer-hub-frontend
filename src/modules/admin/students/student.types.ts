import type { ContractPaymentStatus, ContractStatus, PaymentMethod, PaymentStatus } from "../contracts/contracts.types";
import type { MediaAsset } from "../../../shared/media.types";

export type StudentRiskCode =
  | "DEBT"
  | "ENDING_SOON"
  | "EXPIRED_CONTRACT"
  | "LOW_ATTENDANCE"
  | "NO_GROUP";

export type StudentRiskSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface StudentRisk {
  code: StudentRiskCode;
  label: string;
  severity: StudentRiskSeverity;
}

export interface AdminStudentListItem {
  playerId: string;
  playerName: string;
  avatar?: MediaAsset | null;
  birthDate?: string | null;
  age?: number | null;
  createdAt?: string | null;
  clientId: string;
  parentName: string;
  phone: string;
  email?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  coachName?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  contractStatus?: ContractStatus | null;
  contractEndDate?: string | null;
  paymentStatus?: ContractPaymentStatus | null;
  paidAmount?: number | null;
  outstandingAmount?: number | null;
  attendanceRate?: number | null;
  missedLast30Days?: number | null;
  risks: StudentRisk[];
}

export interface AdminStudentsPageResponse {
  summary?: AdminStudentsSummary;
  content: AdminStudentListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminStudentsSummary {
  total: number;
  paid: number;
  partiallyPaid: number;
  unpaid: number;
  withDebt: number;
  withRisks: number;
  withoutGroup: number;
  lowAttendance: number;
  expiredContracts: number;
  endingSoon: number;
}

export interface AdminStudentsQuery {
  branchId: string;
  search?: string;
  paymentStatus?: ContractPaymentStatus | "all";
  contractStatus?: ContractStatus | "all";
  risk?: StudentRiskCode | "all";
  groupId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AdminStudentDetails {
  player: {
    id: string;
    fullName: string;
    avatar?: MediaAsset | null;
    birthDate?: string | null;
    age?: number | null;
  };
  client: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    status?: string | null;
  };
  currentGroup?: {
    id: string;
    name: string;
    coachName?: string | null;
    scheduleLabel?: string | null;
    nextSessionAt?: string | null;
  } | null;
  currentContract?: {
    id: string;
    contractNumber: string;
    status: ContractStatus;
    startDate: string;
    endDate: string;
    amount: number;
    currency: string;
    paymentStatus: ContractPaymentStatus;
    paidAmount: number;
    outstandingAmount: number;
    overpaidAmount: number;
    lastPaidAt?: string | null;
  } | null;
  attendanceSummary?: {
    attendanceRate?: number | null;
    presentCount?: number | null;
    absentCount?: number | null;
    lateCount?: number | null;
    missedLast30Days?: number | null;
  } | null;
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    method: PaymentMethod;
    status: PaymentStatus;
    paidAt: string;
    comment?: string | null;
  }>;
  recentAttendance: Array<{
    sessionId: string;
    date: string;
    groupName: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  }>;
  risks: StudentRisk[];
}
