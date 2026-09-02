import { describe, it, expect } from 'vitest';
import { buildExportPayload } from './serializer';
import type { ExportSerializerInput } from './types';

// Built from local wall-clock components (not a UTC ISO string) so this stays
// deterministic regardless of the machine's timezone — the implementation's
// end-of-day check reads local hours via getHours().
const NOW = new Date(2026, 8, 2, 14, 12, 3);

function baseInput(overrides: Partial<ExportSerializerInput> = {}): ExportSerializerInput {
  return {
    now: NOW,
    ttlSeconds: 300,
    mocoConnected: false,
    ...overrides
  };
}

describe('buildExportPayload', () => {
  it('returns null when nothing is connected (empty state)', () => {
    expect(buildExportPayload(baseInput())).toBeNull();
  });

  it('returns null when Moco is connected but no day/week/gaps data was supplied', () => {
    expect(buildExportPayload(baseInput({ mocoConnected: true }))).toBeNull();
  });

  it('includes the envelope fields when at least one view exists', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, today: { actual: 6.5, required: 8 } })
    );
    expect(payload).toMatchObject({
      schemaVersion: 1,
      app: 'roots',
      displayName: 'Roots',
      updatedAt: NOW.toISOString(),
      ttlSeconds: 300
    });
  });

  it('builds the today view: booked vs target, ok state before end of day', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, today: { actual: 6.5, required: 8 } })
    );
    const view = payload!.views.find((v) => v.id === 'today');
    expect(view).toEqual({
      id: 'today',
      label: 'Heute',
      value: '6,5h',
      detail: 'von 8,0h',
      progress: 6.5 / 8,
      state: 'ok'
    });
  });

  it('marks today as warn when the day is over (>= 18:00 local) and target is unmet', () => {
    const eveningNow = new Date(2026, 8, 2, 18, 30, 0);
    const payload = buildExportPayload(
      baseInput({ now: eveningNow, mocoConnected: true, today: { actual: 6.5, required: 8 } })
    );
    expect(payload!.views.find((v) => v.id === 'today')!.state).toBe('warn');
  });

  it('clamps today progress to 1 when overbooked', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, today: { actual: 9, required: 8 } })
    );
    expect(payload!.views.find((v) => v.id === 'today')!.progress).toBe(1);
  });

  it('builds the week view: signed balance, raw actual/required detail, no progress', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, week: { actual: 32.5, required: 31.3 } })
    );
    expect(payload!.views.find((v) => v.id === 'week')).toEqual({
      id: 'week',
      label: 'Woche',
      value: '+1,2h',
      detail: '32,5 / 31,3h',
      state: 'ok'
    });
  });

  it('marks week as warn on a negative balance below one hour', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, week: { actual: 28, required: 31.3 } })
    );
    const view = payload!.views.find((v) => v.id === 'week')!;
    expect(view.value).toBe('-3,3h');
    expect(view.state).toBe('warn');
  });

  it('builds the gaps view: count as value, summed hours as detail, warn above zero', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, gaps: { count: 2, hours: 1.5 } })
    );
    expect(payload!.views.find((v) => v.id === 'gaps')).toEqual({
      id: 'gaps',
      label: 'Offen',
      value: '2',
      detail: '1,5h unbebucht',
      state: 'warn'
    });
  });

  it('marks gaps as ok when there are none', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, gaps: { count: 0, hours: 0 } })
    );
    expect(payload!.views.find((v) => v.id === 'gaps')!.state).toBe('ok');
  });

  it('builds the absence view from vacation days remaining, always ok', () => {
    const payload = buildExportPayload(baseInput({ vacationRemainingDays: 12 }));
    expect(payload!.views.find((v) => v.id === 'absence')).toEqual({
      id: 'absence',
      label: 'Urlaub',
      value: '12',
      detail: 'Tage rest',
      state: 'ok'
    });
  });

  it('omits the absence view when vacationRemainingDays is undefined (Personio not connected, or no vacation balance found)', () => {
    const payload = buildExportPayload(
      baseInput({ mocoConnected: true, today: { actual: 1, required: 8 } })
    );
    expect(payload!.views.find((v) => v.id === 'absence')).toBeUndefined();
  });

  it('does not include today/week/gaps views when Moco is not connected, even if data was passed', () => {
    const payload = buildExportPayload(
      baseInput({
        mocoConnected: false,
        today: { actual: 6.5, required: 8 },
        vacationRemainingDays: 12
      })
    );
    expect(payload!.views.map((v) => v.id)).toEqual(['absence']);
  });
});
