import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/index';
import { AppError, errorEnvelope, isUpstreamCode } from '../../src/core/errors';
import { FakeAi, testEnv } from '../helpers';

/** Every model call fails with a non-timeout upstream error. */
class FailingAi extends FakeAi {
  override async run(model: string, inputs: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ model, inputs });
    throw new Error('Workers AI request failed: upstream returned 503');
  }
}

/** Every model call fails the way a stalled inference call reads. */
class TimingOutAi extends FakeAi {
  override async run(model: string, inputs: Record<string, unknown> = {}): Promise<unknown> {
    this.calls.push({ model, inputs });
    throw new Error('Workers AI request failed: connection timed out after 30000ms');
  }
}

interface ErrorBody {
  error: { code: string; message: string; retryable: boolean; details: Record<string, unknown> };
  error_code: string;
  message: string;
  request_id: string;
}

async function request(path: string, init?: RequestInit, ai: FakeAi = new FakeAi()) {
  const app = createApp(testEnv(ai));
  const response = await app.request(`http://ml${path}`, init);
  return { status: response.status, body: (await response.json()) as ErrorBody };
}

function postJson(raw: string): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw };
}

describe('error code table', () => {
  it('maps the new codes to honest statuses', () => {
    expect(new AppError('NOT_FOUND', 'x').status).toBe(404);
    expect(new AppError('UPSTREAM_FAILED', 'x').status).toBe(502);
    expect(new AppError('UPSTREAM_TIMEOUT', 'x').status).toBe(504);
  });

  it('marks upstream failures retryable and a missing route not', () => {
    expect(new AppError('NOT_FOUND', 'x').retryable).toBe(false);
    expect(new AppError('UPSTREAM_FAILED', 'x').retryable).toBe(true);
    expect(new AppError('UPSTREAM_TIMEOUT', 'x').retryable).toBe(true);
  });

  it('treats UPSTREAM_FAILED as an equal of the emitted UPSTREAM_AI_ERROR', () => {
    // UPSTREAM_FAILED is the reserved successor name; the wire still says
    // UPSTREAM_AI_ERROR. Both must carry the same status and retry semantics so a
    // client that switches cannot change behaviour by accident.
    expect(new AppError('UPSTREAM_FAILED', 'x').status).toBe(
      new AppError('UPSTREAM_AI_ERROR', 'x').status,
    );
    expect(isUpstreamCode('UPSTREAM_AI_ERROR')).toBe(true);
    expect(isUpstreamCode('UPSTREAM_FAILED')).toBe(true);
    expect(isUpstreamCode('UPSTREAM_TIMEOUT')).toBe(true);
    expect(isUpstreamCode('INVALID_REQUEST')).toBe(false);
  });
});

describe('error envelope carries both shapes at once', () => {
  it('keeps the nested error object and mirrors it at the top level', () => {
    const envelope = errorEnvelope(new AppError('NOT_FOUND', 'Unknown route.'), 'req-1');
    expect(envelope.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Unknown route.',
      retryable: false,
      details: {},
    });
    expect(envelope.error_code).toBe('NOT_FOUND');
    expect(envelope.message).toBe('Unknown route.');
    expect(envelope.request_id).toBe('req-1');
  });

  it('never lets the mirror disagree with the nested object', () => {
    const envelope = errorEnvelope(new AppError('QUOTA_EXCEEDED', 'Out of neurons.'), 'req-2');
    expect(envelope.error_code).toBe(envelope.error.code);
    expect(envelope.message).toBe(envelope.error.message);
  });
});

describe('unknown route', () => {
  it('returns 404 NOT_FOUND rather than 400', async () => {
    const { status, body } = await request('/nope');
    expect(status).toBe(404);
    expect(body.error_code).toBe('NOT_FOUND');
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.request_id).toBeTruthy();
    expect(typeof body.message).toBe('string');
  });

  it('answers an unknown POST route with 404 too', async () => {
    const { status, body } = await request('/v1/does-not-exist', postJson('{}'));
    expect(status).toBe(404);
    expect(body.error_code).toBe('NOT_FOUND');
  });

  it('returns 404 NOT_FOUND for an unknown reference document', async () => {
    const { status, body } = await request('/v1/reference/nope.md');
    expect(status).toBe(404);
    expect(body.error_code).toBe('NOT_FOUND');
    expect(body.request_id).toBeTruthy();
  });
});

describe('malformed JSON body', () => {
  it('returns 400 INVALID_REQUEST rather than 500 INTERNAL_ERROR', async () => {
    const { status, body } = await request('/v1/classify', postJson('{bad json'));
    expect(status).toBe(400);
    expect(body.error_code).toBe('INVALID_REQUEST');
    expect(body.error.details.reason).toBe('malformed_json');
    expect(body.request_id).toBeTruthy();
  });

  it('treats an empty body as a bad request, not an internal fault', async () => {
    const { status, body } = await request('/v1/emotions', postJson(''));
    expect(status).toBe(400);
    expect(body.error_code).toBe('INVALID_REQUEST');
  });

  it('applies to the compat routes as well', async () => {
    const { status, body } = await request('/emotion', postJson('{"texts": ['));
    expect(status).toBe(400);
    expect(body.error_code).toBe('INVALID_REQUEST');
  });
});

describe('upstream model failures', () => {
  it('returns 502 naming the model that failed', async () => {
    const { status, body } = await request(
      '/v1/embeddings',
      postJson(JSON.stringify({ items: [{ id: '1', text: 'hello' }] })),
      new FailingAi(),
    );
    expect(status).toBe(502);
    // The live contract the Python client reads stays UPSTREAM_AI_ERROR; what changes
    // is that the body now says which model fell over.
    expect(body.error_code).toBe('UPSTREAM_AI_ERROR');
    expect(body.error.retryable).toBe(true);
    expect(body.error.details.model).toBe('@cf/qwen/qwen3-embedding-0.6b');
  });

  it('returns 504 UPSTREAM_TIMEOUT for a stalled call, not a generic 502', async () => {
    const { status, body } = await request(
      '/v1/embeddings',
      postJson(JSON.stringify({ items: [{ id: '1', text: 'hello' }] })),
      new TimingOutAi(),
    );
    expect(status).toBe(504);
    expect(body.error_code).toBe('UPSTREAM_TIMEOUT');
    expect(body.error.code).toBe('UPSTREAM_TIMEOUT');
    expect(body.error.retryable).toBe(true);
    expect(body.error.details.model).toBe('@cf/qwen/qwen3-embedding-0.6b');
    expect(body.message).toContain('@cf/qwen/qwen3-embedding-0.6b');
  });

  it('still reports quota exhaustion as 429, not as a timeout or an upstream failure', async () => {
    const ai = new FakeAi();
    ai.failQuota = true;
    const { status, body } = await request(
      '/v1/embeddings',
      postJson(JSON.stringify({ items: [{ id: '1', text: 'hello' }] })),
      ai,
    );
    expect(status).toBe(429);
    expect(body.error_code).toBe('QUOTA_EXCEEDED');
  });

  it('leaves a healthy request untouched', async () => {
    const app = createApp(testEnv(new FakeAi()));
    const response = await app.request(
      'http://ml/v1/embeddings',
      postJson(JSON.stringify({ items: [{ id: '1', text: 'hello' }] })),
    );
    expect(response.status).toBe(200);
  });
});
