import type { UnifiedTimeEntry, MocoMetadata, JiraMetadata } from '../types';
import type {
  ReconciliationMatch,
  ReconciliationResult,
  ReconciliationSummary,
  ReconciliationStatus,
  MatchConfidence
} from '../types/reconciliation';

const JIRA_KEY_PATTERN = /\b([A-Z][A-Z0-9]+-\d+)\b/;

export function extractIssueKeyFromMoco(
  entry: UnifiedTimeEntry
): { key: string; confidence: MatchConfidence } | null {
  const meta = entry.metadata as MocoMetadata;

  if (meta.remoteTicketKey) {
    return { key: meta.remoteTicketKey, confidence: 'high' };
  }

  if (entry.description) {
    const match = entry.description.match(JIRA_KEY_PATTERN);
    if (match) {
      return { key: match[1], confidence: 'medium' };
    }
  }

  if (entry.title) {
    const match = entry.title.match(JIRA_KEY_PATTERN);
    if (match) {
      return { key: match[1], confidence: 'medium' };
    }
  }

  return null;
}

interface MatchAccumulator {
  issueKey: string | null;
  issueSummary: string | null;
  date: string;
  confidence: MatchConfidence | null;
  mocoEntries: UnifiedTimeEntry[];
  jiraEntries: UnifiedTimeEntry[];
}

export function reconcileEntries(
  mocoEntries: readonly UnifiedTimeEntry[],
  jiraEntries: readonly UnifiedTimeEntry[]
): ReconciliationResult {
  const jiraByDateAndKey = new Map<string, UnifiedTimeEntry[]>();
  const matchedJiraIds = new Set<string>();

  for (const jira of jiraEntries) {
    const meta = jira.metadata as JiraMetadata;
    const key = `${jira.date}-${meta.issueKey}`;
    const existing = jiraByDateAndKey.get(key) ?? [];
    jiraByDateAndKey.set(key, [...existing, jira]);
  }

  const matchMap = new Map<string, MatchAccumulator>();

  for (const moco of mocoEntries) {
    const extracted = extractIssueKeyFromMoco(moco);

    if (extracted) {
      const { key: issueKey, confidence } = extracted;
      const lookupKey = `${moco.date}-${issueKey}`;
      const jiraMatches = jiraByDateAndKey.get(lookupKey);

      if (jiraMatches) {
        for (const j of jiraMatches) {
          matchedJiraIds.add(j.id);
        }
      }

      const existing = matchMap.get(lookupKey);
      if (existing) {
        matchMap.set(lookupKey, {
          ...existing,
          mocoEntries: [...existing.mocoEntries, moco],
          confidence: higherConfidence(existing.confidence, confidence)
        });
      } else {
        const jiraMeta = jiraMatches?.[0]?.metadata as JiraMetadata | undefined;
        matchMap.set(lookupKey, {
          issueKey,
          issueSummary: jiraMeta?.issueSummary ?? null,
          date: moco.date,
          confidence: jiraMatches ? confidence : null,
          mocoEntries: [moco],
          jiraEntries: jiraMatches ? [...jiraMatches] : []
        });
      }
    } else {
      const lookupKey = `moco-only-${moco.id}`;
      matchMap.set(lookupKey, {
        issueKey: null,
        issueSummary: null,
        date: moco.date,
        confidence: null,
        mocoEntries: [moco],
        jiraEntries: []
      });
    }
  }

  for (const [dateKey, jiraGroup] of jiraByDateAndKey) {
    const unmatched = jiraGroup.filter((j) => !matchedJiraIds.has(j.id));
    if (unmatched.length > 0 && !matchMap.has(dateKey)) {
      const meta = unmatched[0].metadata as JiraMetadata;
      matchMap.set(dateKey, {
        issueKey: meta.issueKey,
        issueSummary: meta.issueSummary,
        date: unmatched[0].date,
        confidence: null,
        mocoEntries: [],
        jiraEntries: unmatched
      });
    }
  }

  const matches: ReconciliationMatch[] = Array.from(matchMap.entries()).map(
    ([mapKey, data]) => {
      const mocoHours = data.mocoEntries.reduce((s, e) => s + e.hours, 0);
      const jiraHours = data.jiraEntries.reduce((s, e) => s + e.hours, 0);

      return {
        id: mapKey,
        issueKey: data.issueKey,
        issueSummary: data.issueSummary,
        date: data.date,
        status: determineStatus(data.mocoEntries, data.jiraEntries),
        confidence: data.confidence,
        mocoEntries: data.mocoEntries,
        jiraEntries: data.jiraEntries,
        mocoHours: round(mocoHours),
        jiraHours: round(jiraHours),
        hoursDiff: round(mocoHours - jiraHours)
      };
    }
  );

  matches.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const order: Record<ReconciliationStatus, number> = { 'jira-only': 0, 'moco-only': 1, 'matched': 2 };
    return order[a.status] - order[b.status];
  });

  return { matches, summary: computeSummary(matches) };
}

function determineStatus(
  mocoEntries: UnifiedTimeEntry[],
  jiraEntries: UnifiedTimeEntry[]
): ReconciliationStatus {
  if (mocoEntries.length > 0 && jiraEntries.length > 0) return 'matched';
  if (jiraEntries.length > 0) return 'jira-only';
  return 'moco-only';
}

function higherConfidence(
  a: MatchConfidence | null,
  b: MatchConfidence
): MatchConfidence {
  if (a === 'high' || b === 'high') return 'high';
  return 'medium';
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeSummary(matches: ReconciliationMatch[]): ReconciliationSummary {
  let totalMatched = 0;
  let totalJiraOnly = 0;
  let totalMocoOnly = 0;
  let totalMocoHours = 0;
  let totalJiraHours = 0;

  for (const m of matches) {
    if (m.status === 'matched') totalMatched++;
    else if (m.status === 'jira-only') totalJiraOnly++;
    else totalMocoOnly++;
    totalMocoHours += m.mocoHours;
    totalJiraHours += m.jiraHours;
  }

  const totalWithIssue = totalMatched + totalJiraOnly;
  const matchRate = totalWithIssue > 0
    ? Math.round((totalMatched / totalWithIssue) * 100)
    : 0;

  return {
    totalMatches: matches.length,
    totalMatched,
    totalJiraOnly,
    totalMocoOnly,
    totalMocoHours: round(totalMocoHours),
    totalJiraHours: round(totalJiraHours),
    totalHoursDiff: round(totalMocoHours - totalJiraHours),
    matchRate
  };
}
