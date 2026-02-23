import type { ZodType, ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validate API response data against a Zod schema.
 * Logs warnings on validation failure but returns the data as-is
 * to avoid breaking the app on unexpected API changes.
 */
export function validateResponse<T>(schema: ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn(`API validation failed (${context}):`, formatZodError(result.error));
    return data as T;
  }
  return result.data;
}

function formatZodError(error: ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}
