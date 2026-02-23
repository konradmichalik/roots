export interface PersonioConnectionConfig {
  clientId: string;
  clientSecret: string;
  email: string;
  employeeId?: number;
}

// Personio API envelope
export interface PersonioResponse<T> {
  success: boolean;
  data: T;
}

// Auth
export interface PersonioAuthToken {
  token: string;
  expiresAt: number; // Unix ms
}

// Employee
export interface PersonioEmployeeAttribute<T = unknown> {
  label: string;
  value: T;
}

export interface PersonioWorkScheduleDay {
  name: string;
  duration: string; // "PT0S" or "PT28800S" (seconds in ISO 8601 duration)
}

export interface PersonioEmployee {
  type: 'Employee';
  attributes: {
    id: PersonioEmployeeAttribute<number>;
    first_name: PersonioEmployeeAttribute<string>;
    last_name: PersonioEmployeeAttribute<string>;
    email: PersonioEmployeeAttribute<string>;
    work_schedule?: PersonioEmployeeAttribute<{
      id: number;
      name: string;
      monday: PersonioWorkScheduleDay;
      tuesday: PersonioWorkScheduleDay;
      wednesday: PersonioWorkScheduleDay;
      thursday: PersonioWorkScheduleDay;
      friday: PersonioWorkScheduleDay;
      saturday: PersonioWorkScheduleDay;
      sunday: PersonioWorkScheduleDay;
    }>;
  };
}

// Time-Offs
export interface PersonioTimeOff {
  type: 'TimeOffPeriod';
  attributes: {
    id: number;
    status: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    days_count: number;
    half_day_start: boolean;
    half_day_end: boolean;
    time_off_type: {
      type: 'TimeOffType';
      attributes: {
        id: number;
        name: string;
        category: string;
      };
    };
    employee: {
      type: 'Employee';
      attributes: {
        id: PersonioEmployeeAttribute<number>;
        first_name: PersonioEmployeeAttribute<string>;
        last_name: PersonioEmployeeAttribute<string>;
      };
    };
  };
}

// Absence balance (vacation days remaining, etc.)
export interface PersonioAbsenceBalance {
  id: number;
  name: string;
  category: string | null;
  balance: number;
}
