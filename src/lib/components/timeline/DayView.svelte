<script lang="ts">
  import type { UnifiedTimeEntry, JiraMetadata } from '../../types';
  import { dateNavState } from '../../stores/dateNavigation.svelte';
  import { getEntriesForDate, isAnyLoading } from '../../stores/timeEntries.svelte';
  import { connectionsState } from '../../stores/connections.svelte';
  import { extractIssueKeyFromMoco } from '../../utils/reconciliation';
  import { formatHours, formatBalance, getBalanceClass } from '../../utils/time-format';
  import { settingsState } from '../../stores/settings.svelte';
  import { formatDateLong } from '../../utils/date-helpers';

  const MATCH_COLORS = [
    'border-l-blue-500',
    'border-l-purple-500',
    'border-l-teal-500',
    'border-l-amber-500',
    'border-l-rose-500',
    'border-l-indigo-500',
    'border-l-cyan-500',
    'border-l-orange-500'
  ];

  interface DayRow {
    mocoEntry: UnifiedTimeEntry | null;
    jiraEntry: UnifiedTimeEntry | null;
    issueKey: string | null;
    matchColor: string;
  }

  let entries = $derived(getEntriesForDate(dateNavState.selectedDate));
  let loading = $derived(isAnyLoading());
  let fmt = $derived(settingsState.hoursFormat);

  let mocoTotal = $derived(entries.moco.reduce((s, e) => s + e.hours, 0));
  let jiraTotal = $derived(entries.jira.reduce((s, e) => s + e.hours, 0));
  let diff = $derived(Math.round((mocoTotal - jiraTotal) * 100) / 100);
  let diffClass = $derived(getBalanceClass(diff));

  let bothConnected = $derived(connectionsState.moco.isConnected && connectionsState.jira.isConnected);

  let rows = $derived(buildRows(entries.moco, entries.jira));

  function buildRows(moco: UnifiedTimeEntry[], jira: UnifiedTimeEntry[]): DayRow[] {
    // Index Jira entries by issue key
    const jiraByKey = new Map<string, UnifiedTimeEntry[]>();
    for (const j of jira) {
      const key = (j.metadata as JiraMetadata).issueKey;
      const list = jiraByKey.get(key) ?? [];
      jiraByKey.set(key, [...list, j]);
    }

    // Track which Jira keys have been paired
    const pairedJiraKeys = new Set<string>();
    let colorIndex = 0;

    // Group Moco entries by extracted issue key
    const mocoGroups: { key: string | null; entries: UnifiedTimeEntry[] }[] = [];
    const mocoKeyMap = new Map<string, UnifiedTimeEntry[]>();

    for (const m of moco) {
      const extracted = extractIssueKeyFromMoco(m);
      const key = extracted?.key ?? null;
      if (key) {
        const list = mocoKeyMap.get(key) ?? [];
        mocoKeyMap.set(key, [...list, m]);
      } else {
        mocoGroups.push({ key: null, entries: [m] });
      }
    }
    for (const [key, entries] of mocoKeyMap) {
      mocoGroups.push({ key, entries });
    }

    const result: DayRow[] = [];

    // Build paired rows for each Moco group
    for (const group of mocoGroups) {
      const jiraEntries = group.key ? (jiraByKey.get(group.key) ?? []) : [];
      const isMatched = group.key !== null && jiraEntries.length > 0;
      const color = isMatched ? MATCH_COLORS[colorIndex++ % MATCH_COLORS.length] : '';

      if (isMatched && group.key) {
        pairedJiraKeys.add(group.key);
      }

      const maxLen = Math.max(group.entries.length, jiraEntries.length);
      for (let i = 0; i < maxLen; i++) {
        result.push({
          mocoEntry: group.entries[i] ?? null,
          jiraEntry: jiraEntries[i] ?? null,
          issueKey: group.key,
          matchColor: color
        });
      }
    }

    // Add unmatched Jira entries
    for (const [key, jiraEntries] of jiraByKey) {
      if (pairedJiraKeys.has(key)) continue;
      for (const j of jiraEntries) {
        result.push({
          mocoEntry: null,
          jiraEntry: j,
          issueKey: key,
          matchColor: ''
        });
      }
    }

    return result;
  }
</script>

