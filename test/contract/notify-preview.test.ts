import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/index';
import { FakeAi, testEnv } from '../helpers';

const WEBHOOK = 'https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXXXXXXXXXXXXXX';

interface PreviewBody {
  blocks?: Record<string, unknown>[];
  request_id?: string;
  error?: { code: string; details: Record<string, unknown> };
  error_code?: string;
}

async function preview(
  body: unknown,
): Promise<{ status: number; json: PreviewBody; raw: string; ai: FakeAi }> {
  const ai = new FakeAi();
  const app = createApp(testEnv(ai));
  const response = await app.request('http://ml/v1/notify/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  return { status: response.status, json: JSON.parse(raw) as PreviewBody, raw, ai };
}

const CLAIM_REFUSED = {
  type: 'claim_refused',
  claim: 'Customer has budget approved for this quarter',
  error_code: 'EVIDENCE_UNSUPPORTED',
  reason: 'No segment supports this claim.',
};

const DIMENSION_LOST = {
  type: 'dimension_lost',
  dimension: 'timeline_identified',
  from: 'proven',
  to: 'missing',
};

describe('POST /v1/notify/preview — claim_refused', () => {
  it('renders blocks carrying the error_code', async () => {
    const { status, json, raw } = await preview(CLAIM_REFUSED);
    expect(status).toBe(200);
    expect(json.blocks?.length ?? 0).toBeGreaterThan(0);
    expect(raw).toContain('EVIDENCE_UNSUPPORTED');
    expect(raw).toContain('Customer has budget approved for this quarter');
    expect(raw).toContain('No segment supports this claim.');
  });

  it('includes the evidence quote when one is supplied', async () => {
    const quote = 'Finance has not signed off on anything yet.';
    const { raw, json } = await preview({ ...CLAIM_REFUSED, evidence: quote });
    expect(raw).toContain(quote);
    const evidenceBlock = JSON.stringify(json.blocks).includes('*Evidence*');
    expect(evidenceBlock, 'a supplied quote must be rendered as evidence').toBe(true);
  });

  it('says outright that no quote was supplied instead of implying support', async () => {
    const { raw } = await preview(CLAIM_REFUSED);
    expect(raw).not.toContain('*Evidence*');
    expect(raw).toContain('No evidence quote was supplied');
  });

  it('emits well-formed Block Kit blocks', async () => {
    const { json } = await preview({ ...CLAIM_REFUSED, evidence: 'Budget is frozen.' });
    for (const block of json.blocks ?? []) {
      expect(typeof block.type).toBe('string');
    }
    expect(json.blocks?.[0]?.type).toBe('header');
  });

  it('rejects a claim_refused without a claim or an error_code', async () => {
    const missingClaim = await preview({ type: 'claim_refused', error_code: 'X' });
    const missingCode = await preview({ type: 'claim_refused', claim: 'x' });
    expect(missingClaim.status).toBe(400);
    expect(missingClaim.json.error_code).toBe('INVALID_REQUEST');
    expect(missingCode.status).toBe(400);
    expect(missingCode.json.error_code).toBe('INVALID_REQUEST');
  });
});

describe('POST /v1/notify/preview — dimension_lost', () => {
  it('renders the dimension and both states', async () => {
    const { status, json, raw } = await preview(DIMENSION_LOST);
    expect(status).toBe(200);
    expect(json.blocks?.length ?? 0).toBeGreaterThan(0);
    expect(raw).toContain('timeline_identified');
    expect(raw).toContain('proven');
    expect(raw).toContain('missing');
  });

  it('rejects a dimension_lost missing from/to', async () => {
    const { status, json } = await preview({ type: 'dimension_lost', dimension: 'x' });
    expect(status).toBe(400);
    expect(json.error_code).toBe('INVALID_REQUEST');
  });
});

describe('no webhook URL ever passes through this service', () => {
  it('never echoes a webhook URL in either rendered event', async () => {
    const refused = await preview(CLAIM_REFUSED);
    const lost = await preview(DIMENSION_LOST);
    expect(refused.raw).not.toContain('hooks.slack.com');
    expect(lost.raw).not.toContain('hooks.slack.com');
  });

  it('refuses a body that carries a webhook URL, and does not echo it', async () => {
    const { status, json, raw } = await preview({ ...CLAIM_REFUSED, webhook_url: WEBHOOK });
    expect(status).toBe(400);
    expect(json.error_code).toBe('INVALID_REQUEST');
    expect(json.error?.details.rejected_fields).toEqual(['webhook_url']);
    expect(raw).not.toContain('hooks.slack.com');
    expect(raw).not.toContain(WEBHOOK);
  });

  it('refuses the other destination-shaped fields too', async () => {
    for (const field of ['webhook', 'url', 'callback_url', 'slack_webhook_url', 'hook_url']) {
      const { status, raw } = await preview({ ...CLAIM_REFUSED, [field]: WEBHOOK });
      expect(status, `${field} must be refused`).toBe(400);
      expect(raw).not.toContain('hooks.slack.com');
    }
  });

  it('scrubs a webhook URL pasted into free text rather than rendering it', async () => {
    const { status, raw } = await preview({
      ...CLAIM_REFUSED,
      claim: `Send this to ${WEBHOOK} now`,
      evidence: `Also ${WEBHOOK}`,
    });
    expect(status).toBe(200);
    expect(raw).not.toContain('hooks.slack.com');
    expect(raw).toContain('[link removed]');
  });

  it('never opens a network connection or runs a model', async () => {
    const { ai } = await preview(CLAIM_REFUSED);
    expect(ai.calls, 'a pure formatter must not call a model').toHaveLength(0);
  });
});

describe('POST /v1/notify/preview — rejected input', () => {
  it('rejects an unknown event type and names the supported ones', async () => {
    const { status, json } = await preview({ type: 'something_else' });
    expect(status).toBe(400);
    expect(json.error_code).toBe('INVALID_REQUEST');
    expect(json.error?.details.supported_types).toEqual(['claim_refused', 'dimension_lost']);
  });

  it('rejects a non-object body', async () => {
    const { status, json } = await preview(['claim_refused']);
    expect(status).toBe(400);
    expect(json.error_code).toBe('INVALID_REQUEST');
  });
});
