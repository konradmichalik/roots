import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function personioAttr<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    label: z.string(),
    value: valueSchema
  });
}

const workScheduleDaySchema = z.object({
  name: z.string(),
  duration: z.string()
});

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export const personioAuthResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    token: z.string()
  })
});

const personioEmployeeSchema = z.object({
  type: z.literal('Employee'),
  attributes: z.object({
    id: personioAttr(z.number()),
    first_name: personioAttr(z.string()),
    last_name: personioAttr(z.string()),
    email: personioAttr(z.string()),
    work_schedule: personioAttr(
      z.object({
        id: z.number(),
        name: z.string(),
        monday: workScheduleDaySchema,
        tuesday: workScheduleDaySchema,
        wednesday: workScheduleDaySchema,
        thursday: workScheduleDaySchema,
        friday: workScheduleDaySchema,
        saturday: workScheduleDaySchema,
        sunday: workScheduleDaySchema
      })
    ).optional()
  })
});

export const personioEmployeesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(personioEmployeeSchema)
});

const personioTimeOffSchema = z.object({
  type: z.literal('TimeOffPeriod'),
  attributes: z.object({
    id: z.number(),
    status: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    days_count: z.number(),
    half_day_start: z.boolean(),
    half_day_end: z.boolean(),
    time_off_type: z.object({
      type: z.literal('TimeOffType'),
      attributes: z.object({
        id: z.number(),
        name: z.string(),
        category: z.string()
      })
    }),
    employee: z.object({
      type: z.literal('Employee'),
      attributes: z.object({
        id: personioAttr(z.number()),
        first_name: personioAttr(z.string()),
        last_name: personioAttr(z.string())
      })
    })
  })
});

export const personioTimeOffsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(personioTimeOffSchema)
});
