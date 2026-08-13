import { AppError } from '../core/errors';
import { parseJsonObject } from './json';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function collectText(value: unknown, acc: string[]): void {
  if (typeof value === 'string') {
    acc.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectText(item, acc);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (typeof value.text === 'string') {
    acc.push(value.text);
  }
  if (typeof value.output_text === 'string') {
    acc.push(value.output_text);
  }
  if (typeof value.response === 'string') {
    acc.push(value.response);
  }
  if (value.content !== undefined) {
    collectText(value.content, acc);
  }
  if (value.message !== undefined) {
    collectText(value.message, acc);
  }
  if (value.output !== undefined) {
    collectText(value.output, acc);
  }
  if (value.choices !== undefined) {
    collectText(value.choices, acc);
  }
  if (value.result !== undefined) {
    collectText(value.result, acc);
  }
}

export function extractGeneratedText(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload;
  }
  const parts: string[] = [];
  collectText(payload, parts);
  const joined = parts.join('\n').trim();
  if (joined) {
    return joined;
  }
  throw new AppError('UPSTREAM_AI_ERROR', 'Upstream model returned no text.');
}

function mapUpstreamError(error: unknown): AppError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (
    lower.includes('quota') ||
    lower.includes('neuron') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('capacity')
  ) {
    return new AppError('QUOTA_EXCEEDED', 'Workers AI free allocation is exhausted.', {
      retryable_hint: 'Retry after the daily neuron budget resets.',
    });
  }
  return new AppError('UPSTREAM_AI_ERROR', 'Workers AI request failed.', {
    reason: 'upstream_error',
  });
}

export class ModelClient {
  constructor(private readonly ai: AiBinding) {}

  async run(model: string, inputs: Record<string, unknown>): Promise<unknown> {
    try {
      return await this.ai.run(model, inputs);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw mapUpstreamError(error);
    }
  }

  async generateText(
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const payload = await this.run(model, {
      messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0,
      stream: false,
    });
    return extractGeneratedText(payload);
  }

  async generateJson(
    model: string,
    messages: ChatMessage[],
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<unknown> {
    const text = await this.generateText(model, messages, options);
    return parseJsonObject(text);
  }

  async embed(model: string, texts: string[]): Promise<number[][]> {
    const payload = await this.run(model, { text: texts });
    return extractEmbeddings(payload, texts.length);
  }

  async rerank(
    model: string,
    query: string,
    contexts: string[],
    topK?: number,
  ): Promise<{ index: number; score: number }[]> {
    const payload = await this.run(model, {
      query,
      contexts: contexts.map((text) => ({ text })),
      ...(topK ? { top_k: topK } : {}),
    });
    return extractRerank(payload, contexts.length);
  }
}

function extractEmbeddings(payload: unknown, expected: number): number[][] {
  if (!isRecord(payload)) {
    throw new AppError('UPSTREAM_AI_ERROR', 'Embedding response was not an object.');
  }
  let vectors: unknown = payload.data ?? payload.embeddings ?? payload.result;
  if (isRecord(vectors) && Array.isArray(vectors.data)) {
    vectors = vectors.data;
  }
  if (!Array.isArray(vectors)) {
    throw new AppError('UPSTREAM_AI_ERROR', 'Embedding response missing vectors.');
  }
  const out: number[][] = [];
  for (const item of vectors) {
    if (Array.isArray(item) && item.every((n) => typeof n === 'number')) {
      out.push(item as number[]);
      continue;
    }
    if (isRecord(item) && Array.isArray(item.embedding)) {
      out.push((item.embedding as unknown[]).map((n) => Number(n)));
    }
  }
  if (out.length !== expected) {
    throw new AppError('UPSTREAM_AI_ERROR', 'Embedding response item count mismatch.', {
      expected,
      actual: out.length,
    });
  }
  return out;
}

function extractRerank(payload: unknown, count: number): { index: number; score: number }[] {
  let rows: unknown = payload;
  if (isRecord(payload)) {
    rows = payload.response ?? payload.result ?? payload.data ?? payload.results ?? payload;
  }
  if (!Array.isArray(rows)) {
    throw new AppError('UPSTREAM_AI_ERROR', 'Rerank response missing scores.');
  }
  const mapped = rows.map((row, fallbackIndex) => {
    if (typeof row === 'number') {
      return { index: fallbackIndex, score: row };
    }
    if (isRecord(row)) {
      const index =
        typeof row.id === 'number' ? row.id : typeof row.index === 'number' ? row.index : fallbackIndex;
      const score = Number(row.score ?? row.relevance_score ?? 0);
      return { index, score };
    }
    return { index: fallbackIndex, score: 0 };
  });
  return mapped.filter((row) => row.index >= 0 && row.index < count);
}

export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return vector.slice();
  }
  return vector.map((value) => value / norm);
}
