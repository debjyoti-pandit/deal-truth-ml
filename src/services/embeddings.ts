import { z } from 'zod';
import { l2Normalize } from '../ai/client';
import type { ModelRouter } from '../ai/router';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { logger } from '../core/logging';
import { assertBatch } from '../api/validation';

const requestSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), text: z.string() })).min(1),
  normalize: z.boolean().optional().default(true),
});

export async function embedItems(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{
  items: { id: string; vector: number[]; dimension: number; normalized: boolean }[];
  model: string;
}> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid embeddings request.');
  }
  assertBatch(parsed.data.items, config);
  logger.info('embed.start', {
    item_count: parsed.data.items.length,
    normalize: parsed.data.normalize,
  });
  const vectors = await router.embed(parsed.data.items.map((item) => item.text));
  const items = parsed.data.items.map((item, index) => {
    const raw = vectors[index] ?? [];
    const vector = parsed.data.normalize ? l2Normalize(raw) : raw;
    return {
      id: item.id,
      vector,
      dimension: vector.length,
      normalized: parsed.data.normalize,
    };
  });
  return { items, model: router.modelId('embed') };
}
