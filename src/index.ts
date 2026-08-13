import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadConfig } from './core/config';
import { extractBearer, timingSafeEqual } from './core/auth';
import { AppError, errorEnvelope } from './core/errors';
import { logRequest } from './core/logging';
import { countChars, newRequestId } from './core/request';
import { ModelClient } from './ai/client';
import { ModelRouter } from './ai/router';
import { SALES_LABELS } from './taxonomies/sales-labels';
import { analyzeCall } from './services/analyze';
import { classifyItems } from './services/classify';
import { embedItems } from './services/embeddings';
import { analyzeEmotions } from './services/emotions';
import { generateText } from './services/generate';
import { rerankPassages } from './services/rerank';
import { getReferenceDoc, listReferenceDocs } from './reference';
import { openApiSpec, swaggerUiHtml } from './openapi';
import type { AppVariables, Env } from './env';

type AppEnv = { Bindings: Env; Variables: AppVariables };

const PROTECTED_PREFIXES = ['/v1/', '/classify', '/emotion', '/embed', '/generate'];

function isProtected(path: string): boolean {
  if (path === '/v1/reference' || path.startsWith('/v1/reference/')) {
    return false;
  }
  return PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function createApp(env: Env): Hono<AppEnv> {
  const config = loadConfig(env);
  const router = new ModelRouter(new ModelClient(env.AI), config);
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    const requestId = newRequestId(c.req.header('x-request-id'));
    c.set('requestId', requestId);
    c.set('startMs', Date.now());
    c.header('X-Request-ID', requestId);
    await next();
  });

  // Backend-to-worker only. Do not reflect arbitrary Origin.
  app.use(
    '*',
    cors({
      origin: [],
      allowHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
      exposeHeaders: ['X-Request-ID'],
    }),
  );

  app.onError((error, c) => {
    const requestId = c.get('requestId') ?? 'unknown';
    const appError =
      error instanceof AppError
        ? error
        : new AppError('INTERNAL_ERROR', 'An unexpected error occurred.');
    logRequest({
      request_id: requestId,
      method: c.req.method,
      path: c.req.path,
      status: appError.status,
      duration_ms: Date.now() - (c.get('startMs') ?? Date.now()),
      success: false,
      error_code: appError.code,
      error_detail:
        typeof appError.details.upstream === 'string' ? appError.details.upstream : undefined,
    });
    return c.json(errorEnvelope(appError, requestId), appError.status as 400);
  });

  app.use('*', async (c, next) => {
    if (!isProtected(c.req.path) || c.req.method === 'OPTIONS') {
      await next();
      return;
    }
    if (!config.internalApiToken) {
      await next();
      return;
    }
    const token = extractBearer(c.req.header('authorization'));
    if (!token || !timingSafeEqual(token, config.internalApiToken)) {
      throw new AppError('AUTH_FAILED', 'Invalid or missing bearer token.');
    }
    await next();
  });

  app.get('/health/live', (c) => c.json({ status: 'ok' }));

  app.get('/openapi.json', (c) => c.json(openApiSpec));

  app.get('/docs', (c) => c.html(swaggerUiHtml('/openapi.json')));

  app.get('/health/ready', (c) => {
    const ready = Boolean(env.AI);
    return c.json(
      {
        overall: ready ? 'ready' : 'not_ready',
        ai_binding: ready,
        generation_enabled: config.enableGeneration,
        models: {
          fast: config.fastModelId,
          quality: config.qualityModelId,
          embeddings: { id: config.embeddingModelId, dimension: config.embeddingDimension },
          rerank: config.rerankModelId,
        },
        max_batch_size: config.maxBatchSize,
        max_text_chars: config.maxTextChars,
      },
      ready ? 200 : 503,
    );
  });

  app.get('/v1/models', (c) =>
    c.json({
      fast: { id: config.fastModelId, role: 'segment_classification_and_candidates', ready: true },
      quality: { id: config.qualityModelId, role: 'call_reasoning_and_judge', ready: true },
      embeddings: {
        id: config.embeddingModelId,
        dimension: config.embeddingDimension,
        ready: true,
      },
      rerank: { id: config.rerankModelId, role: 'passage_rerank', ready: true },
      generation: { enabled: config.enableGeneration, ready: config.enableGeneration },
    }),
  );

  app.get('/v1/sales-labels', (c) => c.json({ labels: SALES_LABELS }));

  const mountReference = (prefix: string) => {
    app.get(`${prefix}/reference`, (c) => c.json({ docs: listReferenceDocs(`${prefix}/reference`) }));
    app.get(`${prefix}/reference/:name`, (c) => {
      const doc = getReferenceDoc(c.req.param('name'));
      if (!doc) {
        return c.json(
          errorEnvelope(new AppError('INVALID_REQUEST', 'Unknown reference document.'), c.get('requestId')),
          404,
        );
      }
      return c.body(doc.body, 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
    });
  };
  mountReference('/v1');
  mountReference('/api/v1');

  app.post('/v1/classify', async (c) => {
    const body = await c.req.json();
    const result = await classifyItems(router, config, body);
    logSuccess(c, result.items.length, countChars(bodyItems(body)), result.model);
    return c.json({ items: result.items, model: result.model, request_id: c.get('requestId') });
  });

  app.post('/v1/emotions', async (c) => {
    const body = await c.req.json();
    const result = await analyzeEmotions(router, config, body);
    logSuccess(c, result.items.length, countChars(bodyItems(body)), result.model);
    return c.json({ items: result.items, model: result.model, request_id: c.get('requestId') });
  });

  app.post('/v1/embeddings', async (c) => {
    const body = await c.req.json();
    const result = await embedItems(router, config, body);
    logSuccess(c, result.items.length, countChars(bodyItems(body)), result.model);
    return c.json({ items: result.items, model: result.model, request_id: c.get('requestId') });
  });

  app.post('/v1/rerank', async (c) => {
    const body = await c.req.json();
    const result = await rerankPassages(router, config, body);
    const passages = Array.isArray((body as { passages?: unknown }).passages)
      ? ((body as { passages: { text: string }[] }).passages)
      : [];
    logSuccess(c, result.items.length, countChars(passages.map((p) => p.text)), result.model);
    return c.json({ items: result.items, model: result.model, request_id: c.get('requestId') });
  });

  app.post('/v1/generate', async (c) => {
    const body = await c.req.json();
    const result = await generateText(router, config, body);
    logSuccess(c, 1, String((body as { input?: string }).input ?? '').length, result.model);
    return c.json({ ...result, request_id: c.get('requestId') });
  });

  app.post('/v1/analyze-call', async (c) => {
    const body = await c.req.json();
    const result = await analyzeCall(router, config, body);
    const segments = Array.isArray((body as { segments?: { text: string }[] }).segments)
      ? (body as { segments: { text: string }[] }).segments
      : [];
    logSuccess(c, segments.length, countChars(segments.map((s) => s.text)), result.models.judge);
    return c.json({ ...result, request_id: c.get('requestId') });
  });

  app.post('/classify', async (c) => {
    const body = (await c.req.json()) as { texts?: unknown; labels?: unknown };
    const texts = asStringArray(body.texts, 'texts');
    const labels = asOptionalStringArray(body.labels, 'labels');
    const mapped = await classifyItems(router, config, {
      items: texts.map((text, index) => ({ id: String(index), text })),
      ...(labels.length
        ? {
            candidate_labels: labels.map((label) => ({
              id: slugify(label),
              hypothesis: label,
            })),
          }
        : {}),
    });
    logSuccess(c, texts.length, countChars(texts), mapped.model);
    return c.json({
      results: mapped.items.map((item) => ({
        labels: item.labels.map((label) => ({ label: label.id, score: label.score })),
      })),
    });
  });

  app.post('/emotion', async (c) => {
    const body = (await c.req.json()) as { texts?: unknown };
    const texts = asStringArray(body.texts);
    const mapped = await analyzeEmotions(router, config, {
      items: texts.map((text, index) => ({ id: String(index), text })),
    });
    logSuccess(c, texts.length, countChars(texts), mapped.model);
    return c.json({
      results: mapped.items.map((item) => {
        const row = item as {
          emotion: { label: string; score: number }[];
          buying_intent: { label: string; score: number }[];
          deal_signals: { label: string; score: number }[];
        };
        return {
          labels: [...row.emotion, ...row.buying_intent, ...row.deal_signals],
        };
      }),
    });
  });

  app.post('/embed', async (c) => {
    const body = (await c.req.json()) as { texts?: unknown };
    const texts = asStringArray(body.texts);
    const mapped = await embedItems(router, config, {
      items: texts.map((text, index) => ({ id: String(index), text })),
      normalize: true,
    });
    logSuccess(c, texts.length, countChars(texts), mapped.model);
    return c.json({
      results: mapped.items.map((item) => ({ embedding: item.vector })),
    });
  });

  app.post('/generate', async (c) => {
    const body = (await c.req.json()) as { prompt?: unknown; max_tokens?: unknown };
    if (typeof body.prompt !== 'string' || !body.prompt) {
      throw new AppError('INVALID_REQUEST', 'prompt is required.');
    }
    const mapped = await generateText(router, config, {
      task: 'summary_fallback',
      input: body.prompt,
      max_new_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 256,
      temperature: 0,
    });
    logSuccess(c, 1, body.prompt.length, mapped.model);
    return c.json({ text: mapped.text });
  });

  app.notFound((_c) => {
    throw new AppError('INVALID_REQUEST', 'Unknown route.');
  });

  return app;
}

function logSuccess(
  c: { get: (k: 'requestId' | 'startMs') => string | number; req: { method: string; path: string } },
  itemCount: number,
  charCount: number,
  model: string,
): void {
  logRequest({
    request_id: String(c.get('requestId')),
    method: c.req.method,
    path: c.req.path,
    status: 200,
    item_count: itemCount,
    char_count: charCount,
    model,
    duration_ms: Date.now() - Number(c.get('startMs')),
    success: true,
  });
}

function bodyItems(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('items' in body)) {
    return [];
  }
  const items = (body as { items: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) =>
    typeof item === 'object' && item !== null && 'text' in item
      ? String((item as { text: unknown }).text ?? '')
      : '',
  );
}

function asStringArray(value: unknown, field = 'texts'): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === 'string')) {
    throw new AppError('INVALID_REQUEST', `${field} must be a non-empty string array.`);
  }
  return value;
}

function asOptionalStringArray(value: unknown, field = 'labels'): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new AppError('INVALID_REQUEST', `${field} must be a string array.`);
  }
  return value;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'label';
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response {
    return createApp(env).fetch(request, env, ctx);
  },
};
