import {
  EXPORT_SCHEMA_VERSION,
  EXPORT_APP_SLUG,
  EXPORT_DISPLAY_NAME,
  type ExportPayload,
  type ExportSerializerInput,
  type ExportView
} from './types';

const END_OF_DAY_HOUR = 18;

function formatHoursDE(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

function formatSignedHoursDE(value: number): string {
  const sign = value < 0 ? '-' : '+';
  return `${sign}${formatHoursDE(Math.abs(value))}`;
}

function formatDaysDE(value: number): string {
  return Number.isInteger(value) ? String(value) : formatHoursDE(value);
}

function buildTodayView(today: { actual: number; required: number }, now: Date): ExportView {
  const progress = today.required > 0 ? Math.min(1, today.actual / today.required) : undefined;
  const dayIsOver = now.getHours() >= END_OF_DAY_HOUR;
  const targetUnmet = today.actual < today.required;

  return {
    id: 'today',
    label: 'Heute',
    value: `${formatHoursDE(today.actual)}h`,
    detail: `von ${formatHoursDE(today.required)}h`,
    ...(progress !== undefined ? { progress } : {}),
    state: dayIsOver && targetUnmet ? 'warn' : 'ok'
  };
}

function buildWeekView(week: { actual: number; required: number }): ExportView {
  const balance = week.actual - week.required;

  return {
    id: 'week',
    label: 'Woche',
    value: `${formatSignedHoursDE(balance)}h`,
    detail: `${formatHoursDE(week.actual)} / ${formatHoursDE(week.required)}h`,
    state: balance < -1 ? 'warn' : 'ok'
  };
}

function buildGapsView(gaps: { count: number; hours: number }): ExportView {
  return {
    id: 'gaps',
    label: 'Offen',
    value: String(gaps.count),
    detail: `${formatHoursDE(gaps.hours)}h unbebucht`,
    state: gaps.count > 0 ? 'warn' : 'ok'
  };
}

function buildAbsenceView(remainingDays: number): ExportView {
  return {
    id: 'absence',
    label: 'Urlaub',
    value: formatDaysDE(remainingDays),
    detail: 'Tage rest',
    state: 'ok'
  };
}

export function buildExportPayload(input: ExportSerializerInput): ExportPayload | null {
  const views: ExportView[] = [];

  if (input.mocoConnected) {
    if (input.today) views.push(buildTodayView(input.today, input.now));
    if (input.week) views.push(buildWeekView(input.week));
    if (input.gaps) views.push(buildGapsView(input.gaps));
  }

  if (input.vacationRemainingDays !== undefined) {
    views.push(buildAbsenceView(input.vacationRemainingDays));
  }

  if (views.length === 0) return null;

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    app: EXPORT_APP_SLUG,
    displayName: EXPORT_DISPLAY_NAME,
    updatedAt: input.now.toISOString(),
    ttlSeconds: input.ttlSeconds,
    views
  };
}
