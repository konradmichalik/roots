import { getStorageItemAsync, saveStorage, STORAGE_KEYS } from '../utils/storage';
import { logger } from '../utils/logger';
import { isDemoMode } from '../utils/demo-data';
import { mocoProjectsState, getTasksForProject } from './mocoProjects.svelte';
import type {
  Rule,
  JiraSourceMatcher,
  OutlookSourceMatcher,
  SourceMatcher,
  UnifiedTimeEntry
} from '../types';

export const rulesState = $state<{ rules: Rule[] }>({
  rules: []
});

export async function initializeRules(): Promise<void> {
  const stored = await getStorageItemAsync<Rule[]>(STORAGE_KEYS.RULES);
  if (stored) {
    rulesState.rules = stored;
  }
  logger.store('rules', 'Initialized', { count: rulesState.rules.length });
}

function persist(): void {
  if (isDemoMode()) return;
  saveStorage(STORAGE_KEYS.RULES, rulesState.rules);
}

export function addRule(
  data: Omit<Rule, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'targetStatus'>
): Rule {
  const maxOrder = rulesState.rules.reduce((max, r) => Math.max(max, r.sortOrder), -1);

  const rule: Rule = {
    ...data,
    id: crypto.randomUUID(),
    sortOrder: maxOrder + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetStatus: 'unknown'
  };

  rulesState.rules = [...rulesState.rules, rule];
  persist();
  logger.store('rules', 'Added', { id: rule.id, name: rule.name });
  return rule;
}

export function updateRule(id: string, updates: Partial<Omit<Rule, 'id' | 'createdAt'>>): void {
  rulesState.rules = rulesState.rules.map((r) => {
    if (r.id !== id) return r;
    const targetChanged =
      updates.target &&
      (updates.target.mocoProjectId !== r.target.mocoProjectId ||
        updates.target.mocoTaskId !== r.target.mocoTaskId);
    return {
      ...r,
      ...updates,
      updatedAt: new Date().toISOString(),
      targetStatus: targetChanged ? ('unknown' as const) : (updates.targetStatus ?? r.targetStatus)
    };
  });
  persist();
  logger.store('rules', 'Updated', { id });
}

export function removeRule(id: string): void {
  rulesState.rules = rulesState.rules.filter((r) => r.id !== id);
  persist();
  logger.store('rules', 'Removed', { id });
}

