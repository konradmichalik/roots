import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

export const jiraAdfDocumentSchema = z.object({
  type: z.literal('doc'),
  version: z.number(),
  content: z.array(z.any())
});

export const jiraWorklogAuthorSchema = z.object({
  accountId: z.string().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  displayName: z.string()
});

export const jiraWorklogSchema = z.object({
  id: z.string(),
  author: jiraWorklogAuthorSchema,
  started: z.string(),
  timeSpentSeconds: z.number(),
  comment: z.union([z.string(), jiraAdfDocumentSchema]).optional()
});

export const jiraWorklogResponseSchema = z.object({
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  worklogs: z.array(jiraWorklogSchema)
});

export const jiraIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    issuetype: z.object({
      name: z.string(),
      iconUrl: z.string().optional()
    }),
    project: z.object({
      key: z.string(),
      name: z.string()
    }),
    worklog: jiraWorklogResponseSchema.optional()
  })
});

export const jiraSearchResponseSchema = z.object({
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  issues: z.array(jiraIssueSchema)
});

export const jiraUserSchema = z.object({
  accountId: z.string().optional(),
  key: z.string().optional(),
  name: z.string().optional(),
  displayName: z.string(),
  emailAddress: z.string().optional()
});
