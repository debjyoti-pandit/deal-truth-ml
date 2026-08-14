import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/index';
import type { AiBinding } from '../../src/ai/client';
import type { Env } from '../../src/env';

/**
 * `/v1/rerank` is built and unused; Ask-the-Call is about to adopt it. These tests pin the
 * wire shape and the ordering guarantees so the adoption cannot silently change either.
 *
 * The contract is `{query, passages:[{id,text}]}` → `{items:[{id,score,index}], model}`, which
 * is what the route and docs/API.md already say. (The task text described
 * `{query, documents[]}` → `.results[]`; that shape is not what ships, and the last test here
 * asserts it is rejected rather than quietly accepted.)
 */

const QUERY = 'why is the customer hesitant?';

const PASSAGES = [
  { id: 'price', text: 'We currently pay about $400. This would be almost double.' },
  { id: 'pleasantry', text: 'Thanks for taking the time today.' },
  { id: 'security', text: 'Our security team has to approve any new vendor.' },
];

/** Relevance to "why is the customer hesitant?", as a real reranker would score it. */
function hesitancyScore(text: string): number {
  if (/\$|double|pay/i.test(text)) {
    return 0.81;
  }
  if (/security|approve|vendor/i.test(text)) {
    return 0.74;
  }
  return 0.03;
}

/**
 * Emits rows in the least helpful order it can — lowest score first, and ties in reverse input
 * order — so any test that passes is testing the service's ordering, not the fake's. A tie
 * emitted in input order would look ranked under a stable sort even with no tiebreak at all.
 * `scoreFor` returns `unknown` so a test can hand back a non-numeric score.
 */
class RerankAi implements AiBinding {
  calls = 0;

  constructor(
    private readonly scoreFor: (text: string, index: number) => unknown = hesitancyScore,
  ) {}

  async run(_model: string, inputs: Record<string, unknown> = {}): Promise<unknown> {
    this.calls += 1;
    const contexts = Array.isArray(inputs.contexts) ? (inputs.contexts as { text: string }[]) : [];
    const rows = contexts.map((context, index) => ({
      id: index,
      score: this.scoreFor(context.text, index),
    }));
    return {
      response: [...rows].reverse().sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0)),
    };
  }
}

function envFor(ai: AiBinding, overrides: Partial<Env> = {}): Env {
  return {
    AI: ai,
    INTERNAL_API_TOKEN: '',
    ENABLE_GENERATION: 'true',
    MAX_BATCH_SIZE: '32',
    MAX_TEXT_CHARS: '8000',
    LOG_LEVEL: 'error',
    FAST_MODEL_ID: '@cf/qwen/qwen3-30b-a3b-fp8',
    QUALITY_MODEL_ID: '@cf/openai/gpt-oss-120b',
    EMBEDDING_MODEL_ID: '@cf/qwen/qwen3-embedding-0.6b',
    RERANK_MODEL_ID: '@cf/baai/bge-reranker-base',
    EMBEDDING_DIMENSION: '1024',
    ...overrides,
  };
}

type Item = { id: string; score: number; index: number };

