import { describe, expect, it } from 'vitest';
import { extractBearer, timingSafeEqual } from '../../src/core/auth';
import { AppError } from '../../src/core/errors';
import { extractJsonText, parseJsonObject } from '../../src/ai/json';
import { l2Normalize } from '../../src/ai/client';
import { SALES_LABELS } from '../../src/taxonomies/sales-labels';
import { BUYING_INTENT, DEAL_SIGNALS, SALES_EMOTIONS } from '../../src/taxonomies/emotions';
import { loadConfig } from '../../src/core/config';
import { FakeAi, testEnv } from '../helpers';

describe('timingSafeEqual', () => {
  it('accepts matching tokens', () => {
    expect(timingSafeEqual('secret-token', 'secret-token')).toBe(true);
  });

  it('rejects mismatched tokens of equal length', () => {
    expect(timingSafeEqual('secret-token', 'secret-tokem')).toBe(false);
  });

  it('rejects mismatched lengths', () => {
    expect(timingSafeEqual('abc', 'ab')).toBe(false);
  });
});

describe('extractBearer', () => {
  it('parses bearer tokens', () => {
    expect(extractBearer('Bearer abc123')).toBe('abc123');
  });

  it('rejects missing or malformed headers', () => {
    expect(extractBearer(undefined)).toBeNull();
    expect(extractBearer('Basic abc')).toBeNull();
  });
});

describe('json extract', () => {
  it('unwraps fenced json', () => {
    expect(parseJsonObject('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it('slices object from surrounding text', () => {
    expect(extractJsonText('prefix {"a":1} suffix')).toBe('{"a":1}');
  });

  it('throws SCHEMA_INVALID on garbage', () => {
    expect(() => parseJsonObject('nope')).toThrow(AppError);
  });
});

describe('l2Normalize', () => {
  it('unit-normalizes a vector', () => {
    const out = l2Normalize([3, 4]);
    expect(out[0]).toBeCloseTo(0.6);
    expect(out[1]).toBeCloseTo(0.8);
  });
});

describe('taxonomies', () => {
  it('includes the required sales labels', () => {
    const ids = SALES_LABELS.map((label) => label.id);
    expect(ids).toContain('pricing_objection');
    expect(ids).toContain('budget_blocker');
    expect(ids).toContain('explicit_rejection');
    expect(SALES_LABELS).toHaveLength(24);
    for (const label of SALES_LABELS) {
      expect(label.hypothesis.length).toBeGreaterThan(10);
      expect(label.threshold).toBeGreaterThan(0);
    }
  });

  it('keeps emotion, intent, and deal signals separate', () => {
    expect(SALES_EMOTIONS).toContain('enthusiastic');
    expect(BUYING_INTENT).toContain('negative');
    expect(DEAL_SIGNALS).toContain('budget_blocker');
    expect(new Set(SALES_EMOTIONS).size).toBe(SALES_EMOTIONS.length);
  });
});

describe('config', () => {
  it('loads defaults and env overrides', () => {
    const config = loadConfig(testEnv(new FakeAi(), { ENABLE_GENERATION: 'false', MAX_BATCH_SIZE: '8' }));
    expect(config.enableGeneration).toBe(false);
    expect(config.maxBatchSize).toBe(8);
    expect(config.embeddingDimension).toBe(1024);
  });
});