<div class="mx-auto max-w-4xl space-y-4">
  <!-- Day header -->
  <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
    <span class="text-sm font-medium text-foreground">
      {formatDateLong(dateNavState.selectedDate)}
    </span>
    {#if bothConnected}
      <div class="flex items-center gap-3 text-sm">
        <span class="text-muted-foreground">
          Moco <span class="font-mono font-medium text-foreground">{formatHours(mocoTotal, fmt)}</span>
        </span>
        <span class="text-muted-foreground">
          Jira <span class="font-mono font-medium text-foreground">{formatHours(jiraTotal, fmt)}</span>
        </span>
        {#if Math.abs(diff) > 0.01}
          <span class="font-mono font-medium {diffClass}">
            {formatBalance(diff, fmt)}
          </span>
        {/if}
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="text-center text-sm text-muted-foreground py-2">
      Lade Eintraege...
    </div>
  {/if}

  <!-- Column headers -->
  <div class="grid grid-cols-2 gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Moco</span>
      </div>
      <span class="text-xs font-mono text-muted-foreground">{formatHours(mocoTotal, fmt)}</span>
    </div>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Jira</span>
      </div>
      <span class="text-xs font-mono text-muted-foreground">{formatHours(jiraTotal, fmt)}</span>
    </div>
  </div>

  <!-- Paired rows -->
  {#if rows.length > 0}
    <div class="space-y-1.5">
      {#each rows as row, i (row.mocoEntry?.id ?? row.jiraEntry?.id ?? i)}
        <div class="grid grid-cols-2 gap-4">
          <!-- Moco cell -->
          {#if row.mocoEntry}
            <div class="rounded-md border border-border bg-card p-2.5 {row.matchColor ? `border-l-4 ${row.matchColor}` : ''}">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium text-foreground truncate block">{row.mocoEntry.title}</span>
                  {#if row.mocoEntry.description}
                    <p class="text-xs text-muted-foreground truncate">{row.mocoEntry.description}</p>
                  {/if}
                  {#if row.issueKey}
                    <span class="text-xs font-mono text-blue-600 dark:text-blue-400">{row.issueKey}</span>
                  {/if}
                </div>
                <span class="text-sm font-mono font-medium text-foreground flex-shrink-0">
                  {formatHours(row.mocoEntry.hours, fmt)}
                </span>
              </div>
            </div>
          {:else}
            <div class="rounded-md border border-dashed border-border/50 p-2.5 flex items-center justify-center">
              <span class="text-xs text-muted-foreground/50 italic">Nicht in Moco</span>
            </div>
          {/if}

          <!-- Jira cell -->
          {#if row.jiraEntry}
            <div class="rounded-md border border-border bg-card p-2.5 {row.matchColor ? `border-l-4 ${row.matchColor}` : ''}">
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium text-foreground truncate block">{row.jiraEntry.title}</span>
                  {#if row.jiraEntry.description}
                    <p class="text-xs text-muted-foreground truncate">{row.jiraEntry.description}</p>
                  {/if}
                </div>
                <span class="text-sm font-mono font-medium text-foreground flex-shrink-0">
                  {formatHours(row.jiraEntry.hours, fmt)}
                </span>
              </div>
            </div>
          {:else}
            <div class="rounded-md border border-dashed border-border/50 p-2.5 flex items-center justify-center">
              <span class="text-xs text-muted-foreground/50 italic">Kein Jira-Worklog</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center text-muted-foreground py-8">Keine Eintraege fuer diesen Tag.</div>
  {/if}

  <!-- Outlook events (if any) -->
  {#if entries.outlook.length > 0}
    <div>
      <div class="flex items-center gap-2 mb-2">
        <div class="h-2.5 w-2.5 rounded-full bg-purple-500"></div>
        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Outlook</span>
        <span class="text-xs font-mono text-muted-foreground ml-auto">
          {formatHours(entries.outlook.reduce((s, e) => s + e.hours, 0), fmt)}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        {#each entries.outlook as entry (entry.id)}
          <div class="rounded-md border border-border bg-card p-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-foreground truncate block">{entry.title}</span>
                {#if entry.startTime && entry.endTime}
                  <span class="text-xs text-muted-foreground">{entry.startTime}–{entry.endTime}</span>
                {/if}
              </div>
              <span class="text-sm font-mono font-medium text-foreground flex-shrink-0">
                {formatHours(entry.hours, fmt)}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
