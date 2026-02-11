import { ApiClient, getPlatformFetch } from './base-client';
import type {
  PersonioConnectionConfig,
  PersonioAuthToken,
  PersonioResponse,
  PersonioEmployee,
  PersonioTimeOff,
  PersonioAbsence,
  WeekdayHours
} from '../types';
import type { AbsenceType } from '../types';
import { isTauri } from '../utils/storage';
import { logger } from '../utils/logger';
import { validateResponse } from '../schemas/validate';
import {
  personioAuthResponseSchema,
  personioEmployeesResponseSchema,
  personioTimeOffsResponseSchema
} from '../schemas/personio';

const PERSONIO_API_BASE = 'https://api.personio.de';
const PROXY_BASE = 'http://localhost:3002/personio';
const TOKEN_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

export class PersonioClient extends ApiClient {
  private config_: PersonioConnectionConfig;
  private token: PersonioAuthToken | null = null;
  private onTokenRefreshed?: (token: PersonioAuthToken) => void;

  constructor(
    config: PersonioConnectionConfig,
    storedToken?: PersonioAuthToken,
    onTokenRefreshed?: (token: PersonioAuthToken) => void
  ) {
    super({
      baseUrl: PERSONIO_API_BASE,
      proxyUrl: PROXY_BASE
    });
    this.config_ = config;
    this.token = storedToken ?? null;
    this.onTokenRefreshed = onTokenRefreshed;
  }

  protected override get serviceName(): string {
    return 'Personio';
  }

  protected override getAuthHeaders(): Record<string, string> {
    if (!this.token) return {};
    return { Authorization: `Bearer ${this.token.token}` };
  }

  private isTokenValid(): boolean {
    return !!this.token && this.token.expiresAt > Date.now() + TOKEN_BUFFER_MS;
  }

  private async ensureValidToken(): Promise<void> {
    if (this.isTokenValid()) return;
    await this.authenticate();
  }

  async authenticate(): Promise<void> {
    const fetchFn = await getPlatformFetch();
    const baseUrl = isTauri() ? PERSONIO_API_BASE : PROXY_BASE;

    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: this.config_.clientId,
          client_secret: this.config_.clientSecret
        })
      });
    } catch (error) {
      logger.error('Personio auth network error', error);
      const hint = !isTauri() ? ' (is the proxy server running?)' : '';
      throw new Error(`Personio not reachable${hint}`);
    }

    if (!response.ok) {
      const text = await response.text();
      logger.error('Personio auth failed', { status: response.status, body: text });
      let message = `Personio authentication failed (${response.status})`;
      try {
        const err = JSON.parse(text);
        if (err.error?.message) message = err.error.message;
      } catch {
        // use default message
      }
      throw new Error(message);
    }

    const rawData = await response.json();
    const validated = validateResponse(personioAuthResponseSchema, rawData, 'Personio auth');
    const accessToken = validated.data?.token;

    if (!accessToken) {
      throw new Error('Personio authentication failed: no token in response');
    }

    const expiresIn = 86400; // v1 tokens are valid for 24h

    this.token = {
      token: accessToken,
      expiresAt: Date.now() + expiresIn * 1000
    };

    this.onTokenRefreshed?.(this.token);
    logger.connection('Personio authenticated');
  }

  protected override async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    await this.ensureValidToken();
    try {
      return await super.request<T>(method, endpoint, body, extraHeaders);
    } catch (error) {
      if (error instanceof Error && error.message === 'Network error') {
        const hint = !isTauri() ? ' (is the proxy server running?)' : '';
        throw new Error(`Personio not reachable${hint}`);
      }
      throw error;
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    employeeName?: string;
    employee?: PersonioEmployee;
  }> {
    try {
      await this.authenticate();
      const employee = await this.findCurrentEmployee();
      if (!employee) {
        return { success: false, error: `No employee found with email: ${this.config_.email}` };
      }

      const name = `${employee.attributes.first_name.value} ${employee.attributes.last_name.value}`;
      const id = employee.attributes.id.value;
      this.config_.employeeId = id;

      logger.connectionSuccess(`Personio connected as ${name} (ID: ${id})`);
      return { success: true, employeeName: name, employee };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, error: message };
    }
  }

  async findCurrentEmployee(): Promise<PersonioEmployee | null> {
    const raw = await this.request<PersonioResponse<PersonioEmployee[]>>(
      'GET',
      '/v1/company/employees?limit=200'
    );
    const data = validateResponse(personioEmployeesResponseSchema, raw, 'Personio employees');

    const emailLower = this.config_.email.toLowerCase();
    return (
      data.data.find((emp) => emp.attributes.email.value.toLowerCase() === emailLower) ?? null
    );
  }

  async getTimeOffs(from: string, to: string): Promise<PersonioTimeOff[]> {
    if (!this.config_.employeeId) {
      logger.error('Personio: employeeId not set, cannot fetch time-offs');
      return [];
    }

    const params = new URLSearchParams({
      start_date: from,
      end_date: to,
      'employees[]': String(this.config_.employeeId)
    });

    const raw = await this.request<PersonioResponse<PersonioTimeOff[]>>(
      'GET',
      `/v1/company/time-offs?${params}`
    );
    const data = validateResponse(personioTimeOffsResponseSchema, raw, 'Personio time-offs');

    // Only return approved time-offs
    return data.data.filter((t) => t.attributes.status === 'approved');
  }

  getWorkSchedule(employee: PersonioEmployee): WeekdayHours {
    const schedule = employee.attributes.work_schedule.value;
    return [
      parseDuration(schedule.monday.duration),
      parseDuration(schedule.tuesday.duration),
      parseDuration(schedule.wednesday.duration),
      parseDuration(schedule.thursday.duration),
      parseDuration(schedule.friday.duration),
      parseDuration(schedule.saturday.duration),
      parseDuration(schedule.sunday.duration)
    ];
  }

  getEmployeeId(): number | undefined {
    return this.config_.employeeId;
  }

  getToken(): PersonioAuthToken | null {
    return this.token;
  }
}

// Parse ISO 8601 duration "PT28800S" to hours
function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration;
  const match = duration.match(/PT(\d+)S/);
  if (match) return Number(match[1]) / 3600;
  const num = parseFloat(duration);
  return isNaN(num) ? 0 : num;
}

export function mapPersonioAbsenceType(typeName: string): AbsenceType {
  const lower = typeName.toLowerCase();
  if (lower.includes('urlaub') || lower.includes('vacation') || lower.includes('holiday')) {
    return 'vacation';
  }
  if (lower.includes('krank') || lower.includes('sick') || lower.includes('illness')) {
    return 'sick';
  }
  if (lower.includes('feiertag') || lower.includes('public holiday')) {
    return 'public_holiday';
  }
  if (
    lower.includes('sonderurlaub') ||
    lower.includes('personal') ||
    lower.includes('child sick')
  ) {
    return 'personal';
  }
  return 'other';
}

export function mapTimeOffToAbsence(timeOff: PersonioTimeOff): PersonioAbsence {
  const attrs = timeOff.attributes;
  const typeName = attrs.time_off_type.attributes.name;
  return {
    id: `personio-${attrs.id}`,
    source: 'personio',
    type: mapPersonioAbsenceType(typeName),
    startDate: attrs.start_date,
    endDate: attrs.end_date,
    halfDay: attrs.half_day_start || attrs.half_day_end,
    personioId: attrs.id,
    status: attrs.status,
    typeName
  };
}
