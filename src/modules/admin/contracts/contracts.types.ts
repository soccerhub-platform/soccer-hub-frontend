export type ContractStatus =
  | "DRAFT"
  | "UPCOMING"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED";

export type LeadType = "CHILDREN" | "ADULT";
export type CancelReasonCode =
  | "CLIENT_REQUEST"
  | "PAYMENT_ISSUE"
  | "SCHEDULE_CONFLICT"
  | "MEDICAL"
  | "OTHER";

export interface ContractListItem {
  id: string;
  contractNumber: string;
  branchId: string;
  leadType: LeadType;
  status: ContractStatus;
  amount: number;
  currency: string;
  startDate: string;
  endDate: string;
  notes?: string;
  participant: {
    id: string;
    fullName: string;
    birthDate?: string;
  };
  primaryContact: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
  group: {
    id: string;
    name: string;
    audienceType: LeadType;
  };
  coach?: {
    id: string;
    fullName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractHistoryItem {
  id: string;
  type: "CREATED" | "UPDATED" | "EXTENDED" | "CANCELLED";
  createdAt: string;
  actorName: string;
  comment?: string;
}

export interface ContractDetails extends ContractListItem {
  history: ContractHistoryItem[];
}

export interface ContractsPageResponse {
  content: ContractListItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ContractParticipantOption {
  id: string;
  fullName: string;
  birthDate?: string;
  leadType: LeadType;
  primaryContact: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  };
}

export interface ContractGroupOption {
  id: string;
  branchId: string;
  name: string;
  audienceType: LeadType;
  coach?: {
    id: string;
    fullName: string;
  } | null;
}

export interface ContractValidationError {
  code: string;
  field: string;
  message: string;
}

export interface ContractValidationResult {
  valid: boolean;
  errors: ContractValidationError[];
}

export interface CreateContractRequest {
  branchId: string;
  leadType: LeadType;
  participantId?: string;
  primaryContactId?: string;
  participantDraft?: {
    fullName: string;
    birthDate?: string;
  };
  primaryContactDraft?: {
    fullName: string;
    phone: string;
    email?: string;
  };
  groupId: string;
  coachId?: string | null;
  contractNumber?: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface UpdateContractRequest {
  branchId: string;
  leadType: LeadType;
  participantId: string;
  primaryContactId: string;
  groupId: string;
  coachId?: string | null;
  contractNumber?: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface ExtendContractRequest {
  endDate: string;
  amount?: number;
  notes?: string;
}

export interface CancelContractRequest {
  reasonCode: CancelReasonCode;
  comment?: string;
}

export interface ContractsListQuery {
  branchId?: string;
  status?: ContractStatus | "all";
  leadType?: LeadType | "all";
  search?: string;
  page?: number;
  size?: number;
}
