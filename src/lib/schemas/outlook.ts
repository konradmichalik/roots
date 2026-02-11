import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nested objects
// ---------------------------------------------------------------------------

const dateTimeZoneSchema = z.object({
  dateTime: z.string(),
  timeZone: z.string()
});

const emailAddressSchema = z.object({
  name: z.string(),
  address: z.string()
});

const msGraphAttendeeSchema = z.object({
  emailAddress: emailAddressSchema,
  type: z.enum(['required', 'optional', 'resource']),
  status: z.object({
    response: z.string(),
    time: z.string()
  })
});

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export const msGraphEventSchema = z.object({
  id: z.string(),
  subject: z.string(),
  start: dateTimeZoneSchema,
  end: dateTimeZoneSchema,
  isAllDay: z.boolean(),
  showAs: z.enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown']),
  responseStatus: z.object({
    response: z.string(),
    time: z.string()
  }),
  organizer: z.object({
    emailAddress: emailAddressSchema
  }),
  attendees: z.array(msGraphAttendeeSchema),
  isOnlineMeeting: z.boolean(),
  webLink: z.string()
});

export const msGraphCalendarResponseSchema = z.object({
  value: z.array(msGraphEventSchema),
  '@odata.nextLink': z.string().optional()
});

export const msGraphUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  mail: z.string(),
  userPrincipalName: z.string()
});

