export type ContractStatus = "DRAFT" | "UPCOMING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
export type LeadType = "CHILDREN" | "ADULT";
export type ContractPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type PaymentStatus = "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "KASPI" | "OTHER";
export type CancelReasonCode = "CLIENT_REQUEST" | "PAYMENT_ISSUE" | "SCHEDULE_CONFLICT" | "MEDICAL" | "OTHER";

export interface ContractParty {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
}

export interface ContractCapabilities {
  canEdit: boolean;
  canActivate: boolean;
  canExtend: boolean;
  canCancel: boolean;
  canAddPayment: boolean;
  canEnrollStudent: boolean;
}

export interface ContractListItem {
  id: string;
  contractNumber: string;
  branchId: string;
  leadType: LeadType;
  status: ContractStatus;
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  participant: ContractParty;
  primaryContact: ContractParty;
  group?: { id: string; name: string; audienceType: LeadType } | null;
  coach?: { id: string; fullName: string } | null;
  paymentStatus?: ContractPaymentStatus;
  paidAmount?: number;
  outstandingAmount?: number;
  overpaidAmount?: number;
  lastPaidAt?: string | null;
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
  capabilities: ContractCapabilities;
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
  primaryContact: ContractParty;
}

export interface CreateContractRequest {
  branchId: string;
  clientId: string;
  playerId: string;
  contractNumber?: string;
  startDate: string;
  endDate?: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface UpdateContractRequest {
  startDate: string;
  endDate?: string;
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
  clientId?: string;
  status?: ContractStatus | "all";
  leadType?: LeadType | "all";
  search?: string;
  page?: number;
  size?: number;
}

export interface ContractPaymentSummary {
  contractId: string;
  contractAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: ContractPaymentStatus;
  lastPaidAt?: string | null;
  paymentsCount: number;
  overpaidAmount: number;
}

export interface ContractPaymentItem {
  id: string;
  contractId: string;
  contractNumber?: string | null;
  clientId?: string;
  clientName?: string | null;
  playerId?: string;
  playerName?: string | null;
  branchId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paidAt: string;
  recordedAt?: string;
  recordedBy?: string;
  recordedByName?: string;
  comment?: string;
  externalReference?: string;
  cancelReason?: string;
  cancelComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContractPaymentRequest {
  contractId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paidAt: string;
  comment?: string;
  externalReference?: string;
}

export interface CancelPaymentRequest {
  reason: string;
  comment?: string;
}

export interface AdminPaymentsListQuery {
  branchId?: string;
  search?: string;
  contractId?: string;
  clientId?: string;
  status?: PaymentStatus | "all";
  method?: PaymentMethod | "all";
  paidFrom?: string;
  paidTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AdminPaymentsPageResponse {
  content: ContractPaymentItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
