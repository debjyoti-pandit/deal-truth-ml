import { z } from 'zod';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';

export const textItemSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});

export function assertBatch(items: { text: string }[], config: AppConfig): void {
  if (items.length === 0) {
    throw new AppError('INVALID_REQUEST', 'At least one item is required.');
  }
  if (items.length > config.maxBatchSize) {
    throw new AppError('BATCH_TOO_LARGE', 'Batch exceeds MAX_BATCH_SIZE.', {
      max_batch_size: config.maxBatchSize,
      item_count: items.length,
    });
  }
  for (const item of items) {
    if (item.text.length > config.maxTextChars) {
      throw new AppError('TEXT_TOO_LONG', 'Text exceeds MAX_TEXT_CHARS.', {
        max_text_chars: config.maxTextChars,
        original_chars: item.text.length,
      });
    }
  }
}

export function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('INVALID_REQUEST', 'JSON object body is required.');
  }
  return body as Record<string, unknown>;
}
