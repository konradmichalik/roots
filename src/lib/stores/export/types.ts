export const EXPORT_SCHEMA_VERSION = 1;
export const EXPORT_APP_SLUG = 'roots';
export const EXPORT_DISPLAY_NAME = 'Roots';

export type ExportViewState = 'ok' | 'warn' | 'critical' | 'idle';

export interface ExportView {
  id: string;
  label: string;
  value: string;
  detail?: string;
  progress?: number;
  state?: ExportViewState;
  trend?: number[];
}

export interface ExportPayload {
  schemaVersion: number;
  app: string;
  displayName: string;
  updatedAt: string;
  ttlSeconds: number;
  views: ExportView[];
}

export interface ExportSerializerInput {
  now: Date;
  ttlSeconds: number;
  mocoConnected: boolean;
  today?: { actual: number; required: number };
  week?: { actual: number; required: number };
  gaps?: { count: number; hours: number };
  vacationRemainingDays?: number;
}
