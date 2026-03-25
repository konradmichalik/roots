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

export interface WeekBillability {
  weekLabel: string;
  weekStart: string;
  billable: number;
  nonBillable: number;
  total: number;
  rate: number;
}

export interface DayChartEntry {
  date: string;
  actual: number;
  target: number;
  balance: number;
  isFuture: boolean;
}
