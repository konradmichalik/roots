/**
 * Jira Issue Key Parser
 *
 * Extracts Jira issue keys from text in various formats:
 * - ABC-123
 * - #ABC-123
 * - [ABC-123]
 * - Embedded in text: "Working on ABC-123 today"
 */

/**
 * Regex pattern for Jira issue keys
 * Matches: ABC-123, #ABC-123, [ABC-123]
 * Project key: 1+ uppercase letters (may include digits after first letter)
 * Issue number: 1+ digits
 */
const ISSUE_KEY_PATTERN = /(?:#|\[)?([A-Z][A-Z0-9]*-\d+)(?:\])?/gi;

/**
 * Strict validation pattern for a standalone issue key
 */
const STRICT_ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]*-\d+$/;

/**
 * Extract all Jira issue keys from text
 */
export function extractIssueKeys(text: string): string[] {
  if (!text) return [];

  const matches = text.matchAll(ISSUE_KEY_PATTERN);
  const keys = new Set<string>();

  for (const match of matches) {
    keys.add(match[1].toUpperCase());
  }

  return Array.from(keys);
}

/**
 * Extract the first Jira issue key from text
 */
export function extractFirstIssueKey(text: string): string | null {
  const keys = extractIssueKeys(text);
  return keys[0] ?? null;
}

/**
 * Validate if a string is a valid Jira issue key format
 */
export function isValidIssueKey(key: string): boolean {
  if (!key) return false;
  return STRICT_ISSUE_KEY_PATTERN.test(key.toUpperCase());
}
