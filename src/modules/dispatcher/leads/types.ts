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
}

export interface DispatcherBranchOption {
  id: string;
  name: string;
}

export interface CreateDispatcherLeadPayload {
  parentName: string;
  phone: string;
  branchId: string;
  email?: string;
  comment?: string;
  children?: DispatcherLeadChild[];
}
