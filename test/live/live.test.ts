import { describe, expect, it } from 'vitest';

const live = process.env.RUN_MODEL_TESTS === '1' && Boolean(process.env.ML_SERVICE_BASE_URL);

describe.skipIf(!live)('live Workers AI', () => {
  const base = process.env.ML_SERVICE_BASE_URL ?? '';
  const token = process.env.INTERNAL_API_TOKEN ?? '';

  async function post(path: string, body: unknown): Promise<Response> {
    return fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  it('classifies a security blocker', async () => {
    const response = await post('/v1/classify', {
      items: [{ id: '1', text: 'We cannot buy anything until security approves it.' }],
    });
    expect(response.status).toBe(200);
    const json = (await response.json()) as { items: unknown[] };
    expect(json.items).toHaveLength(1);
  });

  it('embeds with dimension 1024', async () => {
    const response = await post('/v1/embeddings', {
      items: [{ id: '1', text: 'Security approval is mandatory.' }],
    });
    expect(response.status).toBe(200);
    const json = (await response.json()) as { items: { dimension: number }[] };
    expect(json.items[0]?.dimension).toBe(1024);
  });
});
