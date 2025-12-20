/**
 * Common type definitions used across the CRM.  These types
 * describe the shape of clients, leads, trial trainings and
 * administrators/coaches.  */

// Possible statuses for a client or lead in the sales funnel.
export type ClientStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'NO_RESPONSE'
  | 'REJECTED'
  | 'TRIAL_SCHEDULED'
  | 'TRIAL_COMPLETED'
  | 'TRIAL_FAILED'
  | 'CONTRACT_PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'INACTIVE';

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

export interface Club {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Branch {
  id: string;
  clubId: string;
  name: string;
  address?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;      // current page (0-based)
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}