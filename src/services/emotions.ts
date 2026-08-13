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

export const EMOTION_AXES = ['emotion', 'buying_intent', 'deal_signals'] as const;

export type EmotionAxis = (typeof EMOTION_AXES)[number];
export type ScoredLabel = { label: string; score: number };
export type EmotionItem = Record<EmotionAxis, ScoredLabel[]> & {
  id: string;
  unavailable: Record<EmotionAxis, boolean>;
};

const AXIS_LABELS: Record<EmotionAxis, readonly string[]> = {
  emotion: SALES_EMOTIONS,
  buying_intent: BUYING_INTENT,
  deal_signals: DEAL_SIGNALS,
};

const requestSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), text: z.string() })).min(1),
  threshold: z.number().min(0).max(1).optional().default(0.2),
  top_k: z.number().int().positive().max(20).optional().default(6),
});

export async function analyzeEmotions(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{ items: EmotionItem[]; model: string }> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid emotions request.');
  }
  assertBatch(parsed.data.items, config);
  // Results are attributed by id. Two items sharing one id cannot be told apart, and the
  // second would silently inherit the first's scores while reporting `unavailable: false`.
  const seenIds = new Set<string>();
  for (const item of parsed.data.items) {
    if (seenIds.has(item.id)) {
      throw new AppError('INVALID_REQUEST', 'Duplicate item id in emotions request.', {
        id: item.id,
      });
    }
    seenIds.add(item.id);
  }
  const scored = new Map<string, EmotionResponse['items'][number]>();
  let model = router.modelId('fast');
  let scoredChunks = 0;
  let failedChunks = 0;
  let firstFailure: unknown;
  const sourceItems = parsed.data.items;
  logger.info('emotion.start', { item_count: sourceItems.length, chunk_size: EMOTION_ITEM_CHUNK });
  for (let offset = 0; offset < sourceItems.length; offset += EMOTION_ITEM_CHUNK) {
    const chunk = sourceItems.slice(offset, offset + EMOTION_ITEM_CHUNK);
    let data: EmotionResponse;
    try {
      const result = await router.json('fast', emotionsPrompt(chunk), emotionResponseSchema, {
        maxTokens: 2048,
      });
      data = result.data;
      model = result.model;
    } catch (error) {
      // One dead chunk must not erase the axes we did score. Its items still ship,
      // flagged unavailable; the all-chunks-failed case rethrows below.
      failedChunks += 1;
      if (firstFailure === undefined) {
        firstFailure = error;
      }
      logger.warn('emotion.chunk_failed', {
        chunk_size: chunk.length,
        error_code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
      });
      continue;
    }
    scoredChunks += 1;
    // Attribute within this chunk only. A shared map lets a later chunk that re-keys its
    // rows to 0..3 overwrite an earlier chunk's items, which would report another item's
    // scores as if they were their own.
    const returned = new Map(data.items.map((row) => [row.id, row]));
    const anyIdMatched = chunk.some((item) => returned.has(item.id));
    chunk.forEach((item, index) => {
      const matched = returned.get(item.id);
      if (matched) {
        scored.set(item.id, matched);
        return;
      }
      // Models sometimes re-key every id in a chunk (0,1,2 instead of the segment ids).
      // Fall back to position only when nothing matched by id and the row count lines up
      // exactly — otherwise a partial response would hand one item's scores to another.
      if (!anyIdMatched && data.items.length === chunk.length) {
        const positional = data.items[index];
        if (positional) {
          scored.set(item.id, positional);
        }
      }
    });
  }
  if (scoredChunks === 0 && failedChunks > 0) {
    // Nothing was scored at all. A 200 carrying empty axes would read as "scored
    // neutral" downstream; the caller's named ML_* -> PARTIAL path is the honest one.
    throw firstFailure instanceof Error
      ? firstFailure
      : new AppError('UPSTREAM_AI_ERROR', 'Emotion inference failed for every item.');
  }
  const items = sourceItems.map((item) => {
    const row = scored.get(item.id);
    const axis = (name: EmotionAxis): ScoredLabel[] => {
      const scores = row?.[name];
      return scores === undefined
        ? []
        : filterScores(scores, AXIS_LABELS[name], parsed.data.threshold, parsed.data.top_k);
    };
    return {
      id: item.id,
      emotion: axis('emotion'),
      buying_intent: axis('buying_intent'),
      deal_signals: axis('deal_signals'),
      // `[]` means scored with nothing confident. `unavailable` means not scored at
      // all — an empty axis beside it is unknown, not neutral.
      unavailable: {
        emotion: row?.emotion === undefined,
        buying_intent: row?.buying_intent === undefined,
        deal_signals: row?.deal_signals === undefined,
      },
    };
  });
  return { items, model };
}

function filterScores(
  scores: ScoredLabel[],
  allowed: readonly string[],
  threshold: number,
  topK: number,
): ScoredLabel[] {
  // Dedupe within the axis, keeping the highest score. Never across axes: `neutral`
  // belongs to both emotion and buying_intent and means something different on each.
  const best = new Map<string, number>();
  for (const row of scores) {
    if (!allowed.includes(row.label) || row.score < threshold) {
      continue;
    }
    const seen = best.get(row.label);
    if (seen === undefined || row.score > seen) {
      best.set(row.label, row.score);
    }
  }
  return [...best]
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
