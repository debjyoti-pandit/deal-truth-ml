import { describe, expect, it } from 'vitest';

const live = process.env.RUN_MODEL_TESTS === '1' && Boolean(process.env.ML_SERVICE_BASE_URL);

const AXES = ['emotion', 'buying_intent', 'deal_signals'] as const;

type Scored = { label: string; score: number };
type Row = Record<(typeof AXES)[number], Scored[]> & {
  unavailable: Record<(typeof AXES)[number], boolean>;
};

describe.skipIf(!live)('live /v1/emotions axes', () => {
  const base = process.env.ML_SERVICE_BASE_URL ?? '';
  const token = process.env.INTERNAL_API_TOKEN ?? '';

  async function emotions(text: string): Promise<{ status: number; row: Row }> {
    const response = await fetch(`${base}/v1/emotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items: [{ id: '1', text }] }),
    });
    const json = (await response.json()) as { items?: Row[] };
    return { status: response.status, row: (json.items ?? [])[0] as Row };
  }

  it('scores delight and low intent in the same response, from separate arrays', async () => {
    const { status, row } = await emotions(
      'I absolutely love this product, but finance froze our budget until next year.',
    );
    expect(status).toBe(200);
    for (const axis of AXES) {
      expect(Array.isArray(row[axis]), `${axis} missing`).toBe(true);
      expect(row.unavailable[axis], `${axis} was not scored`).toBe(false);
    }
    expect(
      row.emotion.some((x) => /enthusiastic|interested|curious/.test(x.label)),
      'emotion must read positive',
    ).toBe(true);
    // Assert the axis is populated before asserting what is absent from it — an empty
    // array would satisfy the negative check below and let a silent regression ship.
    expect(row.buying_intent.length, 'buying intent must actually be scored').toBeGreaterThan(0);
    expect(
      row.buying_intent.some((x) => /strong_positive|^positive$/.test(x.label)),
      'commercial intent must not read positive despite the delight',
    ).toBe(false);
    expect(
      row.deal_signals.some((x) => /budget/.test(x.label)),
      'budget blocker must be detected',
    ).toBe(true);
  });

  it('returns all three axes even for a flat utterance', async () => {
    const { status, row } = await emotions('Fine.');
    expect(status).toBe(200);
    for (const axis of AXES) {
      expect(Array.isArray(row[axis]), `${axis} missing`).toBe(true);
      expect(row[axis], `${axis} must never be null`).not.toBeNull();
    }
    expect(typeof row.unavailable.emotion).toBe('boolean');
  });
});
