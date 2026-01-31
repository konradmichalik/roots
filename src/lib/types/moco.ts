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
  name: string;
  billable: boolean;
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
  user: MocoUser;
  created_at: string;
  updated_at: string;
}
