import { z } from 'zod';
import type { AppConfig } from '../core/config';
import { AppError } from '../core/errors';
import type { ChatMessage } from './client';
import { ModelClient } from './client';
import { parseWithSchema } from './json';
import { JSON_SYSTEM, repairPrompt } from './prompts';

export type RouteKind = 'fast' | 'quality' | 'embed' | 'rerank';

export class ModelRouter {
  constructor(
    private readonly client: ModelClient,
    private readonly config: AppConfig,
  ) {}

  modelId(kind: RouteKind): string {
    switch (kind) {
      case 'fast':
        return this.config.fastModelId;
      case 'quality':
        return this.config.qualityModelId;
      case 'embed':
        return this.config.embeddingModelId;
      case 'rerank':
        return this.config.rerankModelId;
    }
  }

  async json<T>(
    kind: 'fast' | 'quality',
    userPrompt: string,
    schema: z.ZodType<T>,
    options: { maxTokens?: number } = {},
  ): Promise<{ data: T; model: string; repaired: boolean }> {
    const model = this.modelId(kind);
    const messages: ChatMessage[] = [
      { role: 'system', content: JSON_SYSTEM },
      { role: 'user', content: userPrompt },
    ];
    let raw: unknown;
    try {
      raw = await this.client.generateJson(model, messages, {
        maxTokens: options.maxTokens,
        temperature: 0,
      });
      return { data: parseWithSchema(schema, raw), model, repaired: false };
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'SCHEMA_INVALID') {
        throw error;
      }
      const invalidText = typeof raw === 'string' ? raw : JSON.stringify(raw ?? error.message);
      const repaired = await this.client.generateJson(
        model,
        [
          ...messages,
          { role: 'assistant', content: invalidText.slice(0, 2000) },
          { role: 'user', content: repairPrompt(invalidText, 'strict JSON object matching the requested schema') },
        ],
        { maxTokens: options.maxTokens, temperature: 0 },
      );
      return { data: parseWithSchema(schema, repaired), model, repaired: true };
    }
  }

  async text(
    kind: 'fast' | 'quality',
    userPrompt: string,
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<{ text: string; model: string }> {
    const model = this.modelId(kind);
    const text = await this.client.generateText(
      model,
      [
        {
          role: 'system',
          content:
            'You are Deal Truth ML. Return only the requested text. Do not claim factual grounding. Do not invent evidence.',
        },
        { role: 'user', content: userPrompt },
      ],
      options,
    );
    return { text, model };
  }

  embed(texts: string[]): Promise<number[][]> {
    return this.client.embed(this.modelId('embed'), texts);
  }

  rerank(
    query: string,
    contexts: string[],
    topK?: number,
  ): Promise<{ index: number; score: number }[]> {
    return this.client.rerank(this.modelId('rerank'), query, contexts, topK);
  }
}
