import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/index';
import { FakeAi, testEnv } from '../helpers';

const CALLER_UA = 'deal-truth-api/1.4 python-httpx/0.27';

async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const app = createApp(testEnv(new FakeAi()));
  return app.request(`http://ml${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const COMPAT_CALLS: { path: string; body: unknown; successor: string }[] = [
  { path: '/classify', body: { texts: ['ok'] }, successor: '/v1/classify' },
  { path: '/emotion', body: { texts: ['ok'] }, successor: '/v1/emotions' },
  { path: '/embed', body: { texts: ['ok'] }, successor: '/v1/embeddings' },
  { path: '/generate', body: { prompt: 'ok' }, successor: '/v1/generate' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('compat routes are deprecated but still answer', () => {
  for (const { path, body, successor } of COMPAT_CALLS) {
    it(`POST ${path} still returns 200 and is marked deprecated`, async () => {
      const response = await post(path, body);
      // Deletion is a later task — the live Python pipeline still calls these.
      expect(response.status, `${path} must keep working`).toBe(200);
      expect(response.headers.get('deprecation')).toBe('true');
      expect(response.headers.get('sunset')).toBeTruthy();
      expect(response.headers.get('link')).toBe(`<${successor}>; rel="successor-version"`);
    });
  }

  it('sends a Sunset date that is a parseable HTTP-date in the future', async () => {
    const response = await post('/emotion', { texts: ['ok'] });
    const sunset = response.headers.get('sunset') ?? '';
    const parsed = Date.parse(sunset);
    expect(Number.isNaN(parsed), `Sunset "${sunset}" must be an HTTP-date`).toBe(false);
    expect(parsed).toBeGreaterThan(Date.now());
  });

  it('logs a deprecation warning naming the caller user-agent', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    await post('/emotion', { texts: ['ok'] }, { 'User-Agent': CALLER_UA });
    const warning = consoleError.mock.calls
      .map((call) => String(call[0]))
      .find((line) => line.includes('compat.deprecated_route'));
    expect(warning, 'a deprecation warning must be logged').toBeTruthy();
    expect(warning).toContain('"path":"/emotion"');
    expect(warning, 'the caller must be identifiable for the migration').toContain(CALLER_UA);
  });

  it('marks the route even when the call is rejected', async () => {
    // `{"text":"ok"}` (singular) is a bad body for this route. The deprecation marker
    // has to be on every response, not only the happy path, or a caller that is failing
    // for an unrelated reason never learns the route is going away.
    const response = await post('/emotion', { text: 'ok' });
    expect(response.status).toBe(400);
    expect(response.headers.get('deprecation')).toBe('true');
    expect(response.headers.get('sunset')).toBeTruthy();
  });

  it('marks the route even when the bearer token is wrong', async () => {
    const app = createApp(testEnv(new FakeAi(), { INTERNAL_API_TOKEN: 'secret' }));
    const response = await app.request('http://ml/emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: ['ok'] }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('deprecation')).toBe('true');
  });

  it('does not mark the modern /v1 routes deprecated', async () => {
    const response = await post('/v1/emotions', { items: [{ id: '1', text: 'ok' }] });
    expect(response.status).toBe(200);
    expect(response.headers.get('deprecation')).toBeNull();
    expect(response.headers.get('sunset')).toBeNull();
  });
});

describe('compat /emotion and /v1/emotions must not converge', () => {
  it('returns different top-level shapes', async () => {
    const compat = (await (await post('/emotion', { texts: ['ok'] })).json()) as Record<
      string,
      unknown
    >;
    const modern = (await (
      await post('/v1/emotions', { items: [{ id: '1', text: 'ok' }] })
    ).json()) as Record<string, unknown>;

    // The shell equivalent: diff <(… /emotion | jq -S 'keys') <(… /v1/emotions | jq -S 'keys')
    const compatKeys = Object.keys(compat).sort();
    const modernKeys = Object.keys(modern).sort();
    expect(compatKeys).toEqual(['results']);
    expect(modernKeys).toEqual(['items', 'model', 'request_id']);
    expect(compatKeys, 'the two routes must not return the same shape').not.toEqual(modernKeys);
  });

  it('keeps the three axes separate on /v1 and flattened on compat', async () => {
    const compat = (await (await post('/emotion', { texts: ['ok'] })).json()) as {
      results: { labels: { label: string; score: number }[] }[];
    };
    const modern = (await (
      await post('/v1/emotions', { items: [{ id: '1', text: 'ok' }] })
    ).json()) as {
      items: Record<string, { label: string; score: number }[] | unknown>[];
    };

    const compatItem = compat.results[0]!;
    const modernItem = modern.items[0]!;

    // Compat loses axis identity: one flat array, no way to say which axis a label came from.
    expect(Object.keys(compatItem)).toEqual(['labels']);
    // Modern keeps them named and independent — and must never grow a flat `labels` array,
    // which is how a well-meaning "fix" to compat would leak the merge into /v1.
    expect(Object.keys(modernItem).sort()).toEqual([
      'buying_intent',
      'deal_signals',
      'emotion',
      'id',
      'unavailable',
    ]);
    expect(modernItem).not.toHaveProperty('labels');

    const axes = ['emotion', 'buying_intent', 'deal_signals'] as const;
    const perAxis = axes.map((axis) => modernItem[axis] as { label: string }[]);
    for (const [index, scored] of perAxis.entries()) {
      expect(Array.isArray(scored), `${axes[index]} must be its own array`).toBe(true);
    }
    // Same labels, but compat can only ship their union — the axis each belongs to is gone.
    expect(compatItem.labels.length).toBe(perAxis.reduce((sum, axis) => sum + axis.length, 0));
    expect(compatItem.labels.length).toBeGreaterThan(0);
  });
});
