import { z } from 'zod';
import type { ModelRouter } from '../ai/router';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { logger } from '../core/logging';
import { assertBatch } from '../api/validation';

export interface RerankItem {
  id: string;
  score: number;
  index: number;
}

const requestSchema = z.object({
  query: z.string().min(1),
  // No `.min(1)`: Ask sends whatever retrieval found, and "nothing matched" is an ordinary
  // empty result, not a malformed request. A 400 there would read to the caller as a bug in
  // its own query construction and cost a retry loop over a question that simply has no
  // passages. The empty case short-circuits below without spending an inference call.
  passages: z.array(z.object({ id: z.string().min(1), text: z.string() })),
  top_k: z.number().int().positive().max(50).optional(),
});

export async function rerankPassages(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{ items: RerankItem[]; model: string }> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid rerank request.');
  }
  if (parsed.data.query.length > config.maxTextChars) {
    throw new AppError('TEXT_TOO_LONG', 'Query exceeds MAX_TEXT_CHARS.');
  }
  if (parsed.data.passages.length === 0) {
    logger.info('rerank.empty', { passage_count: 0, query_chars: parsed.data.query.length });
    return { items: [], model: router.modelId('rerank') };
  }
  assertBatch(parsed.data.passages, config);
  logger.info('rerank.start', {
    passage_count: parsed.data.passages.length,
    query_chars: parsed.data.query.length,
  });
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
      // A non-finite score cannot be ordered: NaN makes every comparison false and would leave
      // the array in whatever order the sort happened to walk, breaking the descending
      // guarantee for every other passage too. Treat it as "no relevance" so the passage still
      // comes back, just last.
      const score = Number.isFinite(row.score) ? row.score : 0;
      return { id: passage.id, score, index: row.index };
    })
    .filter((row): row is RerankItem => row !== null)
    // Descending by score, ties broken by input order. The tiebreak is what makes the ranking
    // stable: without it, equal scores come back in whatever order the model listed them, so
    // the same request could render its evidence in a different order twice.
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const sliced = parsed.data.top_k ? items.slice(0, parsed.data.top_k) : items;
  return { items: sliced, model: router.modelId('rerank') };
}
