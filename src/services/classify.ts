import { z } from 'zod';
import { classifyPrompt } from '../ai/prompts';
import type { ModelRouter } from '../ai/router';
import { classifyResponseSchema } from '../ai/schemas';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { defaultCandidateLabels, salesLabelById } from '../taxonomies/sales-labels';
import { assertBatch } from '../api/validation';

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
  const { data, model } = await router.json('fast', classifyPrompt(items, labels), classifyResponseSchema, {
    maxTokens: 1600,
  });
  const byId = new Map(data.items.map((item) => [item.id, item]));
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