export function getSortedRules(): Rule[] {
  return [...rulesState.rules].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnabledRules(): Rule[] {
  return getSortedRules().filter((r) => r.enabled);
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

// TODO: JQL execution + cache will be added when Jira API integration for JQL queries is implemented.
// For now, JQL rules are stored but not matched (they need server-side execution first).

function matchesJiraSource(entry: UnifiedTimeEntry, source: JiraSourceMatcher): boolean {
  if (entry.source !== 'jira' || entry.metadata.source !== 'jira') return false;

  const meta = entry.metadata;

  // JQL mode: not yet supported (requires server-side execution)
  if (source.jql) return false;

  // Project key must always match
  const projectKey = meta.projectKey ?? meta.issueKey.split('-')[0];
  if (projectKey.toLowerCase() !== source.projectKey.toLowerCase()) return false;

  // Issue pattern (exact or wildcard)
  if (source.issuePattern) {
    const pattern = source.issuePattern.toLowerCase();
    const issueKey = meta.issueKey.toLowerCase();
    if (pattern.endsWith('*')) {
      if (!issueKey.startsWith(pattern.slice(0, -1))) return false;
    } else {
      if (issueKey !== pattern) return false;
    }
  }

  // Epic key
  if (source.epicKey) {
    if (!meta.epicKey || meta.epicKey.toLowerCase() !== source.epicKey.toLowerCase()) return false;
  }

  // Component
  if (source.component) {
    if (
      !meta.components ||
      !meta.components.some((c) => c.toLowerCase() === source.component!.toLowerCase())
    )
      return false;
  }

  // Labels (OR logic — at least one must match)
  if (source.labels && source.labels.length > 0) {
    if (
      !meta.labels ||
      !source.labels.some((l) => meta.labels!.some((ml) => ml.toLowerCase() === l.toLowerCase()))
    )
      return false;
  }

  // Summary contains
  if (source.summaryContains) {
    if (!meta.issueSummary.toLowerCase().includes(source.summaryContains.toLowerCase()))
      return false;
  }

  return true;
}

function matchesOutlookSource(entry: UnifiedTimeEntry, source: OutlookSourceMatcher): boolean {
  if (entry.source !== 'outlook' || entry.metadata.source !== 'outlook') return false;

  const title = entry.title.toLowerCase();
  const pattern = source.eventPattern.toLowerCase();

  switch (source.matchType) {
    case 'exact':
      return title === pattern;
    case 'startsWith':
      return title.startsWith(pattern);
    case 'contains':
      return title.includes(pattern);
    default:
      return false;
  }
}

function getMatchSpecificity(rule: Rule): number {
  if (rule.source.type === 'jira') {
    const src = rule.source;

    // JQL — highest priority (11)
    if (src.jql) return 11;

    // Exact issue key (10)
    if (src.issuePattern && !src.issuePattern.endsWith('*')) return 10;

    // Wildcard pattern (8)
    if (src.issuePattern?.endsWith('*')) return 8;

    // Count active filters for combinatory scoring
    let filterCount = 0;
    if (src.epicKey) filterCount++;
    if (src.component) filterCount++;
    if (src.labels && src.labels.length > 0) filterCount++;

    // Triple filter (7), double (5-6), single (4)
    if (filterCount >= 3) return 7;
    if (filterCount === 2) {
      // Epic + Component slightly higher than other combos
      return src.epicKey && src.component ? 6 : 5;
    }
    if (filterCount === 1) return 4;

    // Summary contains (3)
    if (src.summaryContains) return 3;

    // Project-level catch-all (1)
    return 1;
  }

  // Outlook: exact > startsWith > contains
  switch (rule.source.matchType) {
    case 'exact':
      return 3;
    case 'startsWith':
      return 2;
    case 'contains':
      return 1;
    default:
      return 0;
  }
}

/**
 * Test whether a single entry matches a given source matcher.
 * Used by the rule editor for live-match preview.
 */
export function entryMatchesSource(entry: UnifiedTimeEntry, source: SourceMatcher): boolean {
  if (source.type === 'jira') return matchesJiraSource(entry, source);
  if (source.type === 'outlook') return matchesOutlookSource(entry, source);
  return false;
}

export function findMatchingRules(entry: UnifiedTimeEntry): Rule[] {
  return getEnabledRules()
    .filter((rule) => {
      if (rule.source.type === 'jira') return matchesJiraSource(entry, rule.source);
      if (rule.source.type === 'outlook') return matchesOutlookSource(entry, rule.source);
      return false;
    })
    .sort((a, b) => {
      // Most specific rule wins
      const specDiff = getMatchSpecificity(b) - getMatchSpecificity(a);
      if (specDiff !== 0) return specDiff;
      // Same specificity: lower sortOrder wins (higher priority)
      return a.sortOrder - b.sortOrder;
    });
}

export function getUnmatchedEntries(entries: UnifiedTimeEntry[]): UnifiedTimeEntry[] {
  return entries.filter((entry) => findMatchingRules(entry).length === 0);
}

// ---------------------------------------------------------------------------
// Target Validation (Stale Detection)
// ---------------------------------------------------------------------------

/**
 * Validates all rule targets against current mocoProjectsState.
 * Returns rules that became newly stale (for toast notifications).
 */
export function validateRuleTargets(): Rule[] {
  if (mocoProjectsState.projects.length === 0) {
    // Projects not loaded — mark all as unknown, don't notify
    rulesState.rules = rulesState.rules.map((r) =>
      r.targetStatus !== 'unknown' ? { ...r, targetStatus: 'unknown' as const } : r
    );
    persist();
    return [];
  }

  const newlyStale: Rule[] = [];

  rulesState.rules = rulesState.rules.map((rule) => {
    // Skip validation if the project isn't in the loaded list (avoid false stale)
    const project = mocoProjectsState.projects.find((p) => p.id === rule.target.mocoProjectId);
    if (!project) {
      if (rule.targetStatus !== 'unknown') return { ...rule, targetStatus: 'unknown' as const };
      return rule;
    }

    const tasks = getTasksForProject(rule.target.mocoProjectId);
    const taskExists = tasks.some((t) => t.id === rule.target.mocoTaskId);

    const newStatus: Rule['targetStatus'] = taskExists ? 'valid' : 'stale';
    const wasStale = rule.targetStatus === 'stale';

    if (newStatus === 'stale' && !wasStale) {
      newlyStale.push({ ...rule, targetStatus: 'stale' });
    }

    // Also refresh denormalized project/task names if valid
    if (taskExists && newStatus === 'valid') {
      const project = mocoProjectsState.projects.find((p) => p.id === rule.target.mocoProjectId);
      const task = tasks.find((t) => t.id === rule.target.mocoTaskId);
      if (project && task) {
        return {
          ...rule,
          targetStatus: newStatus,
          target: {
            ...rule.target,
            mocoProjectName: project.name,
            mocoTaskName: task.name,
            customerName: project.customer.name
          }
        };
      }
    }

    if (rule.targetStatus === newStatus) return rule;
    return { ...rule, targetStatus: newStatus };
  });

  persist();

  if (newlyStale.length > 0) {
    logger.store('rules', 'Stale targets detected', {
      count: newlyStale.length,
      rules: newlyStale.map((r) => r.name)
    });
  }

  return newlyStale;
}

export function getStaleRules(): Rule[] {
  return rulesState.rules.filter((r) => r.targetStatus === 'stale');
}

export function getRulesWithStatus(status: Rule['targetStatus']): Rule[] {
  return rulesState.rules.filter((r) => r.targetStatus === status);
}

export function findOverlappingRules(source: Rule['source'], excludeId?: string): Rule[] {
  return rulesState.rules.filter((rule) => {
    if (excludeId && rule.id === excludeId) return false;
    if (rule.source.type !== source.type) return false;

    if (source.type === 'jira' && rule.source.type === 'jira') {
      // JQL rules don't overlap with non-JQL rules (can't compare statically)
      if (source.jql || rule.source.jql) return false;

      if (source.projectKey.toLowerCase() !== rule.source.projectKey.toLowerCase()) return false;

      // Different epic → no overlap
      if (
        source.epicKey &&
        rule.source.epicKey &&
        source.epicKey.toLowerCase() !== rule.source.epicKey.toLowerCase()
      )
        return false;

      // Different component → no overlap
      if (
        source.component &&
        rule.source.component &&
        source.component.toLowerCase() !== rule.source.component.toLowerCase()
      )
        return false;

      // Different labels (no intersection) → no overlap
      if (source.labels?.length && rule.source.labels?.length) {
        const srcLabels = new Set(source.labels.map((l) => l.toLowerCase()));
        const hasIntersection = rule.source.labels.some((l) => srcLabels.has(l.toLowerCase()));
        if (!hasIntersection) return false;
      }

      // Same project — overlapping if both have no pattern or patterns overlap
      if (!source.issuePattern && !rule.source.issuePattern) return true;
      if (source.issuePattern && rule.source.issuePattern) {
        return source.issuePattern.toLowerCase() === rule.source.issuePattern.toLowerCase();
      }
      // One has pattern, other doesn't — the project-level one covers the specific one
      return true;
    }

    if (source.type === 'outlook' && rule.source.type === 'outlook') {
      return (
        source.eventPattern.toLowerCase() === rule.source.eventPattern.toLowerCase() &&
        source.matchType === rule.source.matchType
      );
    }

    return false;
  });
}
