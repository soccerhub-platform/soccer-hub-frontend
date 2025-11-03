export type Role = 'DISPATCHER' | 'ADMIN';

export type ClientStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'CONVERTED'
  | 'REJECTED'
  | 'CLIENT';

export interface Client {
  id: string;
  name: string;
  phone: string;
  status: ClientStatus;
  notes?: string;
}

export type TrialTrainingStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface TrialTraining {
  id: string;
  clientId: string;
  date: string;
  status: TrialTrainingStatus;
}

export interface Coach {
  id: string;
  name: string;
  specialization: string;
  active: boolean;
}

export interface AdminAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'DISPATCHER';
  active: boolean;
}