export interface DispatcherLeadChild {
  childName: string;
  childAge: number;
}

export interface DispatcherLead {
  id: string;
  parentName: string;
  phone: string;
  email?: string | null;
  children: DispatcherLeadChild[];
  status: string;
  assignedAdminId: string | null;
  comment: string;
  createdAt: string;
  leadType?: "CHILDREN" | "ADULT";
}

export interface DispatcherBranchOption {
  id: string;
  name: string;
}

export interface CreateDispatcherLeadPayload {
  leadType: "CHILDREN" | "ADULT";
  primaryContact: { fullName: string; phone: string; email?: string };
  branchId: string;
  comment?: string;
  participants: Array<{ fullName: string; birthDate?: string; gender?: "MALE" | "FEMALE"; experience?: string }>;
}
