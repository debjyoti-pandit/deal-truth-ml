import { z } from 'zod';
import { AppError } from '../core/errors';

export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export function parseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(extractJsonText(raw));
  } catch {
    throw new AppError('SCHEMA_INVALID', 'Model output was not valid JSON.');
  }
}

export function parseWithSchema<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError('SCHEMA_INVALID', 'Model output failed schema validation.', {
      issues: parsed.error.issues.slice(0, 8).map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}
