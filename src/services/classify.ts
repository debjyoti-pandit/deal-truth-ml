import { z } from 'zod';
import { classifyPrompt } from '../ai/prompts';
import type { ModelRouter } from '../ai/router';
import { classifyResponseSchema } from '../ai/schemas';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { logger } from '../core/logging';
import { defaultCandidateLabels, salesLabelById } from '../taxonomies/sales-labels';
import { assertBatch } from '../api/validation';

/** Keep Qwen JSON small enough to finish before max_tokens / Workers AI timeouts. */
export const CLASSIFY_ITEM_CHUNK = 3;
const CLASSIFY_MAX_TOKENS = 2048;

const requestSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), text: z.string() })).min(1),
  candidate_labels: z
    .array(
      z.object({
        id: z.string().min(1),
        hypothesis: z.string().min(1),
        threshold: z.number().min(0).max(1).optional(),
      }),
    )
    .optional(),
  multi_label: z.boolean().optional().default(true),
  threshold: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().max(50).optional(),
});

export async function classifyItems(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{
  items: {
    id: string;
    labels: { id: string; score: number; passed_threshold: boolean }[];
  }[];
  model: string;
}> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid classify request.', {
      issues: parsed.error.issues.slice(0, 8),
    });
  }
  const { items, candidate_labels, threshold, top_k } = parsed.data;
  assertBatch(items, config);
  const labels = candidate_labels?.length ? candidate_labels : defaultCandidateLabels();
  logger.info('classify.start', {
    item_count: items.length,
    label_count: labels.length,
    chunk_size: CLASSIFY_ITEM_CHUNK,
  });
  const byId = new Map<string, { id: string; labels: { id: string; score: number }[] }>();
  let model = router.modelId('fast');
  for (let offset = 0; offset < items.length; offset += CLASSIFY_ITEM_CHUNK) {
    const chunk = items.slice(offset, offset + CLASSIFY_ITEM_CHUNK);
    logger.debug('classify.chunk', { offset, size: chunk.length });
    const { data, model: used } = await router.json(
      'fast',
      classifyPrompt(chunk, labels),
      classifyResponseSchema,
      { maxTokens: CLASSIFY_MAX_TOKENS },
    );
    model = used;
    data.items.forEach((row, index) => {
      const normalized = { id: row.id, labels: row.labels ?? [] };
      byId.set(normalized.id, normalized);
      // Models sometimes re-key ids; fall back to positional matching within the chunk.
      const positional = chunk[index];
      if (positional && !data.items.some((r) => r.id === positional.id)) {
        byId.set(positional.id, normalized);
      }
    });
  }
  return {
    model,
    items: items.map((item) => {
      const scored = byId.get(item.id)?.labels ?? [];
      const enriched = scored.map((label) => {
        const catalog = salesLabelById(label.id);
        const cut = threshold ?? labelThreshold(labels, label.id, catalog?.threshold ?? 0.5);
        return {
          id: label.id,
          score: label.score,
          passed_threshold: label.score >= cut,
        };
      });
      const filtered = enriched.filter((label) => label.passed_threshold);
      const ranked = filtered.sort((a, b) => b.score - a.score);
      return {
        id: item.id,
        labels: top_k ? ranked.slice(0, top_k) : ranked,
      };
    }),
  };
}

function labelThreshold(
  labels: { id: string; threshold?: number }[],
  id: string,
  fallback: number,
): number {
  return labels.find((label) => label.id === id)?.threshold ?? fallback;
}
