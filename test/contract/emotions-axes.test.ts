import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/index';
import { FakeAi, testEnv } from '../helpers';

const AXES = ['emotion', 'buying_intent', 'deal_signals'] as const;

type Axis = (typeof AXES)[number];
type Scored = { label: string; score: number };
type Item = Record<Axis, Scored[]> & { id: string; unavailable: Record<Axis, boolean> };

async function post(
  path: string,
  body: unknown,
  ai: FakeAi = new FakeAi(),
): Promise<{ status: number; json: Record<string, unknown> }> {
  const app = createApp(testEnv(ai));
  const response = await app.request(`http://ml${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

async function emotions(body: unknown, ai?: FakeAi): Promise<{ status: number; items: Item[] }> {
  const { status, json } = await post('/v1/emotions', body, ai);
  return { status, items: (json.items ?? []) as Item[] };
}

describe('/v1/emotions — three axes, always, separately', () => {
  it('always returns all three axes, independently scored', async () => {
    const { status, items } = await emotions({
      items: [{ id: 'seg-1', text: 'I love this, but finance froze our budget until next year.' }],
    });
    expect(status).toBe(200);
    const row = items[0]!;
    for (const axis of AXES) {
      expect(Array.isArray(row[axis]), `${axis} missing`).toBe(true);
    }
    const intent = row.buying_intent.find((x) => /weak|negative|low/.test(x.label));
    const blocker = row.deal_signals.find((x) => /budget/.test(x.label));
    const feeling = row.emotion.find((x) => /enthusiastic|interested/.test(x.label));
    expect(feeling, 'positive emotion must be detected').toBeTruthy();
    expect(intent, 'commercial intent must read low despite positive emotion').toBeTruthy();
    expect(blocker, 'budget blocker must be detected').toBeTruthy();
  });

  it('never merges axes — a label may repeat across axes', async () => {
    const ai = new FakeAi();
    // `neutral` is a member of both SALES_EMOTIONS and BUYING_INTENT. It must survive
    // on both axes with its axis identity intact.
    ai.emotionRow = {
      emotion: [{ label: 'neutral', score: 0.6 }],
      buying_intent: [{ label: 'neutral', score: 0.55 }],
      deal_signals: [],
    };
    const { items } = await emotions({ items: [{ id: 'seg-1', text: 'Fine.' }] }, ai);
    const row = items[0]!;
    const flat = AXES.flatMap((axis) => row[axis].map((x) => x.label));
    const namespaced = new Set(AXES.flatMap((axis) => row[axis].map((x) => `${axis}:${x.label}`)));
    expect(flat.length).toBe(namespaced.size);
    expect(row.emotion.map((x) => x.label)).toContain('neutral');
    expect(row.buying_intent.map((x) => x.label)).toContain('neutral');
  });

  it('an axis scored with nothing confident is [] and is not unavailable', async () => {
    // threshold 0.9 keeps deal_signals (0.93) and drops emotion (0.88) — the axis was
    // scored, it just has nothing to say. That is not the same as unavailable.
    const { items } = await emotions({
      items: [{ id: 'seg-1', text: 'We are still deciding.' }],
      threshold: 0.9,
    });
    const row = items[0]!;
    expect(row.emotion).toEqual([]);
    expect(row.unavailable.emotion).toBe(false);
    expect(row.deal_signals.length).toBeGreaterThan(0);
    expect(row.unavailable.deal_signals).toBe(false);
  });

  it('degrades one axis without losing the others when a row omits it', async () => {
    const ai = new FakeAi();
    ai.emotionRow = {
      emotion: [{ label: 'hesitant', score: 0.7 }],
      buying_intent: [{ label: 'weak', score: 0.6 }],
      // deal_signals omitted entirely by the model
    };
    const { items } = await emotions({ items: [{ id: 'seg-1', text: 'Not sure yet.' }] }, ai);
    const row = items[0]!;
    expect(row.emotion.length).toBeGreaterThan(0);
    expect(row.buying_intent.length).toBeGreaterThan(0);
    expect(row.unavailable.emotion).toBe(false);
    expect(row.unavailable.buying_intent).toBe(false);
    expect(row.deal_signals).toEqual([]);
    expect(row.unavailable.deal_signals).toBe(true);
  });

  it('a failed chunk flags only its own items, never the whole batch', async () => {
    const ai = new FakeAi();
    ai.failOnItemIds = ['seg-4']; // items are chunked 4 at a time; this kills the second chunk
    const { status, items } = await emotions(
      {
        items: Array.from({ length: 8 }, (_, i) => ({ id: `seg-${i}`, text: 'Budget is frozen.' })),
      },
      ai,
    );
    expect(status).toBe(200);
    expect(items).toHaveLength(8);
    for (const row of items.slice(0, 4)) {
      expect(row.deal_signals.length, `${row.id} should still be scored`).toBeGreaterThan(0);
      for (const axis of AXES) {
        expect(row.unavailable[axis]).toBe(false);
      }
    }
    for (const row of items.slice(4)) {
      for (const axis of AXES) {
        expect(row[axis], `${row.id}.${axis} must be empty, never null`).toEqual([]);
        expect(row.unavailable[axis], `${row.id}.${axis} must be flagged`).toBe(true);
      }
    }
  });

  it('never keys an axis to null or omits it, even when everything failed', async () => {
    const ai = new FakeAi();
    ai.failOnItemIds = ['seg-0'];
    // A 200 carrying three empty axes would read as "scored neutral" downstream.
    // Total inference failure has to stay an error so the API degrades to PARTIAL.
    const { status, json } = await post(
      '/v1/emotions',
      { items: [{ id: 'seg-0', text: 'Budget is frozen.' }] },
      ai,
    );
    expect(status).toBe(502);
    expect((json.error as { code: string }).code).toBe('UPSTREAM_AI_ERROR');
  });

  it('never attributes one item’s scores to another when a chunk re-keys its ids', async () => {
    const ai = new FakeAi();
    // Second chunk answers with ids 0..3 instead of the requested seg-4..seg-7. Those rows
    // belong to the second chunk's items and must never overwrite the first chunk's.
    ai.rekeyChunksFrom = 1;
    const { items } = await emotions(
      {
        items: Array.from({ length: 8 }, (_, i) => ({ id: `seg-${i}`, text: 'Budget is frozen.' })),
      },
      ai,
    );
    expect(items.map((row) => row.id)).toEqual(Array.from({ length: 8 }, (_, i) => `seg-${i}`));
    for (const row of items) {
      expect(row.deal_signals.length, `${row.id} lost its own scores`).toBeGreaterThan(0);
      expect(row.unavailable.deal_signals).toBe(false);
    }
  });

  it('rejects duplicate item ids rather than scoring one text and reporting two', async () => {
    const { status, json } = await post('/v1/emotions', {
      items: [
        { id: 'dup', text: 'We love it, send the contract.' },
        { id: 'dup', text: 'This is terrible, we are going with a competitor.' },
      ],
    });
    expect(status).toBe(400);
    expect((json.error as { code: string }).code).toBe('INVALID_REQUEST');
  });

  it('compat /emotion still answers at batch size when the model drops items', async () => {
    const ai = new FakeAi();
    ai.dropItemIds = ['5', '6', '7']; // the model routinely omits part of a later chunk
    const { status, json } = await post(
      '/emotion',
      { texts: Array.from({ length: 8 }, () => 'Budget is frozen until next year.') },
      ai,
    );
    // A partial result must not read as an outage: the API still calls this route, and
    // failing it would downgrade every run to PARTIAL. The flat shape simply cannot
    // carry the unavailable flag — that loss is why the route is deprecated.
    expect(status).toBe(200);
    const results = json.results as { labels: { label: string }[] }[];
    expect(results).toHaveLength(8);
    expect(results[0]?.labels.length, 'scored items keep their labels').toBeGreaterThan(0);
    expect(results[5]?.labels, 'unscored items carry no labels, and claim nothing').toEqual([]);
  });
});
