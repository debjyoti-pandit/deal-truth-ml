import { z } from 'zod';
import type { ModelRouter } from '../ai/router';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { assertBatch } from '../api/validation';

const requestSchema = z.object({
  query: z.string().min(1),
  passages: z.array(z.object({ id: z.string().min(1), text: z.string() })).min(1),
  top_k: z.number().int().positive().max(50).optional(),
});

export async function rerankPassages(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{
  items: { id: string; score: number; index: number }[];
  model: string;
}> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid rerank request.');
  }
  assertBatch(parsed.data.passages, config);
  if (parsed.data.query.length > config.maxTextChars) {
    throw new AppError('TEXT_TOO_LONG', 'Query exceeds MAX_TEXT_CHARS.');
  }
  const ranked = await router.rerank(
    parsed.data.query,
    parsed.data.passages.map((passage) => passage.text),
    parsed.data.top_k,
  );
  const items = ranked
    .map((row) => {
      const passage = parsed.data.passages[row.index];
      if (!passage) {
        return null;
      }
      return { id: passage.id, score: row.score, index: row.index };
    })
    .filter((row): row is { id: string; score: number; index: number } => row !== null)
    .sort((a, b) => b.score - a.score);
  const sliced = parsed.data.top_k ? items.slice(0, parsed.data.top_k) : items;
  return { items: sliced, model: router.modelId('rerank') };
}
