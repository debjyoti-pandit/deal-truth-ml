import type { Env } from '../env';

export const DEFAULT_FAST_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
export const DEFAULT_QUALITY_MODEL = '@cf/openai/gpt-oss-120b';
export const DEFAULT_EMBEDDING_MODEL = '@cf/qwen/qwen3-embedding-0.6b';
export const DEFAULT_RERANK_MODEL = '@cf/baai/bge-reranker-base';
export const DEFAULT_EMBEDDING_DIMENSION = 1024;

export interface AppConfig {
  internalApiToken: string;
  enableGeneration: boolean;
  maxBatchSize: number;
  maxTextChars: number;
  logLevel: string;
  fastModelId: string;
  qualityModelId: string;
  embeddingModelId: string;
  rerankModelId: string;
  embeddingDimension: number;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: Env): AppConfig {
  return {
    internalApiToken: env.INTERNAL_API_TOKEN ?? '',
    enableGeneration: parseBool(env.ENABLE_GENERATION, true),
    maxBatchSize: parseIntEnv(env.MAX_BATCH_SIZE, 32),
    maxTextChars: parseIntEnv(env.MAX_TEXT_CHARS, 8000),
    logLevel: env.LOG_LEVEL ?? 'info',
    fastModelId: env.FAST_MODEL_ID || DEFAULT_FAST_MODEL,
    qualityModelId: env.QUALITY_MODEL_ID || DEFAULT_QUALITY_MODEL,
    embeddingModelId: env.EMBEDDING_MODEL_ID || DEFAULT_EMBEDDING_MODEL,
    rerankModelId: env.RERANK_MODEL_ID || DEFAULT_RERANK_MODEL,
    embeddingDimension: parseIntEnv(env.EMBEDDING_DIMENSION, DEFAULT_EMBEDDING_DIMENSION),
  };
}