async function rerank(
  body: unknown,
  ai: AiBinding = new RerankAi(),
): Promise<{ status: number; items: Item[]; json: Record<string, unknown> }> {
  const response = await createApp(envFor(ai)).request('http://ml/v1/rerank', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as Record<string, unknown>;
  return { status: response.status, items: (json.items ?? []) as Item[], json };
}

function isNonIncreasing(items: Item[]): boolean {
  return items.every((item, index) => index === 0 || items[index - 1]!.score >= item.score);
}

describe('/v1/rerank ranking guarantees', () => {
  it('ranks hesitation evidence above the pleasantry', async () => {
    const { status, items } = await rerank({ query: QUERY, passages: PASSAGES });
    expect(status).toBe(200);
    expect(items).toHaveLength(3);
    // The whole point of reranking for Ask: social filler must never be the top evidence.
    expect(items[0]!.id, 'a pleasantry ranked first').not.toBe('pleasantry');
    expect(items.map((item) => item.id)).toEqual(['price', 'security', 'pleasantry']);
    expect(isNonIncreasing(items), 'scores were not monotonically non-increasing').toBe(true);
  });

  it('sorts descending even when the model returns rows ascending', async () => {
    const { items } = await rerank({ query: QUERY, passages: PASSAGES });
    // The fake deliberately emits its worst match first; the service must not trust that order.
    expect(items[0]!.score).toBeGreaterThan(items[items.length - 1]!.score);
    expect(isNonIncreasing(items)).toBe(true);
  });

  it('keeps id and original index attached to every score', async () => {
    const { items } = await rerank({ query: QUERY, passages: PASSAGES });
    for (const item of items) {
      expect(PASSAGES[item.index]!.id, 'index no longer points at its own passage').toBe(item.id);
      expect(typeof item.score).toBe('number');
    }
    expect(new Set(items.map((item) => item.index)).size).toBe(PASSAGES.length);
  });

  it('is stable under ties — input order breaks them, identically every time', async () => {
    const flat = new RerankAi(() => 0.5);
    const first = await rerank({ query: QUERY, passages: PASSAGES }, flat);
    const second = await rerank({ query: QUERY, passages: PASSAGES }, new RerankAi(() => 0.5));
    expect(first.items.map((item) => item.id)).toEqual(['price', 'pleasantry', 'security']);
    expect(first.items.map((item) => item.index)).toEqual([0, 1, 2]);
    // Same request, same ranking: evidence must not reshuffle between two identical asks.
    expect(second.items).toEqual(first.items);
  });

  it('breaks a partial tie by input order without disturbing the ranking', async () => {
    // price and security tie at 0.8; the pleasantry stays last.
    const partial = new RerankAi((text) => (/Thanks/.test(text) ? 0.1 : 0.8));
    const { items } = await rerank({ query: QUERY, passages: PASSAGES }, partial);
    expect(items.map((item) => item.id)).toEqual(['price', 'security', 'pleasantry']);
    expect(isNonIncreasing(items)).toBe(true);
  });

  it('sorts an unusable score last instead of scrambling the ranking', async () => {
    // NaN makes every comparison false, so one bad score can leave the whole array unordered.
    const broken = new RerankAi((text) =>
      /Thanks/.test(text) ? 'not-a-number' : hesitancyScore(text),
    );
    const { items } = await rerank({ query: QUERY, passages: PASSAGES }, broken);
    expect(items).toHaveLength(3);
    expect(isNonIncreasing(items)).toBe(true);
    expect(items[items.length - 1]!.id).toBe('pleasantry');
    expect(Number.isFinite(items[items.length - 1]!.score)).toBe(true);
  });

  it('applies top_k after ranking, not before', async () => {
    const { items } = await rerank({ query: QUERY, passages: PASSAGES, top_k: 2 });
    expect(items.map((item) => item.id)).toEqual(['price', 'security']);
  });
});

describe('/v1/rerank edge cases', () => {
  it('answers 200 with an empty items array for empty passages', async () => {
    const ai = new RerankAi();
    const { status, items, json } = await rerank({ query: QUERY, passages: [] }, ai);
    expect(status).toBe(200);
    expect(items).toEqual([]);
    expect(json.model).toBe('@cf/baai/bge-reranker-base');
    // Nothing to rank means nothing to spend an inference call on.
    expect(ai.calls, 'an empty request still hit the model').toBe(0);
  });

  it('still rejects a request with no query', async () => {
    const { status, json } = await rerank({ passages: PASSAGES });
    expect(status).toBe(400);
    expect((json.error as { code: string }).code).toBe('INVALID_REQUEST');
  });

  it('keeps the passages/items contract and rejects the documents/results shape', async () => {
    const { status, json } = await rerank({
      query: QUERY,
      documents: PASSAGES.map((passage) => passage.text),
    });
    expect(status).toBe(400);
    expect((json.error as { code: string }).code).toBe('INVALID_REQUEST');

    const ok = await rerank({ query: QUERY, passages: PASSAGES });
    expect(Array.isArray(ok.json.items)).toBe(true);
    expect(ok.json.results, 'results[] is not this route’s shape').toBeUndefined();
    expect(Object.keys(ok.items[0]!).sort()).toEqual(['id', 'index', 'score']);
    expect(ok.json.model).toBe('@cf/baai/bge-reranker-base');
    expect(ok.json.request_id).toBeTruthy();
  });
});
