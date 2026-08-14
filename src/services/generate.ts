import { z } from 'zod';
import { generatePrompt, regeneratePrompt } from '../ai/prompts';
import type { ModelRouter } from '../ai/router';
import { GENERATE_TASKS, generationResultSchema, type GenerationResult } from '../ai/schemas';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import { logger } from '../core/logging';

export { GENERATE_TASKS };

/**
 * Named failure for a generation that never satisfied `generationResultSchema`.
 *
 * It travels as `details.reason` on a `SCHEMA_INVALID` AppError because `ErrorCode` lives in
 * `src/core/errors.ts`, which this change is not allowed to edit. The wire body therefore
 * names the failure (`{"error":{"code":"SCHEMA_INVALID","details":{"reason":
 * "LLM_SCHEMA_MISMATCH"}}}`) instead of returning the rejected text. Promote it to a
 * first-class `ErrorCode` when errors.ts is next open; nothing here changes when you do.
 */
export const LLM_SCHEMA_MISMATCH = 'LLM_SCHEMA_MISMATCH';

/** First attempt plus exactly one aimed retry. Never unbounded, never configurable. */
const MAX_GENERATION_ATTEMPTS = 2;

const requestSchema = z.object({
  task: z.enum(GENERATE_TASKS),
  input: z.string().min(1),
  max_new_tokens: z.number().int().positive().max(1024).optional().default(180),
  temperature: z.number().min(0).max(1).optional().default(0),
});

function mismatchReasons(error: z.ZodError): string[] {
  // Reason codes only. The rejected generation itself is never echoed into an error body or a
  // log line — returning it under a different key would defeat the guard.
  return [...new Set(error.issues.map((issue) => issue.message))].slice(0, 8);
}

export async function generateText(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<GenerationResult> {
  if (!config.enableGeneration) {
    throw new AppError('GENERATION_DISABLED', 'Generation is disabled.');
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('INVALID_REQUEST', 'Invalid generate request.');
  }
  if (parsed.data.input.length > config.maxTextChars * 4) {
    throw new AppError('TEXT_TOO_LONG', 'Generation input exceeds the allowed size.');
  }
  const { task, input, max_new_tokens, temperature } = parsed.data;
  const kind = task === 'qa_synthesis' ? 'quality' : 'fast';
  logger.info('generate.start', { task, input_chars: input.length, kind });

  let reasons: string[] = [];
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const prompt =
      attempt === 1 ? generatePrompt(task, input) : regeneratePrompt(task, input, reasons);
    const result = await router.text(kind, prompt, {
      maxTokens: max_new_tokens,
      temperature,
    });
    // Validated before it is returned, not after it is trusted: the candidate is assembled and
    // parsed here, so the only object that can leave this function is one the schema accepted.
    const candidate = generationResultSchema.safeParse({
      text: result.text,
      task,
      model: result.model,
      grounded: false,
      metadata: { max_new_tokens, temperature },
    });
    if (candidate.success) {
      if (attempt > 1) {
        logger.info('generate.repaired', { task, attempts: attempt });
      }
      return candidate.data;
    }
    reasons = mismatchReasons(candidate.error);
    logger.warn('generate.schema_mismatch', { task, attempt, reasons });
  }

  throw new AppError('SCHEMA_INVALID', 'Generated output failed generation schema validation.', {
    reason: LLM_SCHEMA_MISMATCH,
    task,
    attempts: MAX_GENERATION_ATTEMPTS,
    violations: reasons,
  });
}
