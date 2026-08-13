import type { AiBinding } from './ai/client';

export interface Env {
  AI: AiBinding;
  INTERNAL_API_TOKEN?: string;
  ENABLE_GENERATION?: string;
  MAX_BATCH_SIZE?: string;
  MAX_TEXT_CHARS?: string;
  LOG_LEVEL?: string;
  FAST_MODEL_ID?: string;
  QUALITY_MODEL_ID?: string;
  EMBEDDING_MODEL_ID?: string;
  RERANK_MODEL_ID?: string;
  EMBEDDING_DIMENSION?: string;
}

export interface AppVariables {
  requestId: string;
  startMs: number;
}
