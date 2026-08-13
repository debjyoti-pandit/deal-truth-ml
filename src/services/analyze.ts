import { z } from 'zod';
import { candidatesPrompt, judgePrompt } from '../ai/prompts';
import type { ModelRouter } from '../ai/router';
import { analyzeCallSchema, candidatesSchema } from '../ai/schemas';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { logger } from '../core/logging';
import { assertBatch } from '../api/validation';

const segmentSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  speaker_role: z.string().min(1),
  text: z.string(),
});

const requestSchema = z.object({
  segments: z.array(segmentSchema).min(1),
});

export async function analyzeCall(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{
  customer_truth: unknown[];
  objections: unknown[];
  commitments: unknown[];
  risks: unknown[];
  competitors: unknown[];
  buying_signals: unknown[];
  reality_checks: unknown[];
  models: { candidates: string; judge: string };
}> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid analyze-call request.');
  }
  assertBatch(parsed.data.segments, config);

  logger.info('analyze.start', { segment_count: parsed.data.segments.length });

  const candidates = await router.json(
    'fast',
    candidatesPrompt(parsed.data.segments),
    candidatesSchema,
    { maxTokens: 1800 },
  );

  const neededIds = new Set<string>();
  for (const group of Object.values(candidates.data)) {
    for (const item of group) {
      for (const id of item.segment_ids) {
        neededIds.add(String(id));
      }
    }
  }
  const relevant = parsed.data.segments.filter((segment) => neededIds.has(segment.id));
  const context = relevant.length > 0 ? relevant : parsed.data.segments.slice(0, 20);

  logger.info('analyze.candidates', {
    model: candidates.model,
    context_segments: context.length,
  });

  const judged = await router.json(
    'quality',
    judgePrompt(candidates.data, context),
    analyzeCallSchema,
    { maxTokens: 2200 },
  );

  return {
    customer_truth: judged.data.customer_truth ?? [],
    objections: judged.data.objections ?? [],
    commitments: judged.data.commitments ?? [],
    risks: judged.data.risks ?? [],
    competitors: judged.data.competitors ?? [],
    buying_signals: judged.data.buying_signals ?? [],
    reality_checks: judged.data.reality_checks ?? [],
    models: { candidates: candidates.model, judge: judged.model },
  };
}
