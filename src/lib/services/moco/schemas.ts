import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

export const mocoProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  billable: z.boolean()
});

export const mocoTaskSchema = z.object({
  id: z.number(),
  name: z.string(),
  billable: z.boolean(),
  active: z.boolean().optional(),
  budget: z.number().nullable().optional(),
  hourly_rate: z.number().nullable().optional()
});

export const mocoCustomerSchema = z.object({
  id: z.number(),
  name: z.string()
});

export const mocoUserSchema = z.object({
  id: z.number(),
  firstname: z.string(),
  lastname: z.string()
});

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export const mocoActivitySchema = z.object({
  id: z.number(),
  date: z.string(),
  hours: z.number(),
  seconds: z.number(),
  description: z.string(),
  billed: z.boolean(),
  billable: z.boolean(),
  tag: z.string(),
  remote_service: z.string().nullable(),
  remote_id: z.string().nullable(),
  remote_url: z.string().nullable(),
  project: mocoProjectSchema,
  task: mocoTaskSchema,
  customer: mocoCustomerSchema,
  user: mocoUserSchema,
  created_at: z.string(),
  updated_at: z.string()
});

export const mocoActivitiesSchema = z.array(mocoActivitySchema);

export const mocoPresenceSchema = z.object({
  id: z.number(),
  date: z.string(),
  from: z.string(),
  to: z.string().nullable(),
  is_home_office: z.boolean(),
  break: z.number().optional(),
  user: mocoUserSchema,
  created_at: z.string(),
  updated_at: z.string()
});

export const mocoPresencesSchema = z.array(mocoPresenceSchema);

export const mocoProjectContractSchema = z.object({
  user_id: z.number(),
  active: z.boolean()
});

export const mocoProjectAssignedSchema = z.object({
  id: z.number(),
  identifier: z.string(),
  name: z.string(),
  billable: z.boolean(),
  active: z.boolean().optional(),
  customer: mocoCustomerSchema,
  tasks: z.array(mocoTaskSchema),
  contract: mocoProjectContractSchema.optional()
});

export const mocoProjectsAssignedSchema = z.array(mocoProjectAssignedSchema);

export const mocoTaskCostSchema = z.object({
  id: z.number(),
  name: z.string(),
  hours_total: z.number(),
  total_costs: z.number()
});

export const mocoProjectReportSchema = z.object({
  budget_total: z.number(),
  budget_remaining: z.number(),
  hours_total: z.number(),
  hours_remaining: z.number(),
  costs_by_task: z.array(mocoTaskCostSchema)
});
