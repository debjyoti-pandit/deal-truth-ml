import { z } from 'zod';
import { emotionsPrompt } from '../ai/prompts';
import type { ModelRouter } from '../ai/router';
import { emotionResponseSchema, type EmotionResponse } from '../ai/schemas';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { logger } from '../core/logging';
import { BUYING_INTENT, DEAL_SIGNALS, SALES_EMOTIONS } from '../taxonomies/emotions';
import { assertBatch } from '../api/validation';

const EMOTION_ITEM_CHUNK = 4;

const requestSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), text: z.string() })).min(1),
  threshold: z.number().min(0).max(1).optional().default(0.2),
  top_k: z.number().int().positive().max(20).optional().default(6),
});

export async function analyzeEmotions(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{ items: unknown[]; model: string }> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid emotions request.');
  }
  assertBatch(parsed.data.items, config);
  const byId = new Map<string, EmotionResponse['items'][number]>();
  let model = router.modelId('fast');
  const sourceItems = parsed.data.items;
  logger.info('emotion.start', { item_count: sourceItems.length, chunk_size: EMOTION_ITEM_CHUNK });
  for (let offset = 0; offset < sourceItems.length; offset += EMOTION_ITEM_CHUNK) {
    const chunk = sourceItems.slice(offset, offset + EMOTION_ITEM_CHUNK);
    const { data, model: used } = await router.json(
      'fast',
      emotionsPrompt(chunk),
      emotionResponseSchema,
      {
        maxTokens: 2048,
      },
    );
    model = used;
    data.items.forEach((row, index) => {
      const normalized = {
        id: row.id,
        emotion: row.emotion ?? [],
        buying_intent: row.buying_intent ?? [],
        deal_signals: row.deal_signals ?? [],
      };
      byId.set(normalized.id, normalized);
      // Models sometimes re-key ids; fall back to positional matching within the chunk.
      const positional = chunk[index];
      if (positional && !data.items.some((r) => r.id === positional.id)) {
        byId.set(positional.id, normalized);
      }
    });
  }
  const items = sourceItems.map((item) => {
    const result = byId.get(item.id);
    return {
      id: item.id,
      emotion: filterScores(
        result?.emotion ?? [],
        SALES_EMOTIONS,
        parsed.data.threshold,
        parsed.data.top_k,
      ),
      buying_intent: filterScores(
        result?.buying_intent ?? [],
        BUYING_INTENT,
        parsed.data.threshold,
        parsed.data.top_k,
      ),
      deal_signals: filterScores(
        result?.deal_signals ?? [],
        DEAL_SIGNALS,
        parsed.data.threshold,
        parsed.data.top_k,
      ),
    };
  });
  return { items, model };
}

function filterScores(
  scores: { label: string; score: number }[],
  allowed: readonly string[],
  threshold: number,
  topK: number,
): { label: string; score: number }[] {
  return scores
    .filter((row) => allowed.includes(row.label) && row.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
