export type ClientStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "NO_RESPONSE"
  | "REJECTED"
  | "TRIAL_SCHEDULED"
  | "TRIAL_COMPLETED"
  | "TRIAL_FAILED"
  | "CONTRACT_PENDING"
  | "ACTIVE"
  | "PAUSED"
  | "INACTIVE";

export type ClientStudentRelationshipType =
  | "SELF"
  | "MOTHER"
  | "FATHER"
  | "GUARDIAN"
  | "OTHER"
  | "LEGACY_PARENT";

export type ClientPaymentStatus =
  | "PAID"
  | "PARTIALLY_PAID"
  | "UNPAID"
  | "NO_CONTRACT"
  | "NO_AMOUNT"
  | "MIXED_CURRENCIES";

export interface ClientListItem {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  status: ClientStatus;
  studentsCount: number;
  activeContractsCount: number;
  paidAmount?: number | null;
  outstandingAmount?: number | null;
  currency?: string | null;
  mixedCurrencies: boolean;
  lastPaidAt?: string | null;
  paymentStatus: ClientPaymentStatus;
}

export interface ClientsPageResponse {
  content: ClientListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  summary?: {
    clientsCount: number;
    activeClientsCount: number;
    studentsCount: number;
    activeContractsCount: number;
    paidAmount?: number | null;
    outstandingAmount?: number | null;
    currency?: string | null;
    mixedCurrencies: boolean;
  };
}

export interface ClientsListQuery {
  branchId: string;
  search?: string;
  status?: ClientStatus | "ALL";
  students?: "ALL" | "WITH_STUDENTS" | "WITHOUT_STUDENTS";
  contracts?: "ALL" | "ACTIVE" | "NO_ACTIVE";
  payment?: "ALL" | ClientPaymentStatus | "DEBT";
  sort?: string;
  page?: number;
  size?: number;
}

export interface ClientStudentRelation {
  id: string;
  clientId: string;
  clientName: string;
  playerId: string;
  playerName: string;
  relationshipType: ClientStudentRelationshipType;
  primaryContact: boolean;
  primaryPayer: boolean;
  legalRepresentative: boolean;
  receivesNotifications: boolean;
  startedAt: string;
  endedAt?: string | null;
  active: boolean;
}

export interface ClientDetails {
  client: {
    id: string;
    branchId: string;
    fullName: string;
    firstName: string;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
    status: ClientStatus;
    source?: string | null;
    comments?: string | null;
    createdAt?: string | null;
  };
  summary: {
    studentsCount: number;
    activeContractsCount: number;
    allContractsCount: number;
    money: {
      paidAmount?: number | null;
      outstandingAmount?: number | null;
      overpaidAmount?: number | null;
      currency?: string | null;
      mixedCurrencies: boolean;
      lastPaidAt?: string | null;
    };
  };
  students: ClientStudentRelation[];
  capabilities: {
    canEdit: boolean;
    canLinkStudent: boolean;
    canCreateContract: boolean;
    canRecordPayment: boolean;
    canActivate: boolean;
    canPause: boolean;
    canDeactivate: boolean;
  };
}

export interface ClientFormInput {
  branchId?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  source?: string;
  comments?: string;
}

export interface ClientRelationInput {
  playerId: string;
  relationshipType: ClientStudentRelationshipType;
  primaryContact: boolean;
  primaryPayer: boolean;
  replacePrimaryContact: boolean;
  replacePrimaryPayer: boolean;
  legalRepresentative: boolean;
  receivesNotifications: boolean;
  startedAt: string;
}

export interface ClientStudentCreateInput {
  firstName: string;
  lastName?: string;
  birthDate: string;
  relationshipType: ClientStudentRelationshipType;
  primaryContact: boolean;
  primaryPayer: boolean;
  legalRepresentative: boolean;
  receivesNotifications: boolean;
  startedAt: string;
}

export interface ClientRelationUpdateInput {
  relationshipType: ClientStudentRelationshipType;
  primaryContact: boolean;
  primaryPayer: boolean;
  legalRepresentative: boolean;
  receivesNotifications: boolean;
}

export interface ClientActivityItem {
  id: string;
  type: "CLIENT_CREATED" | "CLIENT_UPDATED" | "CLIENT_STATUS_CHANGED" | "STUDENT_LINKED" | "STUDENT_RELATION_UPDATED" | "STUDENT_RELATION_ENDED" | string;
  occurredAt: string;
  actor?: { id: string; fullName?: string | null } | null;
  payload: Record<string, unknown>;
}

export interface ClientActivityPage {
  content: ClientActivityItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
