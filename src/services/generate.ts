import { z } from 'zod';
import { generatePrompt } from '../ai/prompts';
import type { ModelRouter } from '../ai/router';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';

export const GENERATE_TASKS = [
  'summary_fallback',
  'email_polish',
  'battlecard_polish',
  'qa_synthesis',
] as const;

const requestSchema = z.object({
  task: z.enum(GENERATE_TASKS),
  input: z.string().min(1),
  max_new_tokens: z.number().int().positive().max(1024).optional().default(180),
  temperature: z.number().min(0).max(1).optional().default(0),
});

export async function generateText(
  router: ModelRouter,
  config: AppConfig,
  body: unknown,
): Promise<{
  text: string;
  task: string;
  model: string;
  grounded: false;
  metadata: { max_new_tokens: number; temperature: number };
}> {
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
  const kind = parsed.data.task === 'qa_synthesis' ? 'quality' : 'fast';
  const result = await router.text(kind, generatePrompt(parsed.data.task, parsed.data.input), {
    maxTokens: parsed.data.max_new_tokens,
    temperature: parsed.data.temperature,
  });
  return {
    text: result.text,
    task: parsed.data.task,
    model: result.model,
    grounded: false,
    metadata: {
      max_new_tokens: parsed.data.max_new_tokens,
      temperature: parsed.data.temperature,
    },
  };
}
