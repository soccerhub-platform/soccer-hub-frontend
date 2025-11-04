/**
 * Common type definitions used across the CRM.  These types
 * describe the shape of clients, leads, trial trainings and
 * administrators/coaches.  */

// Possible statuses for a client or lead in the sales funnel.
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

// Trial training statuses reflect the outcome of a scheduled session.
export type TrialTrainingStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface TrialTraining {
  id: string;
  clientId: string;
  date: string; // ISO date string
  status: TrialTrainingStatus;
}

// Representation of a coach.  Additional fields can be added as needed.
export interface Coach {
  id: string;
  name: string;
  specialization: string;
  active: boolean;
}

// Representation of an administrator account.  Used in the admin module.
export interface AdminAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'DISPATCHER';
  active: boolean;
}