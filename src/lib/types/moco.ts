export interface MocoActivity {
  id: number;
  date: string;
  hours: number;
  seconds: number;
  description: string;
  billed: boolean;
  billable: boolean;
  tag: string;
  remote_service: string | null;
  remote_id: string | null;
  remote_url: string | null;
  project: MocoProject;
  task: MocoTask;
  customer: MocoCustomer;
  user: MocoUser;
  created_at: string;
  updated_at: string;
}

export interface MocoProject {
  id: number;
  name: string;
  billable: boolean;
}

export interface MocoTask {
  id: number;
  name: string;
  billable: boolean;
  active?: boolean; // May not be present in /projects/assigned but is in /projects/:id/tasks
  budget?: number | null; // Task budget in currency (from /projects/:id/tasks)
  hourly_rate?: number | null; // Task hourly rate (from /projects/:id/tasks)
}

export interface MocoCustomer {
  id: number;
  name: string;
}

export interface MocoUser {
  id: number;
  firstname: string;
  lastname: string;
}

export interface MocoProjectAssigned {
  id: number;
  identifier: string; // Project number, e.g. "P26011"
  name: string;
  billable: boolean;
  active?: boolean; // Projects can be deactivated in Moco
  customer: MocoCustomer;
  tasks: MocoTask[];
}

export interface MocoCreateActivity {
  date: string;
  project_id: number;
  task_id: number;
  hours: number;
  description?: string;
  remote_service?: string;
  remote_id?: string;
  remote_url?: string;
}

export interface MocoUpdateActivity {
  project_id?: number;
  task_id?: number;
  hours?: number;
  description?: string;
}

export interface MocoPresence {
  id: number;
  date: string;
  from: string;
  to: string | null;
  is_home_office: boolean;
  break?: number; // Break time in minutes (from Moco API)
  user: MocoUser;
  created_at: string;
  updated_at: string;
}

export interface MocoCreatePresence {
  date: string;
  from: string;
  to?: string;
  is_home_office?: boolean;
}

export interface MocoUpdatePresence {
  from?: string;
  to?: string;
  is_home_office?: boolean;
}

export interface MocoTaskCost {
  id: number;
  name: string;
  hours_total: number;
  total_costs: number;
}

export interface MocoProjectReport {
  budget_total: number;
  budget_remaining: number;
  hours_total: number;
  hours_remaining: number;
  costs_by_task: MocoTaskCost[];
}
