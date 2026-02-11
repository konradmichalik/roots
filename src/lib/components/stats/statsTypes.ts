export interface TaskStats {
  taskName: string;
  hours: number;
}

export interface ProjectStats {
  projectId: number;
  projectName: string;
  customerName: string;
  hours: number;
  tasks: TaskStats[];
}

export interface MonthProjectStats {
  projects: ProjectStats[];
  billable: number;
  nonBillable: number;
  total: number;
}
