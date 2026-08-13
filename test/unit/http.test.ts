import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/index';
import { FakeAi, testEnv } from '../helpers';

async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe('auth and health', () => {
  it('serves live and ready without auth', async () => {
    const app = createApp(testEnv(new FakeAi(), { INTERNAL_API_TOKEN: 'secret' }));
    const live = await app.request('http://ml/health/live');
    const ready = await app.request('http://ml/health/ready');
    expect(live.status).toBe(200);
    expect(ready.status).toBe(200);
    const body = await jsonOf(ready);
    expect(body.overall).toBe('ready');
  });

  it('rejects protected routes without a token when configured', async () => {
    const app = createApp(testEnv(new FakeAi(), { INTERNAL_API_TOKEN: 'secret' }));
    const response = await app.request('http://ml/v1/models');
    expect(response.status).toBe(401);
    const body = await jsonOf(response);
    const error = body.error as { code: string };
    expect(error.code).toBe('AUTH_FAILED');
    expect(body.request_id).toBeTruthy();
  });

  it('accepts a matching bearer token', async () => {
    const app = createApp(testEnv(new FakeAi(), { INTERNAL_API_TOKEN: 'secret' }));
    const response = await app.request('http://ml/v1/models', {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(response.status).toBe(200);
  });

  it('echoes X-Request-ID', async () => {
    const app = createApp(testEnv(new FakeAi()));
    const response = await app.request('http://ml/health/live', {
      headers: { 'X-Request-ID': 'req-123' },
    });
    expect(response.headers.get('X-Request-ID')).toBe('req-123');
  });
});

describe('validation and errors', () => {
  it('returns BATCH_TOO_LARGE', async () => {
    const app = createApp(testEnv(new FakeAi(), { MAX_BATCH_SIZE: '1' }));
    const response = await app.request('http://ml/v1/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: '1', text: 'a' },
          { id: '2', text: 'b' },
        ],
      }),
    });
    expect(response.status).toBe(413);
    const body = await jsonOf(response);
    expect((body.error as { code: string }).code).toBe('BATCH_TOO_LARGE');
  });

  it('returns TEXT_TOO_LONG', async () => {
    const app = createApp(testEnv(new FakeAi(), { MAX_TEXT_CHARS: '4' }));
    const response = await app.request('http://ml/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: '1', text: 'too-long' }] }),
    });
    expect(response.status).toBe(413);
    expect(((await jsonOf(response)).error as { code: string }).code).toBe('TEXT_TOO_LONG');
  });

  it('returns GENERATION_DISABLED', async () => {
    const app = createApp(testEnv(new FakeAi(), { ENABLE_GENERATION: 'false' }));
    const response = await app.request('http://ml/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'email_polish', input: 'Hi' }),
    });
    expect(response.status).toBe(503);
    expect(((await jsonOf(response)).error as { code: string }).code).toBe('GENERATION_DISABLED');
  });

  it('maps quota errors', async () => {
    const ai = new FakeAi();
    ai.failQuota = true;
    const app = createApp(testEnv(ai));
    const response = await app.request('http://ml/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: '1', text: 'hello' }] }),
    });
    expect(response.status).toBe(429);
    const error = (await jsonOf(response)).error as { code: string; retryable: boolean };
    expect(error.code).toBe('QUOTA_EXCEEDED');
    expect(error.retryable).toBe(true);
  });
});
